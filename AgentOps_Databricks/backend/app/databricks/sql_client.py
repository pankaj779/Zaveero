"""Databricks SQL Warehouse sessions via PAT (dev) or OAuth token (Apps)."""

from __future__ import annotations

from contextlib import contextmanager
from collections.abc import Iterator

from app.config import get_settings

try:
    from databricks import sql as dbsql
except ImportError as e:  # pragma: no cover
    dbsql = None  # type: ignore[assignment]
    _import_error = e
else:
    _import_error = None


@contextmanager
def sql_connection() -> Iterator:
    if dbsql is None:
        raise RuntimeError(
            "databricks-sql-connector is not installed. pip install databricks-sql-connector"
        ) from _import_error
    s = get_settings()
    with sql_connection_with_settings(s) as conn:
        yield conn


@contextmanager
def sql_connection_with_settings(s) -> Iterator:
    if dbsql is None:
        raise RuntimeError(
            "databricks-sql-connector is not installed. pip install databricks-sql-connector"
        ) from _import_error
    host = (getattr(s, "databricks_host", None) or "").strip()
    http_path = (getattr(s, "databricks_http_path", None) or "").strip()
    token = (getattr(s, "databricks_token", None) or "").strip()
    if not host or not http_path:
        raise ValueError(
            "Databricks host and SQL warehouse HTTP path are required. "
            "Enter them on the Connect screen (server .env defaults are optional)."
        )
    if not token:
        raise ValueError("SQL personal access token is required")
    conn = dbsql.connect(
        server_hostname=host,
        http_path=http_path,
        access_token=token,
    )
    try:
        yield conn
    finally:
        conn.close()


def warehouse_id_from_http_path(http_path: str) -> str | None:
    if not http_path:
        return None
    parts = http_path.rstrip("/").split("/")
    return parts[-1] if parts else None
