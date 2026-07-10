# ADR-006: RBAC

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

Authenticated users need fine-grained authorization before business modules ship. Roles and permissions already exist in Prisma (`Role`, `Permission`, `UserRole`, `RolePermission`).

## Decision

Use **Role-Based Access Control** enforced by Nest guards:

1. `AuthorizationMiddleware` extracts Bearer tokens
2. `JwtAuthGuard` validates JWT and loads authorization context
3. `RolesGuard` enforces `@Roles(...)` (OR)
4. `PermissionsGuard` enforces `@Permissions(...)` (AND) via `PermissionLookupService` → repository

Rules:

- User must be active and not soft-deleted
- User must have an ACTIVE membership in an active organization
- Unauthenticated → 401; authenticated but unauthorized → 403
- Permissions are never hardcoded in guards; they are loaded from the database

## Consequences

- Consistent decorator-driven protection for future modules
- Temporary `/api/v1/test/*` routes verify RBAC until business controllers exist
- Global roles + org membership gate; org-scoped role assignment is future work
- Permission checks add a DB round-trip (acceptable; cache later if needed)

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| Embed roles/permissions in JWT | Stale claims after role changes; larger tokens |
| CASL/ABAC now | More power than needed for current permission set |
| Middleware-only authorization | Nest guards compose better with route metadata |
