# Zaavero Platform API Contracts

Base URL: `https://api.zaavero.com` (local: `http://localhost:8000`)

## Authentication

All protected endpoints require:

```
Authorization: Bearer {platform_jwt}
```

### POST /auth/register

```json
{
  "email": "admin@acme.com",
  "password": "securepass123",
  "name": "Jane Admin",
  "workspace_name": "Acme Corp"
}
```

Response:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "ADMIN" },
  "workspace": { "id": "uuid", "name": "Acme Corp", "slug": "acme-corp" }
}
```

### POST /auth/login

```json
{ "email": "admin@acme.com", "password": "securepass123" }
```

Same response shape as register.

### POST /auth/sso/verify

For product apps to validate launch tokens:

```json
{ "token": "eyJ..." }
```

Response:

```json
{
  "valid": true,
  "user_id": "uuid",
  "email": "admin@acme.com",
  "role": "ADMIN",
  "workspace_id": "uuid",
  "workspace_slug": "acme-corp",
  "product": "agentops"
}
```

---

## Dashboard

### GET /dashboard/overview

Returns workspace KPIs, enabled products, announcements, recent activity.

---

## Products

### GET /products

List all catalog products with `enabled` flag for current workspace.

### POST /products/{slug}/enable

Admin only. Body: `{ "config": {} }`

### POST /products/{slug}/launch

Returns SSO launch URL:

```json
{
  "product_slug": "agentops",
  "launch_url": "https://agentops.zaavero.com?zaavero_token=eyJ...",
  "sso_token": "eyJ...",
  "expires_in_seconds": 300
}
```

---

## Marketplace

### GET /marketplace

```json
{
  "plan_tier": "free",
  "products": [...],
  "categories": ["analytics", "observability"]
}
```

Each product includes `plan_eligible`, `can_enable`, `enabled`.

---

## Billing

### GET /billing/summary

Plan tier, available plans, add-ons, Stripe configuration status.

---

## Workspace

### GET /workspace/members

List workspace users with roles.

### PATCH /workspace/members/{id}/role

Admin only. `{ "role": "ANALYST" }`

---

## JWT claims

Platform token payload:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "ADMIN",
  "wid": "workspace-uuid",
  "wslug": "acme-corp",
  "products": ["agentops", "datawhisper"],
  "type": "platform",
  "exp": 1234567890
}
```

SSO launch token adds `"product": "agentops"` and `"type": "sso_launch"`.
