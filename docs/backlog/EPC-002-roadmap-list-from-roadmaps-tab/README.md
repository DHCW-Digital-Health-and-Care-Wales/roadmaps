# EPC-002: Roadmap list from the roadmap index — list the roadmaps the public site lists, not the worksheets

- **Status**: Active — owner decisions recorded 2026-11-10; no story started
- **Progress**: 0 of 3 terminal; next selectable: STY-010; blocked on: nothing
- **Binding ADRs**: ADR-009, ADR-002, ADR-008

## Summary

Connecting and loading the roadmap list works, but it lists the wrong things. Every
visible worksheet becomes a roadmap card named after its tab, so the list includes the
list tab itself and any scratch tab. The public site reads the first tab instead, where
each row is one roadmap with its title, publication state, category, family, status,
product lead, date and descriptions. This epic makes the editor read that row list and
show each roadmap's information on its card, grouped by product family and sorted by
title, with
unpublished roadmaps badged. The only interactions stay the same: connect, refresh and
open a card. The detail page keeps its placeholder, and roadmap items are not read.

## Owner decisions waiting

None.

## Findings

Audited at `16632d3` on 2026-11-10.

### F1 — The list is the worksheets, not the roadmap rows

`GoogleSheetsRoadmapRepository.listRoadmaps` maps each visible worksheet of the metadata
response to `{ id: String(sheetId), name: title }`. Against the real layout that lists
the index tab itself (one card named "Roadmaps") and any scratch tab, names every roadmap
by its tab rather than its title, and drops a roadmap whose tab is hidden. Reproduce:
`rg -n "hidden !== true" src/infrastructure`.

### F2 — A roadmap carries only a name

`Roadmap` is `{ id, name }`; `rg -n "roadmap\.name" src` finds the card (twice) and the
detail page. Nothing can show the category, status, product lead or publication state the
data source already holds.

### F3 — Tests use an invented layout

The E2E fake (`tests/e2e/fixtures/fake-sheets.ts`) serves worksheets called "Platform",
"Mobile app" and "Data & analytics"; unit tests use the same names. Nothing exercises the
real layout. `tests/fixtures/sheets/` now holds the public site's fake example CSVs.

## Design

1. The data source's first tab is the roadmap index, read as ADR-009 sets out (F1).
2. `Roadmap` becomes the ADR-009 shape; every consumer of `name` moves to the localised
   title (F2).
3. Tests and the E2E fake use only `tests/fixtures/sheets/` or inline rows (F3).
4. **Unchanged:** the repository boundary (`listRoadmaps` only), the query keys, the
   loading, empty, error, expired and refresh states, and the detail page's placeholder.

## Shared assumptions and contracts

### The `Roadmap` contract

ADR-009 §"What a roadmap is" is the contract every story builds on. STY-010 introduces
it, STY-011 fills it from the data source, STY-012 shows it.

### Example data only

Tests, the E2E fake and screenshots use only [the example data](../../../tests/fixtures/sheets/README.md)
or inline rows, never the live spreadsheet; its README holds the rule and the examples.

### Copy

Category names come from the public site's `content.ts` (in the analysis) and are
catalogue copy; every other new string goes through the `copywriter` skill, in English
and Welsh. Interface copy never says spreadsheet, tab, row or column, except in the
`invalid-data` problem, which tells the user what to fix in terms the persona allows
(ask the copywriter).

### Problems are codes

The parser's problems are codes with row, column and value; no prose and no logging of
cell contents. Nothing shows them in this epic.

## Stories

| ID      | Story                                                                                            | Area                    | Depends on | State |
| ------- | ------------------------------------------------------------------------------------------------ | ----------------------- | ---------- | ----- |
| STY-010 | [A roadmap carries its list information](STY-010-roadmap-domain-model-and-list-parser.md)        | Domain + Infrastructure | —          |       |
| STY-011 | [The list shows the roadmaps the public site lists](STY-011-read-roadmap-list-from-first-tab.md) | Infrastructure + E2E    | STY-010    |       |
| STY-012 | [Roadmap cards show each roadmap's information](STY-012-roadmap-cards-show-information.md)       | Features/UI + i18n      | STY-011    |       |

## Sequencing

Strictly in order: each story changes what the next builds on. STY-010 keeps the app's
behaviour unchanged (cards still show tab names), STY-011 switches the data and keeps the
cards plain, and STY-012 changes what the cards show.

## Out of scope

- **Showing the roadmap's information on the detail page** (vision, service description
  in full): the owner kept this epic to the main page (analysis decision 5). Comes with
  the roadmap detail epic.
- **Reading roadmap items** from each roadmap's tab: the roadmap detail epic.
- **A sheet-health view** listing the problems the parser records: a later record, once
  Product Leads ask how to fix a mistake.
- **"My roadmaps"**: `productLead` is free text, never split (analysis decision 4), and
  the app does not know who the user is.
- **Grouping by category** as the public site does: the owner chose groups by product
  family instead (analysis decision 3, round 2).
- **Family-wide colours**: the owner plans a feature where every roadmap in a family has
  the family's colour, and Product Leads no longer set one per roadmap (STY-012 D9). It
  changes the shared data source's format, a contract with the public site, so it needs
  its own record agreed with the public site's owners. Until then each card shows its
  roadmap's own colour.
- **Stale roadmaps** (persona A7): the hand-typed `Last updated` date can't be trusted to
  judge six weeks; comes once publishing records when a roadmap changed (STY-012 D10).

## Defects

None.

## Related

- [The roadmap index format the public site uses](../../analysis/roadmaps-tab-format.md)
  (Outcome: ADR-009 and this epic)
- ADR-009, ADR-002, ADR-008
- `tests/fixtures/sheets/README.md`
