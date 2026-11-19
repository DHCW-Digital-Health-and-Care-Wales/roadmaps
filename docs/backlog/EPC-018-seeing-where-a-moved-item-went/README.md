# EPC-018: Seeing where a moved item went — a move that leaves no trace on the page

- **Status**: Active — design E of the moved item UX analysis (C's slide, then B's
  mark), grilled with the owner on 2026-11-19
- **Progress**: 1 of 4 terminal (STY-071); next selectable: STY-072; blocked on:
  STY-074's grilling (an idea, not needed by the others)
- **Binding ADRs**: ADR-002, ADR-005, ADR-008, ADR-010

## Summary

A Product Lead moves items with each item's Move menu, or by its "Horizon or section"
in the item dialog. The move itself is right and stays. What is wrong is that nothing
on the page shows where the item went: two neighbours that read alike swap with no
visible change, and a move to another placement lands off the screen, unmarked. This
epic marks the item last moved, in words, until the next move or the move is undone
or published (STY-071);
lets the item glide to its new place, so the eye follows it (STY-072); and lets the
items glide back on "Undo order" (STY-073). It leaves what a move does, what is
written and what the public site shows. The same motion for adding, removing and
discarding is an idea to grill later (STY-074).

## Owner decisions waiting

- [STY-074](STY-074-the-same-motion-when-adding-removing-and-discarding.md#open-questions)
  — whether adding, removing and discarding items take the same motion

## Findings

Audited at `e75d846` on 2026-11-19, from the moved item UX analysis's prototype page,
which draws the page's items area with every Move menu working.

### F1 — After a click or a tap, nothing marks the moved item

After a move the item takes focus on its Move (`EditableItem`'s `onFocusRequest`,
STY-050 S2), but focus is drawn only for the keyboard (`focus-visible`). The status
line that says "Moved down. 2 of 4." is `sr-only` (`RoadmapItems`). A mouse or touch
user sees the page redrawn, nothing more.

### F2 — A swap of two alike neighbours looks like no change

"Up one" and "Down one" swap two items. Where their titles and descriptions start
alike, as reminders for appointments and for video appointments do, the page before
and after look the same, more so as one-line compact rows.

### F3 — A move to another placement lands out of sight, and nothing is said

An item moved to another placement goes last there (STY-051), often below the screen.
Focus scrolls the page to it in a jump; nothing marks it, nothing on the placement it
left says it went, and the status line says nothing (only `reorder` announces).

## Design

1. The item last moved shows a **moved mark**: an edge and a label saying how it moved,
   until the next move, an undo that puts it back, publishing or leaving the page;
   the page scrolls to it where it is out of sight (F1, F2, F3). STY-071.
2. A move to another placement is said to a screen reader, as a move within one is
   (F3). STY-071.
3. A move from the Move menu shows the item travelling from where it was to where it
   lands, the items it passes moving aside, across placements too; then the mark
   (F2, F3). STY-072.
4. "Undo order" shows the items travelling to where it puts them (F2).
   STY-073.
5. **Unchanged:** the Move menu, its choices, where a moved item lands, the item
   dialog; the pending edits a move makes, "Order changed", "Undo order", "Changed",
   "Undo changes", "Discard all"; focus after a move or a dialog; what is read, written
   and published.

## Shared assumptions and contracts

### The mark is display state

The moved mark is the page's own state, never a pending edit: it changes nothing kept,
counted, written or published, and it does not survive leaving the page or a reload.
At most one item carries it. What clears it and what keeps it is STY-071's S7 and S8:
the owner's list, not a rule derived from where the item stands.

### Reduced motion

Where the Product Lead's system asks for reduced motion, nothing travels and the page
jumps rather than glides; the mark shows as it always does. `globals.css` cuts every
animation and transition on `*, ::before, ::after` to 0.01ms under
`prefers-reduced-motion`, so a mark must never depend on an animation to be seen. That
selector does not reach the `::view-transition-*` pseudo-elements, so the slides gate
on reduced motion themselves (STY-072 S4).

### Motion is built on the View Transitions API

The slides use React's `ViewTransition` (in React 19.3) over the browser's View
Transitions API, or that API directly where React's cannot reach (STY-072 D6): no new
dependency, so ADR-005 is not reopened. A browser without the API shows the move at
once, marked.

### Copy

Each new string is in both catalogues (ADR-008), in the product's voice, through the
`copywriter` skill. The analysis's English is draft.

## Stories

| ID      | Story                                                                                                                                                               | Area                               | Depends on | State |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | ----- |
| STY-071 | [A Product Lead sees which item they moved, and where it went](../_archive/EPC-018-seeing-where-a-moved-item-went/STY-071-a-moved-item-is-marked-where-it-lands.md) | Features/UI + i18n (en + cy) + E2E | —          | ✅    |
| STY-072 | [A Product Lead sees a moved item travel to its new place](STY-072-a-moved-item-slides-to-its-place.md)                                                             | Features/UI + E2E                  | STY-071    |       |
| STY-073 | [A Product Lead sees the items travel back when they undo an order](STY-073-undo-order-slides-the-items-back.md)                                                    | Features/UI + E2E                  | STY-072    |       |
| STY-074 | [The same motion when adding, removing and discarding items](STY-074-the-same-motion-when-adding-removing-and-discarding.md)                                        | Features/UI                        | STY-072    |       |

## Sequencing

STY-071, then STY-072, then STY-073, one at a time: STY-072 plays before the mark
STY-071 draws, and STY-073 reuses STY-072's transition. STY-074 waits for grilling and
is not needed to close the others.

## Out of scope

- A trace where the item was (design D), and a "Back to" link after a move to another
  placement: the owner chose the mark alone; either could follow if moves between
  placements prove disorienting.
- A position on the mark ("2 of 4"): the owner dropped it; the status line still says
  it.
- Dragging an item: no record asks for it (reorder analysis, design B).

## Defects

None.

## Related

- [Moved item UX analysis](../../analysis/moved-item-indicator-ux-analysis.md) and its
  prototype page (design E); its _Outcome_ maps each decision here
- [Reordering a placement's items UX analysis](../../analysis/reorder-items-ux-analysis.md)
- [STY-050](../_archive/EPC-011-adding-roadmaps-and-items/STY-050-reorder-items-in-a-placement.md),
  [STY-051](../_archive/EPC-011-adding-roadmaps-and-items/STY-051-a-moved-item-goes-last-in-its-new-placement.md),
  [STY-067](../_archive/EPC-016-a-roadmaps-items-at-a-glance/STY-067-a-compact-view-of-a-roadmaps-items.md)
- [Product Lead persona](../personas/product-lead.md), A1 and A2
