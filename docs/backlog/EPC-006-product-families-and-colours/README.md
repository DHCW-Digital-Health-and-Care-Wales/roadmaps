# EPC-006: Product families and colours — managed in one place

- **Status**: Active — grilled in rounds 1–4 (2026-11-12); ADR-013 accepted
- **Progress**: 3 of 4 terminal (STY-029 awaits merge); next selectable: STY-030;
  blocked on: nothing (the owner's tabs are needed only to check against the
  real sheet)
- **Binding ADRs**: ADR-013, ADR-009, ADR-012

## Summary

A product family groups roadmaps on the list and has a colour, but the spreadsheet sets
both on every roadmap's row, so two roadmaps in one family can name it differently or
show different colours, and nothing stops it. The owner kept family out of EPC-005's
editing for this reason: family and colour, and perhaps other fields the editor treats as
central rather than per roadmap, should be managed in one place. Families and
categories now get their own tabs, with IDs that stand in for the database keys of the
API that replaces Sheets; a roadmap picks from them, and the editor copies the chosen
values into the roadmap's row, so the public site keeps reading what it reads today.

## Owner decisions waiting

None. Owner step: add the tabs per
[`families-and-categories-tabs.md`](../../operations/families-and-categories-tabs.md).

## Findings

Audited at `8479405` on 2026-11-11.

### F1 — Family and colour are free per row

The roadmap index has `Family`, `Family (cy)` and `Colour` on every row
(`docs/analysis/roadmaps-tab-format.md`). The editor groups by family, matching names
ignoring case, accents, spaces and punctuation (`groupRoadmaps`), and shows each
roadmap's own colour; a family's roadmaps may disagree on both.

### F2 — The public site reads both per roadmap

The public site shows the family above the title with a swatch in that roadmap's colour
(`docs/analysis/roadmaps-tab-format.md`, the `Family` and `Colour` rows). Moving either
elsewhere changes its contract.

### F3 — Category is a fixed list in two codebases

`Roadmap.category` is the public site's slug, its names in the editor's i18n catalogue
(`rg -n "roadmaps.categories" src`); the public site holds the same six in code. A
category the public site doesn't know shows as "Other roadmaps".

## Design

Set in grilling rounds 1–4 (2026-11-12) and recorded in ADR-013; the stories' Decisions
cite each answer.

1. `Families` and `Categories` tabs are the editor's source of truth, built by the owner;
   each row has an ID in the `Item ID` format (F1, F3).
2. Each index row gains `Family ID` and `Category ID`; until it has them it is linked by
   folded name, and gains them at its next publish (F1).
3. The editor copies the family's name, Welsh name and colour, and the category's name,
   into each row it writes; the public site is unchanged (F2).
4. Anyone connected may add, rename and recolour a family; categories are fixed to the
   public site's six; nothing is deleted; Welsh names are the owner's, in the tab.
5. A family change publishes at once after a confirmation; a roadmap's choice of family
   or category is a pending edit (ADR-012).
6. A row out of step with the lists shows the lists' values, flagged, with a fix.
7. A missing tab falls back to today's behaviour; it is an accident, not a mode, since
   the API will always have these lists.

Unchanged: the public site's format and reads, ADR-012's conflict rules, the list's
grouping order (families by name, then no family).

## Shared assumptions and contracts

### The lists

STY-027 owns the `Family` and `Category` domain types, the repository reads, and each
`Roadmap`'s family and category IDs; STY-028–STY-030 build on them and write the copied
cells from the lists as re-read at write time, never from the read the page shows.

### The write path

Writing to the data source reuses EPC-005's publish call and its rules (ADR-012): a
re-read before the write, nothing written on a conflict, the `Template` tab never
written. A change to what the public site reads is said in the record and its PR.

## Stories

| ID      | Story                                                                                                                                            | Area                          | Depends on | State                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ---------- | -------------------- |
| STY-027 | [Families and their colours are managed in one place](../_archive/EPC-006-product-families-and-colours/STY-027-families-in-one-place.md)         | Domain + Infra + UI           | —          | ✅                   |
| STY-028 | [A Product Lead chooses a roadmap's family and category](../_archive/EPC-006-product-families-and-colours/STY-028-choose-family-and-category.md) | Domain + Infra + UI           | STY-027    | ✅                   |
| STY-029 | [Anyone connected adds, renames and recolours a family](../_archive/EPC-006-product-families-and-colours/STY-029-manage-families.md)             | Domain + Infra + UI + Routing | STY-027    | ✅ (PR awaits merge) |
| STY-030 | [A roadmap out of step with its family is made to match](STY-030-make-it-match.md)                                                               | Infra + UI                    | STY-027    |                      |

## Sequencing

STY-027 first: it reads the lists the others write from. Then STY-028, STY-029 and
STY-030 in any order; STY-030 is smallest after STY-029, whose write it can reuse. All
need the owner's tabs only for a check against the real sheet; tests use the fakes.

## Out of scope

- Editing a roadmap's text and items: [EPC-005](../_archive/EPC-005-editing/README.md).
- The public site reading the tabs, and dropping the copied cells: its own repository.
- Deleting a family, editing Welsh names, changing categories (ADR-013).

## Defects

- [DEF-004](../defects/DEF-004-pending-no-category-dropped-when-category-unlisted.md): a pending "No category" is dropped, unwritten, once the roadmap's category leaves its list (Needs triage)
- [DEF-005](../defects/DEF-005-about-form-shows-no-family-after-refresh.md): an open About form shows "No family" after Refresh reads a co-lead's family (Needs triage)

## Related

- ADR-013; ADR-009, ADR-012 Option 1 (why family was not editable)
- [EPC-002](../_archive/EPC-002-roadmap-list-from-roadmaps-tab/README.md) (grouping by family)
