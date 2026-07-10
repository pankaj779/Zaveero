# @graphology/web

Next.js public website for the Graphology Platform.

## Current scope (04.02)

- Global marketing layout (header, footer, skip link)
- Homepage foundation: hero + section placeholders + CTA
- SEO: metadata, Open Graph, Twitter, robots, sitemap, manifest, favicon

## Scripts

```bash
pnpm --filter @graphology/web dev
pnpm --filter @graphology/web build
pnpm --filter @graphology/web lint
pnpm --filter @graphology/web typecheck
pnpm --filter @graphology/web test
```

## Notes

- UI primitives come from `@graphology/ui` only — do not duplicate components here.
- Auth and dashboards are out of scope for this foundation.
- Set `NEXT_PUBLIC_APP_URL` for canonical URLs and sitemap (see `.env.example`).
