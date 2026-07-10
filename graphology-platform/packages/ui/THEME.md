# Theme documentation

## Color tokens (semantic)

Never use raw Tailwind palette colors (`bg-blue-500`, etc.) in components.

| Token | Purpose |
|-------|---------|
| `background` / `foreground` | Page canvas and default text |
| `surface` | Raised panels |
| `card` / `popover` | Cards and overlays |
| `primary` | Primary brand actions |
| `secondary` | Quiet secondary actions |
| `accent` | Highlights / links / focus energy |
| `success` / `warning` / `danger` / `info` | Status |
| `muted` | Subtle fills and secondary text |
| `border` / `input` / `ring` | Chrome and focus |
| `sidebar*` | App shell navigation |

Defined as HSL channels in `src/globals.css` for light and `.dark`.

## Typography (Inter)

| Scale | Utility / token |
|-------|-----------------|
| Display | `text-display` |
| H1–H4 | `text-h1` … `text-h4` |
| Body Large | `text-body-lg` |
| Body | `text-body` |
| Small | `text-small` |
| Caption | `text-caption` |

Or use `<Typography variant="h1" />`.

## Spacing

4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 (mapped to Tailwind `1`–`24` scale).

## Radius

`sm` · `md` · `lg` · `xl` · `full` via `--radius-*`.

## Shadows

`shadow-sm` · `shadow-md` · `shadow-lg` · `shadow-xl` — subtle only.

## Breakpoints (mobile first)

| Name | Min width |
|------|-----------|
| phone | 0 |
| tablet | 640px |
| laptop | 1024px |
| desktop | 1280px |
| ultrawide | 1536px |

## Motion

- Duration max **250ms**
- Easing: calm ease-out
- Prefer opacity + small translate; no bounce
