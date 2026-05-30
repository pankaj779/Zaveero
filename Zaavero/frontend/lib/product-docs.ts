export type ProductDoc = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string; steps?: string[] }>;
};

export const PRODUCT_DOCS: Record<string, ProductDoc> = {
  agentops: {
    slug: "agentops",
    title: "AgentOps",
    summary:
      "Databricks-native observability for production AI agents — health, cost, quality, and governance from one console.",
    sections: [
      {
        heading: "Enable & launch from Zaavero",
        body: "AgentOps is a module in your Zaavero constellation. Enable it from the marketplace, then launch with one click — SSO handles authentication.",
        steps: [
          "Open Marketplace and click Enable for AgentOps.",
          "Go to Products → AgentOps and click Launch product.",
          "You are signed in via Zaavero SSO at the AgentOps app.",
        ],
      },
      {
        heading: "Connect Databricks",
        body: "In AgentOps, open Connect and add your Databricks workspace credentials. Each user can manage their own connections under a shared workspace.",
        steps: [
          "Navigate to Connect in the AgentOps sidebar.",
          "Enter workspace URL and personal access token (PAT).",
          "Test the connection, then save.",
        ],
      },
      {
        heading: "Monitor agents",
        body: "Register agents to watch from the Manage Agents screen, or configure replay targets for batch evaluation. Dashboards show latency, errors, token usage, and cost.",
      },
      {
        heading: "Local development",
        body: "AgentOps runs at http://localhost:5173 (frontend) and http://localhost:8081 (API) when developing locally. If port 8080 is occupied by an old process, use 8081 and set VITE_API_PORT=8081 in AgentOps frontend/.env. Ensure Zaavero backend has AGENTOPS_LAUNCH_URL=http://localhost:5173/sso/zaavero and AgentOps has ZAAVERO_API_URL=http://127.0.0.1:8000.",
      },
    ],
  },
  datawhisper: {
    slug: "datawhisper",
    title: "DataWhisper",
    summary:
      "Natural language analytics — ask questions in plain English and get validated, read-only SQL with lineage-aware intelligence.",
    sections: [
      {
        heading: "Enable & launch from Zaavero",
        body: "Enable DataWhisper from the marketplace, then launch through Zaavero SSO — no separate login required.",
        steps: [
          "Open Marketplace and click Enable for DataWhisper.",
          "Go to Products → DataWhisper and click Launch product.",
          "You land in DataWhisper already authenticated.",
        ],
      },
      {
        heading: "Add a database connection",
        body: "Admins and analysts can connect PostgreSQL, MySQL, Snowflake, BigQuery, Databricks, and more from the Connections page.",
        steps: [
          "Open Connections → Add connection.",
          "Choose your database type and enter credentials.",
          "Run a metadata scan to populate schema and lineage.",
        ],
      },
      {
        heading: "Ask questions",
        body: "Use Chat to ask business questions in natural language. DataWhisper generates read-only SQL, shows confidence scores, and returns charts or tables.",
      },
      {
        heading: "Local development",
        body: "DataWhisper runs at http://localhost:3001 (frontend) and http://localhost:8002 (API via Docker) locally. Zaavero uses port 8000 — DataWhisper API is mapped to 8002 to avoid conflict. Set DATAWHISPER_LAUNCH_URL=http://localhost:3001/sso/zaavero in Zaavero backend .env.",
      },
    ],
  },
  "pipeline-studio": {
    slug: "pipeline-studio",
    title: "Pipeline Studio",
    summary: "Visual workflow builder for data and business automation — coming soon to the Zaavero marketplace.",
    sections: [
      {
        heading: "Status",
        body: "Pipeline Studio is on the roadmap. You can see it in the marketplace with a Coming Soon badge. Enable notifications when it launches from your workspace settings.",
      },
    ],
  },
};

export function getProductDoc(slug: string): ProductDoc | undefined {
  return PRODUCT_DOCS[slug];
}

export const PLATFORM_DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting started",
    body: "Create a Zaavero workspace, enable modules from the marketplace, and launch them with SSO.",
    steps: [
      "Register at /login?mode=register with your email and workspace name.",
      "Browse Marketplace and enable AgentOps, DataWhisper, or other modules.",
      "Open a product page and click Launch — you are signed in automatically.",
    ],
  },
  {
    id: "sso",
    title: "SSO & product launch",
    body: "Zaavero issues a short-lived token when you launch a module. The product validates it against the platform API and creates a local session.",
    steps: [
      "Click Launch on an enabled product.",
      "Zaavero calls POST /products/{slug}/launch and redirects with ?zaavero_token=…",
      "The product calls POST /auth/sso/verify on the Zaavero API.",
      "The product establishes a session using the returned user and workspace context.",
    ],
  },
  {
    id: "billing",
    title: "Billing & plans",
    body: "Starter workspaces include a trial with access to two modules. Pro and Enterprise tiers unlock more products, users, and governance features. Manage billing from Settings.",
  },
  {
    id: "modules",
    title: "Module registration (developers)",
    body: "New products are registered in backend/app/services/product_registry.py and synced via scripts/seed_catalog.py. Each module declares launch URL, documentation path, plan tier, and feature flags.",
  },
] as const;
