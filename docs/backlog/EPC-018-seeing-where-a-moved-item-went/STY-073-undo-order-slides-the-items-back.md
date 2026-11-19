# STY-073: A Product Lead sees the items travel back when they undo an order

- **Status**: Proposed — grilled with the owner on 2026-11-19
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](README.md)
- **Depends on**: STY-072 (hard: its transition)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — STY-072's transition, started from one more control

## Summary

"Undo order" puts a placement's items back in their published order at once, which
can look like nothing happened. This story lets each item travel back to its place, as
a move does, then leaves the page as published. Not in it: marking the items, since
nothing is left to find; and "Discard all", which STY-074 holds as an idea.

## Acceptance criteria

### S1: The items travel back (owner, D1)

**Given** Now's order pending, after moves
**When** the Product Lead chooses "Undo order" beside Now's heading
**Then** each item out of place travels to its published place, in about 0.4 seconds
**And** no item is marked, and STY-071's mark, where it was in Now, is gone
**And** focus goes to Now's heading and "Order of Now undone" is said, as today

### S2: No travel where none is wanted

**Given** the system asks for reduced motion, or the browser has no view transitions
**When** the Product Lead chooses "Undo order"
**Then** the items show at once in their published order, as today

## Decisions

- **D1** (owner, 2026-11-19, grilling round 3 follow-up and round 4 Q1): "Undo order"
  travels back, in this epic; no item is marked after it.

## Out of scope

- "Discard all", adding and removing: STY-074.
