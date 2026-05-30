# Zaavero Constellation

Unified SaaS platform hosting **Zaavero** (platform shell), **AgentOps** (Databricks agent observability), and **DataWhisper** (AI analytics).

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

## Production deploy (free tier)

See **[Zaavero/docs/DEPLOYMENT.md](Zaavero/docs/DEPLOYMENT.md)** for the full runbook:

1. Push this repo to GitHub
2. Neon PostgreSQL (two databases)
3. Render — three API services via [`render.yaml`](render.yaml)
4. Vercel — three frontends
5. GoDaddy DNS for `zaavero.com` subdomains

## Repo layout

```
Applications/
├── Zaavero/                 # Platform (Next.js + FastAPI)
├── AgentOps_Databricks/     # AgentOps module
├── AI Data Analyst for Databases/  # DataWhisper module
├── render.yaml              # Render Blueprint (3 APIs)
└── scripts/
    ├── start-local.ps1
    └── verify-production.ps1
```

## Security

Never commit `.env` files. Rotate any Databricks or API keys that were ever shared in chat or committed by mistake.
