# ADR-002: Layered architecture and the roadmap repository boundary

- Status: Accepted
- Date: 2026-11-10 (amended in STY-002: optional abort `signal`, contract test; STY-003: the
  `AuthClient` port in `domain/auth/`; STY-009: lint rules for `lib/`, `components/`, `i18n/`; ADR-009: the `Roadmap`
  shape and the roadmap list's source; ADR-011: `listRoadmapItems`, delivered in STY-020; ADR-012: a
  write call, for STY-023; STY-040: a call that adds a roadmap; see below)

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
- `domain/auth/auth-client.ts`: the `AuthClient` port and `AuthState` (ADR-003), which
  `infrastructure/google-identity/` implements. Ports live in `domain/` because
  infrastructure may not import `features/`.
- `domain/roadmap/roadmap-repository.ts`:
  `interface RoadmapRepository { listRoadmaps(options?: { signal?: AbortSignal }): Promise<Roadmap[]> }`.
  The optional `signal` (a web-platform type, not a framework one) lets TanStack Query
  cancel superseded requests; on abort an implementation rejects with the signal's
  reason, otherwise every failure is an `AppError`. The detail view derives a single
  roadmap from the list (TanStack Query `select`) — we do not add `getRoadmap` until a
  real need exists.
- `domain/roadmap/testing/roadmap-repository-contract.ts`:
  `describeRoadmapRepositoryContract(name, setup)` is the shared behavioural test every
  adapter (and in-memory test double) runs, so a future `ApiRoadmapRepository` proves
  parity with the Google adapter.
- `lib/errors.ts` defines a transport-agnostic `AppError` with a discriminated `kind`
  (`unauthenticated` | `forbidden` | `not-found` | `rate-limited` | `network` |
  `invalid-response` | `unknown`) plus a `retryable` flag. Adapters translate their
  transport failures into `AppError`; UI copy is chosen from `kind` only. A future API
  adapter maps HTTP statuses to the same kinds.
- `infrastructure/google-sheets/`:
  - `sheets-client.ts` — a small reusable client (`createSheetsClient({ fetch, baseUrl,
getAccessToken })`) that performs authorised GETs with native `fetch`, maps HTTP/network
    failures to `AppError`, and returns `unknown` JSON for callers to validate.
  - `sheets-schemas.ts` — Zod v4 schemas (`zod/mini`, the tree-shakable API, as everywhere
    in the app) for the metadata response
    (`fields=sheets(properties(sheetId,title,index,hidden))`).
  - `google-sheets-roadmap-repository.ts` — implements `RoadmapRepository`: requests
    metadata, validates, drops hidden sheets, preserves API order, maps
    `String(sheetId)` -> `id`, `title` -> `name`. No name-based filtering (e.g. "Template").
- The repository receives an access-token provider function, never React state. It is
  provided to React through a tiny context (`RoadmapRepositoryProvider` /
  `useRoadmapRepository`) that lives in `features/roadmaps/`; `app/` creates the concrete
  repository and passes it to the provider. Dependencies point inward only: `app/` may
  import features, but features never import `app/` (that would be a cycle).

### ADR-009 amendments

ADR-009 supersedes two parts of this decision once EPC-002 delivers it: the
`Roadmap { id; name }` shape (now ADR-009's `Roadmap`, with a slug `id`), and the Google
adapter's mapping of each visible worksheet to a roadmap (it now reads the first
worksheet's rows, and adds the `invalid-data` kind). The layering, the repository
boundary, `listRoadmaps` with its `signal`, the contract test and `AppError` stand.

### ADR-011 amendment

The repository gains a second call (STY-020):
`listRoadmapItems(roadmapId, options?: { signal?: AbortSignal }): Promise<RoadmapItem[]>`,
a roadmap's items in source order, published or not. It rejects with
`AppError('not-found')` for an id no roadmap has, and `AppError('invalid-data')` when that
roadmap's items can't be read; every other failure, and cancellation, behaves as
`listRoadmaps`'s. Both calls take `RepositoryReadOptions`. The contract test covers it,
seeding items per roadmap. "No `getRoadmap`" stands: the detail still derives the roadmap
from the list.

### ADR-012 amendment

The repository gains its first write (EPC-005 STY-023): one call that publishes a
roadmap's pending edits, each field with the value it was edited from, and resolves to
"published" or to the conflicts and missing items or roadmap that stopped it
(ADR-012 §"The repository call"). A conflict is an outcome, not an `AppError`; every
other failure rejects as the reads do. The contract test covers it. Interface code still
never sees a row, column or cell.

### STY-040 amendment

The repository gains a call that adds a roadmap:
`addRoadmap(input: NewRoadmapInput, options?: RepositoryReadOptions): Promise<NewRoadmapOutcome>`.
The input is a title, a short name and, optionally, a family, a category and a product
lead; the outcome is the roadmap added, as `listRoadmaps` then returns it, or that its
short name is in use, that a family or category chosen is no longer listed, or that the
write is unconfirmed. Each is an outcome a screen acts on, not an `AppError`; a data
source with nothing usable to start a roadmap from rejects with `invalid-data`, and
every other failure rejects as the reads do. The rules are the domain's
(`domain/roadmap/short-name.ts`, `new-roadmap.ts`), shared by both repositories, and
the contract test covers the call. The domain names no template, tab or row.

## Consequences

- Swapping data sources is a one-line change in the composition root.
- Google types never escape `infrastructure/`. ESLint import restrictions enforce the
  direction where practical (`no-restricted-imports` per layer).
