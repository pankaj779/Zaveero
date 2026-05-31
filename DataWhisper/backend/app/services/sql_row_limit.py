"""
Row-cap policy before query execution.

DataWhisper supports POSTGRES, MYSQL, SQLSERVER, REDSHIFT, SNOWFLAKE, BIGQUERY, DATABRICKS.

Two layers (both apply):
1. SQL rewrite — append LIMIT / rely on TOP only for SELECT and WITH (row-returning queries).
2. Driver fetchmany — every connector caps rows after execution (safety net for all statement types).

Why not append LIMIT everywhere?
- SELECT … LIMIT n  → supported on all our SQL engines (Databricks Spark SQL included).
- SHOW / DESCRIBE / EXPLAIN → syntax varies by engine:
  - Databricks/Spark: SHOW TABLES has no LIMIT (docs: LIKE filter only).
  - Snowflake: some SHOW commands accept LIMIT; others do not — inconsistent.
  - BigQuery: SHOW statements do not use LIMIT.
  Appending LIMIT to SHOW caused: SHOW TABLES IN schema LIMIT 500 → PARSE_SYNTAX_ERROR on Databricks.
"""

from __future__ import annotations

import re
from typing import Literal

StatementType = Literal["select", "with", "show", "describe", "explain", "other"]

SUPPORTED_DIALECTS = frozenset(
    {"POSTGRES", "MYSQL", "SQLSERVER", "REDSHIFT", "SNOWFLAKE", "BIGQUERY", "DATABRICKS", "STANDARD"}
)

# Statement types where SQL-level LIMIT/TOP rewriting is safe and useful.
_SQL_LIMIT_STATEMENTS = frozenset({"select", "with"})


def get_statement_type(sql: str) -> StatementType:
    m = re.match(r"^\s*(\w+)", sql.strip(), re.IGNORECASE)
    if not m:
        return "other"
    kw = m.group(1).upper()
    if kw == "WITH":
        return "with"
    if kw == "SELECT":
        return "select"
    if kw == "SHOW":
        return "show"
    if kw in ("DESCRIBE", "DESC"):
        return "describe"
    if kw == "EXPLAIN":
        return "explain"
    return "other"


def uses_client_row_cap_only(sql: str) -> bool:
    """True when SQL must not be rewritten; drivers still cap via fetchmany."""
    return get_statement_type(sql) not in _SQL_LIMIT_STATEMENTS


def apply_execution_limit(sql: str, max_rows: int, dialect: str = "STANDARD") -> str:
    """
    Return SQL safe to execute with a row cap.

    - SELECT / WITH: append LIMIT n (except SQL Server — uses fetchmany; optional TOP in AI SQL).
    - SHOW / DESCRIBE / EXPLAIN: unchanged; fetchmany caps result size in every driver.
    """
    s = sql.strip().rstrip(";")
    stmt = get_statement_type(s)

    if stmt not in _SQL_LIMIT_STATEMENTS:
        return s

    d = dialect.upper()
    if d not in SUPPORTED_DIALECTS:
        d = "STANDARD"

    if d == "SQLSERVER":
        # T-SQL has no LIMIT; SELECT TOP must appear right after SELECT (fragile to inject).
        # All paths use pymssql fetchmany(max_rows) after execution.
        return s

    if re.search(r"\blimit\b", s, re.IGNORECASE):
        return s

    return f"{s} LIMIT {max_rows}"
