# ADR-004: TanStack Router with file-based routes and hash history

- Status: Accepted
- Date: 2026-11-10

## Context

GitHub Pages cannot rewrite unknown paths to `index.html`; deep links must survive refresh.

## Decision

- TanStack Router with the official Vite plugin (`@tanstack/router-plugin`) and file-based
  routes in `src/routes/`. Route modules are thin and render feature pages.
- `createHashHistory()` so URLs look like `/roadmaps-editor/#/roadmaps/123`. No 404.html hack.
- Routes: `/` (landing + roadmap list), `/roadmaps/$roadmapId` (placeholder detail),
  `notFoundComponent` on the root route.
- `src/routeTree.gen.ts` is generated and committed (so typecheck works before a build);
  excluded from lint/format.
- No SSR, no TanStack Start. Data loading stays in TanStack Query hooks (not route
  loaders) because data availability depends on client-side auth state.

## Consequences

Hash URLs are slightly less pretty but deploy anywhere static with zero configuration.
