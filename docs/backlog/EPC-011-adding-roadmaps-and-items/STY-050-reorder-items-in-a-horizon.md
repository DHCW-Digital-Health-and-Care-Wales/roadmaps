# STY-050: A Product Lead reorders the items in a horizon

- **Status**: Needs grilling — the owner asked for the record on 2026-11-14 (STY-046
  grilling, items round 1 Q6); nothing is decided
- **Type**: Feature
- **Area**: to be decided
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-014, ADR-011
- **Suggested model**: Opus — moving rows in a tab a co-lead may be editing

## Summary

Items show in a horizon in the order they have in the data source, here and on the
public site. A move changes an item's horizon and not its place in that order, and a
new item goes last (STY-045), so the order can only be changed in the spreadsheet.
This story would let a Product Lead put a horizon's items in the order they want. It
is recorded so the gap is not lost; the interaction and what is written are for the
owner.

## Scope

A first outline, for the grilling to settle. An order change in a roadmap's pending changes; the publish
plan moving rows after its re-read; the Move menu's new choices; README _What the
editor writes_ and an ADR-012 or ADR-014 amendment.

## Open questions

- **Q1**: How does Sam reorder? _Now has four items and the newest should be first._
  - (a) "Move up" and "Move down" in each card's Move menu (recommended) — works by
    keyboard, touch and screen reader with what exists.
  - (b) Drag and drop, with the menu as the accessible path — familiar; a new
    interaction to build and test.
- **Q2**: What is written? The order is the rows' order across the whole tab.
  - (a) The rows are moved in the tab (recommended) — the public site needs no
    change; a co-lead's edits must still find their rows, which item IDs allow.
  - (b) A new order column the public site would have to read — a format change to
    agree with the public site first.
- **Q3**: Is a new order a pending edit, and what if a co-lead reordered meanwhile?
  - (a) Pending; a co-lead's different order of the same horizon is a conflict
    (recommended).
  - (b) Written at once.

## Related

- [`reorder-items-ux-analysis.md`](../../analysis/reorder-items-ux-analysis.md): how a
  Product Lead reorders, how a pending order shows, and how it is published, compared
  in mock-ups.
