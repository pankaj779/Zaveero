"""Connection test must accept form-supplied Databricks credentials."""

from app.config import Settings
from app.runtime_context import ConnectionRecord, connection_to_settings


def test_connection_maps_full_table_fqn_not_schema():
    conn = ConnectionRecord(
        id="c1",
        workspace_id="w1",
        name="prod",
        host="dbc.example.cloud.databricks.com",
        http_path="/sql/1.0/warehouses/x",
        workspace_id_dbx="123",
        sql_token="dapi-test",
        gateway_token="",
        inference_schema="agentops.agent_logs.agentops_test_payload",
        inference_time_column="event_time",
        inference_table_suffix="_payload",
        benchmark_enabled=True,
        exclude_test_requests=True,
    )
    s = connection_to_settings(conn, Settings())
    assert s.inference_table_fqn == "agentops.agent_logs.agentops_test_payload"
    assert s.inference_schema_fqn == ""
    assert s.inference_tables_fqn == ""


def test_connection_maps_schema_discovery():
    conn = ConnectionRecord(
        id="c1",
        workspace_id="w1",
        name="prod",
        host="dbc.example.cloud.databricks.com",
        http_path="/sql/1.0/warehouses/x",
        workspace_id_dbx="123",
        sql_token="dapi-test",
        gateway_token="",
        inference_schema="agentops.agent_logs",
        inference_time_column="event_time",
        inference_table_suffix="_payload",
        benchmark_enabled=True,
        exclude_test_requests=True,
    )
    s = connection_to_settings(conn, Settings())
    assert s.inference_schema_fqn == "agentops.agent_logs"
    assert s.inference_table_fqn == ""


def test_settings_model_validate_accepts_form_fields():
    s = Settings.model_validate(
        {
            "databricks_host": "dbc-4d180757-761e.cloud.databricks.com",
            "databricks_http_path": "/sql/1.0/warehouses/c6f5e8338863dfb1",
            "databricks_token": "dapi-test-token",
        }
    )
    assert s.databricks_host == "dbc-4d180757-761e.cloud.databricks.com"
    assert s.databricks_http_path.startswith("/sql/")
    assert s.databricks_token == "dapi-test-token"
