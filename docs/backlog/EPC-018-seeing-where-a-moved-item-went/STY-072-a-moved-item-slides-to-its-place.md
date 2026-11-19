# STY-072: A Product Lead sees a moved item travel to its new place

- **Status**: Proposed — grilled with the owner on 2026-11-19 (design E, C's slide)
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](README.md)
- **Depends on**: STY-071 (hard: the mark it ends on)
- **Binding ADRs**: ADR-002, ADR-005, ADR-010
- **Suggested model**: Opus — a view transition across two lists, with focus, scroll
  and the stuck header to keep in step

## Summary

The mark says where an item went; this story shows it going. After a choice in the
Move menu, the item lifts and glides from where it was to where it lands, the items it
passes moving aside, and, for a move to another placement, the page scrolls with it.
Then STY-071's mark shows. It uses React's `ViewTransition`, or the browser's API
directly (D6), with no new dependency.
Not in it: a move from the item dialog, which only marks, and reduced motion, which
never travels.

## Scope

`features/roadmaps`: the items area, its lists and the item's card and row. No new
copy, nothing in `domain/` or `infrastructure/`, no new dependency.

## Acceptance criteria

### S1: A move within a placement travels (owner, D1)

**Given** a placement of four items, in Cards or Compact
**When** the Product Lead chooses "Up one", "Down one", "To the top" or "To the bottom"
**Then** the item, raised above the others, travels from its old place to its new one
in about 0.4 seconds, while each item it passes moves to its own new place
**And** it then shows STY-071's mark, and focus is on its Move

### S2: A move to another placement travels the whole way (owner, D2)

**Given** an item in Now and Later below the screen
**When** the Product Lead moves it to Later from its Move menu
**Then** the page scrolls to Later while the item travels there, in about 0.7 seconds
**And** it lands last in Later, marked "Moved from Now", in the room between the stuck
header and the foot bar

### S3: A second move takes over (owner, D4)

**Given** an item still travelling
**When** the Product Lead makes another move
**Then** the first travel ends at once in its final place and the second plays from
there
**And** no control is held while an item travels

### S4: No travel where none is wanted (owner, D3)

**Given** the system asks for reduced motion, or the browser has no view transitions,
or the item is moved by the item dialog
**When** the move is made
**Then** nothing travels: the item shows at once in its new place, marked, as STY-071
has it

### S5: Nothing else moves

**Given** a roadmap's page
**When** the Product Lead edits an item, switches view, opens a row or publishes
**Then** nothing travels, as today

## Tests

S1 to S3 need Playwright in Chromium: jsdom has no view transitions. Assert the
transition starts and ends (the item's view transition name, `document`'s active
transition) rather than pixel positions in flight. S4 by emulating reduced motion.

## Decisions

- **D1** (owner, 2026-11-19, analysis): design E: C's slide, then B's mark.
- **D2** (owner, 2026-11-19, grilling round 3 Q1): a move to another placement travels
  the whole way, the page scrolling with it.
- **D3** (owner, 2026-11-19, grilling round 3 Q3): a move from the item dialog marks
  and does not travel.
- **D4** (owner, 2026-11-19, grilling round 4 Q2): a second move takes over a travel
  in flight.
- **D5** (owner, 2026-11-19, grilling round 3 Q2 and its follow-up): React's
  `ViewTransition`, over a hand-built slide, AutoAnimate (no travel between lists) and
  Motion (about 30 KB and an ADR).
- **D6** (agent, 2026-11-19, review): where React's `ViewTransition` cannot animate a
  sync-store update, `document.startViewTransition` with `flushSync`: the same browser
  API under React's, not the hand-built measuring slide D5 rejected, nor moving the
  store off `useSyncExternalStore` for this alone. Delivery says which it used; the
  owner may veto it.

## Starting point

Audited at `e75d846` against react-dom 19.3.1's source:

- React exports `ViewTransition` and `addTransitionType`, but starts a view transition
  only for a transition lane. Pending edits are read through `useSyncExternalStore`
  (`pending-changes-context.ts`), whose updates are always sync, so a `store.update`
  never animates, even inside `startTransition`. The move must reach the page on a
  transition lane (a transition-lane mirror of the store, or `useDeferredValue`), or
  be wrapped in `document.startViewTransition` with `flushSync` (D6).
- React holds a new commit until a running view transition finishes. For S3, skip the
  running one first (`ViewTransition.skipTransition()` on the document's active
  transition), so the second move is not delayed.
- A moved item is drawn anew in another list (`RoadmapItems`' focus request), so the
  two ends pair by a shared `view-transition-name`. Do not use the card key: an item
  read without an ID keys by its read position and text (`item-card-keys.ts`), which
  changes on a re-read, and React escapes an invalid name with `btoa`, which throws on
  any character outside Latin-1 ("Tŷ", an en dash). Name it from the item's ID,
  sanitised, and give an item without one no name, so it shows at once, marked.
- `globals.css`'s reduced-motion rule does not reach `::view-transition-*`, so S4's
  gate is the code's.

## Out of scope

- "Undo order" travelling back: STY-073.
- Adding, removing and discarding: STY-074.
