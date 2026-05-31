"""
Rewrite catalog introspection SQL (SHOW/DESCRIBE) to dialect-safe SELECT before execution.

SHOW TABLES is valid read-only SQL but:
- DataWhisper must not append LIMIT to SHOW (Databricks parse error).
- information_schema SELECT + LIMIT works on every supported engine.
"""

from __future__ import annotations

import re

_SHOW_TABLES = re.compile(
    r"^\s*SHOW\s+TABLES\b(?:\s+(?:FROM|IN)\s+(`?[\w.]+`?))?(?:\s+(?:LIKE\s+)?(?P<like>'(?:[^'\\]|\\.)*'|`[^`]+`))?\s*$",
    re.IGNORECASE,
)


def _clean_ident(raw: str) -> str:
    return raw.strip().strip("`\"'")


def _split_catalog_schema(scope: str) -> tuple[str | None, str]:
    parts = scope.split(".")
    if len(parts) >= 2:
        return ".".join(parts[:-1]), parts[-1]
    return None, parts[0]


def _like_pattern(like: str | None) -> str | None:
    if not like:
        return None
    s = like.strip().strip("`\"'")
    if s.startswith("'") and s.endswith("'"):
        s = s[1:-1]
    return s.replace("*", "%") if s else None


def rewrite_show_tables(sql: str, dialect: str) -> tuple[str, bool]:
    """
    Convert SHOW TABLES … to a SELECT that supports LIMIT on all engines.
    Returns (sql, was_rewritten).
    """
    m = _SHOW_TABLES.match(sql.strip().rstrip(";"))
    if not m:
        return sql, False

    scope_raw = m.group(1)
    scope = _clean_ident(scope_raw) if scope_raw else None
    like = _like_pattern(m.group("like"))
    d = dialect.upper()

    catalog, schema = (None, None)
    if scope:
        catalog, schema = _split_catalog_schema(scope)

    if d == "DATABRICKS":
        where = ["table_type IN ('MANAGED', 'EXTERNAL', 'VIEW', 'BASE TABLE')"]
        if catalog and schema:
            where.append(f"LOWER(table_catalog) = LOWER('{catalog}')")
            where.append(f"LOWER(table_schema) = LOWER('{schema}')")
        elif scope:
            where.append(
                f"(LOWER(table_schema) = LOWER('{scope}') OR LOWER(CONCAT(table_catalog, '.', table_schema)) = LOWER('{scope}'))"
            )
        if like:
            where.append(f"LOWER(table_name) LIKE LOWER('{like}')")
        q = (
            "SELECT table_catalog AS database, table_schema AS tableNamespace, "
            "table_name AS tableName, 'false' AS isTemporary "
            f"FROM information_schema.tables WHERE {' AND '.join(where)}"
        )
        return q, True

    if d in ("POSTGRES", "REDSHIFT"):
        where = ["schemaname NOT IN ('pg_catalog', 'information_schema')"]
        if scope:
            where.append(f"schemaname = '{schema if schema and catalog else scope}'")
        if like:
            where.append(f"tablename LIKE '{like}'")
        q = (
            "SELECT schemaname AS table_schema, tablename AS table_name "
            f"FROM pg_catalog.pg_tables WHERE {' AND '.join(where)}"
        )
        return q, True

    if d == "MYSQL":
        where = ["1=1"]
        if scope:
            where.append(f"table_schema = '{scope}'")
        if like:
            where.append(f"table_name LIKE '{like}'")
        q = (
            "SELECT table_schema, table_name "
            f"FROM information_schema.tables WHERE {' AND '.join(where)}"
        )
        return q, True

    if d == "SQLSERVER":
        where = ["TABLE_TYPE = 'BASE TABLE'"]
        if scope:
            where.append(f"TABLE_SCHEMA = '{schema if catalog else scope}'")
            if catalog:
                where.append(f"TABLE_CATALOG = '{catalog}'")
        if like:
            where.append(f"TABLE_NAME LIKE '{like}'")
        q = (
            "SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name "
            f"FROM INFORMATION_SCHEMA.TABLES WHERE {' AND '.join(where)}"
        )
        return q, True

    if d == "SNOWFLAKE":
        where = ["1=1"]
        if catalog:
            where.append(f"LOWER(table_catalog) = LOWER('{catalog}')")
        if schema:
            where.append(f"LOWER(table_schema) = LOWER('{schema}')")
        elif scope:
            where.append(f"LOWER(table_schema) = LOWER('{scope}')")
        if like:
            where.append(f"LOWER(table_name) LIKE LOWER('{like}')")
        q = (
            "SELECT table_catalog, table_schema, table_name "
            f"FROM information_schema.tables WHERE {' AND '.join(where)}"
        )
        return q, True

    if d == "BIGQUERY":
        # scope: project.dataset or dataset
        dataset = scope
        if catalog and schema:
            dataset = f"{catalog}.{schema}"
        where = ["1=1"]
        if like:
            where.append(f"LOWER(table_name) LIKE LOWER('{like}')")
        if dataset and "." in dataset:
            proj, ds = dataset.split(".", 1)
            q = (
                f"SELECT table_schema, table_name FROM `{proj}.{ds}`.INFORMATION_SCHEMA.TABLES"
                + (f" WHERE LOWER(table_name) LIKE LOWER('{like}')" if like else "")
            )
        elif dataset:
            q = (
                f"SELECT table_schema, table_name FROM `{dataset}`.INFORMATION_SCHEMA.TABLES"
                + (f" WHERE LOWER(table_name) LIKE LOWER('{like}')" if like else "")
            )
        else:
            q = "SELECT table_schema, table_name FROM INFORMATION_SCHEMA.TABLES"
            if like:
                q += f" WHERE LOWER(table_name) LIKE LOWER('{like}')"
        return q, True

    # Unknown dialect: leave SHOW unchanged (row limit layer will not append LIMIT)
    return sql, False


def prepare_sql_for_execution(sql: str, max_rows: int, dialect: str = "STANDARD") -> str:
    """Rewrite catalog SQL then apply row limits (import here to avoid cycles)."""
    from app.services.sql_row_limit import apply_execution_limit

    rewritten, _ = rewrite_show_tables(sql, dialect)
    return apply_execution_limit(rewritten, max_rows, dialect)
