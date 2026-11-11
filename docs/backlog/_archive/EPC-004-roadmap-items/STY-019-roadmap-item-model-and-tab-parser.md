# STY-019: A roadmap item carries everything its row holds, and a roadmap's tab can be parsed

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Refactor
- **Area**: Domain + Infrastructure
- **Epic**: EPC-004-roadmap-items
- **Depends on**: none
- **Binding ADRs**: ADR-011 §"What a roadmap item is", §"Reading the items", §"Mistakes in
  a roadmap tab"; ADR-009 (header matching); ADR-002
- **Suggested model**: Opus — a pure parser with many edge cases that must match another
  repository's rules, plus a behaviour-preserving extraction from the index parser
- **Delivered**: _(PR link added once raised)_

## Summary

Lays the ground for showing a roadmap's items. A roadmap item gains everything a roadmap
tab holds about it (title, horizon or section, description, expected outcome, phase,
tags, organisations and details, each in English and optionally Welsh), and a parser
turns a tab's rows into items as the public site reads them. It finds each column by its
header, not its position, and keeps items with an unrecognised horizon instead of
dropping them. Nothing visible changes: nothing reads a roadmap's tab until STY-020.

## Scope

- `domain/`: ADR-011's `RoadmapPlacement`, `Organisation`, `RoadmapItem` and
  `RoadmapItemDetail`, and a test builder for items.
- `infrastructure/google-sheets/`: a pure parser from a roadmap tab's rows to items plus
  problems; no I/O, not in the barrel. The header reader moves out of the index parser so
  both use it; the index parser's behaviour and tests stay as they are.

## Acceptance criteria

### S1: The example roadmap tab parses to its items

**Given** the rows of `tests/fixtures/sheets/ProductA.csv`
**When** the tab is parsed
**Then** it returns nine items in row order, with placements `now`, `now`, `now`, `next`,
`later`, `later`, `recently-delivered`, `delivered-this-year` and `not-doing`
**And** the first item has phase "Beta", tags "Service X" and "Service Y" with Welsh
"Gwasanaeth X" and "Gwasanaeth Y", organisations `cavuhb` then `sbuhb`, a Welsh title,
and four details at levels 0, 1, 2 and 0 whose Welsh has no leading dashes
**And** "Minimal card" has no outcome, phase, tags, organisations or details, and
"Discovery card" has a Welsh description and outcome
**And** no problems are recorded

### S2: Columns are found by header, in any order

**Given** a tab whose header puts the columns in a different order from the Template,
spells them `HORIZON`, `outcome`, `Phase (Welsh)` and `Labels - Cymraeg`, and adds an
unknown `Notes` column
**When** the tab is parsed
**Then** each value is read from the column its header names, and `Notes` is ignored
**And** a second header for the same column is ignored and recorded as a problem, and the
first is read
**And** `Horizon (cy)` and `Organisations (cy)` are ignored and recorded as problems

### S3: An item with no recognised horizon is kept (owner, decision 2)

**Given** rows whose `Horizon` is blank, `Soon`, `recently  delivered` and `NOT-DOING`
**When** the tab is parsed
**Then** the first two items have no placement, each recorded as a problem with its row
and value, and the others are `recently-delivered` and `not-doing`
**And** a tab with no `Horizon` column gives every item no placement and records one
problem for the missing column

### S4: Rows the public site skips

**Given** a blank row, a row with a description but a blank title, and a row with only a
Welsh title
**When** the tab is parsed
**Then** none becomes an item; the blank row records nothing, the other two each record a
problem with their row

### S5: Tags, organisations and details follow the public site's rules

**Given** tags `Service X, , Service Y, Service X,` with Welsh `-, Gwasanaeth Y`;
organisations `sbuhb, National, CAVUHB, Mars`; details whose Welsh has a different
number of lines; and a Welsh detail `-5 gradd` under an English line with no dash
**When** the tab is parsed
**Then** the tags are "Service X" and "Service Y" in that order, with no Welsh, since the
counts differ, and the mismatch is recorded
**And** the organisations are `national`, `cavuhb` and `sbuhb` in that order, and "Mars"
is left out and recorded
**And** the details keep their English with no Welsh, the mismatch recorded, and `-5 gradd`
keeps its dash when the counts match

### S6: Optional text is null when it has no English

**Given** an item with a blank outcome and a Welsh outcome, and missing `Phase` and
`Details` columns
**When** the tab is parsed
**Then** its outcome and phase are `null`, its details `[]`, the Welsh outcome is dropped
and recorded, and each missing optional column is recorded once
**And** a cell's surrounding spaces are trimmed and its inner line breaks kept

### S7: An unreadable tab is an invalid-data problem

**Given** a tab with no rows, or a header with no `Title` column
**When** it is parsed
**Then** it fails with the `invalid-data` problem kind
**And** a tab with only a header gives no items and no failure

### S8: The roadmap index reads as before

**Given** the shared header reader
**When** the existing roadmap index tests run
**Then** they pass unchanged

### S9: An unplaced item keeps its horizon as written (owner, grilling round 1)

**Given** rows whose `Horizon` is `Soon`, blank, and `Now`
**When** the tab is parsed
**Then** the first item has no placement and its horizon as written is "Soon", the second
has no placement and "" as written, and the third is placed `now` with no written
horizon
**And** in a tab with no `Horizon` column every item's horizon as written is ""

### S10: A blank middle entry keeps tags and details paired (Sonnet review)

**Given** tags `A,,B` with Welsh `Y,,Z`, and details with a blank middle line in both
languages
**When** the tab is parsed
**Then** the tags are "A" (Welsh "Y") and "B" (Welsh "Z"), and the details likewise keep
their Welsh, with no mismatch recorded: blank entries keep their place while pairing and
are dropped afterwards

## Tests

All scenarios are unit tests of the parser: S1 from the fixture file, the rest inline
(the fixtures README keeps edge cases out of the CSVs). S8 is the index parser's
existing suite.

## Decisions

- **D1** (owner, 2026-11-10): columns are found by header, never position; the Template
  tab's header is the public site's columns, and it is never read. Adds S2.
- **D2** (owner, 2026-11-10, analysis decision 2): an item with a blank or unknown
  horizon is kept with no placement. Adds S3.
- **D3** (owner, 2026-11-10, analysis decision 3): every column is modelled, including
  tags, organisations and details. Changes: S1, S5.
- **D4** (agent, 2026-11-10): a row with only a Welsh title is skipped (S4), since an
  item's English title is never empty (ADR-011), as the public site drops Welsh with no
  English.
- **D5** (owner, 2026-11-10, grilling round 1, ADR-011 Option 5): an unplaced item keeps
  the text written in its horizon cell, so the page can show what to fix. Adds S9.
- **D6** (owner, 2026-11-10, grilling rounds 1–2, ADR-011 Options 1–4 and 6): ADR-011
  accepted. Organisations are stored as the known twelve, unknown codes dropped and
  recorded, as S5 says; the page shows them as standard codes (STY-021).
- **D7** (agent, 2026-11-10, Sonnet review): the domain fields are `tags` and
  `expectedOutcome`, the glossary's terms, over the sheet's `labels` and `outcome`
  (ADR-011); the parser alone knows the `Labels` and `Outcome` headers. Adds S10, since
  pairing before dropping blanks is easy to port wrongly.

## Starting point

Audited at `0f9f09e`; re-checked at `215c0c1`. The public site's rules are in `scripts/parse-roadmap.ts` at
`50e67f9` (`parseRoadmap`, `toItem`, `parseLabels`, `parseDetails`, `pairLists`,
`stripWelshDashes`, `splitEntries`, `orBlank`, `parseOrganisations`); the analysis summarises them. Port the
behaviour, not the code: its warnings are prose and it throws on a missing required
column, where ADR-011 keeps `Horizon` optional. Its translation-quality warnings are not
ported (as STY-010 decided for the index). The index parser's header handling is in
`roadmap-index-parser.ts` (`readHeader`, `claim`, `matchKey`, `WELSH_HEADER`,
`ProblemLog`); its problem codes are exported and stay as they are.

## Out of scope

- Reading a tab from the data source and the missing-tab failure: STY-020.
- Showing any item: STY-021.
- Item identity: the first editing record (ADR-011).

## Delivery

### Departures

- **Problems recorded beyond the scenarios** (agent): as the public site warns for each,
  a missing optional column records `missing-column` once (S3's `Horizon` and S6's
  optional columns use the same code), and a blank and an unknown horizon are separate
  codes, `missing-horizon` and `unknown-horizon`, both with the row, the `Horizon`
  header and the value as written (`""` when blank). A missing `Horizon` column records
  no per-row horizon problem, as S3 asks.
- **S4, which rows are blank** (agent): a row is blank, and skipped with no problem, when
  every column the header reads is blank, unknown columns such as `Notes` included and
  ignored columns (repeats, a Welsh `Horizon`) not, exactly as the public site's
  `readTable`. A row with only a Welsh title records one `missing-title`, not also
  `welsh-without-english`.
- **Not ported** (agent): the public site's translation-quality warnings, as STY-010
  decided for the index (record's Starting point).
- **Shared header reader** (agent): `headerReader(columns, welshColumns)` in
  `sheet-header.ts` makes each parser's reader; `matchKey` lives there too, and the
  problem shape and log are `SheetProblem<Code>`/`ProblemLog<Code>` in
  `sheet-problem-log.ts`. `RoadmapIndexProblem` is now an alias of
  `SheetProblem<RoadmapIndexProblemCode>`, the same shape, and its codes are unchanged.
  The header reader also reports `readIndexes`, every column read, for the blank-row
  check; the index parser does not use it (its blank rule is a blank `Sheet`).
- **Organisations and horizons match by id** (agent): the public site keys each sheet
  value (`National`, `CAVUHB`, `Recently delivered`) with the header rule; every one
  folds to its id's key, so the parser keys the ids themselves and keeps no spelling
  table.
- **Test order**: the parser suite was written first and failed (no module); the index
  suite ran green against the extracted reader before the tab parser existed.

### Contract for dependents

- **Parser** (STY-020): `parseRoadmapTab(rows: readonly (readonly string[])[])` from
  `@/infrastructure/google-sheets/roadmap-tab-parser` (not in the barrel). `rows[0]` is
  spreadsheet row 1, rows may be ragged. Returns `{ items, problems }`, items in row
  order. Throws `AppError("invalid-data")` (not retryable) for no rows or a header with no
  `Title` column, so STY-020 passes `[]` when a values response has no `values`. A header
  alone gives no items and no failure.
- **Problems**: `RoadmapTabProblem { code, row, column, value }`, as the index's. Codes:
  `missing-column`, `duplicate-column`, `welsh-column-not-allowed`, `missing-title`,
  `missing-horizon`, `unknown-horizon`, `unknown-organisation`, `welsh-count-mismatch`
  (column is the Welsh header, value the whole Welsh cell), `welsh-without-english`.
  Nothing logs or shows them.
- **Domain**: `RoadmapItem`, `RoadmapItemDetail` (`domain/roadmap/roadmap-item.ts`),
  `ROADMAP_PLACEMENTS`/`ROADMAP_HORIZONS`/`RoadmapPlacement`
  (`roadmap-placement.ts`), `ORGANISATIONS`/`Organisation` (`organisation.ts`), as
  ADR-011. Test builder: `createTestRoadmapItem(title, overrides?)`
  (`domain/roadmap/testing/test-roadmap-item.ts`): placed `now`, everything else empty.
- **Header reader**: `headerReader`, `matchKey`, `HeaderProblemCode` (`sheet-header.ts`)
  and `ProblemLog`/`SheetProblem` (`sheet-problem-log.ts`), for any later tab parser.

### Scenario evidence

| Scenario | Held by                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| S1       | `src/infrastructure/google-sheets/roadmap-tab-parser.test.ts` (`the example roadmap tab (S1)`), `ProductA.csv` |
| S2       | same file, `headers (S2)`                                                                                      |
| S3, S9   | same file, `horizons (S3, S9)`                                                                                 |
| S4       | same file, `skipped rows (S4)`                                                                                 |
| S5, S10  | same file, `tags, organisations and details (S5, S10)`                                                         |
| S6       | same file, `optional text (S6)`                                                                                |
| S7       | same file, `an unreadable tab (S7)`                                                                            |
| S8       | `src/infrastructure/google-sheets/roadmap-index-parser.test.ts`, unchanged and passing                         |
