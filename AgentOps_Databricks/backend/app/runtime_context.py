"""Per-request Databricks connection context (replaces single .env tenant)."""

from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass

from app.config import Settings
from app.databricks.fqn import parse_inference_location

_runtime_settings: ContextVar[Settings | None] = ContextVar("runtime_settings", default=None)
_current_connection_id: ContextVar[str | None] = ContextVar("current_connection_id", default=None)
_current_user_id: ContextVar[str | None] = ContextVar("current_user_id", default=None)


@dataclass
class ConnectionRecord:
    id: str
    workspace_id: str
    name: str
    host: str
    http_path: str
    workspace_id_dbx: str
    sql_token: str
    gateway_token: str
    inference_schema: str
    inference_time_column: str
    inference_table_suffix: str
    benchmark_enabled: bool
    exclude_test_requests: bool


def connection_to_settings(conn: ConnectionRecord, base: Settings | None = None) -> Settings:
    """Build Settings from a stored Databricks connection."""
    base = base or Settings()
    data = base.model_dump()
    table_fqn, schema_fqn = parse_inference_location(conn.inference_schema)
    inference_update: dict[str, str] = {
        "inference_time_column": conn.inference_time_column,
        "inference_table_name_suffix": conn.inference_table_suffix,
    }
    if (conn.inference_schema or "").strip():
        inference_update["inference_table_fqn"] = table_fqn or ""
        inference_update["inference_schema_fqn"] = schema_fqn or ""
        inference_update["inference_tables_fqn"] = ""
    data.update(
        {
            "databricks_host": conn.host,
            "databricks_http_path": conn.http_path,
            "databricks_token": conn.sql_token,
            "databricks_ai_gateway_token": conn.gateway_token or conn.sql_token,
            "workspace_id": conn.workspace_id_dbx,
            "benchmark_enabled": conn.benchmark_enabled,
            "exclude_test_requests_from_analytics": conn.exclude_test_requests,
            **inference_update,
        }
    )
    return Settings(**data)


def set_runtime_context(
    *,
    settings: Settings | None,
    connection_id: str | None = None,
    user_id: str | None = None,
) -> tuple[object, object, object]:
    t1 = _runtime_settings.set(settings)
    t2 = _current_connection_id.set(connection_id)
    t3 = _current_user_id.set(user_id)
    return t1, t2, t3


def reset_runtime_context(tokens: tuple[object, object, object]) -> None:
    _runtime_settings.reset(tokens[0])
    _current_connection_id.reset(tokens[1])
    _current_user_id.reset(tokens[2])


def get_runtime_settings() -> Settings | None:
    return _runtime_settings.get()


def get_current_connection_id() -> str | None:
    return _current_connection_id.get()


def get_current_user_id() -> str | None:
    return _current_user_id.get()
