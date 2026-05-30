# Zaavero Platform

**zaavero.com** — A unified enterprise SaaS platform hosting multiple products under one login, one workspace, and one billing account.

## Products (modules)

| Product | Repository | Role |
|---------|------------|------|
| **AgentOps** | [AgentOps-Databricks-app](https://github.com/pankaj779/AgentOps-Databricks-app) | Databricks AI agent observability |
| **DataWhisper** | [ai-data-analyst](https://github.com/pankaj779/ai-data-analyst) | NL→SQL analytics platform |

Zaavero is the **platform shell**. AgentOps and DataWhisper remain separate deployable apps, integrated via SSO launch tokens and the product module registry.

## Stack

| Layer | Technology | Hosting target |
|-------|------------|----------------|
| Frontend | Next.js 14, TypeScript, Tailwind, ShadCN | Vercel |
| Backend | FastAPI, Prisma Client Python | Railway |
| Database | PostgreSQL | Neon |

## Port layout (all apps together)

| App | Frontend | Backend |
|-----|----------|---------|
| **Zaavero** (platform) | http://localhost:3000 | http://localhost:8000 |
| **DataWhisper** | http://localhost:3001 | http://localhost:8000 (Docker) or separate |
| **AgentOps** | http://localhost:5173 | http://localhost:8080 |

Zaavero owns port **3000**. DataWhisper uses **3001** when running alongside Zaavero.

## Quick start (local)

### 1. Database

```bash
cd infra
docker compose up -d
```

PostgreSQL runs on `localhost:5433` (user/pass/db: `postgres`/`postgres`/`zaavero`).

### 2. Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
copy .env.example .env
# Edit DATABASE_URL=postgresql://postgres:postgres@localhost:5433/zaavero

prisma generate
prisma db push
python scripts/seed_catalog.py

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

App: http://localhost:3000

### 4. Product URLs (optional)

Point launch URLs in `backend/.env`:

```
AGENTOPS_LAUNCH_URL=http://localhost:5173
DATAWHISPER_LAUNCH_URL=http://localhost:3001
```

## Platform features

- **Single sign-on** — one login for all products
- **Workspace model** — shared team, roles (Admin / Analyst / Viewer)
- **Product marketplace** — enable/disable modules per workspace
- **Module registry** — plug-in framework for unlimited future products
- **Feature flags** — platform, product, and workspace overrides
- **Billing architecture** — Stripe-ready plans + product add-ons
- **Activity audit log** — workspace events
- **SSO product launch** — short-lived JWT for cross-app auth

## Navigation

| Route | Purpose |
|-------|---------|
| `/` | Premium landing page |
| `/login` | Sign in / register / join workspace |
| `/dashboard` | Workspace overview |
| `/products` | Enabled product modules |
| `/products/agentops` | AgentOps detail + launch |
| `/products/datawhisper` | DataWhisper detail + launch |
| `/marketplace` | Browse and enable products |
| `/settings` | Profile, billing, team |
| `/documentation` | Platform docs |

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | New workspace + admin |
| POST | `/auth/join` | Join workspace by slug |
| POST | `/auth/login` | JWT |
| GET | `/auth/me` | Current user + enabled products |
| POST | `/auth/sso/verify` | Products validate SSO token |
| GET | `/dashboard/overview` | Workspace dashboard |
| GET | `/products` | Product catalog with enablement |
| POST | `/products/{slug}/enable` | Enable product (admin) |
| POST | `/products/{slug}/launch` | SSO launch token + URL |
| GET | `/marketplace` | Marketplace catalog |
| GET | `/billing/summary` | Billing + plans |
| GET | `/workspace/members` | Team list |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture.

## Adding a new product module

1. Add entry to `backend/app/services/product_registry.py` (`PRODUCT_REGISTRY`)
2. Run `python scripts/seed_catalog.py` to sync DB
3. Set launch URL env var
4. Implement SSO token validation in the product app (`POST /auth/sso/verify`)

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Set `NEXT_PUBLIC_API_URL`, `NEXTAUTH_*`, `INTERNAL_API_URL` |
| Backend | Railway | Set `DATABASE_URL` (Neon), `JWT_SECRET`, product launch URLs |
| Database | Neon | PostgreSQL 16+ |

## License

Proprietary — Zaavero Platform
