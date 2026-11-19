# STY-073: A Product Lead sees the items travel back when they undo an order

- **Status**: Proposed — grilled with the owner on 2026-11-19
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](README.md)
- **Depends on**: STY-072 (hard: its transition)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — STY-072's transition, started from one more control

## Summary

"Undo order" puts a placement's items back in their default order at once (those
last read, then those moved in, then those added), which can look like nothing
happened. This story lets each item travel to where the undo puts it, as a move does; what "Undo
order" does is unchanged. Not in it: marking the items, since nothing is left to find;
and "Discard all", which STY-074 holds as an idea.

## Acceptance criteria

### S1: The items travel back (owner, D1; D2)

**Given** Now's order pending, after moves, with an item moved in from Next and an item
added and not yet published among Now's items
**When** the Product Lead chooses "Undo order" beside Now's heading
**Then** each item travels, in about 0.4 seconds, to where "Undo order" puts it today
(STY-050): Now's items as last read in their read order, then the items moved in, in
the order they were moved, then the items added, in the order they were added, even
where an item was added before another was moved in
**And** every other pending edit stays: the moved-in item's placement, the new item,
and any item's changed fields
**And** no item is newly marked: a mark on an item in Now is cleared, and one
elsewhere stays (STY-071 S8)
**And** focus goes to Now's heading and "Order of Now undone" is said, as today

### S2: No travel where none is wanted (D2)

**Given** the system asks for reduced motion, or the browser has no view transitions
**When** the Product Lead chooses "Undo order"
**Then** the items show at once where "Undo order" puts them, as today

## Decisions

- **D1** (owner, 2026-11-19, grilling round 3 follow-up and round 4 Q1): "Undo order"
  travels back, in this epic; no item is marked after it.
- **D2** (agent, 2026-11-19, review): S1 and S2 first said "published order"; "Undo
  order" in fact gives the default order (STY-050, STY-051, `groupRoadmapItems`), so
  they say where it puts the items; the story changes no behaviour of the undo. A mark
  elsewhere stays, as STY-071 S8 has it.

## Out of scope

- "Discard all", adding and removing: STY-074.
