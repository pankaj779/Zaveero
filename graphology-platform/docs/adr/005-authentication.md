# ADR-005: Authentication

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

The API needs secure registration, login, email verification, password reset, and session continuity without storing plaintext secrets or revealing account existence.

## Decision

Implement authentication in `apps/api` auth module with:

- **Argon2** password hashing
- **JWT access tokens** (short-lived; claims: `sub`, `email`, `type=access`)
- **Opaque refresh tokens** stored as SHA-256 hashes (peppered), with rotation and family revoke on replay
- Email verification and password-reset tokens stored as hashes with expiry and single-use semantics
- Uniform responses for sensitive flows (forgot-password, unknown email login failures)
- Email delivery via `EmailService` (Resend) using `FRONTEND_URL` for links

## Consequences

- Access tokens stay small; authorization context is loaded at request time
- Refresh rotation improves session security but requires careful client handling
- Email provider outages must not roll back registration (send is best-effort after commit)
- Google OAuth remains out of scope until a later task

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| JWT-only sessions (no refresh store) | Harder to revoke; longer-lived access tokens |
| Passport-heavy stack for every flow | Extra dependency; current JwtService + guards suffice |
| Session cookies only | Less suitable for future mobile clients |
