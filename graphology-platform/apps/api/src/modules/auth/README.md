# Authentication Module

Authentication architecture for the Graphology API.

## Implemented

- Registration, login, email verification/resend
- **Refresh token rotation** — `POST /api/v1/auth/refresh`
- **Logout** — `POST /api/v1/auth/logout`

### Refresh token security

- Opaque refresh tokens (not JWTs)
- SHA-256 hash with `REFRESH_TOKEN_SECRET` pepper before persistence
- Single-use rotation: old token revoked + `replacedByTokenId` set
- Replay of a revoked token invalidates the user's refresh-token family
- Logout always returns success (no token validity leakage)

## Configuration

- `JWT_SECRET` / `JWT_EXPIRES_IN` — access tokens
- `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRES_IN` — refresh tokens  
  (aliases: `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`)
