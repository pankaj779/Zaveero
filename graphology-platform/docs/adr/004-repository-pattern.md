# ADR-004: Repository Pattern

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

NestJS services must remain testable and free of ORM coupling. Prisma should stay behind persistence adapters so domain rules do not leak SQL/Prisma APIs.

## Decision

Enforce a **repository abstraction** for all persistence used by feature services:

- Interfaces live in module `interfaces/` (for example `AuthRepository`, `UserRepository`, `AuthorizationRepository`)
- Prisma implementations live in `repositories/` and inject `PRISMA_CLIENT`
- Services depend on DI tokens (`AUTH_REPOSITORY`, etc.), never on `PrismaClient`
- Transactions that span multiple writes are owned by repository methods

## Consequences

- Unit tests mock repositories without spinning up Prisma
- Slightly more boilerplate per feature
- Clear boundary for future ORM or query-engine changes
- Violations are easy to catch in review (`prisma.` usage outside repositories)

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Prisma in services | Couples domain logic to ORM; harder to test |
| Active Record entities | Conflicts with Nest DI and Prisma Client style |
| CQRS/event sourcing | Unnecessary complexity for current phase |
