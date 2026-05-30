# DataWhisper — Docker stack

## Services (docker-compose)

| Service    | Image / build        | Host port | Role |
|-----------|----------------------|-----------|------|
| **postgres** | `postgres:16-alpine` | **5432**  | App database (users, workspaces, connections, metadata, RLS). Data in volume `postgres_data`. |
| **backend**  | `../backend/Dockerfile` | **8000** | FastAPI + Prisma. On **every start**: `prisma db push` → `psql` applies `sql/enable_rls.sql` → `uvicorn`. |
| **frontend** | `../frontend/Dockerfile` | **3000** | Next.js UI. Browser → `NEXT_PUBLIC_API_URL` (localhost:8000). **Server** (Route Handlers, NextAuth) → `INTERNAL_API_URL` (**http://backend:8000**, set in Dockerfile + compose). |

**Internal DNS (inside Compose):** `postgres:5432`, `backend:8000`. The frontend container uses `INTERNAL_API_URL=http://backend:8000` for server-side calls.

## One command (from this folder)

```bash
docker compose up --build
```

- First time: builds images, starts Postgres, waits for health, starts backend (schema + RLS + API), then frontend.
- Open **http://localhost:3000** (UI) and **http://localhost:8000/docs** (API).

After changing **frontend** server-side API wiring, rebuild the frontend image (`docker compose build frontend` or `up --build`) so `INTERNAL_API_URL=http://backend:8000` from the Dockerfile is applied. Without it, **Register** and **Sign in** can fail because Next.js server routes cannot reach `localhost:8000` from inside the frontend container.

## Environment files

| File | Used by |
|------|---------|
| `infra/.env` | Optional; merged into backend/frontend via `env_file` in compose (e.g. `JWT_SECRET`, `NEXTAUTH_SECRET`). |
| `backend/.env` | Merged into backend container (API keys, overrides). **Do not** duplicate `OPENAI_API_KEY` in two places unnecessarily. |

Compose **sets** `DATABASE_URL` for the backend to the `postgres` service (see `docker-compose.yml`). You normally **do not** put `DATABASE_URL` in `backend/.env` when using Docker, or it can override the Compose value.

## What runs automatically (backend container)

1. **`prisma db push`** — tables match `prisma/schema.prisma`.
2. **`psql … -f /app/sql/enable_rls.sql`** — Row Level Security policies (idempotent; safe on restarts).
3. **`uvicorn`** — API.

You do **not** need to run `psql` or `db push` by hand when using this stack.

## Postgres init (`postgres-init/`)

Scripts in `postgres-init/` run only **the first time** the Postgres volume is created (e.g. `uuid-ossp`). They do **not** apply RLS; RLS is applied by the **backend** entrypoint so it always runs **after** the schema exists.

## Production notes

- Change default passwords and secrets (`JWT_SECRET`, `NEXTAUTH_SECRET`, `POSTGRES_PASSWORD`, etc.).
- The Compose Postgres user is **not** a superuser, so **RLS is enforced** for the app role.
- For a non-Docker deploy, run the same steps as the entrypoint: `prisma db push`, then `psql $DATABASE_URL -f backend/sql/enable_rls.sql`, then start the API.

## Troubleshooting

**Register / Sign in fails (500, or “Invalid email or password”)**

- Rebuild the **frontend** after Dockerfile changes: `docker compose build --no-cache frontend` then `docker compose up -d`.
- The Next.js **server** must use `INTERNAL_API_URL=http://backend:8000` (set in `frontend/Dockerfile`). The browser still uses `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- Rebuild the **backend** if you see `exec /app/docker-entrypoint.sh: no such file or directory` in logs: `docker compose build --no-cache backend` (fixes Windows CRLF or stale image).

**Smoke-test the API (host → published port 8000)**

```powershell
cd backend
$env:API_BASE="http://127.0.0.1:8000"
python scripts/smoke_auth.py
```
(Bash: `API_BASE=http://127.0.0.1:8000 python scripts/smoke_auth.py`)
