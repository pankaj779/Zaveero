# Infrastructure

This directory contains infrastructure configuration and deployment resources for the Graphology Platform.

## Contents

- Docker Compose configuration (root level)
- Future: Terraform, Kubernetes manifests, monitoring configuration

## Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | localhost:3000 | localhost:4000 | localhost:5432 |
| Staging | Vercel | Render | Neon |
| Production | Vercel | Render | Neon |

## Local Development

Start all services with Docker Compose from the repository root:

```bash
docker compose up --build
```
