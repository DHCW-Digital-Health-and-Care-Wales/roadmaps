# ADR-0002: Layered architecture and the roadmap repository boundary

- Status: Accepted
- Date: 2026-11-10

## Context

Google Sheets is the initial data store. It will later be replaced by a PostgreSQL-backed
HTTP API. The presentation layer must not change when that happens.

## Decision

Four layers with one-way dependencies:

```
React UI (features/*/components, pages, routes)
  -> application hooks (features/*/hooks, TanStack Query)
    -> domain (Roadmap, RoadmapRepository)            <- framework free
      <- infrastructure adapters implement the domain interfaces
         (GoogleSheetsRoadmapRepository -> Sheets HTTP client -> Sheets API)
app/ (composition root) is the only module that imports concrete adapters.
```

- `domain/roadmap/roadmap.ts`: `interface Roadmap { id: string; name: string }`.
- `domain/roadmap/roadmap-repository.ts`: `interface RoadmapRepository { listRoadmaps(): Promise<Roadmap[]> }`.
  The detail view derives a single roadmap from the list (TanStack Query `select`) — we do
  not add `getRoadmap` until a real need exists.
- `lib/errors.ts` defines a transport-agnostic `AppError` with a discriminated `kind`
  (`unauthenticated` | `forbidden` | `not-found` | `rate-limited` | `network` |
  `invalid-response` | `unknown`) plus a `retryable` flag. Adapters translate their
  transport failures into `AppError`; UI copy is chosen from `kind` only. A future API
  adapter maps HTTP statuses to the same kinds.
- `infrastructure/google-sheets/`:
  - `sheets-client.ts` — a small reusable client (`createSheetsClient({ fetch, baseUrl,
getAccessToken })`) that performs authorised GETs with native `fetch`, maps HTTP/network
    failures to `AppError`, and returns `unknown` JSON for callers to validate.
  - `sheets-schemas.ts` — Zod v4 schemas for the metadata response
    (`fields=sheets(properties(sheetId,title,index,hidden))`).
  - `google-sheets-roadmap-repository.ts` — implements `RoadmapRepository`: requests
    metadata, validates, drops hidden sheets, preserves API order, maps
    `String(sheetId)` -> `id`, `title` -> `name`. No name-based filtering (e.g. "Template").
- The repository receives an access-token provider function, never React state. It is
  provided to React through a tiny context (`RoadmapRepositoryProvider` /
  `useRoadmapRepository`) that lives in `features/roadmaps/`; `app/` creates the concrete
  repository and passes it to the provider. Dependencies point inward only: `app/` may
  import features, but features never import `app/` (that would be a cycle).

## Consequences

- Swapping data sources is a one-line change in the composition root.
- Google types never escape `infrastructure/`. ESLint import restrictions enforce the
  direction where practical (`no-restricted-imports` per layer).
