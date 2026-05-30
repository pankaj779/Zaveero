# DataWhisper — Implementation Guide

## Architecture Overview

DataWhisper is a multi-tenant AI-powered data analyst platform that:
1. Connects to 7+ database types (Postgres, MySQL, Snowflake, BigQuery, Databricks, SQL Server, Redshift)
2. Scans metadata to build lineage (FK-based + AI-inferred)
3. Crawls code repositories to build end-to-end data lineage
4. Uses AI (OpenAI/Gemini) to convert natural language → SQL
5. Validates, executes, and visualizes results

## Component Status

### Core Features (COMPLETED)
- [x] Multi-database connectors (7 types)
- [x] Metadata scanner + FK-based lineage
- [x] Heuristic join inference (name-based)
- [x] AI SQL generation with auto-retry + validation
- [x] Chart engine (7 types + auto-detect + live switching)
- [x] Conversation memory
- [x] Query caching (5-min TTL)
- [x] Rate limiting (per workspace)
- [x] Row Level Security (PostgreSQL RLS)
- [x] JWT auth + encrypted connections
- [x] Reports + Dashboards
- [x] Audit logging

### Crawler System

- [x] Prisma models: `CrawlSource` (with self-relation for sub-crawls), `CrawlSession`, `CodeLineageNode` (now also stores `MODULE / CLASS / FUNCTION / METHOD / EXTERNAL` symbol nodes), `CodeSymbolEdge` (cross-symbol relationships: `CALLS / IMPORTS / EXTENDS / IMPLEMENTS / INSTANTIATES`), `DiscoveredResource` (all RLS-protected)
- [x] sqlglot-based SQL lineage (column-level + table-level, 31 dialects)
- [x] Git-based repo crawler (clone, parse SQL/Python/dbt/config files; GitHub/GitLab/Bitbucket/CUSTOM URL)
- [x] **Connector spec registry** (`backend/app/services/connector_specs.py`) — declarative credential schemas for GIT_REPO, POSTGRES, MYSQL, SQLSERVER, REDSHIFT, SNOWFLAKE, BIGQUERY, DATABRICKS, MONGODB, S3, GCS, AZURE_BLOB, REST_API, AIRFLOW, DBT_PROFILE, KAFKA, UNKNOWN_URI. The UI uses these to render dynamic "Connect" forms — no per-type hard-coded UI.
- [x] **Universal discovery engine** (`backend/app/services/discovery.py`) — language-agnostic resource scanner. Reads `.py, .js/ts, .java/kt/scala, .go, .rs, .rb, .php, .cs, .sql, .yml/yaml/json/toml/ini/env, .sh/ps1, .tf/hcl, Dockerfile, package.json, requirements.txt, go.mod, .gitmodules`, etc., and detects DB connection strings, S3/GCS/Azure URIs, REST endpoints, embedded git URLs (incl. `git+https`, ssh `git@`), submodules, Airflow conn_ids, dbt profiles.
  - **Noise filtering:** lockfiles (`package-lock.json`, `yarn.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`, …) and vendor/build dirs (`node_modules`, `.venv`, `dist`, `.next`, `target`, …) are skipped entirely. Package-registry hosts (`registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, `crates.io`, `ghcr.io`, `repo1.maven.org`, …), CDNs (`cdn.jsdelivr.net`, `unpkg.com`), badges, GitHub sponsor/marketplace/orgs pages, and well-known docs sites are filtered out. Only URLs that look like *runtime* data sources surface as discoveries.
  - **Re-crawl hygiene:** each crawl deletes all `PENDING_AUTH` discoveries for the source before persisting, so old noise is replaced — `CONNECTED` and `SKIPPED` rows are preserved.
- [x] **Pipeline tracking** — every crawl session carries a `pipeline_steps` array in `progressJson`: PREPARE → CLONE → SCAN → DISCOVER → PERSIST → DONE. Each step has status/started/completed/message. The UI renders this as a live timeline.
- [x] **Recursive sub-crawls** — `DiscoveredResource` rows persist what was found. When the user clicks **Connect** on a discovery, the API creates a new `CrawlSource` (for code) or `DbConnection` (for warehouses), links it back via `parentCrawlSourceId` / `originDiscoveryId`, and (for code) kicks off a sub-crawl automatically. Discoveries from the sub-crawl then surface for the user to connect again — the chain continues until everything is connected or skipped.
- [x] **Workspace transactions for background tasks** — `_run_crawl` wraps every Prisma write in `workspace_transaction(workspace_id)` so RLS policies (which look at `app.workspace_id`) match the crawl source's tenant even though there is no HTTP request to set that GUC.
- [x] Crawler UI: live pipeline timeline, dynamic credential dialog driven by connector spec, recursive source tree view, code lineage tree, polling.
- [x] Discoveries panel: grouped by host + kind, with per-group expand/collapse, filter input, "Show skipped / connected" toggle, **Skip group** and **Skip all pending** bulk actions, and a deep-link to the Unified data graph.
- [x] Unified lineage merge (DB FK + inferred + code-derived)
- [x] Environment classification (PRODUCTION/STAGING/DEV)
- [x] Resume/retry on failed crawls (skip already-scanned files)

### Code-structure lineage (tree-sitter)

Beyond data-flow lineage (table → table), we extract a **symbol-level call graph**
for every cloned repo — the same kind of intel that powers GitHub's
"Go to definition" and Sourcegraph navigation.

- **Library:** `tree-sitter` + `tree-sitter-language-pack` (1.8.0). One pip install,
  ~305 precompiled grammars; no per-language SDK. Covers Python, JavaScript,
  TypeScript, TSX, Java, Go, Ruby, Rust, C, C++, C#, PHP, Kotlin, Scala, Swift,
  Lua, Bash, and many more out of the box.
- **Service:** `backend/app/services/code_graph.py`. For each source file:
  1. Detect language from extension.
  2. Run a tree-sitter query that captures class/function/method definitions,
     call expressions, `new` / instantiation, import statements, and inheritance.
  3. Walk the captured matches and build `SymbolNode` records (with stable
     `symbol_id = "<rel_path>::ClassName::method_name"`) and `SymbolEdge` records
     (`CALLS / IMPORTS / EXTENDS / INSTANTIATES`).
- **Resolver:** A second pass tries to resolve each call/import target to a real
  definition in the repo. Same-file definitions win; otherwise we follow the file's
  `from X import Y` table; otherwise we fall back to a global match by simple name.
  Anything unresolved becomes an `EXTERNAL` node so the graph stays complete.
- **Persistence:** Symbol nodes are stored in `CodeLineageNode` (with
  `nodeType ∈ {MODULE, CLASS, FUNCTION, METHOD, EXTERNAL, ...}`); edges go to
  `CodeSymbolEdge`. Each re-crawl wipes both before re-inserting, so the graph
  reflects the latest commit. Duplicate `(from, to, edge_type)` collapses to a
  single edge with a `count` in metadata for visual edge weight.
- **Pipeline step:** A new **SYMBOLS** step now runs between SCAN and DISCOVER
  for Git crawls. Step message reports files parsed, node/edge counts, and the
  top languages found.
- **API:** `GET /crawler/sources/{id}/symbol-graph?edge_types=&focus=&depth=&max_nodes=`
  returns `{nodes, edges, stats}` with optional BFS-from-focus and node cap.
- **UI:** New **Code symbol graph** tab on the crawler page (`frontend/components/code-symbol-graph.tsx`).
  React Flow + dagre layout, colour-coded by node type (Module / Class / Function /
  Method / External), edge-type toggles (CALLS / IMPORTS / EXTENDS / IMPLEMENTS /
  INSTANTIATES), filter input, and **click-to-focus** (BFS ±N hops around a
  chosen symbol). Edge thickness scales with call count; IMPORTS edges are dashed
  and animated for visual contrast.

This gives the application a full "what calls what" view — answering questions
like *"which function reads this table?"* or *"which class uses this API client?"*
directly, on top of the data-flow graph we already had.

### Native scanners (non-Git sources)

Each scanner lives in `backend/app/services/scanners/` and exposes
`async def scan(config) -> { nodes, edges, discoveries, files_scanned, errors }`.
The runner persists the results uniformly with code-crawl results.

| Source type | Scanner | What it does |
|-------------|---------|--------------|
| `S3` | `scanners/s3.py` (boto3) | Lists buckets (or one bucket), emits a node per data-shaped key (`.csv .parquet .json …`), rolls up large buckets via top-level prefix. |
| `MONGODB` | `scanners/mongodb.py` (pymongo) | Lists databases + collections, samples one document per collection for top-level field names. |
| `KAFKA` | `scanners/kafka.py` (kafka-python) | `KafkaAdminClient` lists all non-internal topics + partition counts. |
| `REST_API` | `scanners/rest_api.py` (httpx) | Probes many OpenAPI paths (`/openapi.json`, `/api/v1/openapi.json`, `/docs/openapi.json`, YAML specs, …), tolerant `Content-Type`, **Bearer / basic / API-key** auth. Databricks Apps: use app root URL + **bearer** + PAT. Clear errors if the spec is missing or gated. |

A `CrawlSource` of type `S3`/`MONGODB`/`KAFKA`/`REST_API` runs through the same
**PREPARE → CONNECT → SCAN → PERSIST → DONE** pipeline; the UI's pipeline timeline
adapts automatically.

### Background job queue

Crawl execution lives in `app/services/crawl_runner.py` so both modes can call it.

| Trigger | Mode |
|---------|------|
| `REDIS_URL` set | API enqueues to **arq + Redis** → `worker` container runs the crawl. Survives API restarts; horizontal scale via more workers. |
| `REDIS_URL` empty | API falls back to FastAPI `BackgroundTasks` (in-process). Useful for local dev without Redis. |

Compose adds two new services: `redis` and `worker`. The `worker` container reuses
the backend image but overrides the entrypoint to `python -m app.worker`. Concurrent
jobs are tunable via `ARQ_MAX_JOBS` (default 4).

### Visual unified lineage graph

`GET /crawler/lineage/unified` **excludes tree-sitter symbol nodes** (`MODULE`, `CLASS`,
`FUNCTION`, `METHOD`, …) so the merged graph stays **data-flow only** (tables, APIs,
buckets, SQL-derived steps). Symbol/call graphs are never mixed in.

`frontend/components/unified-lineage-graph.tsx` renders that payload with **React Flow**
+ **dagre**. The `/lineage` page has **three** tabs: **Unified data graph** (default),
**Code structure** (per crawl source — `CodeSymbolGraph`, packed multi-component dagre
layout + custom nodes), and **Connection FK graph** (per DB connection). Deep-link:
`/lineage?tab=code&source=<crawl_source_uuid>`.

### Crawler API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/crawler/connector-specs` | List connector kinds + credential schemas (used by UI to render dynamic forms). |
| POST | `/crawler/sources` | Create a starting crawl source. |
| GET | `/crawler/sources` | List sources in the workspace (flat — UI nests by `parent_crawl_source_id`). |
| GET | `/crawler/sources/{id}` | Single source. |
| DELETE | `/crawler/sources/{id}` | Delete (cascades to sessions, lineage, discoveries). |
| GET | `/crawler/sources/{id}/config` | Get the source's config with secret fields redacted (used by the Edit dialog). |
| PATCH | `/crawler/sources/{id}` | Partial update — rename and/or change credentials/branch/URL. Secrets left blank or set to `__KEEP_EXISTING__` are preserved. Refuses while `CRAWLING`. Auto-resets status from `ERROR`/`PENDING_AUTH` → `READY` if config changed. |
| POST | `/crawler/sources/{id}/crawl` | Start a crawl (202 background task). Only `GITHUB`/`GITLAB`/`BITBUCKET`/`CUSTOM`. |
| POST | `/crawler/sessions/{id}/retry` | Resume a FAILED/PAUSED session with new credentials. |
| GET | `/crawler/sources/{id}/sessions` | Sessions for a source (each carries `pipeline_steps`). |
| GET | `/crawler/sources/{id}/lineage` | Code lineage nodes for this source (includes symbol nodes — UI filters them out for the data-lineage view). |
| GET | `/crawler/sources/{id}/symbol-graph` | Tree-sitter symbol graph: `{nodes, edges, stats}`. Query params: `edge_types=CALLS,IMPORTS,...`, `focus=<node_id>`, `depth=2`, `max_nodes=600`. |
| GET | `/crawler/sources/{id}/discoveries` | Discoveries for this source. |
| GET | `/crawler/sources/{id}/tree` | BFS parent→children CrawlSource tree. |
| GET | `/crawler/discoveries?status=` | All discoveries in workspace (filterable). |
| POST | `/crawler/discoveries/{id}/connect` | Provide credentials. Creates `CrawlSource` (code) or `DbConnection` (warehouse), starts sub-crawl. |
| POST | `/crawler/discoveries/{id}/skip` | Mark discovery as skipped. |
| POST | `/crawler/sources/{id}/discoveries/skip-all?kind=&host=` | Bulk-mark `PENDING_AUTH` discoveries as skipped. Optional `kind` (e.g. `REST_API`) and `host` (substring match against URI / display name) filters. Auto-flips source status `PENDING_AUTH → DONE` if nothing is left pending. |
| GET | `/crawler/lineage/unified` | Code lineage + DB FK lineage combined. |

### Data Accuracy Improvements (NEW)
- [x] Enhanced AI prompt: table-specific queries, filter matching, CAST rules
- [x] sqlglot for SQL file lineage; sqlparse still used for SQL validation safety checks
- [x] Code lineage edges fed to AI for better context (includes `environment` when present)
- [x] **ai_data_scope** (optional per connection): whitelist table name prefixes, block substrings, filter code lineage by environment; metadata sent to `/ai/generate`, `/execute` validation, `/sql/explain`, and table preview all respect the filtered set. Driver calls use `driver_config()` so `ai_data_scope` is never sent to warehouse clients.

### Connection config: `ai_data_scope` (optional)

Stored encrypted alongside DB credentials. Example:

```json
"ai_data_scope": {
  "allowed_table_prefixes": ["analytics.", "prod."],
  "blocked_name_substrings": ["_stg_", ".staging."],
  "code_lineage_environments": ["PRODUCTION", "UNKNOWN"]
}
```

- If `allowed_table_prefixes` is non-empty, only tables whose full name starts with one prefix (case-insensitive) are visible to the AI and to execute validation.
- `blocked_name_substrings` excludes matching tables (case-insensitive substring).
- `code_lineage_environments` limits which crawled code nodes are merged into the join graph for NL→SQL.

Omit `ai_data_scope` entirely for legacy behavior (all scanned tables available).

### Crawler engine

- **Implemented:** Git clone + file walk for source types `GITHUB`, `GITLAB`, `BITBUCKET`, `CUSTOM` (HTTPS Git URL + token in encrypted config).
- **Not implemented:** `S3`, `AIRFLOW`, `DBT_CLOUD` as crawl engines — API returns **400** if you start a crawl for those types (sources can still be created for future work).
- **RLS:** Background crawl tasks run **outside** HTTP middleware; all DB writes in `_run_crawl` use `workspace_transaction(workspace_id)` so `crawl_sources`, `crawl_sessions`, and `code_lineage_nodes` policies see the correct tenant.

## Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| sqlglot | 30.6.0 | SQL parsing + column-level lineage (31 dialects) |
| tree-sitter | 0.24.0 | Universal parser used by `code_graph.py` for the symbol-level lineage |
| tree-sitter-language-pack | 1.8.0 | Pre-compiled grammars for 305+ languages — one install covers Python, JS/TS, Java, Go, Rust, Ruby, C/C++, C#, PHP, Kotlin, Scala, Swift, Lua, Bash, etc. |
| GitPython | 3.1.44 | Clone git repositories |
| PyGithub | 2.6.0 | GitHub API interaction |
| fastapi | 0.115.6 | Backend API framework |
| prisma | 0.15.0 | ORM for PostgreSQL |
| openai | 1.109.1 | OpenAI LLM integration |
| google-generativeai | 0.8.6 | Gemini LLM integration |
| reactflow + dagre | 11.x / 0.8.x | Front-end graph rendering for both Unified data graph and Code symbol graph |
| arq + redis | 0.26.1 / 5.2.1 | Optional background job queue (falls back to FastAPI BackgroundTasks if `REDIS_URL` is unset) |
| boto3 / pymongo / kafka-python | 1.35 / 4.10 / 2.0 | Native scanners for S3, MongoDB, Kafka |

## Data Flow

```
GitHub Repo → Crawler → Parse SQL/Python/Config files
                          ↓
                   sqlglot extracts table/column lineage
                          ↓
                   CodeLineageNode records in DB
                          ↓
DB Connection → Metadata Scan → FK edges + Inferred edges
                          ↓
              Unified Lineage Graph (FK + Inferred + Code)
                          ↓
              AI SQL Generation uses full lineage context
                          ↓
              User asks question → AI generates SQL → Execute → Visualize
```

## API Endpoints

### Crawler
- `POST /crawler/sources` — Add crawl source
- `GET /crawler/sources` — List sources
- `GET /crawler/sources/{id}` — Get source details
- `DELETE /crawler/sources/{id}` — Delete source
- `POST /crawler/sources/{id}/crawl` — Start crawl
- `POST /crawler/sessions/{id}/retry` — Retry with new credentials
- `GET /crawler/sources/{id}/sessions` — List sessions
- `GET /crawler/sources/{id}/lineage` — Code lineage nodes
- `GET /crawler/lineage/unified` — Unified lineage graph

### Core (see README for full list)

- `POST /ai/generate` — Uses filtered metadata + lineage when `ai_data_scope` is set on the connection.
- `POST /execute` — Validates SQL against the same filtered metadata as `/ai/generate`.
- `GET /execute/preview/...` — Preview rejected if table excluded by `ai_data_scope`.
- `POST /metadata/{id}/scan` — Uses `driver_config` (strips `ai_data_scope` before connecting).

## Run locally

From repo root: see `README.md` (Docker Compose under `infra/`) or local `uvicorn` + `npm run dev`. After code changes, rebuild backend image if you use Docker: `docker compose up --build`.
