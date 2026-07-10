# Infrastructure

Infrastructure configuration and deployment resources for the Graphology Platform.

## Contents

| Path | Purpose |
|------|---------|
| [`docker-compose.yml`](../docker-compose.yml) | Local stack: Postgres + API + Web |
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Production-oriented overrides |
| [`apps/api/Dockerfile`](../apps/api/Dockerfile) | Multi-stage NestJS image (migrations on start) |
| [`apps/web/Dockerfile`](../apps/web/Dockerfile) | Multi-stage Next.js standalone image |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | CI: lint, typecheck, build, test (Node 20/22 + Postgres) |

## Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | localhost:3000 | localhost:3001 | localhost:5432 |
| Staging | Vercel (planned) | Render (planned) | Neon (planned) |
| Production | Vercel (planned) | Render (planned) | Neon (planned) |

## Local Development

```bash
# Postgres only (recommended while developing apps on the host)
docker compose up -d postgres

# Full stack
docker compose up --build

# Production-oriented flags
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

Provide secrets via a real `.env` (see [docs/ENVIRONMENT.md](../docs/ENVIRONMENT.md)). Never commit secrets.

## Related docs

- [Deployment guide](../docs/08_DEPLOYMENT_GUIDE.md)
- [Root README](../README.md)
