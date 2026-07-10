# Authentication Module

Authentication architecture for the Graphology API.

## Implemented

- **User registration** — `POST /api/v1/auth/register`
  - Argon2 password hashing (plaintext never persisted)
  - Unique email / optional unique phone
  - Default organization membership (`Graphology Academy`)
  - Default RBAC role (`Student`) via name lookup
  - Single Prisma transaction for user + membership + role
- **User login** — `POST /api/v1/auth/login`
  - Argon2 password verification with timing-safe dummy hash for unknown emails
  - Uniform `InvalidCredentialsException` for unknown email / wrong password
  - Rejects inactive and soft-deleted accounts via `AccountDisabledException`
  - Access token only (`JWT_SECRET` + `JWT_EXPIRES_IN` via ConfigModule)

## Not implemented yet

Refresh tokens, cookies, OAuth, password reset, email verification, and RBAC enforcement.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| **Controllers** | HTTP surface for auth routes (`/api/v1/auth/*`). |
| **Services** | Application use-cases. Depend on repository interfaces, never Prisma. Hash/verify passwords; issue access tokens via `TokenService`. |
| **Repositories** | Persistence adapters. `PrismaAuthRepository` / `PrismaUserRepository` implement interfaces. |
| **Interfaces** | Contracts (`AuthRepository`, `UserRepository`) so services stay DB-agnostic. |
| **DTOs** | Request validation (`RegisterDto`, `LoginDto`, placeholders for reset/etc.). |
| **Entities / Types / Mappers** | Domain and API shapes. |
| **Guards / Strategies / Decorators** | Placeholders for JWT guards and RBAC. |
| **Constants / Exceptions** | Shared names and typed errors. |

## Dependency flow

```text
HTTP (AuthController)
        │
        ▼
   AuthService  (argon2 hash/verify)
        │
        ├── UserRepository  ──► PrismaUserRepository ──► PrismaClient
        ├── AuthRepository  ──► PrismaAuthRepository ──► PrismaClient ($transaction)
        └── TokenService    ──► JwtService (ConfigModule: JWT_SECRET, JWT_EXPIRES_IN)
```

- `DatabaseModule` provides `PRISMA_CLIENT` globally.
- `AuthModule` binds repository tokens and registers `JwtModule` asynchronously from env.
- Services inject tokens, not concrete Prisma types.
