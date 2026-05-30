# Production deployment — zaavero.com (free tier)

Deploy the full Zaavero constellation at **$0/month** for feedback testing:

| Layer | Service | Hosts |
|-------|---------|-------|
| Frontends (×3) | Vercel Hobby | `zaavero.com`, `agentops.`, `datawhisper.` |
| Backends (×3) | Render Free | `api.`, `agentops-api.`, `datawhisper-api.` |
| Databases (×2) | Neon Free | `zaavero` + `datawhisper` databases |
| DNS | GoDaddy | CNAME/A records |

**Trade-off:** Render free services **sleep after ~15 minutes idle**. First request after sleep takes 30–60 seconds (cold start). Fine for demos; upgrade to Render Starter ($7/service) when you need always-on.

**AgentOps caveat:** Databricks connections and monitored agents are stored in **SQLite** on the API container. On Render free tier, data can be **lost on redeploy**. Users re-enter Databricks settings via `/connect` after redeploys until Postgres migration is added.

---

## Architecture

```
zaavero.com          → Vercel (Zaavero Next.js)
api.zaavero.com      → Render (Zaavero FastAPI) → Neon DB `zaavero`

agentops.zaavero.com     → Vercel (AgentOps Vite SPA)
agentops-api.zaavero.com → Render (AgentOps FastAPI) → SQLite (ephemeral on free tier)

datawhisper.zaavero.com     → Vercel (DataWhisper Next.js)
datawhisper-api.zaavero.com → Render (DataWhisper FastAPI) → Neon DB `datawhisper`
```

SSO flow: Zaavero issues token → product validates via `POST https://api.zaavero.com/auth/sso/verify`.

---

## Step 1 — Push to GitHub

Repo is initialized locally at `Applications/`. Push to GitHub:

```powershell
cd C:\Users\Pankaj_Kumar\My_documents\Applications

# Create empty repo on GitHub: github.com/new → name: zaavero-constellation (private recommended)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zaavero-constellation.git
git push -u origin main
```

Or run: `.\scripts\push-github.ps1 -RemoteUrl https://github.com/YOUR_USERNAME/zaavero-constellation.git`

**Never commit:** `.env`, `.env.local`, `replay_targets.json`, `*.db`, API keys.

---

## Step 2 — Neon PostgreSQL (free)

1. Sign up at [neon.tech](https://neon.tech)
2. Create project **`zaavero-prod`** (region closest to your users)
3. Create two databases in the project:
   - `zaavero`
   - `datawhisper`
4. Copy **pooled** connection strings (Dashboard → Connection Details → Pooled, `?sslmode=require`)

Save these for Render:

| Variable | Database |
|----------|----------|
| `DATABASE_URL` on **zaavero-api** | `zaavero` |
| `DATABASE_URL` + `MIGRATION_DATABASE_URL` on **datawhisper-api** | `datawhisper` (same URL for both on Neon free tier) |

Generate secrets (PowerShell):

```powershell
# JWT secrets (run twice, use different values)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

---

## Step 3 — Render backends (free, 3 services)

### Option A — Blueprint (recommended)

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connect GitHub repo `zaavero-constellation`
3. Render reads [`render.yaml`](../../render.yaml) at repo root and creates 3 services
4. In Render dashboard, set **secret** env vars:

**zaavero-api**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon pooled URL → `zaavero` |
| `JWT_SECRET` | random 48+ chars |

**agentops-api**

| Key | Value |
|-----|-------|
| `JWT_SECRET` | random 48+ chars |

(`ZAAVERO_API_URL`, `CORS_ORIGINS` are preset in `render.yaml`)

**datawhisper-api**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon pooled URL → `datawhisper` |
| `MIGRATION_DATABASE_URL` | same as `DATABASE_URL` |
| `JWT_SECRET` | random 48+ chars |
| `OPENAI_API_KEY` | optional, for NL→SQL |

5. Wait for deploy → verify:
   - `https://zaavero-api.onrender.com/health` (or custom domain)
   - `https://agentops-api.onrender.com/api/health`
   - `https://datawhisper-api.onrender.com/health`

6. Attach **custom domains** (Render → each service → Settings → Custom Domains):
   - `api.zaavero.com`
   - `agentops-api.zaavero.com`
   - `datawhisper-api.zaavero.com`

7. After first Zaavero deploy, set `SEED_CATALOG=0` on **zaavero-api** to skip startup seed on every restart (optional).

### Option B — Manual web services

Create 3 **Web Services** from Docker, pointing at:

| Service | Root directory | Dockerfile |
|---------|----------------|------------|
| zaavero-api | `Zaavero/backend` | `Dockerfile` |
| agentops-api | `AgentOps_Databricks/backend` | `Dockerfile` |
| datawhisper-api | `DataWhisper/backend` | `Dockerfile` |

Use env vars from [`.env.production.example`](../../Zaavero/backend/.env.production.example) files in each backend.

---

## Step 4 — Vercel frontends (free, 3 projects)

Create **three** Vercel projects from the same GitHub repo:

### zaavero-web

| Setting | Value |
|---------|-------|
| Root Directory | `Zaavero/frontend` |
| Framework | Next.js |

**Environment variables (Production):**

```
NEXTAUTH_URL=https://zaavero.com
NEXTAUTH_SECRET=<random-48-chars>
NEXT_PUBLIC_API_URL=https://api.zaavero.com
INTERNAL_API_URL=https://api.zaavero.com
```

**Domains:** `zaavero.com`, `www.zaavero.com`

### agentops-web

| Setting | Value |
|---------|-------|
| Root Directory | `AgentOps_Databricks/frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**Environment variables (Production):**

```
VITE_API_URL=https://agentops-api.zaavero.com
```

Uses [`vercel.json`](../../AgentOps_Databricks/frontend/vercel.json) for SPA routing (`/sso/zaavero`, etc.).

**Domain:** `agentops.zaavero.com`

### datawhisper-web

| Setting | Value |
|---------|-------|
| Root Directory | `DataWhisper/frontend` |
| Framework | Next.js |

**Environment variables (Production):**

```
NEXTAUTH_URL=https://datawhisper.zaavero.com
NEXTAUTH_SECRET=<random-48-chars>
NEXT_PUBLIC_API_URL=https://datawhisper-api.zaavero.com
INTERNAL_API_URL=https://datawhisper-api.zaavero.com
```

**Domain:** `datawhisper.zaavero.com`

---

## Step 5 — GoDaddy DNS

In GoDaddy → **DNS** for `zaavero.com`:

### Vercel (platform + product UIs)

When you add each domain in Vercel, it shows exact records. Typically:

| Type | Name | Value |
|------|------|-------|
| A | `@` | Vercel IP (e.g. `76.76.21.21`) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `agentops` | `cname.vercel-dns.com` |
| CNAME | `datawhisper` | `cname.vercel-dns.com` |

### Render (APIs)

Render gives a hostname like `zaavero-api.onrender.com` when you add a custom domain:

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `zaavero-api.onrender.com` |
| CNAME | `agentops-api` | `agentops-api.onrender.com` |
| CNAME | `datawhisper-api` | `datawhisper-api.onrender.com` |

Wait 5–60 minutes for propagation. HTTPS is automatic on Vercel and Render.

---

## Step 6 — Verify end-to-end

Run locally after DNS propagates:

```powershell
cd Applications
.\scripts\verify-production.ps1
```

Manual checklist:

- [ ] `https://zaavero.com` — landing page loads
- [ ] Register a new workspace (Neon DB is empty in prod)
- [ ] Marketplace → Enable AgentOps and DataWhisper
- [ ] Products → Launch AgentOps → SSO → `/connect` → save Databricks → add agents
- [ ] Products → Launch DataWhisper → SSO → dashboard
- [ ] Documentation at `/documentation/agentops` works in-app

---

## Environment reference

Production examples (copy to Render/Vercel dashboards):

- [`Zaavero/backend/.env.production.example`](../../Zaavero/backend/.env.production.example)
- [`Zaavero/frontend/.env.production.example`](../../Zaavero/frontend/.env.production.example)
- [`AgentOps_Databricks/backend/.env.production.example`](../../AgentOps_Databricks/backend/.env.production.example)
- [`AgentOps_Databricks/frontend/.env.production.example`](../../AgentOps_Databricks/frontend/.env.production.example)
- [`DataWhisper/backend/.env.production.example`](../../DataWhisper/backend/.env.production.example)
- [`DataWhisper/frontend/.env.production.example`](../../DataWhisper/frontend/.env.production.example)

---

## Local development

```powershell
cd Applications
.\scripts\start-local.ps1
```

| Service | URL |
|---------|-----|
| Zaavero | http://localhost:3000 |
| Zaavero API | http://localhost:8000 |
| AgentOps | http://localhost:5173 (API :8081) |
| DataWhisper | http://localhost:3001 (API :8002) |

---

## Upgrade path (when you outgrow free tier)

| Need | Action |
|------|--------|
| No cold starts | Render Starter ($7/mo per service) or Railway |
| AgentOps persistence | Render persistent disk or migrate SQLite → Postgres |
| Stripe billing | Add `STRIPE_*` keys to Zaavero backend |
| Email auth | Add SMTP or Auth0/Clerk |

---

## What's still pending (post-MVP)

- Live Stripe checkout
- Password reset / email verification
- Pipeline Studio product (marketplace placeholder today)
- SAML/SCIM (Enterprise tier)
- AgentOps Postgres migration for durable multi-tenant storage
