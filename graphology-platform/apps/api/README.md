# @graphology/api

NestJS REST API for the Graphology Platform.

## Scripts

```bash
pnpm --filter @graphology/api dev
pnpm --filter @graphology/api build
pnpm --filter @graphology/api lint
pnpm --filter @graphology/api typecheck
pnpm --filter @graphology/api test
```

## Entry points

- App: `src/main.ts`
- Modules: `src/modules/auth`, `src/modules/email`
- Swagger: `http://localhost:3001/api/docs`
- Versioned API: `/api/v1`

## Docs

- [Auth & RBAC](./src/modules/auth/README.md)
- [Environment](../../docs/ENVIRONMENT.md)
- [API versioning](../../docs/API_VERSIONING.md)
- [ADR-005 Authentication](../../docs/adr/005-authentication.md)
- [ADR-006 RBAC](../../docs/adr/006-rbac.md)
