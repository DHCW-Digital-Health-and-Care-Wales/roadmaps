# EPC-006: Product families and colours — managed in one place

- **Status**: Active — recorded 2026-11-11 from the Editing epic's grilling (Q11); needs
  grilling before any story is selectable
- **Progress**: 0 of 1 terminal; next selectable: none; blocked on: STY-027's open
  questions
- **Binding ADRs**: ADR-009, ADR-012

## Summary

A product family groups roadmaps on the list and has a colour, but the spreadsheet sets
both on every roadmap's row, so two roadmaps in one family can name it differently or
show different colours, and nothing stops it. The owner kept family out of EPC-005's
editing for this reason: family and colour, and perhaps other fields the editor treats as
central rather than per roadmap, should be managed in one place. This epic decides how,
and what the public site then reads.

## Owner decisions waiting

STY-027's open questions: where families and their colours are defined, who may change
them, and what happens to the per-roadmap `Family` and `Colour` cells the public site
reads today.

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

## Design

_Set by STY-027's grilling._

## Stories

| ID      | Story                                                                                   | Area | Depends on | State |
| ------- | --------------------------------------------------------------------------------------- | ---- | ---------- | ----- |
| STY-027 | [Families and their colours are managed in one place](STY-027-families-in-one-place.md) | TBD  | EPC-005    |       |

## Out of scope

- Editing a roadmap's text and items: [EPC-005](../EPC-005-editing/README.md).

## Related

- ADR-009, ADR-012 Option 1 (why family is not editable yet)
- [EPC-002](../_archive/EPC-002-roadmap-list-from-roadmaps-tab/README.md) (grouping by family)
