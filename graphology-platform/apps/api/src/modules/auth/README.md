# Authentication Module

Authentication and authorization architecture for the Graphology API.

## Implemented

- Registration, login, email verification/resend
- Refresh token rotation and logout
- Forgot / reset password
- **RBAC** — JWT auth guard, roles guard, permissions guard, `@CurrentUser`, `@Roles`, `@Permissions`

## Authentication flow

1. Client sends `Authorization: Bearer <accessToken>`.
2. `AuthorizationMiddleware` extracts the Bearer token onto the request (`accessToken`).
3. `JwtAuthGuard` verifies the JWT (`sub`, `email`, `type=access`).
4. Guard loads authorization context via `PermissionLookupService` → `AuthorizationRepository`.
5. Rejects inactive / soft-deleted users and users without an **ACTIVE** membership in an **active** organization.
6. Attaches `AuthenticatedUser` to `request.user`.

## Authorization flow

1. `RolesGuard` reads `@Roles(...)` metadata (OR match).
2. `PermissionsGuard` reads `@Permissions(...)` metadata (AND match).
3. Permissions are loaded from the database through the repository — never hardcoded in guards.
4. Missing/invalid auth → **401**. Authenticated but unauthorized → **403**.

## Guard order

Always apply in this order:

```ts
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
```

## Decorator usage

```ts
@Get('admin')
@Roles('Admin')
admin(@CurrentUser() user: AuthenticatedUser) { ... }

@Get('teacher')
@Roles('Teacher', 'Admin')
teacher(@CurrentUser('id') userId: string) { ... }

@Get('permissions')
@Permissions('student.view')
permissions(@CurrentUser('email') email: string) { ... }
```

## Permission lookup strategy

- `PermissionLookupService` is the only service entry point for RBAC data.
- It depends on `AUTHORIZATION_REPOSITORY` (`PrismaAuthorizationRepository`).
- One query loads: user status, role names, permission names (via `RolePermission`), and active organization memberships.
- Roles are assigned globally via `UserRole`; evaluation still requires an active org membership.
- Temporary verification routes: `GET /api/v1/test/{admin|teacher|student|permissions}`.
