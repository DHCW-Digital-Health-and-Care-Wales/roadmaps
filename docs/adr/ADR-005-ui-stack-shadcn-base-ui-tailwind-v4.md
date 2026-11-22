# ADR-005: UI stack — shadcn/ui on Base UI with Tailwind CSS v4

- Status: Accepted; the _Visual direction_ bullet is superseded by ADR-010, and the rest
  stands
- Date: 2026-11-10 (amended in STY-017: no toasts)

## Decision

- Tailwind CSS v4 via `@tailwindcss/vite`, CSS-first config (`@import "tailwindcss"`,
  `@theme`, CSS variables) in `apps/editor/src/styles/globals.css`. No `tailwind.config.js`.
- shadcn/ui initialised with the **Base UI** primitive library (`@base-ui/react`), not
  Radix. Components are added via the shadcn CLI into `apps/editor/src/components/ui/`.
- Icons: `lucide-react`. No toasts (amended in STY-017): the app announces outcomes with
  a callout at the top of the page (the `Alert` component), as DHCW's notification
  banner does, and `sonner` was removed with its last toast. A failure stays until the
  next attempt or a dismissal; a confirmation clears itself after a short dwell, paused
  while it is hovered or focused. The rule for copy is the copywriter skill's "Page
  notice" pattern.
- Theme: light by default; a small `ThemeProvider` toggles the `dark` class on
  `<html>`, persists the preference (non-sensitive) in `localStorage`, and an inline
  script in `apps/editor/index.html` avoids a flash of the wrong theme.
- Visual direction (superseded by ADR-010): clean SaaS, neutral palette, a single restrained accent, subtle
  borders, visible focus rings, responsive grid, minimal animation (respect
  `prefers-reduced-motion`).

## Consequences

Generated shadcn files are owned by us but should stay close to upstream to ease updates.
