# STY-010: A roadmap carries its list information, and the roadmap index can be parsed

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Refactor
- **Area**: Domain + Infrastructure + i18n (en + cy)
- **Epic**: EPC-002-roadmap-list-from-roadmaps-tab
- **Depends on**: none
- **Binding ADRs**: ADR-009 §"What a roadmap is", §"Reading the list", §"Mistakes in the
  list"; ADR-002; ADR-008
- **Suggested model**: Opus — a pure parser with many edge cases that must match another
  repository's rules

## Summary

Lays the ground for listing the right roadmaps. A roadmap gains everything the roadmap
list holds about it (title in English and Welsh, publication state, category, family,
status, product lead, date, colour, vision, service description), and a parser turns the
list's rows into roadmaps exactly as the public site reads them, recording mistakes
rather than failing. The app still reads worksheets until STY-011, so nothing visible
changes yet.

## Scope

- `domain/`: the ADR-009 types (`LocalisedText`, `localise`, `RoadmapCategory`, the new
  `Roadmap`), replacing `name`.
- `infrastructure/google-sheets/`: a pure parser from rows (`string[][]`) to roadmaps plus
  problems and each roadmap's tab name; no I/O. The current worksheet repository maps to
  the new shape as an interim (`title.en` = tab name, `published: true`, the rest `null`).
- `features/`: every use of `name` reads the localised title in the current language.
- `lib/errors` + `i18n/`: the `invalid-data` kind and its final copy in English and Welsh
  (with the `copywriter` skill), since the catalogue types require it; STY-011 S5 is the
  first place a user sees it.
- A test-only CSV reader for `tests/fixtures/sheets/` that STY-011's E2E fake reuses;
  Vitest tests load the CSVs with Vite `?raw` imports, since `src` has no Node types.

## Acceptance criteria

### S1: The example list parses to the three example roadmaps

**Given** the rows of `tests/fixtures/sheets/Roadmaps.csv`
**When** the roadmap index is parsed
**Then** it returns `producta`, `productb` and `productc`, in row order, with their tab
names
**And** Product A has category `gp-community-services`, family "Single Record", status
"Beta", product lead "Alex Jones", date `2026-10-01` and colour `#325083`
**And** Product B has no category, no vision, date `2026-09-15` and Welsh title, family,
status and service description
**And** Product C is not published and has product lead "Sam Evans"

### S2: Headers are matched the way the public site matches them

**Given** headers such as `STATUS LABEL`, `Status-label`, `product lead`,
`Title (Welsh)`, `Title - Cymraeg` and an unknown `Notes`
**When** the index is parsed
**Then** each maps to its column, and `Notes` is ignored
**And** a second header for the same column, or a Welsh header for a column without Welsh
(`Colour (cy)`, `Product Lead (cy)`), is ignored and recorded as a problem

### S3: Values follow the public site's rules

**Given** rows with surrounding spaces, a blank `Title`, `Enabled` values `Yes`, `No`,
`yes` and blank, category spellings like ` gp & community services`, an unknown category,
dates `31/02/2026` and `1 Oct 2026`, colours `#ABC`, `red` and `url(x)`, and Welsh with no
English
**When** the index is parsed
**Then** cells are trimmed; a blank title falls back to the `Sheet` value; only `Yes`
publishes; category spellings match and an unknown one becomes no category; impossible
or other-format dates become no date; `#ABC` becomes `#aabbcc` and the others no colour;
Welsh with no English is dropped
**And** `yes`, the unknown category, both dates, all three colours and the orphan Welsh are
each recorded as a problem with its row; `No` and blanks are not

### S4: Bad rows are skipped, not fatal

**Given** a blank row, a row with a blank `Sheet`, two rows whose `Sheet` values give the
same id (`Product A`, `product-a`) and a row whose `Sheet` is `---`
**When** the index is parsed
**Then** the blank rows are ignored, the first `Product A` row is kept, and the duplicate
and `---` rows are skipped, each recorded as a problem
**And** a list with no `Enabled` column lists every roadmap as not published, recording
one problem

### S5: An unreadable list is an invalid-data problem

**Given** a list with no rows, or a header with no `Sheet` column
**When** it is parsed
**Then** it fails with the `invalid-data` problem kind, which is not retryable
**And** a list with only a header gives no roadmaps and no failure

### S6: Nothing visible changes yet

**Given** a connected user and the current worksheet data source
**When** the roadmap list and a roadmap's detail page load
**Then** they show the same cards, names and addresses as before, in English and Welsh
**And** every existing unit, component and E2E test passes against the new `Roadmap`
shape

### S7: A published row wins over a draft with the same id (D3)

**Given** a row `Product A` with `Enabled` `No` above a row `product-a` with `Yes`
**When** the index is parsed
**Then** `producta` is the second row's roadmap, published
**And** the first row is skipped and recorded as a duplicate
**And** when both rows are enabled, the first is kept and the second skipped and recorded

## Tests

S1–S5 and S7 are unit tests of the parser (S1 from the fixture file, the rest inline). S6 is the
existing suites, unchanged in what they assert.

## Decisions

- **D1** (owner, 2026-11-10, grilling round 1 Q4): `Product Lead` is one free-text value,
  never split. Changes: S1, S2.
- **D2** (agent, 2026-11-10): the interim worksheet mapping over a parser-only story with
  no domain change, so STY-011 swaps only the data source.
- **D3** (agent, 2026-11-10, Opus review): among rows sharing an id, the enabled row is
  kept (the first enabled one, else the first row), matching the public site, which drops disabled rows before its
  duplicate check (ADR-009). Clarifies "the first" in S4; adds S7.
- **D4** (agent, 2026-11-10, Opus review): S2's header variants are alternative
  spellings, each tested in its own header; the duplicate case puts two spellings of one
  column in the same header.
- **D5** (agent, 2026-11-10, Sol review): `#ABC` is expanded as S3 says and also recorded
  as a problem, since the public site's sync fails on a three-digit colour (ADR-009).

## Starting point

Audited at `16632d3`. The public site's rules are in its `scripts/parse-roadmap.ts` and
`src/lib/text.ts` at `50e67f9`; the analysis summarises them. Port the behaviour, not the code. Its 31-line `scripts/csv.ts` is a
good model for the test CSV reader. The contract test's fixtures use numeric ids today.

## Out of scope

- Reading the list from the data source, and the missing-tab problem: STY-011.
- Showing any new field: STY-012.

## Delivery

### Departures

- **S3, S4, the problems recorded beyond the scenarios** (agent): the parser records a
  `missing-column` problem for every column other than `Sheet` that has no header, as
  the public site warns for each, and a `no-published-roadmap` problem when no roadmap
  is published (ADR-009's "No roadmap enabled" mistake). The second is not recorded when
  the `Enabled` column is missing, which already explains it, so S4's list without
  `Enabled` still records exactly one problem. A header with no rows records
  `no-published-roadmap` too: S5 asks only that it gives no roadmaps and no failure.
- **S4, a row with a blank `Sheet`** is ignored without a problem, as the public site
  ignores it and S4 counts it among "the blank rows".
- **Value problems of a skipped row** (agent): a row skipped as a duplicate or for having
  no id records only that; its other cells are not checked, so a bad colour on a skipped
  draft records nothing.
- **Welsh title with a blank English title** (agent): the English falls back to the
  `Sheet` value and the Welsh is kept, with no problem, exactly as the public site's
  `readText` does; S3's "Welsh with no English is dropped" applies to the other text
  columns.
- **Not ported** (agent): the public site's translation-quality warnings (a Welsh
  placeholder, Welsh identical to the English, a large length gap) change nothing that
  is read, so they are left to the sheet-health record (EPC-002 Out of scope).
- **Paths** (agent): the parser is
  `src/infrastructure/google-sheets/roadmap-index-parser.ts`; the CSV reader is
  `tests/fixtures/sheets/parse-csv.ts`, so `tsconfig.app.json` includes
  `tests/fixtures` and Vitest runs `tests/fixtures/**/*.test.ts`. The current
  language reaches components through a new `useLanguage()` in `@/i18n`, which the
  language switcher now uses too. The in-memory repository double deep-copies
  (`structuredClone`) now that a roadmap holds nested text.
- **Test order**: the parser, Welsh-title and `invalid-data` panel tests were written
  first and failed (no parser; cards still read `name`); the CSV reader's own test was
  written alongside it, as test code.

### Contract for dependents

- **Parser** (STY-011): `parseRoadmapIndex(rows: readonly (readonly string[])[])` from
  `@/infrastructure/google-sheets/roadmap-index-parser` (not in the barrel). `rows[0]` is
  spreadsheet row 1 and rows may be ragged, as the Sheets values API returns them.
  Returns `{ entries: { roadmap, tabName }[], problems }`, entries in row order. Throws
  `AppError("invalid-data")` (not retryable) for no rows or a header with no `Sheet`
  column, so STY-011 passes `[]` when the values response has no `values`.
- **Problems**: `RoadmapIndexProblem { code, row, column, value }`; `row` is the sheet
  row (1 = header) or `null` for the whole list, `column` the header as written (or the
  expected header when missing), `value` the trimmed cell. Codes: `missing-column`,
  `duplicate-column`, `welsh-column-not-allowed`, `enabled-not-yes`, `unknown-category`,
  `invalid-date`, `invalid-colour`, `short-colour`, `welsh-without-english`,
  `invalid-id`, `duplicate-id`, `no-published-roadmap`. Nothing logs or shows them.
  STY-011 adds its missing-tab problem beside these.
- **Interim** (resolved by STY-011): `GoogleSheetsRoadmapRepository` still lists the
  visible worksheets, each as `title.en` = tab name, `published: true`, everything else
  `null` (`worksheetRoadmap`). The repository contract's fixtures are numeric ids built
  with `createTestRoadmap(id, title, overrides?)`
  (`src/domain/roadmap/testing/test-roadmap.ts`), whose defaults are that interim shape.
- **Domain**: `localise(text, language)` and `ContentLanguage` in
  `domain/roadmap/localised-text.ts`; `ROADMAP_CATEGORIES`/`RoadmapCategory` in
  `domain/roadmap/roadmap-category.ts`. The sheet spellings of the categories live in
  the parser; their display names are STY-012's catalogue copy.
- **UI**: `useLanguage()` from `@/i18n`; the card and detail page show
  `localise(roadmap.title, language)`. New copy: `errors.invalid-data` (en + cy), with
  the `FileWarningIcon` in `RoadmapsErrorState` and no Retry.
- **Fixtures**: `parseCsv(text)` in `tests/fixtures/sheets/parse-csv.ts` for STY-011's
  E2E fake (Node reads the file; Vitest imports it with `?raw`).

### Scenario evidence

| Scenario | Held by                                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `src/infrastructure/google-sheets/roadmap-index-parser.test.ts` (`the example roadmap index (S1)`), from `Roadmaps.csv`                              |
| S2       | same file, `headers (S2)`                                                                                                                            |
| S3       | same file, `values (S3)`                                                                                                                             |
| S4       | same file, `bad rows (S4)`                                                                                                                           |
| S5       | same file, `an unreadable list (S5)`; `src/lib/errors.test.ts` (`defaults invalid-data to retryable=false`)                                          |
| S6       | the existing suites, unchanged in what they assert; `roadmaps-page.test.tsx` and `roadmap-detail-page.test.tsx` (Welsh title tests); `pnpm test:e2e` |
| S7       | `roadmap-index-parser.test.ts`, `rows with the same id (S7)`                                                                                         |
