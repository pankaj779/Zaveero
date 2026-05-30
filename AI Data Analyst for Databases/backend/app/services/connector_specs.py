"""
Connector spec registry.

Each `kind` is a type of resource the crawler can discover (a git repo, a database,
an object store, an API endpoint, ...). The UI uses these specs to render the
credential prompt dynamically — without hard-coded forms per type. Adding a new
resource type means: append a spec here + add a discovery rule + (optionally) a
sub-crawler.

Field type values understood by the frontend:
    text, password, email, number, url, select, multiline

Field shape:
    {
        "name": "...",         # form key
        "label": "...",        # human label
        "type": "text|...",    # input kind
        "secret": bool,        # treat as password
        "required": bool,
        "placeholder": str,
        "help": str,
        "default": Any,
        "options": [...],      # for type=select
        "prefill_from": str,   # discovery.detail key to prefill (e.g. "host")
    }
"""

from __future__ import annotations

from typing import Any

# Categories help the UI group kinds: code, database, storage, pipeline, api, messaging.

CONNECTOR_SPECS: list[dict[str, Any]] = [
    # ---- Code / Git ----
    {
        "kind": "GIT_REPO",
        "category": "code",
        "label": "Git repository",
        "description": "Clone a code repository (GitHub, GitLab, Bitbucket, self-hosted) and crawl it for lineage.",
        "creates": "crawl_source",
        "target_source_type": "GITHUB",
        "icon": "git-branch",
        "fields": [
            {"name": "url", "label": "Repository URL", "type": "url", "required": True,
             "placeholder": "https://github.com/org/repo", "prefill_from": "uri"},
            {"name": "token", "label": "Personal access token", "type": "text", "secret": True,
             "required": False, "placeholder": "ghp_… / glpat_… / bbp_…",
             "help": "Needed for private repos. Public repos can leave blank."},
            {"name": "branch", "label": "Branch (optional)", "type": "text", "required": False, "placeholder": "main"},
        ],
    },
    # ---- Databases (create DbConnection) ----
    {
        "kind": "POSTGRES",
        "category": "database",
        "label": "PostgreSQL",
        "description": "Connect to a Postgres database — scan tables, FK lineage, and run queries.",
        "creates": "db_connection",
        "target_db_type": "POSTGRES",
        "icon": "database",
        "fields": [
            {"name": "host", "label": "Host", "type": "text", "required": True, "prefill_from": "host"},
            {"name": "port", "label": "Port", "type": "number", "required": True, "default": 5432, "prefill_from": "port"},
            {"name": "database", "label": "Database", "type": "text", "required": True, "prefill_from": "database"},
            {"name": "user", "label": "Username", "type": "text", "required": True, "prefill_from": "user"},
            {"name": "password", "label": "Password", "type": "password", "secret": True, "required": True},
            {"name": "sslmode", "label": "SSL mode", "type": "select", "default": "disable",
             "options": ["disable", "require", "verify-ca", "verify-full"]},
        ],
    },
    {
        "kind": "MYSQL",
        "category": "database",
        "label": "MySQL / MariaDB",
        "description": "Connect to a MySQL/MariaDB database for metadata + queries.",
        "creates": "db_connection",
        "target_db_type": "MYSQL",
        "icon": "database",
        "fields": [
            {"name": "host", "label": "Host", "type": "text", "required": True, "prefill_from": "host"},
            {"name": "port", "label": "Port", "type": "number", "required": True, "default": 3306, "prefill_from": "port"},
            {"name": "database", "label": "Database", "type": "text", "required": True, "prefill_from": "database"},
            {"name": "user", "label": "Username", "type": "text", "required": True, "prefill_from": "user"},
            {"name": "password", "label": "Password", "type": "password", "secret": True, "required": True},
        ],
    },
    {
        "kind": "SQLSERVER",
        "category": "database",
        "label": "SQL Server",
        "description": "Microsoft SQL Server connection.",
        "creates": "db_connection",
        "target_db_type": "SQLSERVER",
        "icon": "database",
        "fields": [
            {"name": "host", "label": "Host", "type": "text", "required": True, "prefill_from": "host"},
            {"name": "port", "label": "Port", "type": "number", "required": True, "default": 1433, "prefill_from": "port"},
            {"name": "database", "label": "Database", "type": "text", "required": True, "prefill_from": "database"},
            {"name": "user", "label": "Username", "type": "text", "required": True},
            {"name": "password", "label": "Password", "type": "password", "secret": True, "required": True},
        ],
    },
    {
        "kind": "REDSHIFT",
        "category": "database",
        "label": "Amazon Redshift",
        "description": "Redshift cluster connection.",
        "creates": "db_connection",
        "target_db_type": "REDSHIFT",
        "icon": "database",
        "fields": [
            {"name": "host", "label": "Host", "type": "text", "required": True, "prefill_from": "host"},
            {"name": "port", "label": "Port", "type": "number", "required": True, "default": 5439, "prefill_from": "port"},
            {"name": "database", "label": "Database", "type": "text", "required": True, "prefill_from": "database"},
            {"name": "user", "label": "Username", "type": "text", "required": True},
            {"name": "password", "label": "Password", "type": "password", "secret": True, "required": True},
        ],
    },
    {
        "kind": "SNOWFLAKE",
        "category": "database",
        "label": "Snowflake",
        "description": "Snowflake warehouse connection (account, warehouse, role).",
        "creates": "db_connection",
        "target_db_type": "SNOWFLAKE",
        "icon": "snowflake",
        "fields": [
            {"name": "account", "label": "Account", "type": "text", "required": True,
             "placeholder": "xy12345.us-east-1", "prefill_from": "account"},
            {"name": "user", "label": "Username", "type": "text", "required": True},
            {"name": "password", "label": "Password", "type": "password", "secret": True, "required": True},
            {"name": "warehouse", "label": "Warehouse", "type": "text", "required": False, "prefill_from": "warehouse"},
            {"name": "database", "label": "Database", "type": "text", "required": False, "prefill_from": "database"},
            {"name": "schema", "label": "Schema", "type": "text", "required": False, "default": "PUBLIC"},
            {"name": "role", "label": "Role", "type": "text", "required": False},
        ],
    },
    {
        "kind": "BIGQUERY",
        "category": "database",
        "label": "BigQuery",
        "description": "Google BigQuery — paste a service account JSON to authenticate.",
        "creates": "db_connection",
        "target_db_type": "BIGQUERY",
        "icon": "database",
        "fields": [
            {"name": "project_id", "label": "GCP project id", "type": "text", "required": True, "prefill_from": "project_id"},
            {"name": "dataset", "label": "Default dataset", "type": "text", "required": False, "prefill_from": "dataset"},
            {"name": "service_account_json", "label": "Service account JSON", "type": "multiline",
             "secret": True, "required": True,
             "placeholder": '{"type":"service_account",...}',
             "help": "Paste the full JSON. Stored encrypted."},
        ],
    },
    {
        "kind": "DATABRICKS",
        "category": "database",
        "label": "Databricks SQL",
        "description": "Databricks workspace + SQL warehouse.",
        "creates": "db_connection",
        "target_db_type": "DATABRICKS",
        "icon": "database",
        "fields": [
            {"name": "host", "label": "Workspace host", "type": "text", "required": True,
             "placeholder": "adb-xxx.azuredatabricks.net", "prefill_from": "host"},
            {"name": "http_path", "label": "HTTP path", "type": "text", "required": True,
             "placeholder": "/sql/1.0/warehouses/xxxx"},
            {"name": "token", "label": "Personal access token", "type": "password", "secret": True, "required": True},
            {"name": "catalog", "label": "Catalog", "type": "text", "required": False},
            {"name": "schema", "label": "Schema", "type": "text", "required": False, "default": "default"},
        ],
    },
    {
        "kind": "MONGODB",
        "category": "database",
        "label": "MongoDB",
        "description": "MongoDB cluster — connect and we will list databases + collections.",
        "creates": "crawl_source",
        "target_source_type": "MONGODB",
        "icon": "database",
        "fields": [
            {"name": "uri", "label": "Mongo connection URI", "type": "text", "secret": True, "required": True,
             "placeholder": "mongodb+srv://user:pass@host/db", "prefill_from": "uri"},
        ],
    },
    # ---- Storage ----
    {
        "kind": "S3",
        "category": "storage",
        "label": "Amazon S3 bucket",
        "description": "Connect to an S3 bucket and list objects (max 500 per bucket, top prefixes used for roll-ups).",
        "creates": "crawl_source",
        "target_source_type": "S3",
        "icon": "cloud",
        "fields": [
            {"name": "bucket", "label": "Bucket name (leave blank to list all buckets)", "type": "text", "required": False, "prefill_from": "bucket"},
            {"name": "region", "label": "Region", "type": "text", "required": False, "default": "us-east-1"},
            {"name": "access_key_id", "label": "Access key id", "type": "text", "required": False},
            {"name": "secret_access_key", "label": "Secret access key", "type": "password", "secret": True, "required": False},
        ],
    },
    {
        "kind": "GCS",
        "category": "storage",
        "label": "Google Cloud Storage bucket",
        "description": "GCS bucket reference; uses a service account JSON.",
        "creates": "discovery_only",
        "icon": "cloud",
        "fields": [
            {"name": "bucket", "label": "Bucket name", "type": "text", "required": True, "prefill_from": "bucket"},
            {"name": "service_account_json", "label": "Service account JSON", "type": "multiline", "secret": True, "required": False},
        ],
    },
    {
        "kind": "AZURE_BLOB",
        "category": "storage",
        "label": "Azure Blob container",
        "creates": "discovery_only",
        "icon": "cloud",
        "fields": [
            {"name": "account", "label": "Storage account", "type": "text", "required": True, "prefill_from": "account"},
            {"name": "container", "label": "Container", "type": "text", "required": True, "prefill_from": "container"},
            {"name": "sas_token", "label": "SAS token", "type": "password", "secret": True, "required": False},
        ],
    },
    # ---- API ----
    {
        "kind": "REST_API",
        "category": "api",
        "label": "HTTP API",
        "description": "External REST endpoint — we probe for OpenAPI/Swagger and expand each route as a node. "
                       "Use the app root URL (e.g. https://your-app.databricksapps.com). "
                       "If the spec is not public, set Auth to **bearer** and paste a Databricks PAT (or app token). "
                       "We try /openapi.json, /docs/openapi.json, /api/v1/openapi.json, and similar paths.",
        "creates": "crawl_source",
        "target_source_type": "REST_API",
        "icon": "globe",
        "fields": [
            {"name": "base_url", "label": "Base URL", "type": "url", "required": True, "prefill_from": "uri"},
            {"name": "auth_kind", "label": "Auth", "type": "select",
             "options": ["none", "bearer", "api_key", "basic"], "default": "none"},
            {"name": "token", "label": "Token / key / password", "type": "password", "secret": True, "required": False},
            {"name": "username", "label": "Username (basic auth only)", "type": "text", "required": False},
        ],
    },
    # ---- Pipeline / Orchestration ----
    {
        "kind": "AIRFLOW",
        "category": "pipeline",
        "label": "Airflow connection",
        "description": "Airflow conn_id found in DAG code — connect by providing the underlying credentials.",
        "creates": "discovery_only",
        "icon": "workflow",
        "fields": [
            {"name": "conn_id", "label": "Airflow conn_id", "type": "text", "required": True, "prefill_from": "conn_id"},
            {"name": "underlying_kind", "label": "Underlying system",
             "type": "select", "options": ["postgres", "mysql", "snowflake", "s3", "http", "other"], "default": "other"},
            {"name": "host", "label": "Host (if applicable)", "type": "text", "required": False},
            {"name": "user", "label": "User", "type": "text", "required": False},
            {"name": "password", "label": "Password / token", "type": "password", "secret": True, "required": False},
        ],
    },
    {
        "kind": "DBT_PROFILE",
        "category": "pipeline",
        "label": "dbt profile",
        "description": "dbt profile target found in profiles.yml — fill the underlying warehouse creds.",
        "creates": "discovery_only",
        "icon": "workflow",
        "fields": [
            {"name": "profile_name", "label": "Profile name", "type": "text", "required": True, "prefill_from": "profile_name"},
            {"name": "type", "label": "Warehouse type", "type": "select",
             "options": ["postgres", "snowflake", "bigquery", "redshift", "databricks", "duckdb"], "default": "postgres"},
            {"name": "host", "label": "Host", "type": "text", "required": False, "prefill_from": "host"},
            {"name": "database", "label": "Database", "type": "text", "required": False, "prefill_from": "database"},
            {"name": "user", "label": "User", "type": "text", "required": False, "prefill_from": "user"},
            {"name": "password", "label": "Password", "type": "password", "secret": True, "required": False},
        ],
    },
    # ---- Messaging ----
    {
        "kind": "KAFKA",
        "category": "messaging",
        "label": "Kafka cluster",
        "description": "Connect via AdminClient and list topics.",
        "creates": "crawl_source",
        "target_source_type": "KAFKA",
        "icon": "radio",
        "fields": [
            {"name": "bootstrap_servers", "label": "Bootstrap servers", "type": "text", "required": True,
             "placeholder": "broker-1:9092,broker-2:9092", "prefill_from": "bootstrap_servers"},
            {"name": "security_protocol", "label": "Security protocol", "type": "select",
             "options": ["PLAINTEXT", "SASL_PLAINTEXT", "SASL_SSL", "SSL"], "default": "PLAINTEXT"},
            {"name": "username", "label": "SASL username", "type": "text", "required": False},
            {"name": "password", "label": "SASL password", "type": "password", "secret": True, "required": False},
        ],
    },
    # ---- Generic fallback ----
    {
        "kind": "UNKNOWN_URI",
        "category": "other",
        "label": "Unknown external resource",
        "description": "Resource referenced by the code we couldn't classify. Provide its credentials manually.",
        "creates": "discovery_only",
        "icon": "help-circle",
        "fields": [
            {"name": "uri", "label": "URI / endpoint", "type": "text", "required": True, "prefill_from": "uri"},
            {"name": "username", "label": "Username (optional)", "type": "text", "required": False},
            {"name": "password", "label": "Password / token (optional)", "type": "password", "secret": True, "required": False},
            {"name": "notes", "label": "Notes", "type": "multiline", "required": False},
        ],
    },
]


def get_spec(kind: str) -> dict[str, Any] | None:
    for spec in CONNECTOR_SPECS:
        if spec["kind"] == kind:
            return spec
    return None


def all_specs() -> list[dict[str, Any]]:
    return list(CONNECTOR_SPECS)
