# STY-073: A Product Lead sees the items travel back when they undo an order

- **Status**: Done — grilled with the owner on 2026-11-19
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](../../EPC-018-seeing-where-a-moved-item-went/README.md)
- **Depends on**: STY-072 (hard: its transition)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — STY-072's transition, started from one more control
- **Delivered**: _(add on delivery)_

## Summary

"Undo order" puts a placement's items back in their default order at once (those
last read, then those moved in, then those added), which can look like nothing
happened. This story lets each item travel to where the undo puts it, as a move
does; what "Undo order" does is unchanged. Not in it: marking the items, since nothing
is left to find; and "Discard all", which STY-074 holds as an idea.

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

## Delivery

### Departures

None. "Undo order" calls STY-072's `travel` with `"within"`, from `PlacementHeading`'s
`undo`; no new transition type, CSS or dependency.

### Contract for dependents

- `PlacementHeading`'s "Undo order" makes its whole change inside `travel("within", …)`:
  the undo of the order, the mark's `onUndone`, focus on the heading and the status
  message. They are drawn together as the browser has drawn the page as it was, a frame
  after the click, so a test that reads the page right after the click polls
  (`waitFor`). With reduced motion, or no view transitions, `travel` calls them at once,
  as before.
- No item is raised: only the item `EditableItem` moves carries `moved-item`, which
  `globals.css` raises, so the items an undo moves all travel alike.
- A component test of a travel installs `withViewTransitions`
  (`features/roadmaps/testing/view-transitions.ts`), the one stub of the API: it draws
  each update `delay` ms after it is asked for (50, or 0 for at once), or at once and
  finishes only on `ends` with `held`, and its spy records each transition's types.
  Install it after the test's own setup moves, or each is drawn late too.
  `item-travel.test.ts` and `roadmap-detail-page-moved-mark.test.tsx` use it too, in
  place of the stubs they each had.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-ordering.test.tsx` (`where the items travel back`: one `item-move` travel; the undo not drawn until the browser has drawn the page as it was; Now's items read in order, then the item moved in, then the item added before it was moved in, though it was added first; focus on the heading; "Order of Now undone"; the move in and the new item still pending; no mark); `moved-travel.spec.ts` (`“Undo order” makes the items travel back`: each of Now's items' groups 400 ms and none raised, the order, no mark, focus, the moved-in item still "Changed"; a mark on an item in Later stays; the compact view); `roadmap-detail-page-moved-mark.test.tsx` (`cleared by “Undo order”`, unchanged) |
| S2       | `roadmap-detail-page-ordering.test.tsx` (reduced motion: drawn at once, no transition started); `moved-travel.spec.ts` (`“Undo order” with no travel where none is wanted`: reduced motion and a browser without view transitions, the order drawn, focus on the heading, no transition recorded)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Red      | With `PlacementHeading`'s `travel` call taken out, `roadmap-detail-page-ordering.test.tsx`'s travel test and `moved-travel.spec.ts`'s Cards and Compact travel tests fail (the order drawn at once, no transition started). Behaviour that follows the code, so a break of finished code, not test-first evidence.                                                                                                                                                                                                                                                                                                                                                                                                          |
