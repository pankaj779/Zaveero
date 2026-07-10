# ADR-001: Monorepo

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

The Graphology Platform includes a NestJS API, Next.js web app, shared libraries, and a future mobile client. Teams need shared types, consistent tooling, and atomic cross-package changes without publishing private packages for every change.

## Decision

Use a **pnpm + Turborepo monorepo** with:

- `apps/*` for deployable applications (`api`, `web`, `mobile`)
- `packages/*` for shared libraries (`database`, `types`, `ui`, `utils`, `config`, `auth`)
- Workspace protocol (`workspace:*`) for internal dependencies
- Turbo pipelines for `build`, `lint`, `typecheck`, and `test`

## Consequences

- Single lockfile and aligned TypeScript/ESLint versions
- Faster local iteration via Turbo caching
- Clear package boundaries, but requires discipline to avoid circular deps
- CI must install the full workspace (mitigated with pnpm filtering and caching)

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Polyrepo (separate git repos) | Higher coordination cost; version skew across apps |
| npm/yarn workspaces only | pnpm’s strict linking and disk efficiency preferred |
| Nx | Strong alternative; Turborepo is lighter for current scale |
