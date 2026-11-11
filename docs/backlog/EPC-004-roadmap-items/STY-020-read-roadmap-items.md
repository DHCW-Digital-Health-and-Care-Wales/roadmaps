# STY-020: The repository reads a roadmap's items from the tab its index row names

- **Status**: Proposed — selectable once STY-019 is on `main`
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + E2E
- **Epic**: EPC-004-roadmap-items
- **Depends on**: STY-019 (hard)
- **Binding ADRs**: ADR-011 §"Reading the items", §"Mistakes in a roadmap tab"; ADR-009
  §"Reading the list"; ADR-002; ADR-003 (auth-scoped data)
- **Suggested model**: Opus — a new repository contract across the adapter, the
  in-memory double, the query layer and the E2E fake, with failure modes to get exactly
  right

## Summary

Makes a roadmap's items reachable. The roadmap repository gains a call that returns one
roadmap's items: the Google adapter finds the roadmap's tab through the roadmap index and
reads it with STY-019's parser, published or not. A roadmap that does not exist, or
whose tab is missing or unreadable, fails with a clear problem kind for that roadmap
alone. A query hook exposes the items to the roadmap page, cleared on disconnect like
the list. Nothing visible changes yet: STY-021 shows the items.

## Scope

- `domain/`: `RoadmapRepository.listRoadmapItems(roadmapId, options?)` (ADR-011) and its
  contract tests.
- `infrastructure/google-sheets/`: the adapter's implementation, sharing the index read
  with `listRoadmaps`.
- `features/roadmaps/`: the in-memory double holds items per roadmap; a query key under
  `roadmapKeys.all` and a `useRoadmapItems(roadmapId)` hook, fetching only while
  connected.
- `tests/e2e/fixtures/`: the Sheets fake serves every tab of its spreadsheet.
- ADR-002 gains an ADR-011 amendment recording the new call. The README's "Spreadsheet
  format" ("Every other tab is a roadmap's items, not read yet") and the `sheets` entry of
  `tests/e2e/AGENTS.md` ("reading any other tab is a violation") change to match, linking
  the roadmap tab analysis and ADR-011.

## Acceptance criteria

### S1: A roadmap's items are read from its own tab

**Given** the example spreadsheet (`tests/fixtures/sheets/`)
**When** the items of `producta` are requested
**Then** they are ProductA's nine items in row order, as STY-019 S1 parses them
**And** the requests are, in order: the tab list, the first tab's values, then the
`ProductA` tab's values, with the same parameters and bearer token as the list's reads

### S2: An unpublished roadmap's items are read too

**Given** the example spreadsheet
**When** the items of `productc` (not published) are requested
**Then** its item is returned, with no organisations, since its tab has no
`Organisations` column

### S3: An unknown roadmap is not found

**Given** the example spreadsheet
**When** the items of `0` are requested
**Then** the call fails with the `not-found` problem kind, not retryable, after reading
only the tab list and the first tab

### S4: A missing or unreadable tab is invalid data for that roadmap only

**Given** an index row whose `Sheet` names no tab, and another whose tab has no `Title`
column
**When** each roadmap's items are requested
**Then** each fails with the `invalid-data` problem kind, not retryable
**And** the missing tab is never requested
**And** listing the roadmaps still succeeds with both roadmaps

### S5: Tab titles are quoted and matched exactly

**Given** a roadmap whose `Sheet` is `Product's "B" & co`, matching a tab of that exact
title
**When** its items are requested
**Then** the tab is read with its title quoted, the quote doubled, as one encoded path
segment
**And** a tab titled `producta` does not match a `Sheet` of `ProductA`

### S6: Failures and cancellation behave as the list's do

**Given** each read in turn failing with 401, 403, 429, 5xx or a network error, or the
signal aborted mid-read
**When** a roadmap's items are requested
**Then** the call rejects with the same problem kind as `listRoadmaps` would, and with
the abort reason when cancelled
**And** a 401 expires the session, as for the list

### S7: Items are auth-scoped data

**Given** a connected user whose roadmap's items have loaded
**When** they disconnect
**Then** the cached items are removed
**And** while not connected, no items are requested; after reconnecting they are fetched
again

### S8: Nothing visible changes yet

**Given** a connected user
**When** the roadmap list and a roadmap's page load
**Then** they look and behave as before, and the page makes no items request until
STY-021 uses the hook
**And** every existing unit, component and E2E test passes

## Tests

S1–S6 are adapter tests against MSW-mocked Sheets responses built from the fixture CSVs
or inline rows, plus the repository contract run against both the adapter and the
in-memory double (S1, S3, S6's cancellation). S7 is a hook test with the providers'
test utility. The E2E fake's change is proved by STY-021's specs; this story keeps the
existing E2E suite green (S8).

## Decisions

- **D1** (owner, 2026-11-10, grilling round 1, ADR-011 Option 3): the adapter re-reads the tab
  list and the index on every items call, over remembering tabs from the last list read,
  which would be stale after a rename and empty after a reload.
- **D2** (agent, 2026-11-10): an id the index does not list is `not-found` (S3), over
  `invalid-data`, because the data is well formed; the roadmap is simply not there. The
  page shows it as STY-021 D11 sets (Opus review).
- **D3** (agent, 2026-11-10): the tab is matched to the `Sheet` value exactly, as the
  index parser's `missing-tab` problem already does (S5), so an editor-visible problem
  and a failed read always agree.

## Starting point

Audited at `0f9f09e`; re-checked at `215c0c1`. `GoogleSheetsRoadmapRepository.#readRoadmapIndex`
already reads the tab list and the index and returns `{ entries, problems }`, entries
being `RoadmapIndexEntry { roadmap, tabName }`; reuse it, but it does not return the tab
titles it read, which S4's "never requested" check needs: return them from the shared
read too (or say on each entry whether its tab exists).
`quoteTabTitle` and `SHEET_VALUES_PARAMS` are the list's. The E2E fake answers 400 for
any tab but the first (`rg -n "not the first tab" tests/e2e`) and documents itself as
reading only the index; its `EXAMPLE_SPREADSHEET` already holds the three roadmap tabs.
The fake logs reads as `"metadata" | "values"` (`SheetsRead`), so it cannot show which
tab S1 read: extend the log with the tab. `tests/fixtures/sheets/ProductC.csv` says "this
tab is never read"; the CSVs are copied unchanged from the public site, so leave that text
alone. The contract's `withRoadmaps(roadmaps)` seeds roadmaps only, and the in-memory double
takes `roadmaps | AppError`: both need a way to seed items per roadmap.

## Out of scope

- Showing items, and the item-specific copy for `invalid-data`: STY-021.
- Reading the `Template` tab: never (epic).
- A cache of id → tab, or a batched read: only if the three reads prove slow (ADR-011).
