"""
SQL lineage extraction using sqlglot — column-level and table-level.
Replaces the heuristic-only approach with real SQL parsing across 31 dialects.
"""
from __future__ import annotations

import logging
from typing import Any

import sqlglot
from sqlglot import exp
from sqlglot.lineage import lineage as sg_lineage

logger = logging.getLogger(__name__)

DIALECT_MAP = {
    "POSTGRES": "postgres",
    "MYSQL": "mysql",
    "SNOWFLAKE": "snowflake",
    "BIGQUERY": "bigquery",
    "DATABRICKS": "databricks",
    "SQLSERVER": "tsql",
    "REDSHIFT": "redshift",
}


def _to_sg_dialect(engine: str) -> str | None:
    return DIALECT_MAP.get(engine.upper())


def extract_table_lineage_from_sql(
    sql: str,
    dialect: str | None = None,
) -> dict[str, Any]:
    """
    Parse a SQL statement and extract table-level lineage:
    which tables are read from and which are written to.
    Returns: { "reads": ["schema.table", ...], "writes": ["schema.table", ...] }
    """
    sg_dialect = _to_sg_dialect(dialect) if dialect else None
    reads: set[str] = set()
    writes: set[str] = set()

    try:
        for stmt in sqlglot.parse(sql, read=sg_dialect, error_level=sqlglot.ErrorLevel.WARN):
            if stmt is None:
                continue
            # Tables being read (FROM, JOIN)
            for table in stmt.find_all(exp.Table):
                parts = []
                if table.catalog:
                    parts.append(table.catalog)
                if table.db:
                    parts.append(table.db)
                if table.name:
                    parts.append(table.name)
                if parts:
                    reads.add(".".join(parts))

            # Tables being written to (INSERT INTO, CREATE TABLE AS, MERGE INTO)
            if isinstance(stmt, (exp.Insert, exp.Create, exp.Merge)):
                target = stmt.find(exp.Table)
                if target:
                    parts = []
                    if target.catalog:
                        parts.append(target.catalog)
                    if target.db:
                        parts.append(target.db)
                    if target.name:
                        parts.append(target.name)
                    if parts:
                        name = ".".join(parts)
                        writes.add(name)
                        reads.discard(name)
    except Exception as e:
        logger.warning("sqlglot parse error: %s", e)

    return {"reads": sorted(reads), "writes": sorted(writes)}


def extract_column_lineage_from_sql(
    sql: str,
    schema: dict[str, dict[str, str]] | None = None,
    dialect: str | None = None,
) -> list[dict[str, Any]]:
    """
    Extract column-level lineage from a SELECT statement.
    Returns list of: { "output_column": str, "source_table": str, "source_column": str }
    """
    sg_dialect = _to_sg_dialect(dialect) if dialect else None
    results: list[dict[str, Any]] = []

    try:
        parsed = sqlglot.parse(sql, read=sg_dialect, error_level=sqlglot.ErrorLevel.WARN)
        if not parsed or parsed[0] is None:
            return results

        stmt = parsed[0]
        if not isinstance(stmt, exp.Select):
            return results

        for projection in stmt.expressions:
            alias = projection.alias_or_name
            if not alias:
                continue
            try:
                node = sg_lineage(
                    column=alias,
                    sql=sql,
                    schema=schema or {},
                    dialect=sg_dialect,
                )
                for downstream in node.walk():
                    if downstream.expression and isinstance(downstream.expression, exp.Column):
                        col = downstream.expression
                        table_name = col.table or ""
                        col_name = col.name or ""
                        if table_name and col_name:
                            results.append({
                                "output_column": alias,
                                "source_table": table_name,
                                "source_column": col_name,
                            })
            except Exception:
                pass
    except Exception as e:
        logger.warning("column lineage error: %s", e)

    return results


def analyze_sql_file(
    file_content: str,
    file_path: str,
    dialect: str | None = None,
) -> list[dict[str, Any]]:
    """
    Analyze a SQL file (may contain multiple statements) and extract all lineage edges.
    Returns list of edges: { from_node, to_node, edge_type, source_file, source_line }
    """
    edges: list[dict[str, Any]] = []
    sg_dialect = _to_sg_dialect(dialect) if dialect else None

    try:
        stmts = sqlglot.parse(file_content, read=sg_dialect, error_level=sqlglot.ErrorLevel.WARN)
    except Exception as e:
        logger.warning("Failed to parse %s: %s", file_path, e)
        return edges

    for i, stmt in enumerate(stmts):
        if stmt is None:
            continue
        try:
            info = extract_table_lineage_from_sql(stmt.sql(dialect=sg_dialect), dialect)
            for write_table in info["writes"]:
                for read_table in info["reads"]:
                    edges.append({
                        "from_node": read_table,
                        "to_node": write_table,
                        "edge_type": "TABLE_TRANSFORM",
                        "source_file": file_path,
                        "statement_index": i,
                    })
            if not info["writes"] and info["reads"]:
                for read_table in info["reads"]:
                    edges.append({
                        "from_node": read_table,
                        "to_node": f"QUERY:{file_path}:{i}",
                        "edge_type": "TABLE_READ",
                        "source_file": file_path,
                        "statement_index": i,
                    })
        except Exception:
            continue

    return edges


def classify_environment(file_path: str) -> str:
    """Classify a file path as PRODUCTION, STAGING, DEV, or UNKNOWN."""
    fp = file_path.lower()
    if any(k in fp for k in ("/prod/", "/production/", "/main/", "/master/", "/release/")):
        return "PRODUCTION"
    if any(k in fp for k in ("/staging/", "/stg/", "/stage/")):
        return "STAGING"
    if any(k in fp for k in ("/dev/", "/develop/", "/feature/", "/test/", "/sandbox/")):
        return "DEV"
    return "UNKNOWN"
