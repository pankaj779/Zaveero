"""
Resource discovery engine.

Walk a cloned repository (or any directory) and identify *external resources*
the code talks to: databases, object stores, REST endpoints, Git repositories,
Airflow connections, dbt profiles, Kafka clusters, etc.

For each discovery we emit a normalised record that the API persists as a
`DiscoveredResource` row. The UI then renders a credential prompt from the
matching connector spec (see `connector_specs.py`), and once the user provides
credentials we can create a new `CrawlSource` (for recursive crawl) or a
`DbConnection`.

This module is intentionally heuristic and language-agnostic — it reads text
patterns rather than parsing every grammar. False positives are okay: the user
chooses whether to connect or skip each discovery.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import yaml

logger = logging.getLogger(__name__)

# File types we will read (text-y). Everything else is skipped quickly.
TEXTUAL_SUFFIXES = {
    ".py", ".pyw", ".pyi",
    ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx",
    ".java", ".kt", ".kts", ".scala",
    ".go", ".rs", ".rb", ".php", ".cs", ".vb",
    ".c", ".h", ".cc", ".cpp", ".hpp",
    ".sql", ".hql", ".ddl", ".dml",
    ".yml", ".yaml", ".json", ".toml", ".ini", ".cfg", ".conf", ".env",
    ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
    ".tf", ".tfvars", ".hcl",
    ".dockerfile", ".gradle", ".groovy", ".properties",
    ".md", ".markdown", ".txt",
    ".xml",
}

# Names without a useful suffix that we still want to read. Note: lockfiles are
# intentionally excluded here — they live in LOCKFILE_NAMES and we skip them.
TEXTUAL_NAMES = {
    "Dockerfile", "Makefile", "Procfile", ".gitmodules",
    "requirements.txt", "Pipfile", "pyproject.toml", "setup.py", "setup.cfg",
    "package.json",
    "go.mod",
    "Cargo.toml",
    "build.gradle", "pom.xml", "ivy.xml",
    "composer.json",
    ".env", ".env.local", ".env.production", ".env.development", ".env.staging",
}

# Directory names whose contents are dependencies / build artefacts, not the
# user's code. They explode the file count and produce only false positives.
SKIP_DIR_NAMES: set[str] = {
    "node_modules", "bower_components", "jspm_packages",
    ".venv", "venv", "env", ".env", ".pyenv",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox",
    "site-packages", "dist", "build", "out", ".next", ".nuxt", ".cache",
    "target", ".gradle", ".m2",
    "vendor", "Pods",
    "coverage", ".nyc_output",
    ".terraform", ".serverless",
    ".idea", ".vscode", ".vs",
}

MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB

# Lockfiles are a long list of *download* URLs — they are noise for lineage.
# Skipping them entirely is what every modern code-scanning tool does.
LOCKFILE_NAMES: set[str] = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json",
    "Pipfile.lock", "poetry.lock",
    "Gemfile.lock",
    "composer.lock",
    "Cargo.lock",
    "go.sum",
    "yarn-error.log",
}


# ---------------- Patterns ----------------

# Generic connection-string URIs (scheme://...). We catch them broadly and
# classify later.
_URI_PATTERN = re.compile(
    r"\b("
    r"postgres(?:ql)?|mysql|mariadb|mssql|sqlserver|oracle|redshift|snowflake|bigquery|"
    r"mongodb(?:\+srv)?|redis|rediss|memcached|cassandra|clickhouse|"
    r"kafka|amqp|amqps|nats|"
    r"s3|gs|gcs|az|azure|wasb|wasbs|abfs|abfss|"
    r"https?|ssh|git|ftp|ftps|sftp"
    r")"
    r"(?:\+\w+)?"  # optional +driver
    r"://"
    r"[^\s'\"<>(){}\[\],;]+",
    re.IGNORECASE,
)

# `git@host:owner/repo.git` style refs
_GIT_SSH_RE = re.compile(r"\bgit@[A-Za-z0-9._-]+:[A-Za-z0-9._/-]+(?:\.git)?\b")

# Database hostnames inside dict-like configs ({"host": "...", "user": "...", ...})
_HOSTKEYS = ("host", "hostname", "server", "endpoint", "url", "uri",
             "connection_string", "conn_string", "dsn", "jdbc_url")
_PORTKEYS = ("port",)
_USERKEYS = ("user", "username", "uid")
_PASSKEYS = ("password", "pass", "passwd", "secret", "pwd")
_DBKEYS = ("database", "dbname", "db_name", "db", "schema")
_BUCKETKEYS = ("bucket", "s3_bucket", "gcs_bucket", "container", "blob_container", "container_name")

_DBT_REF_RE = re.compile(r"\{\{\s*ref\s*\(\s*['\"]([^'\"]+)['\"]\s*\)\s*\}\}")
_DBT_SOURCE_RE = re.compile(r"\{\{\s*source\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)\s*\}\}")
_AIRFLOW_CONN_RE = re.compile(r"conn_id\s*=\s*['\"]([^'\"]+)['\"]")
_AIRFLOW_HOOK_RE = re.compile(r"\b(\w*Hook)\s*\(")

# `package.json` "git+https://..." dependency style
_NPM_GIT_DEP_RE = re.compile(r"\"(git\+[a-zA-Z]+://[^\"]+|git@[^\"]+)\"")


# ---------------- Helpers ----------------

def _sanitize_uri(uri: str) -> str:
    """Mask passwords inside URIs."""
    return re.sub(r"(://[^:/@]+:)[^@]+(@)", r"\1***\2", uri)


def _scheme_to_kind(scheme: str) -> str:
    s = scheme.lower().split("+", 1)[0]
    mapping = {
        "postgres": "POSTGRES", "postgresql": "POSTGRES",
        "mysql": "MYSQL", "mariadb": "MYSQL",
        "mssql": "SQLSERVER", "sqlserver": "SQLSERVER",
        "redshift": "REDSHIFT",
        "snowflake": "SNOWFLAKE",
        "bigquery": "BIGQUERY",
        "mongodb": "MONGODB",
        "redis": "REST_API", "rediss": "REST_API",  # treat as endpoint for now
        "kafka": "KAFKA",
        "s3": "S3",
        "gs": "GCS", "gcs": "GCS",
        "az": "AZURE_BLOB", "azure": "AZURE_BLOB",
        "wasb": "AZURE_BLOB", "wasbs": "AZURE_BLOB",
        "abfs": "AZURE_BLOB", "abfss": "AZURE_BLOB",
        "http": "REST_API", "https": "REST_API",
        "git": "GIT_REPO", "ssh": "GIT_REPO",
    }
    return mapping.get(s, "UNKNOWN_URI")


def _is_textual(path: Path) -> bool:
    if path.name in TEXTUAL_NAMES:
        return True
    return path.suffix.lower() in TEXTUAL_SUFFIXES


def _parse_db_uri(uri: str) -> dict[str, Any]:
    """Extract host, port, user, database from a db-ish URI."""
    try:
        p = urlparse(uri)
    except Exception:
        return {"uri": _sanitize_uri(uri)}
    out: dict[str, Any] = {"uri": _sanitize_uri(uri)}
    if p.hostname:
        out["host"] = p.hostname
    if p.port:
        out["port"] = p.port
    if p.username:
        out["user"] = p.username
    if p.path and len(p.path) > 1:
        out["database"] = p.path.lstrip("/")
    return out


def _looks_like_git_repo(uri: str) -> bool:
    """True only for URLs that actually point at a clonable repo.

    A bare `github.com` host is not enough — `github.com/sponsors/foo`,
    `github.com/orgs/bar`, `github.com/marketplace/baz` are NOT repos.
    """
    u = uri.lower().rstrip("/")
    if u.endswith(".git"):
        return True
    try:
        p = urlparse(uri)
    except Exception:
        return False
    host = (p.hostname or "").lower()
    path = (p.path or "").strip("/")
    parts = [seg for seg in path.split("/") if seg]

    if host == "github.com":
        # `/owner/repo` or `/owner/repo/...` — repo must be the second segment.
        if len(parts) < 2:
            return False
        if parts[0].lower() in _GITHUB_NON_REPO_PREFIXES:
            return False
        # Reject if first segment isn't a plausible user/org slug
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9._-]*$", parts[0]):
            return False
        return True
    if host == "gitlab.com" or host == "bitbucket.org":
        return len(parts) >= 2 and parts[0] not in _GITHUB_NON_REPO_PREFIXES
    if "dev.azure.com" in host or "/_git/" in (p.path or "").lower():
        return True
    if host.startswith("gitlab.") or host.startswith("git."):
        return len(parts) >= 2
    return False


def _git_target_source_type(uri: str) -> str:
    u = uri.lower()
    if "gitlab" in u:
        return "GITLAB"
    if "bitbucket" in u:
        return "BITBUCKET"
    if "github" in u:
        return "GITHUB"
    return "CUSTOM"


def _classify_uri(scheme: str, uri: str) -> str:
    kind = _scheme_to_kind(scheme)
    if kind == "REST_API" or kind == "GIT_REPO":
        if _looks_like_git_repo(uri):
            return "GIT_REPO"
    return kind


def _walk_data_for_resources(
    data: Any, source_file: str, out: list[dict[str, Any]], path_hint: str = ""
) -> None:
    """Recursively walk parsed YAML/JSON/TOML data for connection-shaped dicts."""
    if isinstance(data, dict):
        keys_lower = {k.lower(): k for k in data.keys() if isinstance(k, str)}

        # Find a host-like value -> infer a database resource
        host_key = next((keys_lower[k] for k in _HOSTKEYS if k in keys_lower), None)
        if host_key and isinstance(data.get(host_key), str):
            host_val = data[host_key]
            # If it's already a URI, prefer the URI path (handled elsewhere).
            if "://" in host_val:
                _extract_uris_from_text(host_val, source_file, out)
            else:
                detail: dict[str, Any] = {"host": host_val, "source_path": path_hint}
                for kgroup, key in (("port", _PORTKEYS), ("user", _USERKEYS),
                                    ("database", _DBKEYS)):
                    real = next((keys_lower[k] for k in key if k in keys_lower), None)
                    if real and data.get(real) not in (None, ""):
                        detail[kgroup] = data[real]
                # We don't store the password but we know secret was nearby
                has_secret = any(k in keys_lower for k in _PASSKEYS)
                detail["has_secret_inline"] = has_secret
                # Heuristic: if "type" key matches a known db
                t = data.get(keys_lower.get("type", "")) if "type" in keys_lower else None
                kind = _kind_from_db_type(t) or "POSTGRES"
                uri = f"{kind.lower()}://{host_val}"
                if detail.get("database"):
                    uri += f"/{detail['database']}"
                out.append({
                    "kind": kind,
                    "uri": uri,
                    "display_name": f"{kind.title()} @ {host_val}",
                    "detail": detail,
                    "source_file": source_file,
                })

        # Bucket-like discoveries
        bucket_key = next((keys_lower[k] for k in _BUCKETKEYS if k in keys_lower), None)
        if bucket_key and isinstance(data.get(bucket_key), str):
            bucket_val = data[bucket_key]
            kind = "AZURE_BLOB" if "container" in bucket_key else (
                "GCS" if "gcs" in bucket_key else "S3"
            )
            out.append({
                "kind": kind,
                "uri": f"{kind.lower()}://{bucket_val}",
                "display_name": f"{kind} {bucket_val}",
                "detail": {"bucket": bucket_val, "source_path": path_hint},
                "source_file": source_file,
            })

        for k, v in data.items():
            new_hint = f"{path_hint}.{k}" if path_hint else str(k)
            _walk_data_for_resources(v, source_file, out, new_hint)

    elif isinstance(data, list):
        for i, v in enumerate(data):
            _walk_data_for_resources(v, source_file, out, f"{path_hint}[{i}]")

    elif isinstance(data, str):
        _extract_uris_from_text(data, source_file, out)


def _kind_from_db_type(t: Any) -> str | None:
    if not isinstance(t, str):
        return None
    tl = t.lower()
    mapping = {
        "postgres": "POSTGRES", "postgresql": "POSTGRES",
        "mysql": "MYSQL", "mariadb": "MYSQL",
        "mssql": "SQLSERVER", "sqlserver": "SQLSERVER",
        "redshift": "REDSHIFT", "snowflake": "SNOWFLAKE",
        "bigquery": "BIGQUERY", "databricks": "DATABRICKS",
        "mongodb": "MONGODB", "mongo": "MONGODB",
        "s3": "S3", "gcs": "GCS", "azure": "AZURE_BLOB",
        "kafka": "KAFKA",
    }
    return mapping.get(tl)


def _extract_uris_from_text(text: str, source_file: str, out: list[dict[str, Any]]) -> None:
    for m in _URI_PATTERN.finditer(text):
        scheme = m.group(1)
        uri = m.group(0)
        kind = _classify_uri(scheme, uri)
        detail = _parse_db_uri(uri) if kind in {
            "POSTGRES", "MYSQL", "SQLSERVER", "REDSHIFT", "SNOWFLAKE",
            "MONGODB", "BIGQUERY",
        } else {"uri": _sanitize_uri(uri)}
        if kind == "GIT_REPO":
            detail = {"uri": uri, "target_source_type": _git_target_source_type(uri)}
            display = uri
        elif kind == "REST_API":
            try:
                host = urlparse(uri).hostname or uri
            except Exception:
                host = uri
            display = host
            detail.setdefault("host", host)
        else:
            display = detail.get("host") or _sanitize_uri(uri)
            display = f"{kind.title()} @ {display}"
        out.append({
            "kind": kind,
            "uri": _sanitize_uri(uri) if kind != "GIT_REPO" else uri,
            "display_name": display,
            "detail": detail,
            "source_file": source_file,
        })

    for m in _GIT_SSH_RE.finditer(text):
        uri = m.group(0)
        out.append({
            "kind": "GIT_REPO",
            "uri": uri,
            "display_name": uri,
            "detail": {"uri": uri, "target_source_type": _git_target_source_type(uri)},
            "source_file": source_file,
        })


_DOC_EXTENSIONS = {".md", ".markdown", ".txt"}

# Hosts that are documentation, CDNs, badges, sponsor pages, or package registries.
# None of these belong on a lineage graph — they're build-time download targets, not
# runtime data sources. Real DB / Git / S3 URIs still pass because they use distinct
# schemes (`postgres://`, `s3://`, `git@`, …).
_NOISY_REST_HOSTS: set[str] = {
    # Badges / shields
    "img.shields.io", "shields.io", "badge.fury.io", "badgen.net",
    # GitHub static assets / sponsor / marketing
    "raw.githubusercontent.com", "user-images.githubusercontent.com",
    "objects.githubusercontent.com", "avatars.githubusercontent.com",
    "github.io",
    # CDNs / fonts
    "fonts.googleapis.com", "fonts.gstatic.com",
    "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com",
    # Documentation / well-known sites
    "wikipedia.org", "stackoverflow.com", "stackexchange.com",
    "developer.mozilla.org", "docs.python.org", "docs.aws.amazon.com",
    "docs.docker.com", "docs.github.com", "docs.npmjs.com",
    "www.w3.org",
    "reactjs.org", "react.dev", "vuejs.org", "angular.io",
    "nodejs.org", "npmjs.com", "www.npmjs.com",
    "tensorflow.org", "pytorch.org",
    "eslint.org", "prettier.io", "babeljs.io", "typescriptlang.org",
    "jestjs.io", "mochajs.org", "webpack.js.org", "parceljs.org", "vitejs.dev",
    "rollupjs.org", "esbuild.github.io",
    "tailwindcss.com", "getbootstrap.com", "mui.com",
    # Package registries (build/install time download URLs, not lineage)
    "registry.npmjs.org", "registry.yarnpkg.com",
    "pypi.org", "files.pythonhosted.org", "test.pypi.org",
    "repo.maven.apache.org", "repo1.maven.org", "repo.maven.org", "repository.jboss.org",
    "rubygems.org", "api.rubygems.org",
    "proxy.golang.org", "pkg.go.dev", "sum.golang.org",
    "crates.io", "static.crates.io", "index.crates.io",
    "registry-1.docker.io", "auth.docker.io", "production.cloudflare.docker.com",
    "hub.docker.com", "ghcr.io",
    "registry.terraform.io",
    "api.nuget.org", "www.nuget.org",
    "packagist.org", "repo.packagist.org",
    # Software vendor product pages
    "opensource.org",
    "spdx.org", "creativecommons.org",
}

# GitHub paths that look like repos but aren't (sponsors, marketplace, etc.).
_GITHUB_NON_REPO_PREFIXES = (
    "sponsors", "orgs", "settings", "marketplace", "topics", "features",
    "about", "pricing", "login", "join", "notifications", "search",
    "trending", "explore", "collections", "events",
    "site-policy", "security", "readme",
)


def _is_noisy_rest_url(uri: str) -> bool:
    try:
        host = urlparse(uri).hostname or ""
    except Exception:
        return False
    host = host.lower()
    if host in _NOISY_REST_HOSTS:
        return True
    # If it's a code-host URL that isn't a real repo (sponsors, marketplace,
    # settings…) we've already failed `_looks_like_git_repo`, so as a REST
    # endpoint it's just a web page — not lineage.
    if host in {"github.com", "www.github.com", "gitlab.com", "bitbucket.org"}:
        return True
    # Subdomain catches: *.gstatic.com, *.w3.org, *.github.io, *.readthedocs.io
    for suffix in (".gstatic.com", ".w3.org", ".github.io",
                   ".readthedocs.io", ".readthedocs.org",
                   ".pages.dev", ".vercel.app", ".netlify.app",
                   ".github.dev"):
        if host.endswith(suffix):
            return True
    return False


def _scan_text_file(rel_path: str, content: str, out: list[dict[str, Any]]) -> None:
    """Plain-text/source-code scan: regex for URIs + a few framework hints."""
    suffix = Path(rel_path).suffix.lower()
    is_doc = suffix in _DOC_EXTENSIONS

    tmp: list[dict[str, Any]] = []
    _extract_uris_from_text(content, rel_path, tmp)
    for r in tmp:
        # In documentation files we keep only "interesting" kinds.
        if is_doc and r["kind"] in {"REST_API", "UNKNOWN_URI"}:
            continue
        if r["kind"] == "REST_API" and _is_noisy_rest_url(r.get("detail", {}).get("uri", r["uri"])):
            continue
        out.append(r)

    # Airflow conn_id references
    for m in _AIRFLOW_CONN_RE.finditer(content):
        conn_id = m.group(1)
        out.append({
            "kind": "AIRFLOW",
            "uri": f"airflow://conn/{conn_id}",
            "display_name": f"Airflow conn_id: {conn_id}",
            "detail": {"conn_id": conn_id},
            "source_file": rel_path,
        })

    # npm git+https dependencies (package.json)
    if rel_path.endswith("package.json"):
        for m in _NPM_GIT_DEP_RE.finditer(content):
            uri = m.group(1)
            out.append({
                "kind": "GIT_REPO",
                "uri": uri,
                "display_name": uri,
                "detail": {"uri": uri, "target_source_type": _git_target_source_type(uri)},
                "source_file": rel_path,
            })

    # .gitmodules submodules
    if rel_path.endswith(".gitmodules"):
        for m in re.finditer(r"url\s*=\s*(\S+)", content):
            uri = m.group(1)
            out.append({
                "kind": "GIT_REPO",
                "uri": uri,
                "display_name": f"submodule {uri}",
                "detail": {"uri": uri, "target_source_type": _git_target_source_type(uri)},
                "source_file": rel_path,
            })


def _scan_yaml_file(rel_path: str, content: str, out: list[dict[str, Any]]) -> None:
    try:
        for doc in yaml.safe_load_all(content):
            if doc is not None:
                _walk_data_for_resources(doc, rel_path, out)
                _maybe_extract_dbt_profile(doc, rel_path, out)
    except Exception:
        # Fall back to plain text scan on parse error
        _scan_text_file(rel_path, content, out)


def _scan_json_file(rel_path: str, content: str, out: list[dict[str, Any]]) -> None:
    try:
        data = json.loads(content)
        _walk_data_for_resources(data, rel_path, out)
    except Exception:
        _scan_text_file(rel_path, content, out)


def _maybe_extract_dbt_profile(doc: Any, rel_path: str, out: list[dict[str, Any]]) -> None:
    """profiles.yml shape: { profile_name: { target: ..., outputs: { dev: {type, host, ...} } } }"""
    if not isinstance(doc, dict) or "profiles.yml" not in rel_path.lower() and "profile" not in rel_path.lower():
        return
    for profile_name, payload in doc.items():
        if not isinstance(payload, dict):
            continue
        outputs = payload.get("outputs")
        if not isinstance(outputs, dict):
            continue
        for env_name, cfg in outputs.items():
            if not isinstance(cfg, dict):
                continue
            t = cfg.get("type", "?")
            host = cfg.get("host") or cfg.get("account")
            out.append({
                "kind": "DBT_PROFILE",
                "uri": f"dbt://{profile_name}/{env_name}",
                "display_name": f"dbt profile {profile_name}.{env_name} ({t})",
                "detail": {
                    "profile_name": profile_name,
                    "target": env_name,
                    "type": t,
                    "host": host,
                    "database": cfg.get("database") or cfg.get("dbname"),
                    "user": cfg.get("user"),
                },
                "source_file": rel_path,
            })


# ---------------- Public entrypoint ----------------

def discover_resources(repo_path: str) -> list[dict[str, Any]]:
    """Walk a cloned repo and return a deduped list of discovered resources."""
    root = Path(repo_path)
    out: list[dict[str, Any]] = []

    for fp in root.rglob("*"):
        try:
            if not fp.is_file():
                continue
            # Skip vendor / build / cache directories entirely
            if any(part in SKIP_DIR_NAMES or part == ".git" for part in fp.parts):
                continue
            # Skip lockfiles — they are pages of download URLs, not lineage data
            if fp.name in LOCKFILE_NAMES:
                continue
            if fp.name.startswith(".") and fp.name not in TEXTUAL_NAMES:
                continue
            if not _is_textual(fp):
                continue
            if fp.stat().st_size > MAX_FILE_SIZE:
                continue
        except OSError:
            continue

        rel = str(fp.relative_to(root))
        try:
            content = fp.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        suffix = fp.suffix.lower()
        if suffix in {".yml", ".yaml"}:
            _scan_yaml_file(rel, content, out)
        elif suffix == ".json":
            _scan_json_file(rel, content, out)
        else:
            _scan_text_file(rel, content, out)

    # Dedupe by (kind, uri); keep the first source_file we saw.
    seen: dict[tuple[str, str], dict[str, Any]] = {}
    for r in out:
        key = (r["kind"], r["uri"])
        if key not in seen:
            seen[key] = r
    return list(seen.values())
