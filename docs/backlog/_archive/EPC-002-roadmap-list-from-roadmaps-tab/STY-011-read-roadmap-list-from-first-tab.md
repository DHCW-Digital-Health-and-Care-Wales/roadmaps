# STY-011: The roadmap list shows the roadmaps the public site lists

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Infrastructure + E2E + Docs
- **Epic**: EPC-002-roadmap-list-from-roadmaps-tab
- **Depends on**: STY-010 (hard)
- **Binding ADRs**: ADR-009 §"Reading the list", §"Mistakes in the list"; ADR-002
- **Suggested model**: Sonnet — a second request and an E2E fake rework, following a
  settled design
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/5

## Summary

After connecting, the roadmap list shows one card per roadmap in the data source's
roadmap index, titled as the public site titles it, including roadmaps not yet published,
instead of one card per worksheet. Each card opens a detail address that matches the
roadmap's public page (`#/roadmaps/producta`). The cards stay as plain as today; showing
the rest of each roadmap's information is STY-012.

## Scope

- `infrastructure/google-sheets/`: the repository reads the worksheet metadata, then the
  first tab's values, and returns the parsed roadmaps in row order; a roadmap whose tab
  is missing is recorded as a problem and kept. A Zod schema for the values response.
- The repository contract and the in-memory double move to slug ids and full roadmaps.
- `tests/e2e/`: the fake serves the example CSVs for both reads and rejects any other
  read; specs move to the example roadmaps.
- README: a short "Spreadsheet format" section pointing at the analysis and the fixtures.
  Every statement that worksheets are roadmaps is corrected, including root `AGENTS.md`
  "What this is" and `tests/e2e/AGENTS.md`. Copy that says the same (for
  example `roadmaps.description`) is checked with the `copywriter` skill.

## Acceptance criteria

### S1: The list shows the listed roadmaps, not the worksheets

**Given** the data source holds the example spreadsheet (`tests/fixtures/sheets/`)
**When** a connected user opens the main page
**Then** they see three cards, "Product A roadmap", "Product B roadmap" and "Product C
roadmap", in that order, and the count reads 3 roadmaps
**And** no card is named after the list tab or any other tab

### S2: Cards open addresses that match the public site

**Given** the example roadmaps are listed
**When** the user opens Product A's card, or reloads `#/roadmaps/producta`
**Then** the detail page shows "Product A roadmap"
**And** `#/roadmaps/0` shows "Roadmap not found"

### S3: The first tab is the list, whatever it is called

**Given** the list tab is called "Index" and is first, though hidden or with no `index`
in the metadata
**When** the list loads
**Then** the roadmaps come from "Index"
**And** a tab title with a space or an apostrophe is read correctly

### S4: A roadmap whose tab is missing is still listed

**Given** a listed roadmap names a tab the spreadsheet does not have
**When** the list loads
**Then** its card is shown like the others

### S5: An unreadable list shows a problem the user can act on

**Given** the first tab's header has no `Sheet` column, or the first tab is empty
**When** the list loads
**Then** the user sees the `invalid-data` problem without a Retry button, in English and
Welsh
**And** a list with a header and no rows shows the empty state

### S6: Every existing problem and state still works

**Given** either read fails with 401, 403, 404, 429, 5xx or a network failure, or returns
a malformed body
**When** the list loads
**Then** the user sees the same problem, Retry and Reconnect behaviour as today
**And** a superseded load is cancelled without starting its second read

## Tests

S3, S4 and S6's request details are MSW integration tests of the repository, which pin
the exact paths and parameters. S1, S2 and S5 are Playwright against the fake, since they
cross the router, the query layer and both reads.

## Decisions

- **D1** (owner, 2026-11-10, grilling round 1 Q1): roadmaps not published are listed.
  Holds in S1 (Product C).
- **D2** (owner, 2026-11-10, grilling round 1 Q2): a missing tab never fails the list.
  Holds in S4.

## Starting point

Audited at `16632d3`. The E2E fake checks every request's path, `fields` and token and
records misuse as a violation (`tests/e2e/AGENTS.md`); keep that for the values read.
Specs and tests that name the invented worksheets or `#/roadmaps/42`:
`rg -ln "roadmaps/42|Mobile app|Data & analytics|Platform" src tests`. In dev, StrictMode
repeats the first fetch, so screenshot scripts should route reads themselves rather than
queue replies.

## Out of scope

- Showing category, status, product lead and the rest on the cards: STY-012.
- Showing recorded problems: a later sheet-health record (EPC-002 Out of scope).

## Delivery

### Departures

- **S4, where the missing-tab problem is recorded** (agent): the parser's new
  `tabTitles` option records `missing-tab` (row, `Sheet` header, value) for each kept
  row whose `Sheet` matches no tab title exactly; skipped rows are not checked. The
  repository passes the tab titles from its first read and, as ADR-009 says, nothing
  shows the problems yet: `listRoadmaps` returns only the roadmaps.
- **S3, a spreadsheet with no tabs** fails with `invalid-data` without the values read,
  as ADR-009 lists it among the unreadable lists.
- **S3, which tab is first**: the one with the lowest `index`, a missing `index` being
  0, as Google omits it; hidden tabs count. Its title is quoted for A1 notation (`'`
  doubled) and URL-encoded as one path segment.
- **Copy** (agent, with the `copywriter` skill): `roadmaps.description` no longer
  names the spreadsheet ("Every roadmap, published or not."), since nothing there is
  the reader's to act on. `roadmaps.empty.description` and
  `roadmaps.detail.notFoundDescription` dropped "visible", which meant visible
  worksheets: "The connected spreadsheet doesn't list any roadmaps yet." and "This
  roadmap doesn't exist or is no longer listed." The Welsh of all three is
  machine-assisted and needs a fluent review. The copywriter's empty-state pattern
  follows.
- **Feature tests** moved from the invented worksheets and numeric ids to the example
  roadmaps (`producta`, `productb`, `productc`); `#/roadmaps/0` is now the unknown id.
- **E2E fake API** (agent): `sheets.respondWith({ worksheets } | { status })` is
  replaced by `sheets.spreadsheet` (tabs with rows; `withRoadmapIndex(rows)`) and
  `sheets.failWith(...statuses)`, since one load is now two requests that must read the
  same spreadsheet. `sheets.reads` records which read each request was.
- **S6, a failure of the second read** is held by the MSW tests only; the E2E fake's
  `failWith` fails whichever request comes next, which is the tab list.
- **Test order**: the repository, values-schema and missing-tab tests were written
  first and failed (38 failures) before the code that passes them; the E2E specs
  followed the working code.

### Contract for dependents

- **Repository**: `GoogleSheetsRoadmapRepository.listRoadmaps` makes two reads, both
  with the caller's `signal`: `GET /{id}?fields=sheets(properties(sheetId,title,index,hidden))`,
  then `GET /{id}/values/{quoted first tab}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&fields=values`.
  A load cancelled during the first read never starts the second. Its private
  `#readRoadmapIndex` returns the parsed index with problems, for a later sheet-health
  view; the id → tab mapping (`entries[].tabName`) stays in the adapter for the roadmap
  detail work.
- **Schemas**: `parseSheetValues(json)` (`sheets-schemas.ts`) returns `string[][]` (no
  `values` → `[]`) or throws `invalid-response`.
- **Parser**: new problem code `missing-tab`; `CATEGORY_SHEET_VALUES` is exported for
  tests that write index rows.
- **Contract test**: fixtures are slug ids and full roadmaps (category, family, status,
  product lead, date, colour, vision, service description, Welsh title, an unpublished
  roadmap); each adapter's `withRoadmaps` must round-trip them.
- **E2E hooks** (en): cards "Product A roadmap", "Product B roadmap", "Product C
  roadmap", in that order, `href` `#/roadmaps/producta` etc.; count "3 roadmaps";
  the `invalid-data` panel "Couldn't load your roadmaps" with no buttons. See
  `tests/e2e/AGENTS.md` for the fake.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `tests/e2e/roadmaps.spec.ts` (`connecting shows the roadmaps the roadmap index lists, in its order (S1)`); `google-sheets-roadmap-repository.test.ts` (`the listed roadmaps (S1)`)                                                                                                                                                 |
| S2       | `tests/e2e/roadmaps.spec.ts` (`a card opens the address of its public page…`, `a deep link survives a reload (S2)`, `a worksheet id is not a roadmap address (S2)`)                                                                                                                                                                |
| S3       | `google-sheets-roadmap-repository.test.ts` (`which tab is the list (S3)`: lowest index in any order, a missing index, hidden, a space, an apostrophe, a slash and a hash, no tabs)                                                                                                                                                 |
| S4       | `google-sheets-roadmap-repository.test.ts` (`a roadmap whose tab is missing (S4)`); `roadmap-index-parser.test.ts` (`a roadmap whose tab is missing`)                                                                                                                                                                              |
| S5       | `tests/e2e/roadmap-errors.spec.ts` (`a roadmap index with no Sheet column can't be read…`, `an empty roadmap index can't be read, in Welsh too (S5)`); `tests/e2e/roadmaps.spec.ts` (`a roadmap index with no roadmaps shows the empty state (S5)`); `google-sheets-roadmap-repository.test.ts` (`an unreadable list (S5)`)        |
| S6       | `google-sheets-roadmap-repository.test.ts` (`failures (S6)`: 401, 403, 404, 429, 500, 503 and network on either read, malformed bodies; `does not start the second read once the load is cancelled (S6)`); `sheets-schemas.test.ts` (`parseSheetValues`); `tests/e2e/roadmap-errors.spec.ts` (Retry, 403, 401 → Reconnect, expiry) |
