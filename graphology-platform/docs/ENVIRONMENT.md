# Environment Variables

Single source of truth for configuration. Copy [`.env.example`](../.env.example) to `.env` at the repository root. Nest validates config via `apps/api/src/config/env.schema.ts`.

Never commit real secrets.

## Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `APP_NAME` | No | `Graphology Platform` | Product name (Swagger title, emails) |
| `APP_URL` | No | `http://localhost:3000` | Public web URL |
| `FRONTEND_URL` | No | falls back to `APP_URL` | Links in verification / reset emails |
| `API_URL` | No | `http://localhost:3001` | Public API base (without `/api/v1`) |
| `PORT` | No | `3001` | API listen port |
| `HOST` | No | `0.0.0.0` | API bind host |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allowed origins |

## Database

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma connection (pooled URL on Neon) |
| `DIRECT_URL` | Yes | Direct URL for migrations |

## Authentication

| Variable | Required | Alias | Description |
|----------|----------|-------|-------------|
| `JWT_SECRET` | Yes | — | Access token signing secret |
| `JWT_EXPIRES_IN` | No | `JWT_ACCESS_EXPIRATION` | Access token TTL (default `15m`) |
| `REFRESH_TOKEN_SECRET` | Yes | `JWT_REFRESH_SECRET` | Pepper for refresh-token hashing |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `JWT_REFRESH_EXPIRATION` | Refresh TTL (default `7d`) |

## Email (Resend)

| Variable | Required | Alias | Description |
|----------|----------|-------|-------------|
| `RESEND_API_KEY` | Yes | — | Resend API key |
| `EMAIL_FROM` | Yes | `RESEND_FROM_EMAIL` | From address |

## Payments (placeholders until payments module)

| Variable | Required | Alias | Description |
|----------|----------|-------|-------------|
| `RAZORPAY_KEY_ID` | Yes | — | Razorpay key id |
| `RAZORPAY_SECRET` | Yes | `RAZORPAY_KEY_SECRET` | Razorpay secret |

## Optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Future Google OAuth |
| `CLOUDINARY_*` | Future media uploads |
| `SEED_ADMIN_*` | Database seed admin credentials |

## App-specific examples

- Root: [`.env.example`](../.env.example)
- API: [`apps/api/.env.example`](../apps/api/.env.example)
- Web: [`apps/web/.env.example`](../apps/web/.env.example)
- Database: [`packages/database/.env.example`](../packages/database/.env.example)
