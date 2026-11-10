# STY-006 — Roadmaps feature: query hooks, list, states, detail page

## Goal

Authenticated users see their roadmaps as cards with first-class loading, empty, error,
permission, reconnect, retry and refresh behaviour; cards navigate to a placeholder
detail page.

## Scope

- `src/features/roadmaps/hooks/roadmap-queries.ts` — query key factory
  (`roadmapKeys.all/list()` under the auth-scoped root from STY-005) and `queryOptions` for
  the list.
- `useRoadmaps()` — enabled only when auth state is `connected`; `staleTime` 60s; uses
  the repository from context; passes the abort signal if supported. On
  `AppError('unauthenticated')` calls `auth.reportUnauthenticated()` (once, in a query
  cache/observer-safe place — e.g. a `QueryCache` `onError` in the composition root or an
  effect-free mechanism; justify the choice).
- `useRoadmap(roadmapId)` — derives one roadmap from the list via `select`.
- `useRefreshRoadmaps()` (or `refetch` exposure) for the Refresh button; show
  `isFetching` spinner state on the button; avoid toast on every refresh (toast only on
  failure of a manual refresh, if at all).
- Components (`features/roadmaps/components/`): `RoadmapGrid`, `RoadmapCard` (Lucide icon,
  name, subtle hover/focus, whole card is a `Link` to `/roadmaps/$roadmapId`),
  `RoadmapGridSkeleton`, `RoadmapsEmptyState`, `RoadmapsErrorState` (copy chosen by
  `AppError.kind`: forbidden -> clear permission message incl. "ask the spreadsheet owner
  for access"; not-found; rate-limited; network; invalid-response; unknown), with Retry
  for retryable errors and Reconnect for unauthenticated/expired.
- `pages/roadmaps-page.tsx` section: heading "Your Roadmaps", description "Roadmaps
  available in the connected spreadsheet.", Refresh button, grid. Expired session shows a
  reconnect prompt instead of stale-but-misleading data (decide & document whether cached
  cards stay visible while expired — they must be cleared on disconnect).
- `pages/roadmap-detail-page.tsx` — name + "Roadmap details are coming soon.", back link;
  handles not-connected (prompt to connect), loading, unknown id (friendly not-found).
- All copy via i18n (ADR-008), English and Welsh; error copy keyed by `AppError.kind`;
  use the pluralised roadmap count key from STY-004 if a count is shown.
- An in-memory `RoadmapRepository` test double in `features/roadmaps/testing/`.

## Tests

- Loading skeletons, cards (order, names, links), empty state, permission error copy,
  reconnect flow (unauthenticated error -> Reconnect -> connect called), retry refetches,
  refresh refetches, query not executed while unauthenticated, cache cleared on disconnect,
  detail page states, and at least one state rendered in Welsh.

## Acceptance criteria

- [x] No Google/Sheets terminology anywhere under `features/` or `routes/` (code; copy lives in
      the catalogues).
- [x] No `fetch` and no `useEffect` data fetching in features.
- [x] All checks green.

## Decisions

- **401 → expired, in one place**: a `QueryCache` `onError` in `createQueryClient` calls an
  `onUnauthenticated` option once per failed query (after retries, which never apply to
  that kind); the composition root wires it to `authClient.reportUnauthenticated()`. It
  covers every current and future query, runs per query rather than per observer, and
  needs no effect. Rejected: a `queryFn` wrapper (couples every query to auth) and a
  `useEffect` on `error` (one call per mounted observer).
- **Expired session**: `/` keeps the roadmaps (not the hero) with an inline alert and
  Reconnect; cards loaded earlier stay visible; Refresh is disabled until connected. Data
  is only removed on disconnect. While `connecting`, `HomePage` keeps whichever view
  started the attempt (derived state during render), so reconnecting never flashes the
  hero. `invalidateAuthScopedQueriesOnSessionEnd` marks auth-scoped data stale when a
  session ends without a disconnect, so reconnecting always refetches, even within
  `staleTime` (a failed query is already invalidated by TanStack Query).
- **No toasts for query errors**: errors render inline. Without data, a panel; with data
  (failed refresh or background refetch), a compact alert above the cards. This covers
  every refetch path, and nothing has to tell a manual refresh apart from others.
- **`useRefreshRoadmaps` not added**: `useRoadmaps().refetch` backs Refresh and Retry.
- **Detail page**: `useRoadmap(id)` uses `select` on the list query (`null` = loaded, no
  such id). A cached roadmap stays visible with the same alert when expired or a refetch
  failed; "not found" is only claimed from a list that is current.
- **Cards**: `MapIcon` (the header brand mark already uses `ChartGanttIcon`), two-line
  clamp with the full name as the link text and `title`; equal row heights from `sm`.

## Review notes (Sol, `gpt-6.1-sol`)

1. Major — the detail page hid expiry and refetch failures behind cached data, and could
   report "not found" from a stale list. **Fixed**: shared `useRoadmapsProblem`, alert over
   cached content, not-found only without a problem; three tests added.
2. Minor — timer expiry within `staleTime` then Reconnect did not refetch. **Fixed**:
   `invalidateAuthScopedQueriesOnSessionEnd` (wired in the composition root and
   `renderWithProviders`), with unit and page tests.

No other findings (keys, abort, disconnect clearing, retries, `select` stability, layering,
a11y, i18n, duplication).
