# Authentication Module

Foundation architecture for authentication in the Graphology API.

This module defines structure and dependency injection only. It does **not** implement login, registration, JWT issuance, OAuth, password reset, email verification, or RBAC enforcement.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| **Controllers** | Future HTTP surface for auth routes (`/api/v1/auth/*`). Placeholder only. |
| **Services** | Application use-cases. Depend on repository interfaces, never Prisma. |
| **Repositories** | Persistence adapters. `PrismaAuthRepository` / `PrismaUserRepository` implement interfaces. |
| **Interfaces** | Contracts (`AuthRepository`, `UserRepository`) so services stay DB-agnostic. |
| **DTOs** | Request validation placeholders (`RegisterDto`, `LoginDto`, etc.). |
| **Entities / Types / Mappers** | Domain and API shapes; mapping helpers for later tasks. |
| **Guards / Strategies / Decorators** | Placeholders for JWT, roles, and permissions. |
| **Constants / Exceptions** | Shared names and typed errors prepared for future use. |

## Dependency flow

```text
HTTP (AuthController)
        │
        ▼
   AuthService
        │
        ├── AuthRepository  ──► PrismaAuthRepository ──► PrismaClient
        └── UserRepository  ──► PrismaUserRepository ──► PrismaClient
```

- `DatabaseModule` provides `PRISMA_CLIENT` globally.
- `AuthModule` binds `AUTH_REPOSITORY` → `PrismaAuthRepository` and `USER_REPOSITORY` → `PrismaUserRepository`.
- Services inject tokens, not concrete Prisma types.
- Swapping the database adapter later requires only new repository implementations and DI bindings.

## Folder layout

```text
modules/auth/
  auth.module.ts
  controllers/
  services/
  repositories/
  dto/
  entities/
  interfaces/
  guards/
  strategies/
  decorators/
  types/
  constants/
  exceptions/
  mappers/
  tests/
  README.md
```

## Out of scope (this task)

Registration, login, JWT/cookies, OAuth, password reset, email verification, RBAC logic, and business methods on repositories.
