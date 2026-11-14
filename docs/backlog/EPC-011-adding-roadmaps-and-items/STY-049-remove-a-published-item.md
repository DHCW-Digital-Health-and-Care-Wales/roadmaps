# STY-049: A Product Lead removes a published item

- **Status**: Needs grilling — the owner asked for the record on 2026-11-14 (STY-046
  grilling, items round 1 Q5); nothing is decided
- **Type**: Feature
- **Area**: to be decided
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-046 (preferred order)
- **Binding ADRs**: ADR-012, ADR-011
- **Suggested model**: Opus — deleting a row another Product Lead may be editing

## Summary

A new item can be removed before it is published (STY-046). An item the data source
already holds cannot: a Product Lead moves it to "Not doing" or deletes it in the
spreadsheet. This story would let them remove one from the editor. It is recorded so
the gap is not lost; how a removal is confirmed and published is for the owner.

## Scope

A first outline, for the grilling to settle. A removal in a roadmap's pending changes, published by
deleting the item's row, found by its ID; the card's control and its undone state;
README _What the editor writes_ and an ADR-012 amendment.

## Open questions

- **Q1**: Is removing an item a pending edit? _Sam removes "Fax referrals" from a
  published roadmap._
  - (a) Pending until published, shown struck through with Undo (recommended) —
    matches every other item change; nothing leaves the public site by accident.
  - (b) Written at once after a confirmation.
- **Q2**: What if a co-lead has edited the item since Sam loaded it?
  - (a) The removal is a conflict: Sam sees the co-lead's change and chooses to
    remove anyway or keep the item (recommended).
  - (b) The removal wins.
- **Q3**: Should the editor steer towards "Not doing" instead? _The public site shows
  "Not doing" items, so readers see what was dropped._
  - (a) The confirmation mentions "Not doing" as the way to show a dropped item
    (recommended).
  - (b) No mention.
