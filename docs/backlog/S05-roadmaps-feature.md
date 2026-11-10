# S05 — Roadmaps feature: query hooks, list, states, detail page

## Goal

Authenticated users see their roadmaps as cards with first-class loading, empty, error,
permission, reconnect, retry and refresh behaviour; cards navigate to a placeholder
detail page.

## Scope

- `src/features/roadmaps/hooks/roadmap-queries.ts` — query key factory
  (`roadmapKeys.all/list()` under the auth-scoped root from S04) and `queryOptions` for
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
- An in-memory `RoadmapRepository` test double in `features/roadmaps/testing/`.

## Tests

- Loading skeletons, cards (order, names, links), empty state, permission error copy,
  reconnect flow (unauthenticated error -> Reconnect -> connect called), retry refetches,
  refresh refetches, query not executed while unauthenticated, cache cleared on disconnect,
  detail page states.

## Acceptance criteria

- [ ] No Google/Sheets terminology anywhere under `features/` or `routes/`.
- [ ] No `fetch` and no `useEffect` data fetching in features.
- [ ] All checks green.
