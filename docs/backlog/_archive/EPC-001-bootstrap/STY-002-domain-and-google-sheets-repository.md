# STY-002 — Domain model, error model, Google Sheets client & repository

## Goal

Framework-free domain + a robust Google Sheets adapter that turns spreadsheet metadata into
`Roadmap[]`, with exhaustive unit/integration tests. See ADR-0002.

## Scope

- `src/domain/roadmap/roadmap.ts`, `roadmap-repository.ts` exactly as ADR-0002.
- `src/lib/errors.ts`: `AppError` (extends `Error`, `kind`, `retryable`, optional `cause`,
  optional `status`), `isAppError`, and `toAppError(unknown)` normaliser. No UI copy here.
- `src/infrastructure/google-sheets/`:
  - `sheets-client.ts` — `createSheetsClient({ fetch?, baseUrl?, getAccessToken })` with a
    `getJson(path, searchParams)` (or narrowly typed `getSpreadsheetMetadata`) method.
    Sends `Authorization: Bearer`, `Accept: application/json`. Missing token ->
    `AppError('unauthenticated')` without a request. Maps 401 -> unauthenticated,
    403 -> forbidden, 404 -> not-found, 429 -> rate-limited (retryable), 5xx -> unknown
    retryable, `TypeError`/network -> network (retryable), invalid JSON -> invalid-response.
    Reads Google's error body (`error.status`/`message`) defensively for diagnostics but
    never surfaces raw messages as UI copy. Never logs tokens. Supports `AbortSignal`.
  - `sheets-schemas.ts` — Zod v4 schema for
    `{ sheets?: Array<{ properties: { sheetId, title, index?, hidden? } }> }`. Missing
    `sheets` = empty spreadsheet. Malformed -> `AppError('invalid-response')`.
  - `google-sheets-roadmap-repository.ts` — `class GoogleSheetsRoadmapRepository implements
RoadmapRepository` (constructor takes `{ client, spreadsheetId }`), requests
    `GET /{spreadsheetId}?fields=sheets(properties(sheetId,title,index,hidden))`,
    validates, excludes `hidden: true`, preserves response order, maps
    `id: String(sheetId)`, `name: title`. No name-based filtering.
  - `index.ts` barrel exporting only what the composition root needs.
- Accept an optional `AbortSignal` path through if it fits cleanly (TanStack Query passes
  one); keep the domain interface as specified — an optional `{ signal }` options param on
  `listRoadmaps` is acceptable only if documented in ADR-0002.

## Tests (Vitest + MSW)

- Parsing: valid, empty (`{}` and `{ sheets: [] }`), malformed variants (missing title,
  wrong types, non-object).
- Mapping: id from sheetId (stable, stringified, including `0`), order preserved, hidden
  excluded, "Template"-named sheets retained.
- HTTP categorisation: 401/403/404/429/500, network failure, non-JSON body; asserts
  `Authorization` header and exact `fields` query parameter; no request without token.
- A reusable `RoadmapRepository` contract test (`describeRoadmapRepositoryContract(factory)`)
  run against the Google adapter, so future adapters reuse it.

## Acceptance criteria

- [x] No React/TanStack/Google imports in `domain/`; no React/TanStack in `infrastructure/`.
- [x] All tests above exist and pass; lint/typecheck/build green.

## Review notes

Sol review (Codex `gpt-6.1-sol`, high) — no blockers; both findings fixed:

1. **Body-read transport failures were reported as `invalid-response` (not retryable).**
   Fixed: the client reads the body as text inside the transport `try` (a stream failure
   becomes a retryable `network` error) and only `JSON.parse` failures become
   `invalid-response`. Test: erroring response stream.
2. **Cancellation was only honoured on failure paths** (an aborted call without a token
   rejected as `unauthenticated`; a fetch ignoring the signal could still resolve).
   Fixed: `getJson` wraps the request in `try/finally` with `signal?.throwIfAborted()`, so
   an aborted signal always rejects with its reason. Tests: aborted without a token, and
   aborted before a success / error response is read (custom reason identity).
