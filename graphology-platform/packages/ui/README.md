# @graphology/ui — Design System

Premium education-platform UI library for Graphology.

Feeling: Curiosity → Trust → Premium → Professional → Modern → Calm  
References: Apple, Stripe, Linear, Notion, Vercel — not a traditional coaching site.

## Principles

Minimal · Elegant · Accessible · Fast · Consistent · Responsive · Purposeful whitespace

## Structure

```text
src/
  globals.css                 # Semantic tokens + typography utilities
  components/
    ui/                       # Primitives (Button, Input, Dialog, …)
    forms/                    # FormField, OTP, Search, FileUpload
    feedback/                 # Alert, EmptyState, Loading
    layout/                   # Container, Section, PageHeader
    navigation/               # Navbar, Sidebar
    marketing/                # Hero, FeatureGrid
    data-display/             # Table, Pagination
    icons/                    # Lucide re-exports only
```

Storybook is not included yet; folders are organized for later Storybook adoption.

## Usage

```tsx
import { Button, Alert, Hero } from '@graphology/ui';
import '@graphology/ui/globals.css';
```

Dark mode: add `class="dark"` on `<html>` (already supported via tokens).

## Theme

See [THEME.md](./THEME.md).

## Icons & motion

- Icons: **Lucide only**
- Motion: **Framer Motion**, ≤ 250ms, no bounce (`FadeIn`)

## Scripts

```bash
pnpm --filter @graphology/ui build
pnpm --filter @graphology/ui lint
pnpm --filter @graphology/ui typecheck
pnpm --filter @graphology/ui test
```
