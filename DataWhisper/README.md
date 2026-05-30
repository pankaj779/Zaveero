# DataWhisper

SaaS: natural language → validated SQL → read-only execution on your warehouses. **Workspaces** share connections and query history. **Prisma** is used **only in the Python backend** for the app database.

## Stack

- **Frontend:** Next.js 14 (App Router), Tailwind, ShadCN-style UI, React Query, NextAuth (credentials), Chart.js  
- **Backend:** FastAPI, **Prisma Client Python**, Pydantic  
- **App DB:** PostgreSQL  
- **External DBs:** PostgreSQL, MySQL, Snowflake, BigQuery, Databricks  

## Run with Docker

```bash
cd infra
export JWT_SECRET="$(openssl rand -hex 32)"
export NEXTAUTH_SECRET="$(openssl rand -hex 32)"
export OPENAI_API_KEY="sk-..."
docker compose up --build
```

- App: http://localhost:3001  
- API: http://localhost:8000/docs  

**Auth:** Register creates a **new workspace** (you are workspace admin). **Join workspace** registers a user into an existing workspace by **slug**. Login uses email/password.

**Secrets:** Set `OPENAI_API_KEY` for the backend. Optional `ENCRYPTION_KEY` (Fernet); otherwise derived from `JWT_SECRET`.

## Backend layout

- `backend/prisma/schema.prisma` — Prisma schema (workspaces, users, connections, metadata versions, lineage edges, query history).  
- `backend/app/routers/` — `auth`, `db_connections`, `metadata`, `lineage`, `ai_sql`, `execute`, `history`.  
- Query **results are not persisted** — only row counts, chart type, SQL, question, explanation.

## Local dev

1. PostgreSQL running; `DATABASE_URL=postgresql://...` (sync URL for Prisma CLI).  
2. Backend: `cd backend && pip install -r requirements.txt && prisma generate && prisma db push && uvicorn app.main:app --reload`  
3. Frontend: `cd frontend && npm install && npm run dev` — set `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## API highlights

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | New workspace + admin user |
| POST | `/auth/join` | Join workspace by slug |
| POST | `/auth/login` | JWT |
| GET/POST | `/connections` | Workspace-scoped connections (encrypted) |
| POST | `/connections/test` | Test DB (auth required) |
| GET | `/metadata/{id}` | Semantic metadata JSON (versioned snapshot) |
| POST | `/metadata/{id}/scan` | New metadata version + lineage edges |
| GET | `/lineage/{id}` | Lineage graph for a connection/version |
| POST | `/ai/generate` | NL→SQL with validation, auto-retry, confidence |
| POST | `/execute` | Validate + run; stores no result rows; explanation + confidence |
| GET | `/history` | Shared workspace history (`metadata_version_id`, `confidence_score`) |
| GET | `/usage/me` | Per-user AI generation + execution counts |
| GET | `/usage/workspace` | All members’ usage (workspace admin only) |

After schema changes: `cd backend && prisma db push` (or your migration flow).
