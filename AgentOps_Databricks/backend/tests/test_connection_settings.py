"""Connection test must accept form-supplied Databricks credentials."""

from app.config import Settings


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
