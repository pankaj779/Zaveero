"""Product module registration and catalog management."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import Settings, get_settings


@dataclass(frozen=True)
class ProductModuleDefinition:
    slug: str
    name: str
    tagline: str
    description: str
    long_description: str
    icon: str
    category: str
    status: str
    launch_url_key: str  # settings attribute name
    documentation_url: str
    is_core: bool
    min_plan_tier: str
    addon_price_cents: int
    sort_order: int
    module_config: dict[str, Any]
    feature_flags: list[str]


# ─── Module registry ─────────────────────────────────────────────────────────
# Add new products here. Seed script syncs these to the database.

PRODUCT_REGISTRY: list[ProductModuleDefinition] = [
    ProductModuleDefinition(
        slug="agentops",
        name="AgentOps",
        tagline="Observability for production AI agents",
        description="Monitor agent health, cost, quality, and governance on Databricks.",
        long_description=(
            "AgentOps is a Databricks-native observability platform for production AI agents. "
            "Track latency, errors, throughput, token usage, and cost. Drill into MLflow traces, "
            "Unity Catalog lineage, and governance dashboards — all from one pane of glass."
        ),
        icon="activity",
        category="observability",
        status="ACTIVE",
        launch_url_key="agentops_launch_url",
        documentation_url="/documentation/agentops",
        is_core=False,
        min_plan_tier="starter",
        addon_price_cents=4900,
        sort_order=1,
        module_config={
            "routes": ["/health", "/cost", "/quality", "/governance", "/trace"],
            "required_roles": {"view": "VIEWER", "manage": "ADMIN"},
            "integrations": ["databricks", "mlflow", "unity-catalog"],
        },
        feature_flags=["agentops.replay", "agentops.benchmark", "agentops.pii_scan"],
    ),
    ProductModuleDefinition(
        slug="datawhisper",
        name="DataWhisper",
        tagline="Natural language analytics for your data warehouse",
        description="Ask questions in plain English. Get validated, read-only SQL with lineage-aware AI.",
        long_description=(
            "DataWhisper turns natural language into validated, read-only SQL against PostgreSQL, "
            "MySQL, Snowflake, BigQuery, Databricks, and more. Metadata scanning, lineage discovery, "
            "confidence scores, dashboards, and a code crawler — all in shared workspaces."
        ),
        icon="message-square",
        category="analytics",
        status="ACTIVE",
        launch_url_key="datawhisper_launch_url",
        documentation_url="/documentation/datawhisper",
        is_core=False,
        min_plan_tier="starter",
        addon_price_cents=5900,
        sort_order=2,
        module_config={
            "routes": ["/chat", "/connections", "/lineage", "/crawler", "/reports"],
            "required_roles": {"view": "VIEWER", "query": "ANALYST", "manage": "ADMIN"},
            "integrations": ["postgres", "mysql", "snowflake", "bigquery", "databricks"],
        },
        feature_flags=["datawhisper.crawler", "datawhisper.scheduled_reports", "datawhisper.dashboards"],
    ),
    ProductModuleDefinition(
        slug="pipeline-studio",
        name="Pipeline Studio",
        tagline="Visual data pipeline builder",
        description="Design, deploy, and monitor data pipelines with a visual canvas.",
        long_description="Coming soon — a visual pipeline builder for modern data teams.",
        icon="workflow",
        category="data-engineering",
        status="COMING_SOON",
        launch_url_key="",
        documentation_url="/documentation/pipeline-studio",
        is_core=False,
        min_plan_tier="pro",
        addon_price_cents=7900,
        sort_order=3,
        module_config={"routes": [], "required_roles": {}},
        feature_flags=[],
    ),
]


def resolve_launch_url(defn: ProductModuleDefinition, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    if not defn.launch_url_key:
        return ""
    return getattr(settings, defn.launch_url_key, "")


def get_module_by_slug(slug: str) -> ProductModuleDefinition | None:
    for mod in PRODUCT_REGISTRY:
        if mod.slug == slug:
            return mod
    return None


def all_module_slugs() -> list[str]:
    return [m.slug for m in PRODUCT_REGISTRY]
