"""
GitHub repository crawler — clones repos and extracts SQL lineage,
Python table references, dbt models, Airflow DAGs, and config resources.
"""
from __future__ import annotations

import asyncio
import ast
import json
import logging
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import git
import yaml

from app.services.sqlglot_lineage import analyze_sql_file, classify_environment

logger = logging.getLogger(__name__)

SQL_EXTENSIONS = {".sql", ".hql", ".ddl", ".dml"}
PYTHON_EXTENSIONS = {".py"}
CONFIG_EXTENSIONS = {".yml", ".yaml", ".json"}
DBT_MODEL_PATTERN = re.compile(r"models?/", re.IGNORECASE)
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB

_DBT_REF_RE = re.compile(r"\{\{\s*ref\s*\(\s*['\"]([^'\"]+)['\"]\s*\)\s*\}\}")
_DBT_SOURCE_RE = re.compile(
    r"\{\{\s*source\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)\s*\}\}"
)
_CONN_STRING_RE = re.compile(
    r"(postgres(?:ql)?|mysql|mssql|oracle|redshift|snowflake|bigquery)"
    r"(?:://|:\/\/|\+\w+://)"
    r"[^\s'\"]+",
    re.IGNORECASE,
)
_AIRFLOW_CONN_RE = re.compile(r"conn_id\s*=\s*['\"]([^'\"]+)['\"]")


def _normalize_token(token: str | None) -> str | None:
    if token is None:
        return None
    t = token.strip()
    # Strip a surrounding "Bearer " prefix if pasted by mistake
    if t.lower().startswith("bearer "):
        t = t[7:].strip()
    return t or None


def _build_auth_urls(repo_url: str, token: str | None) -> list[tuple[str, str]]:
    """
    Return a list of (label, url) auth variants to try in order. Without a token,
    just the plain URL. With a token we try the most-compatible form first, then
    the `x-access-token` form which GitHub recommends for fine-grained PATs and
    GitHub App tokens.
    """
    parsed = urlparse(repo_url)
    path = parsed.path
    # GitHub is tolerant of missing `.git` but some servers aren't; ensure it.
    if "github.com" in (parsed.netloc or "").lower() and not path.endswith(".git"):
        path = path + ".git"

    base = f"{parsed.scheme}://{parsed.netloc}{path}"
    if not token:
        return [("anonymous", base)]
    # urllib will percent-encode '@' etc. inside the token if present — but PATs are
    # ASCII-safe so we just inline them.
    pat_url = f"{parsed.scheme}://{token}@{parsed.netloc}{path}"
    xat_url = f"{parsed.scheme}://x-access-token:{token}@{parsed.netloc}{path}"
    return [("pat", pat_url), ("x-access-token", xat_url)]


def _diagnose_git_error(repo_url: str, err_text: str, *, had_token: bool) -> str:
    """Map common git/GitHub error patterns to clear, actionable messages."""
    lower = err_text.lower()
    host = (urlparse(repo_url).hostname or "").lower()

    if "403" in lower and ("write access" in lower or "permission" in lower or "forbidden" in lower):
        if "github.com" in host:
            return (
                "GitHub rejected the access token (HTTP 403).\n\n"
                "Most common causes:\n"
                "  • The token belongs to a different GitHub user than the repo owner.\n"
                "  • Classic PAT is missing the `repo` scope.\n"
                "  • Fine-grained PAT is missing `Contents: Read` permission, OR the repository was not\n"
                "    selected when the token was created.\n"
                "  • The token expired or was revoked.\n\n"
                "Fix: create a new PAT at https://github.com/settings/tokens and paste it into the\n"
                "Personal access token field, then click Start crawl again."
            )
        return f"Remote returned HTTP 403 (forbidden) for {repo_url}. Check that the token has read access to this repo."

    if "401" in lower or "authentication failed" in lower or "could not read username" in lower:
        if had_token:
            return (
                "Authentication failed (HTTP 401). The token didn't authenticate against the remote.\n"
                "  • Make sure you pasted the *entire* token (no leading/trailing whitespace).\n"
                "  • Classic GitHub PATs start with `ghp_`. Fine-grained tokens start with `github_pat_`.\n"
                "  • For GitLab use `glpat_…`, for Bitbucket app passwords use the raw password."
            )
        return (
            "Authentication required (HTTP 401). The repository is private — enter a personal "
            "access token in the PAT field and click Start crawl again."
        )

    if "404" in lower or "not found" in lower or "repository not found" in lower:
        return (
            f"Remote returned HTTP 404 for {repo_url}. Double-check the URL and the owner/repo name. "
            "If the repo is private, also confirm your token has access to it."
        )

    if "ssl" in lower or "certificate" in lower:
        return f"TLS/SSL error talking to {repo_url}. Check your network / proxy / self-signed cert setup."

    if "could not resolve host" in lower or "name or service not known" in lower:
        return f"DNS error: could not resolve the host in {repo_url}. Check the URL spelling and outbound network."

    if "timed out" in lower or "timeout" in lower:
        return f"Git clone timed out talking to {repo_url}. Network / firewall issue, or repo is very large."

    # Generic fallback — keep the original stderr so the user can copy/paste it.
    return f"git clone failed for {repo_url}:\n{err_text.strip()}"


async def clone_repo(
    repo_url: str, token: str | None = None, branch: str | None = None
) -> str:
    """
    Clone a git repo to a temp dir. Returns the temp dir path. Caller must clean up.

    On 401/403 with a token, retries once with the `x-access-token:` URL format which
    GitHub recommends for fine-grained PATs and App installation tokens. Errors are
    translated into actionable, human-readable diagnostics so the UI doesn't surface
    raw git stderr.
    """
    token = _normalize_token(token)
    attempts = _build_auth_urls(repo_url, token)

    tmp_dir = tempfile.mkdtemp(prefix="datawhisper_repo_")
    last_err: str = ""

    for label, auth_url in attempts:
        kwargs: dict[str, Any] = {"url": auth_url, "to_path": tmp_dir, "depth": 1}
        if branch:
            kwargs["branch"] = branch
        try:
            await asyncio.to_thread(git.Repo.clone_from, **kwargs)
            logger.info("clone_repo: %s succeeded via auth=%s", repo_url, label)
            return tmp_dir
        except Exception as e:
            # Make sure the tmpdir is empty before the next attempt (git refuses to clone into a non-empty dir).
            shutil.rmtree(tmp_dir, ignore_errors=True)
            tmp_dir = tempfile.mkdtemp(prefix="datawhisper_repo_")
            last_err = str(e)
            logger.warning("clone_repo: attempt auth=%s failed: %s", label, last_err[:200])
            # Only retry the next auth variant on auth-shaped failures.
            if "401" not in last_err and "403" not in last_err and "Authentication failed" not in last_err:
                break

    shutil.rmtree(tmp_dir, ignore_errors=True)
    diagnostic = _diagnose_git_error(repo_url, last_err, had_token=token is not None)
    raise RuntimeError(diagnostic)


async def crawl_repository(
    repo_path: str,
    dialect: str | None = None,
    already_scanned: set[str] | None = None,
) -> dict[str, Any]:
    """
    Walk a cloned repo directory and extract lineage from all relevant files.
    Returns: {
        "edges": [...],
        "files_scanned": int,
        "files_skipped": int,
        "errors": [...],
        "discovered_resources": [...],
    }
    """
    already_scanned = already_scanned or set()

    edges: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    discovered_resources: list[dict[str, Any]] = []
    files_scanned = 0
    files_skipped = 0

    repo_root = Path(repo_path)

    for file_path in repo_root.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.name.startswith("."):
            continue
        if ".git" in file_path.parts:
            continue

        rel_path = str(file_path.relative_to(repo_root))

        if rel_path in already_scanned:
            files_skipped += 1
            continue

        if file_path.stat().st_size > MAX_FILE_SIZE:
            files_skipped += 1
            continue

        suffix = file_path.suffix.lower()

        try:
            if suffix in SQL_EXTENSIONS:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                file_edges = await _process_sql_file(rel_path, content, dialect)
                edges.extend(file_edges)
                files_scanned += 1

            elif suffix in PYTHON_EXTENSIONS:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                file_edges = _process_python_file(rel_path, content, dialect)
                edges.extend(file_edges)
                files_scanned += 1

            elif suffix in CONFIG_EXTENSIONS:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                resources = _scan_config_for_resources(rel_path, content)
                discovered_resources.extend(resources)
                files_scanned += 1

            else:
                continue

        except Exception as e:
            errors.append({"file": rel_path, "error": str(e)})
            logger.warning("Error processing %s: %s", rel_path, e)

    return {
        "edges": edges,
        "files_scanned": files_scanned,
        "files_skipped": files_skipped,
        "errors": errors,
        "discovered_resources": discovered_resources,
    }


async def _process_sql_file(
    rel_path: str, content: str, dialect: str | None
) -> list[dict[str, Any]]:
    """Process a SQL file — handles both regular SQL and dbt models."""
    edges: list[dict[str, Any]] = []
    env = classify_environment(rel_path)

    is_dbt = bool(DBT_MODEL_PATTERN.search(rel_path))

    if is_dbt:
        dbt_edges = _extract_dbt_lineage(rel_path, content)
        edges.extend(dbt_edges)

    sql_edges = await asyncio.to_thread(analyze_sql_file, content, rel_path, dialect)
    for edge in sql_edges:
        edge["environment"] = env
    edges.extend(sql_edges)

    return edges


def _extract_dbt_lineage(file_path: str, content: str) -> list[dict[str, Any]]:
    """Extract dbt ref() and source() dependencies."""
    edges: list[dict[str, Any]] = []
    model_name = Path(file_path).stem

    for match in _DBT_REF_RE.finditer(content):
        ref_model = match.group(1)
        edges.append({
            "from_node": ref_model,
            "to_node": model_name,
            "edge_type": "DBT_REF",
            "source_file": file_path,
            "environment": classify_environment(file_path),
        })

    for match in _DBT_SOURCE_RE.finditer(content):
        source_name = match.group(1)
        table_name = match.group(2)
        edges.append({
            "from_node": f"{source_name}.{table_name}",
            "to_node": model_name,
            "edge_type": "DBT_SOURCE",
            "source_file": file_path,
            "environment": classify_environment(file_path),
        })

    return edges


def _process_python_file(
    rel_path: str, content: str, dialect: str | None
) -> list[dict[str, Any]]:
    """Process a Python file — extract embedded SQL and table references."""
    edges: list[dict[str, Any]] = []
    env = classify_environment(rel_path)

    sql_strings = _extract_sql_from_python(rel_path, content)
    for sql in sql_strings:
        try:
            sql_edges = analyze_sql_file(sql, rel_path, dialect)
            for edge in sql_edges:
                edge["environment"] = env
            edges.extend(sql_edges)
        except Exception:
            pass

    py_edges = _extract_python_table_refs(rel_path, content)
    for edge in py_edges:
        edge["environment"] = env
    edges.extend(py_edges)

    if _is_airflow_dag(content):
        airflow_edges = _extract_airflow_refs(rel_path, content)
        for edge in airflow_edges:
            edge["environment"] = env
        edges.extend(airflow_edges)

    return edges


def _extract_sql_from_python(file_path: str, content: str) -> list[str]:
    """Use ast to find SQL strings embedded in Python code."""
    sql_strings: list[str] = []

    try:
        tree = ast.parse(content)
    except SyntaxError:
        return sql_strings

    sql_indicators = re.compile(
        r"\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|MERGE|WITH)\b",
        re.IGNORECASE,
    )

    for node in ast.walk(tree):
        strings_to_check: list[str] = []

        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            strings_to_check.append(node.value)
        elif isinstance(node, ast.JoinedStr):
            for val in node.values:
                if isinstance(val, ast.Constant) and isinstance(val.value, str):
                    strings_to_check.append(val.value)

        for s in strings_to_check:
            if len(s) > 20 and sql_indicators.search(s):
                sql_strings.append(s)

    return sql_strings


def _extract_python_table_refs(
    file_path: str, content: str
) -> list[dict[str, Any]]:
    """Detect pandas read_sql, spark.sql, execute() calls and extract table references."""
    edges: list[dict[str, Any]] = []

    try:
        tree = ast.parse(content)
    except SyntaxError:
        return edges

    read_sql_pattern = re.compile(
        r"\b(?:read_sql|read_sql_query|read_sql_table)\b"
    )
    spark_sql_pattern = re.compile(r"\bspark\.sql\b")
    execute_pattern = re.compile(r"\b(?:execute|executemany|run_query)\b")

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        func_name = _get_call_name(node)
        if not func_name:
            continue

        if read_sql_pattern.search(func_name) or spark_sql_pattern.search(func_name) or execute_pattern.search(func_name):
            for arg in node.args:
                if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                    sql_str = arg.value
                    if len(sql_str) > 10:
                        edges.append({
                            "from_node": f"PYTHON_SQL:{file_path}",
                            "to_node": f"QUERY:{file_path}:{node.lineno}",
                            "edge_type": "PYTHON_SQL_CALL",
                            "source_file": file_path,
                            "call_type": func_name,
                            "line": node.lineno,
                        })

    return edges


def _get_call_name(node: ast.Call) -> str | None:
    """Extract the function name from a Call node."""
    if isinstance(node.func, ast.Name):
        return node.func.id
    elif isinstance(node.func, ast.Attribute):
        parts = []
        current = node.func
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name):
            parts.append(current.id)
        return ".".join(reversed(parts))
    return None


def _is_airflow_dag(content: str) -> bool:
    """Detect if a Python file is an Airflow DAG."""
    return "airflow" in content.lower() and "dag" in content.lower()


def _extract_airflow_refs(
    file_path: str, content: str
) -> list[dict[str, Any]]:
    """Extract Airflow connection references and task dependencies."""
    edges: list[dict[str, Any]] = []

    for match in _AIRFLOW_CONN_RE.finditer(content):
        conn_id = match.group(1)
        edges.append({
            "from_node": f"AIRFLOW_CONN:{conn_id}",
            "to_node": f"DAG:{file_path}",
            "edge_type": "AIRFLOW_CONNECTION",
            "source_file": file_path,
            "environment": classify_environment(file_path),
        })

    return edges


def _scan_config_for_resources(
    file_path: str, content: str
) -> list[dict[str, Any]]:
    """Scan YAML/JSON configs for database connection strings, Airflow connections, etc."""
    resources: list[dict[str, Any]] = []

    for match in _CONN_STRING_RE.finditer(content):
        db_type = match.group(1).upper()
        conn_str = match.group(0)
        resources.append({
            "type": "DATABASE",
            "name": db_type,
            "detail": _sanitize_connection_string(conn_str),
            "source_file": file_path,
        })

    suffix = Path(file_path).suffix.lower()
    try:
        if suffix in {".yml", ".yaml"}:
            data = yaml.safe_load(content)
            if isinstance(data, dict):
                resources.extend(_walk_yaml_for_resources(data, file_path))
        elif suffix == ".json":
            data = json.loads(content)
            if isinstance(data, dict):
                resources.extend(_walk_yaml_for_resources(data, file_path))
    except Exception:
        pass

    return resources


def _walk_yaml_for_resources(
    data: dict[str, Any], file_path: str, prefix: str = ""
) -> list[dict[str, Any]]:
    """Recursively walk parsed YAML/JSON to find connection-related keys."""
    resources: list[dict[str, Any]] = []
    connection_keys = {
        "host", "hostname", "server", "endpoint", "url", "uri",
        "database", "dbname", "db_name", "schema",
        "connection_string", "conn_string", "dsn",
    }
    dbt_target_keys = {"target", "outputs"}
    storage_keys = {"bucket", "s3_bucket", "gcs_bucket", "container", "blob_storage"}

    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key

        if isinstance(value, dict):
            if key in ("profiles", "target", "outputs") or "dbt" in file_path.lower():
                for sub_key, sub_val in value.items():
                    if isinstance(sub_val, dict) and any(
                        k in sub_val for k in ("type", "host", "database", "schema")
                    ):
                        resources.append({
                            "type": "DATABASE",
                            "name": sub_val.get("type", sub_key),
                            "detail": f"host={sub_val.get('host', '?')} db={sub_val.get('database', '?')}",
                            "source_file": file_path,
                        })

            resources.extend(_walk_yaml_for_resources(value, file_path, full_key))

        elif isinstance(value, str):
            lower_key = key.lower()
            if lower_key in connection_keys and value:
                resources.append({
                    "type": "DATABASE",
                    "name": lower_key,
                    "detail": _sanitize_connection_string(value),
                    "source_file": file_path,
                })
            elif lower_key in storage_keys and value:
                resources.append({
                    "type": "STORAGE",
                    "name": lower_key,
                    "detail": value,
                    "source_file": file_path,
                })
            elif lower_key in ("api_url", "api_endpoint", "base_url") and value:
                resources.append({
                    "type": "API",
                    "name": lower_key,
                    "detail": value,
                    "source_file": file_path,
                })

    return resources


def _sanitize_connection_string(conn_str: str) -> str:
    """Mask passwords in connection strings for safe storage."""
    return re.sub(
        r"(://[^:]+:)[^@]+(@)",
        r"\1****\2",
        conn_str,
    )
