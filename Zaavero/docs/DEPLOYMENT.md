# Deploying Zaavero to zaavero.com

This guide covers production deployment of the Zaavero platform and its product modules.

## Architecture overview

| Component | Suggested host | Domain |
|-----------|----------------|--------|
| Zaavero frontend (Next.js) | Vercel | `zaavero.com`, `www.zaavero.com` |
| Zaavero API (FastAPI) | Railway / Render / Fly.io | `api.zaavero.com` |
| PostgreSQL | Neon / Supabase / Railway | (connection string only) |
| AgentOps frontend | Vercel or static CDN | `agentops.zaavero.com` |
| AgentOps API | Railway / Render | `agentops-api.zaavero.com` |
| DataWhisper frontend | Vercel | `datawhisper.zaavero.com` |
| DataWhisper API | Railway / Docker | `datawhisper-api.zaavero.com` |

Documentation is served **inside** the Zaavero app at `/documentation` — no separate `docs.zaavero.com` subdomain is required unless you add one later.

---

## 1. Zaavero backend (API)

### Environment variables

```env
DATABASE_URL=postgresql://USER:PASS@HOST:5432/zaavero
JWT_SECRET=<long-random-string-min-32-chars>
CORS_ORIGINS=https://zaavero.com,https://www.zaavero.com

AGENTOPS_LAUNCH_URL=https://agentops.zaavero.com/sso/zaavero
DATAWHISPER_LAUNCH_URL=https://datawhisper.zaavero.com/sso/zaavero
```

### Deploy steps

```bash
cd Zaavero/backend
pip install -r requirements.txt
prisma generate
prisma db push
PYTHONPATH=. python scripts/seed_catalog.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Point `api.zaavero.com` DNS (CNAME) to your host. Verify: `GET https://api.zaavero.com/health`

---

## 2. Zaavero frontend (Next.js)

### Environment variables (Vercel)

```env
NEXTAUTH_SECRET=<long-random-string>
NEXTAUTH_URL=https://zaavero.com
NEXT_PUBLIC_API_URL=https://api.zaavero.com
INTERNAL_API_URL=https://api.zaavero.com
```

### Deploy

1. Import `Zaavero/frontend` repo/folder into Vercel.
2. Set root directory to `frontend`.
3. Add env vars above.
4. Add custom domains: `zaavero.com`, `www.zaavero.com`.

---

## 3. AgentOps module

Set in AgentOps backend `.env`:

```env
ZAAVERO_API_URL=https://api.zaavero.com
```

Set CORS on AgentOps API to allow your AgentOps frontend origin.

Update Zaavero seed/registry launch URL to production AgentOps SSO callback.

---

## 4. DataWhisper module

Mirror the AgentOps SSO pattern:

- `ZAAVERO_API_URL=https://api.zaavero.com` in DataWhisper backend
- Launch URL: `https://datawhisper.zaavero.com/sso/zaavero`

---

## 5. DNS checklist (example)

| Record | Type | Value |
|--------|------|-------|
| `@` | A / CNAME | Vercel |
| `www` | CNAME | Vercel |
| `api` | CNAME | Railway/Render |
| `agentops` | CNAME | Vercel |
| `datawhisper` | CNAME | Vercel |

---

## 6. Post-deploy verification

- [ ] `https://zaavero.com` loads with styled UI
- [ ] Register a workspace
- [ ] Marketplace → Enable AgentOps and DataWhisper
- [ ] Products → Documentation opens `/documentation/agentops` (in-app)
- [ ] Launch AgentOps → SSO lands in AgentOps dashboard
- [ ] Launch DataWhisper → SSO lands in DataWhisper dashboard

---

## Local development (all services)

Use the startup script (recommended):

```powershell
cd Applications
.\scripts\start-local.ps1
```

| Service | URL | Notes |
|---------|-----|-------|
| Zaavero UI | http://localhost:3000 | |
| Zaavero API | http://localhost:8000 | Postgres on :5433 |
| AgentOps UI | http://localhost:5173 | |
| AgentOps API | http://localhost:8081 | **Not 8080** — stale processes on 8080 lack auth routes |
| DataWhisper UI | http://localhost:3001 | |
| DataWhisper API | http://localhost:8002 | Docker; avoids conflict with Zaavero on :8000 |

**AgentOps:** `frontend/.env.development` must set `VITE_API_PORT=8081`. Restart the Vite dev server after changing it.

**DataWhisper:** `frontend/.env.local` needs `NEXT_PUBLIC_API_URL=http://localhost:8002` and `INTERNAL_API_URL=http://127.0.0.1:8002`. Rebuild the Docker backend after SSO code changes: `docker compose up -d --build backend` in `AI Data Analyst for Databases/infra`.

Launch only works when the target product app **and** its API are running.
