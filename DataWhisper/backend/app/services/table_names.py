"""Canonical table naming and cross-layer resolution (scan ↔ code ↔ AI)."""

from __future__ import annotations

import re
from typing import Any

# Cap tables persisted per scan (safety on large warehouses).
MAX_TABLES_PER_SCAN = 2000


def _parts(name: str) -> list[str]:
    s = name.strip().strip("`\"[]")
    if not s:
        return []
    return [p.strip() for p in re.split(r"\.(?=(?:[^`\"]*[`\"][^`\"]*[`\"])*[^`\"]*$)", s) if p.strip()]


def canonical_table_name(engine: str, raw_name: str, context: dict[str, Any] | None = None) -> str:
    """
    Normalize to fully-qualified name per engine.
    context may include: database, schema, catalog, project_id, dataset
    """
    ctx = context or {}
    eng = engine.upper()
    parts = _parts(raw_name)
    if not parts:
        return raw_name.strip()

    if eng == "DATABRICKS":
        if len(parts) >= 3:
            return ".".join(parts[:3])
        catalog = ctx.get("catalog") or "hive_metastore"
        schema = ctx.get("schema") or "default"
        if len(parts) == 2:
            return f"{catalog}.{parts[0]}.{parts[1]}"
        return f"{catalog}.{schema}.{parts[0]}"

    if eng == "SNOWFLAKE":
        db = ctx.get("database") or ctx.get("db") or ""
        if len(parts) >= 3:
            return ".".join(parts[:3])
        if len(parts) == 2 and db:
            return f"{db}.{parts[0]}.{parts[1]}"
        if db:
            schema = ctx.get("schema") or "PUBLIC"
            return f"{db}.{schema}.{parts[0]}"
        return ".".join(parts)

    if eng == "BIGQUERY":
        project = ctx.get("project_id") or ctx.get("project") or ""
        if len(parts) >= 3:
            return ".".join(parts[:3])
        dataset = ctx.get("dataset") or ""
        if project and dataset:
            return f"{project}.{dataset}.{parts[-1]}"
        return ".".join(parts)

    if eng in ("POSTGRES", "REDSHIFT", "SQLSERVER"):
        if len(parts) >= 2:
            return ".".join(parts[:2])
        schema = ctx.get("schema") or ("dbo" if eng == "SQLSERVER" else "public")
        return f"{schema}.{parts[0]}"

    if eng == "MYSQL":
        db = ctx.get("database") or ctx.get("db") or ""
        if len(parts) >= 2:
            return ".".join(parts[:2])
        if db:
            return f"{db}.{parts[0]}"
        return parts[0]

    return ".".join(parts)


def resolve_table_to_known(
    name: str,
    known: set[str],
    engine: str = "",
) -> str | None:
    """Map a SQL/code table reference to a scanned metadata name."""
    if not name or not known:
        return None
    cleaned = name.strip().strip("`\"[]")
    if cleaned in known:
        return cleaned
    lower = cleaned.lower()
    for k in known:
        if k.lower() == lower:
            return k
    for k in known:
        if k.lower().endswith("." + lower):
            return k
    short = cleaned.split(".")[-1].lower()
    matches = [k for k in known if k.split(".")[-1].lower() == short]
    if len(matches) == 1:
        return matches[0]
    if len(cleaned.split(".")) >= 2:
        suffix = ".".join(cleaned.split(".")[-2:]).lower()
        path_matches = [k for k in known if k.lower().endswith("." + suffix) or k.lower() == suffix]
        if len(path_matches) == 1:
            return path_matches[0]
    return None


def normalize_metadata_tables(meta: dict[str, Any], engine: str, config: dict[str, Any]) -> dict[str, Any]:
    """Rewrite table + FK names to canonical form after scan."""
    ctx = dict(config)
    tables = meta.get("tables") or []
    rename: dict[str, str] = {}
    out_tables: list[dict[str, Any]] = []
    for t in tables:
        if not isinstance(t, dict) or not t.get("name"):
            continue
        old = str(t["name"])
        new = canonical_table_name(engine, old, ctx)
        rename[old] = new
        nt = dict(t)
        nt["name"] = new
        fks = []
        for fk in nt.get("foreign_keys") or []:
            if not isinstance(fk, dict):
                continue
            ref = fk.get("referenced_table")
            if isinstance(ref, str):
                fk = dict(fk)
                fk["referenced_table"] = canonical_table_name(engine, ref, ctx)
            fks.append(fk)
        nt["foreign_keys"] = fks
        out_tables.append(nt)
        if len(out_tables) >= MAX_TABLES_PER_SCAN:
            break
    meta = {**meta, "tables": out_tables, "tables_truncated": len(tables) > MAX_TABLES_PER_SCAN}
    return meta, rename
