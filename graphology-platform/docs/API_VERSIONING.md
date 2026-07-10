# API Versioning

## Current version

**URI versioning** with default version `1`.

| Item | Value |
|------|-------|
| Global prefix | `/api` |
| Version | `v1` |
| Example | `POST /api/v1/auth/login` |
| Swagger UI | `/api/docs` (OpenAPI for the running app) |
| Package version | `0.1.0` (semver of the API package / monorepo) |

Configured in `apps/api/src/main.ts`:

```ts
app.setGlobalPrefix('api');
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

## Compatibility policy

- Additive, non-breaking changes may ship under `v1`.
- Breaking changes require a new URI version (`v2`) and a migration window.
- Deprecated endpoints remain documented in Swagger until removed.

## Authentication in Swagger

1. Call `POST /api/v1/auth/login`.
2. Copy `data.accessToken`.
3. In Swagger UI, click **Authorize** and paste the token (Bearer scheme `access-token`).
4. Call protected routes such as `GET /api/v1/test/admin`.

Refresh tokens are opaque strings returned in login/refresh responses; they are not JWTs and are not used as Bearer access tokens.

## Response envelope

Success and error shapes follow [API Standards](./07_API_STANDARDS.md).
