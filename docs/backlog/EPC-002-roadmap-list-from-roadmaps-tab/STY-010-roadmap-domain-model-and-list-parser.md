# STY-010: A roadmap carries its list information, and the roadmap list can be parsed

- **Status**: Proposed — owner decisions in ADR-009; ready to select
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
- `lib/errors` + `i18n/`: the `invalid-data` kind and its copy.
- A test-only CSV reader for `tests/fixtures/sheets/`, which STY-011's E2E fake reuses.

## Acceptance criteria

### S1: The example list parses to the three example roadmaps

**Given** the rows of `tests/fixtures/sheets/Roadmaps.csv`
**When** the roadmap list is parsed
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
**When** the list is parsed
**Then** each maps to its column, and `Notes` is ignored
**And** a second header for the same column, or a Welsh header for a column without Welsh
(`Colour (cy)`, `Product Lead (cy)`), is ignored and recorded as a problem

### S3: Values follow the public site's rules

**Given** rows with surrounding spaces, a blank `Title`, `Enabled` values `Yes`, `No`,
`yes` and blank, category spellings like ` gp & community services`, an unknown category,
dates `31/02/2026` and `1 Oct 2026`, colours `#ABC`, `red` and `url(x)`, and Welsh with no
English
**When** the list is parsed
**Then** cells are trimmed; a blank title falls back to the `Sheet` value; only `Yes`
publishes; category spellings match and an unknown one becomes no category; impossible
or other-format dates become no date; `#ABC` becomes `#aabbcc` and the others no colour;
Welsh with no English is dropped
**And** `yes`, the unknown category, both dates, both colours and the orphan Welsh are
each recorded as a problem with its row; `No` and blanks are not

### S4: Bad rows are skipped, not fatal

**Given** a blank row, a row with a blank `Sheet`, two rows whose `Sheet` values give the
same id (`Product A`, `product-a`) and a row whose `Sheet` is `---`
**When** the list is parsed
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

## Tests

S1–S5 are unit tests of the parser (S1 from the fixture file, the rest inline). S6 is the
existing suites, unchanged in what they assert.

## Decisions

- **D1** (owner, 2026-11-10, grilling round 1 Q4): `Product Lead` is one free-text value,
  never split. Changes: S1, S2.
- **D2** (agent, 2026-11-10): the interim worksheet mapping over a parser-only story with
  no domain change, so STY-011 swaps only the data source.

## Starting point

Audited at `16632d3`. The public site's rules are in its `scripts/parse-roadmap.ts`
(`parseRoadmapList`, `readHeader`, `readTable`, `toIsoDate`, `safeColour`,
`parseCategory`, `isEnabled`) and `src/lib/text.ts` (`fold`) at `50e67f9`; the analysis
summarises them. Port the behaviour, not the code. Its 31-line `scripts/csv.ts` is a
good model for the test CSV reader. The contract test's fixtures use numeric ids today.

## Out of scope

- Reading the list from the data source, and the missing-tab problem: STY-011.
- Showing any new field: STY-012.
