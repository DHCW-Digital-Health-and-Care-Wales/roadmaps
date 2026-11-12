# STY-022: Each roadmap item keeps an identity

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure
- **Epic**: [EPC-005-editing](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012 §"Item identity", ADR-011, ADR-002
- **Suggested model**: Sonnet — a parser and model change along ADR-012's settled rules,
  with nothing visible

## Summary

Before the editor can write an item back, it must know which row the item is when a
co-lead has inserted or sorted rows meanwhile. Each item gains an identity, read from an
`Item ID` column; an item whose row has no ID yet has none, and the first publish gives it
one (STY-023). Nothing visible changes: the roadmap's page looks the same, and items are
still shown in row order. Writing IDs is STY-023's.

## Scope

`domain/roadmap/` (the item's `id`) and `infrastructure/google-sheets/` (the tab parser
reads `Item ID` by header, flags duplicates, and tells the adapter which row each item
came from). The in-memory double and test helpers follow. `features/` keeps keying items
by position: STY-025 decides when the page keys them by ID.

## Acceptance criteria

### S1: An item's ID is read by header

**Given** a roadmap's tab whose header has `Item ID` in any position, and a row whose
`Item ID` cell is `k7q2xw` (whitespace around it trimmed)
**When** the roadmap's items are read
**Then** that item's `id` is `k7q2xw`
**And** every other field reads as before, and nothing records a problem for the column

### S2: An item without an ID has none

**Given** a tab with no `Item ID` column, or a row whose `Item ID` cell is blank
**When** the items are read
**Then** each such item's `id` is `null`
**And** no problem is recorded: a missing `Item ID` column is not `missing-column`, since
every tab predates it

### S3: A repeated ID stays with the first row

**Given** two kept rows with the ID `k7q2xw`, the second below the first
**When** the items are read
**Then** the first item's `id` is `k7q2xw`, the second's is `null`
**And** a `duplicate-item-id` problem records the second row, the column and the value

### S4: A row with only an ID is still blank

**Given** a row whose only non-blank cell is `Item ID`
**When** the items are read
**Then** the row is treated as ADR-011 treats a row without a title (recorded as
`missing-title`, not kept), and its ID is not counted for S3

### S5: The adapter knows each kept item's row

**Given** a tab whose kept items are on spreadsheet rows 2, 4 and 5 (a blank row 3)
**When** the parser returns
**Then** the adapter can tell, for each item, the spreadsheet row it came from, without
any row number reaching `domain/` or `features/`

### S6: Welsh and the interface are unaffected

**Given** the example roadmaps, in English and in Cymraeg
**When** a roadmap's page is opened
**Then** it shows exactly what it showed before this story (the aria snapshots do not
change)

## Tests

S1–S5 are parser unit tests on inline rows; S2's "no column" case is also the existing
fixtures. The repository contract keeps passing with `id` set on seeded items. S6 is the
unchanged E2E suite.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q5): items are matched by an ID column, not by
  position or content → this story.
- **D2** (owner, 2026-11-11, grilling Q13): the column is headed `Item ID`, may sit
  anywhere, is visible in the sheet, and on a duplicate the first row keeps the ID → S1,
  S3.
- **D3** (agent, 2026-11-11): IDs are compared exactly after trimming, not with
  `matchKey`'s folding, because they are machine-made tokens; the header is matched with
  `matchKey` like every other header.
- **D4** (agent, 2026-11-11): the row number is returned beside the items, inside
  infrastructure (S5), over a `row` field on `RoadmapItem`, because rows are the sheet's
  concern (ADR-012 §"Item identity").

## Starting point

Audited at `8479405`: the parser keeps items in row order and records problems with a
1-based `row` already (`sheet-problem-log.ts`), so the row is known where an item is
built. `createTestRoadmapItem` builds items for features' tests; it gains `id` (default
`null`).

## Out of scope

- Writing IDs, and adding the column: STY-023.
- Keying the page's items by ID: STY-025, if it needs it.
- Showing a duplicate ID to anyone: a later sheet-health record.

## Delivery

### Departures

None. The row list is `RoadmapTab.rows`, a number array in step with `items` (D4).

### Contract for dependents

- **Domain**: `RoadmapItem.id: string | null` (`@/domain/roadmap/roadmap-item`);
  `createTestRoadmapItem` defaults it to `null`.
- **Parser** (`parseRoadmapTab`): `RoadmapTab = { items, rows, problems }`, where
  `rows[i]` is the spreadsheet row (1 is the header) of `items[i]`. `Item ID` is a header
  column like the rest (`matchKey`, any position, first header wins) with no
  `missing-column` and no Welsh version. The ID is trimmed and compared exactly; the
  first kept row with an ID keeps it, a later repeat has `id: null` and records
  `duplicate-item-id` (row, header as written, value). A row with only an ID is not
  blank, so it is `missing-title` and its ID is not counted. The adapter still returns
  `.items` only and writes nothing.
- **Tests**: the repository contract's "Every field" item has `id: "k7q2xw"`; the Google
  adapter's test writes an `Item ID` column in `tabRowsFor`. Fixtures have no such column.

### Scenario evidence

- **S1–S5**: `roadmap-tab-parser.test.ts` "item IDs" (header by position, trimmed; no
  column or blank cell; duplicate; ID-only row; rows 2, 4, 5), and the example tab's
  first item with `id: null` and no problems.
- **S6**: no `features/` or E2E file changed; the unchanged unit suite and E2E suite pass.
