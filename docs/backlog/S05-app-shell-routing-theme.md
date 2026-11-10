# S05 — Composition root, routing, app shell, theme, auth UI

## Goal

The app boots through a single composition root, renders a polished responsive shell with
header (product name, icon, theme toggle, connection status, Connect/Disconnect), the
unauthenticated welcome state, and the route skeleton.

## Scope

- `src/lib/query-client.ts` — `createQueryClient()` with sensible defaults
  (`staleTime` 60s, `refetchOnWindowFocus: false`, retry policy: never retry
  non-retryable `AppError`s, max 2 for retryable ones).
- `src/app/composition.ts` — builds config, auth client, sheets client (with
  `getAccessToken` from the auth client), `GoogleSheetsRoadmapRepository`, query client.
  The only file importing concrete adapters. Disconnect -> `queryClient.removeQueries`
  for auth-scoped keys (define a single `authScopedQueryKey` root, e.g. `['session']`
  or similar, in features — not in the composition root, to avoid magic strings).
- `src/features/roadmaps/roadmap-repository-context.tsx` — `RoadmapRepositoryProvider`
  + `useRoadmapRepository()`.
- `src/app/providers.tsx` — Theme, QueryClient, Auth, Repository providers, `Toaster`.
- Routes (`src/routes/`): `__root.tsx` (AppShell + `<Outlet/>` + not-found component),
  `index.tsx` (home page), `roadmaps.$roadmapId.tsx` (placeholder page — real content in
  S05). Typed params.
- i18n: lift the S04 i18n wiring into `app/composition.ts` (create the instance) and
  `app/providers.tsx` (`I18nextProvider`); place the `LanguageSwitcher` in the header next
  to the theme toggle. All copy (incl. aria-labels and toasts) via `t()` (ADR-0008).
- Theme: `ThemeProvider` per ADR-0005 + `ThemeToggle` (accessible label, Lucide sun/moon),
  no-flash inline script in `index.html`.
- Layout: `components/layout/app-shell.tsx`, `app-header.tsx`; header shows
  "Product Roadmaps" with a Lucide roadmap-ish icon (e.g. `Map`/`Milestone`/`Route`),
  theme toggle, `ConnectionStatus` badge ("Not connected" / "Connecting…" /
  "Google connected" / "Session expired") and Connect/Disconnect/Reconnect button
  (`features/auth/components/`). Copy never implies identity.
- Home page unauthenticated: hero with title "Product Roadmaps", subtitle
  "A simple way to explore and manage your product roadmaps.", explanation that roadmaps
  are currently sourced from Google Sheets, prominent "Connect Google" button, note that
  access is required to load the roadmaps. When connected the page renders a slot for the
  roadmap list (implemented in S06; a minimal placeholder is fine now).
- shadcn components added as needed via CLI (e.g. `card`, `badge`, `sonner`, `skeleton`,
  `separator`, `dropdown-menu` only if used). Sonner adapted to our ThemeProvider.
- Sonner usage: one toast on successful connect, one on disconnect, error toast for
  OAuth failures (not for popup-closed). No toast spam.
- `src/test/render-with-providers.tsx` — shared test utility wiring router (memory
  history), query client, fake auth client and an in-memory repository.

## Tests

- Landing renders title/subtitle/explanation and Connect button for `ready` state.
- Clicking Connect calls `authClient.connect`.
- Header status reflects each auth state; Disconnect calls disconnect and clears
  auth-scoped queries.
- Theme toggle switches `dark` class and persists preference.
- Not-found route renders for unknown hash path.
- Landing renders in Welsh when the test i18n instance is `cy`; header language switcher works.

## Acceptance criteria

- [ ] App renders in dev; header responsive at 375px; keyboard focus visible everywhere.
- [ ] No literal user-facing strings outside the i18n catalogues.
- [ ] Only `src/app/composition.ts` imports from `@/infrastructure`.
- [ ] All checks green.
