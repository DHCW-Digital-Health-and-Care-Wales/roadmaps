# ADR-0005: UI stack — shadcn/ui on Base UI with Tailwind CSS v4

- Status: Accepted
- Date: 2026-11-10

## Decision

- Tailwind CSS v4 via `@tailwindcss/vite`, CSS-first config (`@import "tailwindcss"`,
  `@theme`, CSS variables) in `src/styles/globals.css`. No `tailwind.config.js`.
- shadcn/ui initialised with the **Base UI** primitive library (`@base-ui/react`), not
  Radix. Components are added via the shadcn CLI into `src/components/ui/`.
- Icons: `lucide-react`. Toasts: `sonner` (shadcn `sonner` component, adapted to our own
  theme provider rather than adding `next-themes`).
- Theme: light by default; a small `ThemeProvider` toggles the `dark` class on
  `<html>`, persists the preference (non-sensitive) in `localStorage`, and an inline
  script in `index.html` avoids a flash of the wrong theme.
- Visual direction: clean SaaS, neutral palette, a single restrained accent, subtle
  borders, visible focus rings, responsive grid, minimal animation (respect
  `prefers-reduced-motion`).

## Consequences

Generated shadcn files are owned by us but should stay close to upstream to ease updates.
