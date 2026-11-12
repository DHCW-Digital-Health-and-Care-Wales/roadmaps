# Code review lenses: Data, repository and caches

Lenses for a diff touching the repository, an adapter, a parser, a query or a mutation. Apply them in `../SKILL.md`'s
working order, and grade and report findings as it sets.

- **Layer and repository boundary (ADR-002).** UI, hooks and tests-of-UI speak
  `Roadmap`, `RoadmapRepository`, `AuthClient` and `AppError`, never
  spreadsheets, worksheets, ranges, `sheetId`, Google response types or
  statuses. The domain stays framework-free; `app/composition.ts` is the only
  importer of `@/infrastructure`. A change to `RoadmapRepository` or
  `AuthClient` updates every implementation (Sheets adapter, in-memory double,
  fake) and its shared contract test
  (`describeRoadmapRepositoryContract`), and a new adapter behavior is
  something a future HTTP API adapter could honour. No `fetch()` in components
  or hooks. A shortcut that lets a feature reach an adapter, or a Google
  detail leak into `Roadmap`, is a finding even where lint passes (a re-export
  or a barrel that sidesteps the rule).
- **Untrusted data at the boundary.** Everything crossing out of Google (the
  GIS token response, the Sheets JSON, `error_callback` payloads) is parsed
  with Zod (`zod/mini`: `z.optional`, `z._default`, `x.check(…)`, `z.pipe`) in
  `infrastructure/` before it is trusted; `@types/google.accounts` is wrong at
  runtime (`expires_in`), so a typed cast is not parsing. Check that a bad
  shape becomes `invalid-response` (not a crash or a silent empty list), that
  unknown fields are stripped, that parsed values are range-checked (an
  `expires_in` of 0 or negative, an empty title), and that the requested
  `fields` mask matches what the schema reads.
- **Client and API agree.** Compare each client predicate with the API's actual
  behavior, both directions. Status mapping (401 `unauthenticated`, 403
  `forbidden`, 404 `not-found`, 429 `rate-limited`, 5xx retryable `unknown`,
  other `unknown`), which kinds are `retryable` against which controls the UI
  offers (Retry only when retryable, Reconnect for an expired session), what
  the repository drops (hidden sheets) against what a count or empty state
  says, ordering the UI assumes against what the API returns, and the scope the
  token was granted against the scope the call needs. An action offered for a
  state the API refuses, or a list that omits rows the user expects, is a
  defect; a control hidden for a state the API accepts is a defect only where
  the requirements have the UI offer it.
- **Server-state and caches (TanStack Query).** Query keys extend
  `authScopedQueryKey` (`roadmapKeys.all` does), so `disconnect()` drops them;
  a new authorised query outside that root survives a disconnect and leaks the
  last session's data. Check key identity (every input of the `queryFn` is in
  the key), `enabled` is tied to `connected`, `signal` is passed through to the
  repository, retries come only from `shouldRetryQuery` (retryable `AppError`s,
  at most 2; a per-query `retry` or a thrown non-`AppError` that gets retried
  is a finding), `select` stability (`useCallback`) and what `data: null`
  means for "not found". On session end the auth-scoped queries are cancelled,
  then invalidated with `refetchType: "none"`; `QueryCache.onError` maps
  `unauthenticated` to `reportUnauthenticated()` once per query. Verify new
  queries and mutations fit that flow, and that a mutation invalidates every
  query whose answer it changes (the list and anything derived from it).
  Repository abort rejects with `signal.reason`, not an `AppError`; code that
  catches errors must not turn an abort into an error state.
