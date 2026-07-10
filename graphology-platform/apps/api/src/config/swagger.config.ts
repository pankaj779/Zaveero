/**
 * OpenAPI / Swagger description for the Graphology Platform API.
 */
export const SWAGGER_API_DESCRIPTION = `
## Overview

Versioned REST API for the Graphology Platform (\`/api/v1\`).

## Authentication

1. Register or log in via **Auth** endpoints.
2. Use the returned \`accessToken\` as a Bearer token.
3. Rotate sessions with \`POST /api/v1/auth/refresh\` using the opaque refresh token.
4. Revoke sessions with \`POST /api/v1/auth/logout\`.

Protected routes require header:

\`Authorization: Bearer <accessToken>\`

## Authorization (RBAC)

Use \`@Roles\` / \`@Permissions\` on controllers. Temporary verification routes live under **RBAC Test**.

- Unauthenticated → \`401\`
- Authenticated without role/permission or inactive org membership → \`403\`

## Response envelope

Success and error payloads follow the platform API standards document.

## Docs

- Repository: \`docs/API_VERSIONING.md\`, \`docs/ENVIRONMENT.md\`
- Auth module: \`apps/api/src/modules/auth/README.md\`
`.trim();

export const SWAGGER_TAGS = [
  {
    name: 'Health',
    description: 'Liveness and readiness probes',
  },
  {
    name: 'Auth',
    description: 'Registration, login, tokens, email verification, password reset',
  },
  {
    name: 'RBAC Test',
    description: 'Temporary protected routes for authorization verification (remove later)',
  },
] as const;
