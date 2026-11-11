# EPC-004: Roadmap items — a roadmap's page shows its items, read as the public site reads them

- **Status**: Done — planned 2026-11-10; a thin slice to iterate on; every story delivered, STY-019 and STY-020 merged, STY-021 in its PR, which awaits the owner's merge
- **Progress**: 3 of 3 terminal
- **Binding ADRs**: ADR-011, ADR-009, ADR-002, ADR-008, ADR-010

## Summary

The roadmap list is right, but opening a roadmap shows only its title and "Roadmap
details are coming soon". Each roadmap's items already sit in the tab its index row
names, in a format the public site reads. This epic models a roadmap item from every
column of that format, reads a roadmap's items through the repository, matching
columns by header rather than position, and shows them on the roadmap's page grouped
under Now, Next, Later and the three delivered or not-doing sections, with items the
public site would drop shown and flagged. Every field is plain text: no editing, no
filters, no styling of item cards beyond the basics. Later epics iterate on it.

## Owner decisions waiting

None. ADR-011 was accepted in grilling rounds 1 and 2 (2026-11-10); the page-level
answers are STY-021's Decisions.

## Findings

Audited at `0f9f09e` on 2026-11-10; re-checked at `215c0c1` (after STY-017), unchanged.

### F1 — The roadmap page has nothing to show

`RoadmapDetailPage` renders the title and `roadmaps.detail.comingSoon`
(`rg -n "comingSoon" src`). A Product Lead cannot see a roadmap's items anywhere in the
editor, which is the first thing the persona needs ("see each of their roadmaps as Now,
Next and Later at a glance").

### F2 — No roadmap item exists in the domain

`rg -n -w "RoadmapItem|Horizon|placement" src` finds nothing. The glossary marks roadmap
item, horizon, tag and expected outcome _(planned)_.

### F3 — The repository can only list roadmaps

`RoadmapRepository` has `listRoadmaps` alone. The adapter knows each roadmap's tab name
(`RoadmapIndexEntry.tabName`) but drops it after listing, as ADR-009 intends ("the
roadmap detail work looks it up again").

### F4 — The E2E fake refuses every tab but the first

`tests/e2e/fixtures/fake-sheets.ts` answers 400 for a read of any other tab
(`rg -n "not the first tab" tests/e2e`). Its spreadsheet already holds the three example
roadmap tabs.

### F5 — The index parser's header reader is private to it

`readHeader`, `claim`, `matchKey`, `WELSH_HEADER` and `ProblemLog` in
`roadmap-index-parser.ts` are what a roadmap-tab parser needs too
(`rg -n "^function readHeader|^const matchKey|^class ProblemLog" src/infrastructure`).

## Design

1. A roadmap item is ADR-011's `RoadmapItem`, every column modelled (F2).
2. One header reader serves both parsers, so the index and roadmap tabs match headers
   identically; it moves out of the index parser without changing its behaviour (F5).
3. The repository gains `listRoadmapItems(roadmapId)`; the Google adapter finds the tab
   through the roadmap index on each call (F3, ADR-011).
4. The E2E fake serves every tab of the example spreadsheet and still records a read of a
   tab that does not exist as a violation, since the adapter must check the tab list
   first (F4).
5. The roadmap page shows the items with no recognised horizon first, flagged, then the
   items under their placements; it gains a Refresh for the roadmap and its items and the
   "Not published" badge (F1).
6. **Unchanged:** the roadmap list, its query, cards, grouping and states; the home
   page's Refresh re-reads the list only (owner, grilling round 1); the roadmap title on
   the detail page still comes from the list (ADR-002); `Roadmap`'s shape; nothing
   writes to the data source.

## Shared assumptions and contracts

### The `RoadmapItem` contract

ADR-011 §"What a roadmap item is" is the contract. STY-019 introduces it, STY-020 reads it
through the repository, STY-021 shows it.

### Columns by header, never by position

The owner's rule: a roadmap tab's columns may be in any order, so a column is found only
by its row-1 header. The parser's suite (STY-019 S2) and the page's E2E (STY-021 S10)
each read a tab whose header is in a different order from the Template's; tests built on
the fixture CSVs keep the fixtures' order.

### The Template tab is never read

It is the second tab of the connected spreadsheet and the reference for the permitted
columns, which are the public site's (owner). The index does not name it, so it is never
a roadmap; nothing reads it.

### Example data only

As in EPC-002: tests, the E2E fake and screenshots use only `tests/fixtures/sheets/`
(its README) or inline rows, never the live spreadsheet. `ProductA.csv` covers every
column and placement; edge cases go inline.

### Problems are codes

As ADR-009: the roadmap-tab parser's problems are codes with row, column and value, no
prose and no logging of cell contents. Nothing shows them in this epic, apart from the
flagged group of unplaced items, which is item data, not a problem list.

### Copy

Placement headings, field labels and new problem copy go through the `copywriter`
skill in English and Welsh. Section headings are the values a Product Lead types
(`Recently delivered`, `Delivered this year`, `Not doing`), which the copywriter may
polish. Organisations show as their standard codes (`CAVUHB`, `National`), not
translated, and are not catalogue copy (ADR-011 Option 6). Interface copy never says
tab, row or column; it speaks horizon, roadmap item, tag and expected outcome
(`docs/GLOSSARY.md`).

## Stories

| ID      | Story                                                                                           | Area                               | Depends on | State                |
| ------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | -------------------- |
| STY-019 | [A roadmap item carries everything its row holds](STY-019-roadmap-item-model-and-tab-parser.md) | Domain + Infrastructure            | —          | ✅                   |
| STY-020 | [The repository reads a roadmap's items](STY-020-read-roadmap-items.md)                         | Domain + Infrastructure + E2E      | STY-019    | ✅                   |
| STY-021 | [A roadmap's page shows its items](STY-021-roadmap-page-shows-items.md)                         | Features/UI + i18n (en + cy) + E2E | STY-020    | ✅ (PR awaits merge) |

## Sequencing

Strictly in order, each on the default branch before the next starts: STY-019 adds the
model and parser with nothing visible, STY-020 makes them reachable through the
repository and a query hook with nothing visible, and STY-021 shows them.

## Out of scope

- **Editing, moving and publishing items**: the next epics; they need item identity
  (ADR-011) and the pending-edit model (persona A9, A10).
- **Styled item cards** (the phone-screen card budget, A11), Markdown-like paragraphs and
  bullets in descriptions, organisation filters, the public site's horizon definitions:
  later iterations of the roadmap page.
- **The roadmap's own information on its page** (vision, service description, product
  lead): deferred by EPC-002's decision 5; a later record, likely the next iteration.
- **A sheet-health view** of the problems both parsers record: a later record.
- **Reading the `Template` tab**: never; the owner confirmed its header matches the public
  site's columns.

## Defects

None.

## Related

- [The roadmap tab format the public site uses](../../../analysis/roadmap-tab-format.md)
  (Outcome: ADR-011 and this epic)
- [The roadmap index format](../../../analysis/roadmaps-tab-format.md), EPC-002 (archived)
- ADR-011, ADR-009, ADR-002, ADR-008, ADR-010
- `tests/fixtures/sheets/README.md`
