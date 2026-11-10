# STY-011: The roadmap list shows the roadmaps the public site lists

- **Status**: Proposed — waits for STY-010 on the default branch
- **Type**: Feature
- **Area**: Infrastructure + E2E + Docs
- **Epic**: EPC-002-roadmap-list-from-roadmaps-tab
- **Depends on**: STY-010 (hard)
- **Binding ADRs**: ADR-009 §"Reading the list", §"Mistakes in the list"; ADR-002
- **Suggested model**: Sonnet — a second request and an E2E fake rework, following a
  settled design

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
