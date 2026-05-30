import {
  Activity,
  BarChart3,
  Boxes,
  MessageSquare,
  Shield,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export const PRODUCT_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  "message-square": MessageSquare,
  workflow: Workflow,
};

export type PlatformProduct = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  longDescription: string;
  icon: keyof typeof PRODUCT_ICONS;
  color: string;
  features: string[];
  useCases: string[];
  status: "available" | "coming_soon";
};

export const PLATFORM_PRODUCTS: PlatformProduct[] = [
  {
    slug: "agentops",
    name: "AgentOps",
    category: "Observability",
    tagline: "Monitor production AI agents with confidence",
    description:
      "Databricks-native observability for AI agents — health, cost, quality, and governance in one pane of glass.",
    longDescription:
      "AgentOps gives engineering and platform teams full visibility into production AI agents running on Databricks. Track latency, errors, throughput, token usage, and spend. Drill into MLflow traces, Unity Catalog lineage, and governance dashboards — without switching tools.",
    icon: "activity",
    color: "from-cyan-500 to-blue-600",
    features: [
      "Agent health & SLO monitoring",
      "Token usage & cost attribution",
      "MLflow trace analysis",
      "Unity Catalog governance",
      "Multi-model compare & replay",
      "Audit-ready dashboards",
    ],
    useCases: ["MLOps teams", "AI platform engineers", "Databricks enterprises"],
    status: "available",
  },
  {
    slug: "datawhisper",
    name: "DataWhisper",
    category: "Analytics",
    tagline: "Ask questions. Get answers from your data.",
    description:
      "Natural language analytics across PostgreSQL, Snowflake, BigQuery, Databricks, and more — with validated, read-only SQL.",
    longDescription:
      "DataWhisper democratizes data access. Business users ask questions in plain English; the platform generates validated SQL, runs read-only queries, and returns charts and insights — with lineage-aware joins, confidence scores, and full audit trails.",
    icon: "message-square",
    color: "from-violet-500 to-purple-600",
    features: [
      "Natural language to SQL",
      "7+ database connectors",
      "Lineage & schema intelligence",
      "Read-only execution guardrails",
      "Dashboards & scheduled reports",
      "Code crawler for lineage",
    ],
    useCases: ["Analytics teams", "Business operators", "Data democratization"],
    status: "available",
  },
  {
    slug: "pipeline-studio",
    name: "Pipeline Studio",
    category: "Operations",
    tagline: "Visual workflows for modern teams",
    description: "Design, deploy, and monitor business workflows — coming soon to the Zaavero marketplace.",
    longDescription:
      "Pipeline Studio will bring visual workflow design to the Zaavero platform — connecting data, automation, and human tasks under the same SSO and governance model.",
    icon: "workflow",
    color: "from-amber-500 to-orange-600",
    features: ["Visual canvas", "Trigger-based automation", "Audit logs", "Team collaboration"],
    useCases: ["Operations", "RevOps", "Process automation"],
    status: "coming_soon",
  },
];

export const PLATFORM_CATEGORIES = [
  { icon: Boxes, title: "Any domain", body: "Analytics, operations, finance, HR, support — orbit the modules that match each business challenge." },
  { icon: Shield, title: "One governance layer", body: "Identity, roles, audit logs, and billing radiate from a single command center — not scattered across vendors." },
  { icon: BarChart3, title: "Composable by design", body: "Enable only what you need today. Expand your constellation through the marketplace as priorities shift." },
];

export function getProduct(slug: string): PlatformProduct | undefined {
  return PLATFORM_PRODUCTS.find((p) => p.slug === slug);
}
