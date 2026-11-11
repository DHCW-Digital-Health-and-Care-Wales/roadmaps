# STY-023: The repository publishes a roadmap's changes

- **Status**: Proposed — owner decisions settled in the Editing epic's grilling
  (2026-11-11); waits for STY-022
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features + E2E
- **Epic**: EPC-005-editing
- **Depends on**: STY-022 (hard)
- **Binding ADRs**: ADR-012 §"Finding what to write" and §"The repository call",
  ADR-002, ADR-009, ADR-011, ADR-003
- **Suggested model**: Opus — the app's first write to a shared, public data source:
  atomicity, conflict detection and column placement must all be right

## Summary

The repository learns to write. Given a roadmap's pending changes, each with the value it
was edited from, it re-reads the roadmap, refuses if a co-lead changed the same field or
removed an item or the roadmap, and otherwise writes every change, any missing item IDs
and any missing columns in one all-or-nothing request. Nothing visible changes: no
screen calls it until STY-025. The E2E fake learns to accept the write, so later stories
can prove a publish end to end.

## Scope

`domain/roadmap/` (the call and its change and outcome types, ADR-012 outline),
`infrastructure/google-sheets/` (a write method on the client, the adapter's publish, the
tab list read gains each tab's grid size), the in-memory double and the repository
contract, a `features/roadmaps/` mutation hook (not yet used), and the E2E fake. The
README's spreadsheet format section gains `Item ID` and what the editor writes.

## Acceptance criteria

### S1: Changes are written to the right cells

**Given** Product A's index row and tab, and changes to its status label and to two items'
titles and phases, every base equal to the current value
**When** the changes are published
**Then** the outcome is "published", and re-reading shows exactly those values
**And** no other cell changed: Welsh cells, `Last updated`, tags, organisations, details,
other roadmaps' rows and the `Template` tab are byte-for-byte the same

### S2: One request, all or nothing

**Given** changes to the roadmap's text and to items
**When** they are published
**Then** the Google adapter sends one `spreadsheets.batchUpdate`, after its three reads
**And** a failing write (any HTTP error) leaves the spreadsheet unchanged and rejects with
the matching `AppError`, as reads map statuses

### S3: Text is stored as typed

**Given** a change whose value is `=SUM(A1)`, `42`, `1/2` or `TRUE`
**When** it is published
**Then** the cell holds that exact string, not a formula, number, date or boolean
**And** clearing an optional field writes an empty cell

### S4: Items are found by ID wherever their row moved

**Given** an item edited while on row 4, and a co-lead has since inserted a row above it
**When** the change is published
**Then** the item's new row is written, found by its `Item ID`

### S5: An item without an ID is found only if unchanged

**Given** an item loaded without an ID at position 3 among the kept items
**When** the change is published and position 3 still holds exactly the loaded content
**Then** that row is written
**And** if position 3 holds anything else, the item is reported as not found and nothing
is written (ADR-012 Option 13)

### S6: IDs are assigned on every publish

**Given** a tab where some kept rows have no ID and one repeats an earlier ID
**When** any change to that roadmap is published
**Then** each of those rows gains a new ID unique in the tab; the first of the duplicates
keeps its own
**And** an ID is short, random, and cannot read as a number, a date, a boolean or a
formula

### S7: A missing column is added last

**Given** a tab with no `Item ID` (or no `Phase`) column, whose widest row ends at its
grid's last column
**When** a change needing it is published
**Then** the grid grows and the column is added after the last column any row uses,
headed `Item ID` (or the public site's English header), in the same request
**And** no existing column moves; the same holds for a missing column of the roadmap
index

### S8: A co-lead's change to the same field stops everything

**Given** a pending title whose base is "A" and whose value is "B", and the current
title is "C"
**When** the changes are published
**Then** nothing is written and the outcome lists that field with its base, pending and
current values
**And** a current value equal to the pending value ("B") is not a conflict, and a
co-lead's change to a field not edited is not a conflict and is not overwritten

### S9: Missing items and a missing roadmap are outcomes

**Given** an edited item whose ID is no longer in the tab, or a roadmap whose index row is
gone
**When** the changes are published
**Then** nothing is written and the outcome names what could not be found
**And** a tab that can no longer be read (`invalid-data`) rejects as `listRoadmapItems`
does

### S10: Refusals and an expired session reject

**Given** the data source answers the write with 403, or the token has expired
**When** the changes are published
**Then** the call rejects with `forbidden` or `unauthenticated`, nothing is retried
automatically, and nothing is written
**And** an aborted call rejects with the signal's reason

### S11: The E2E fake accepts the write

**Given** an E2E test that publishes through the repository
**When** the fake receives the `batchUpdate`
**Then** it applies it to its spreadsheet, so later reads return the new values, and
records it (`sheets.writes`)
**And** it records a violation for a request outside the agreed shape (another method or
path, a `Template` write, a formula value, a write to a Welsh column)

## Tests

S1–S10 run in the repository contract (in-memory double and Google adapter against MSW),
plus adapter tests for the exact request (S2, S3, S7). S11 is proved by an E2E test that
publishes from the page in STY-025; this story adds a fake unit test or a minimal
fixture-level spec.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q4, Q17): a roadmap's edits are written together,
  all or nothing → S2.
- **D2** (owner, 2026-11-11, grilling Q15, Q16): conflicts are field-level and any
  conflict publishes nothing → S8.
- **D3** (owner, 2026-11-11, grilling Q13, Q23, Q30): IDs are assigned to every kept row
  on any publish; an item without an ID is matched by position plus exact content, and
  is treated as not found otherwise → S5, S6, S9.
- **D4** (owner, 2026-11-11, grilling Q28): a missing column is appended with the public
  site's English header → S7.
- **D5** (owner, 2026-11-11, grilling Q8, Q14): `Last updated` and the `Template` tab are
  never written → S1.
- **D6** (agent, 2026-11-11): `updateCells` with `userEnteredValue.stringValue` over
  `values.batchUpdate` with `RAW`, because only `spreadsheets.batchUpdate` also carries
  `appendDimension` and is atomic across both tabs (S2, S3, S7).
- **D7** (agent, 2026-11-11): a conflict and a not-found are outcomes, not `AppError`s, so
  the page can show both without a catch (ADR-012).

## Starting point

Audited at `8479405`:

- `createSheetsClient` sends only `GET` with `fields` (`getJson`); a write needs `POST`
  with a JSON body and the same token, abort and status mapping.
- The metadata mask is `sheets(properties(sheetId,title,index,hidden))`; publishing also
  needs `gridProperties(rowCount,columnCount)`. Reads do not, but sharing one mask keeps
  one fake path.
- Values are read with the default `FORMATTED_VALUE`; a base value is compared with that,
  so compare formatted to formatted.
- `tests/e2e/fixtures/fake-sheets.ts` answers non-`GET` with 404 (`#readOf`).
- `README.md` §"Spreadsheet format" and its note on "planned editing features" describe
  the format the editor reads; both change here.

## Out of scope

- Any screen: STY-025 and STY-026.
- Writing Welsh, tags, organisations, details or placement: later records.
