# Authentication Module

Authentication architecture for the Graphology API.

## Implemented

- Registration, login, email verification/resend
- Refresh token rotation and logout
- **Forgot / reset password** — `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`

### Password reset security

- Opaque reset tokens; only SHA-256 hashes stored (`password_reset_tokens`)
- 30-minute expiry, single-use (`usedAt`)
- Forgot-password never reveals whether the email exists
- Successful reset updates password (Argon2), invalidates outstanding reset tokens, and revokes all refresh tokens in one transaction
