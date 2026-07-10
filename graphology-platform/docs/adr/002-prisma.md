# ADR-002: Prisma

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

The platform needs a typed PostgreSQL data layer with migrations, seed scripts, and a clear path to Neon (pooled + direct URLs) in production.

## Decision

Use **Prisma ORM** in `@graphology/database` as the single schema and migration source of truth.

- Schema: `packages/database/prisma/schema.prisma`
- Migrations via Prisma Migrate
- UUID v7 primary keys
- Seed script with Zod-validated seed data
- NestJS injects `PrismaClient` through `PRISMA_CLIENT`; feature services never import Prisma directly

## Consequences

- Strong TypeScript types generated from schema
- Migration history is authoritative for schema evolution
- Prisma Client must be generated before build/test
- Repository layer required to keep domain services ORM-agnostic

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| TypeORM | Weaker migration DX and typing for this stack |
| Drizzle | Attractive SQL-first option; Prisma already chosen and migrated |
| Raw `pg` + SQL | Too much boilerplate for multi-model RBAC and auth tokens |
