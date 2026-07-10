# ADR-003: Multi-tenancy

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

Graphology Academy and future institutes need isolated operational data while allowing a person to belong to more than one organization (for example, teacher at one academy and student at another).

## Decision

Adopt **organization-based multi-tenancy** with membership, not a single `organizationId` on `User`:

- `Organization` is the tenant boundary
- `OrganizationMember` links users to organizations with status (`ACTIVE`, `INVITED`, `SUSPENDED`, `REMOVED`)
- Future business tables (courses, batches, payments) will carry `organizationId`
- Authorization requires at least one **ACTIVE** membership in an **active** organization

## Consequences

- Users are global identities; tenancy is membership-scoped
- Queries for business data must always filter by organization
- Cross-org access needs explicit membership checks
- Roles today are global via `UserRole`; org-scoped roles remain a future enhancement

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Single org per user (`User.organizationId`) | Blocks multi-org users |
| Schema-per-tenant | Operationally heavy for early stage |
| Database-per-tenant | Overkill before product-market fit |
