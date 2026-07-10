# Authentication Module

Authentication architecture for the Graphology API.

## Implemented

- **User registration** — `POST /api/v1/auth/register`
- **User login** — `POST /api/v1/auth/login` (access token only)
- **Email verification** — `GET /api/v1/auth/verify-email?token=...`
- **Resend verification** — `POST /api/v1/auth/resend-verification`

### Email verification details

- Cryptographically secure raw token sent by email
- Only SHA-256 token hash stored (`email_verification_tokens`)
- 24-hour expiry
- Email delivery via provider-agnostic `EmailService` (`ResendEmailService` implementation)
- Registration is not rolled back if email sending fails (failure is logged)

## Not implemented yet

Refresh tokens, cookies, OAuth, password reset, and RBAC enforcement.

## Dependency flow

```text
HTTP (AuthController)
        │
        ▼
   AuthService
        │
        ├── UserRepository  ──► PrismaUserRepository
        ├── AuthRepository  ──► PrismaAuthRepository  (users + verification tokens)
        ├── TokenService    ──► JwtService
        └── EmailService    ──► ResendEmailService
```
