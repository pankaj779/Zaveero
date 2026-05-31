"""Fix SQL identifiers per database dialect before execution."""

from __future__ import annotations

import re


def fix_sql_for_execution(sql: str, dialect: str) -> str:
    """
    Normalize common SQL mistakes before sending to the warehouse.

    Databricks: `catalog.schema.table` as one backtick identifier is invalid —
    must be `catalog`.`schema`.`table`.
    """
    d = dialect.upper()
    if d != "DATABRICKS":
        return sql

    def _split_backtick(m: re.Match[str]) -> str:
        inner = m.group(1)
        if "." in inner and not inner.startswith("."):
            parts = [p.strip() for p in inner.split(".") if p.strip()]
            if len(parts) >= 2:
                return ".".join(f"`{p}`" for p in parts)
        return m.group(0)

    return re.sub(r"`([^`]+)`", _split_backtick, sql)


def quote_table_name(full_name: str, dialect: str) -> str:
    """Quote a fully-qualified table name for use in SQL."""
    parts = [p.strip().strip("`") for p in full_name.split(".") if p.strip()]
    if not parts:
        return full_name
    d = dialect.upper()
    if d in ("DATABRICKS", "MYSQL", "BIGQUERY"):
        return ".".join(f"`{p}`" for p in parts)
    if d == "SQLSERVER":
        return ".".join(f"[{p}]" for p in parts)
    if d in ("POSTGRES", "REDSHIFT", "SNOWFLAKE"):
        return ".".join(f'"{p}"' for p in parts)
    return full_name
