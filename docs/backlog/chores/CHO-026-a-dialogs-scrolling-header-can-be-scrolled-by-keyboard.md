# CHO-026: A dialog's scrolling header can be scrolled from the keyboard

- **Status**: Proposed — declined in STY-076's review record; the owner has not asked for it
- **Type**: Chore
- **Area**: Features/UI + E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — one primitive's header and one axe scenario
- **Delivered**: _(add on delivery)_

## Summary

At the pinned sizes, a dialog's header taller than two fifths of the screen scrolls by
itself (`DialogHeader`, `pinned:max-h-[40dvh] pinned:overflow-y-auto`), so a very long
item title cannot push the buttons out of view. The removal question's header holds only
its title and description, so the scroll area has nothing focusable in it: where the
browser does not make such a scroller focusable, a keyboard user cannot read the rest of
the title, and axe would flag it (`scrollable-region-focusable`), as it did a scrolling
band STY-076 tried and dropped. STY-076 declined it as reachable only with a very long title.
Done is a header that a keyboard user can scroll whenever it scrolls, with the axe spec
holding that state.

## Measurement

At commit `08c2e3f`.

| Area                         | Measurement                                                                                                                   | Verdict                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `dialog.tsx`, `DialogHeader` | scrolls at the pinned sizes, no `tabIndex`, no region name                                                                    | a scroller with no focus of its own |
| `removal-dialog.tsx`         | its header holds `DialogTitle` and `DialogDescription` only                                                                   | nothing focusable inside            |
| `pinned-dialog.spec.ts`      | at 640×500 an item titled with 80 words makes the removal question's header scroll (`…a removal question … very long title…`) | reachable with a long title         |
| `accessibility.spec.ts`      | no scenario opens a dialog whose header scrolls                                                                               | axe has not looked at the state     |

To measure first: whether axe flags that state, and which of the supported browsers move
focus to a scroller with no focusable content on Tab, so the fix covers those that do not.

## Acceptance criteria

### S1: A keyboard user reads a long title in the removal question

**Given** the removal question about an item whose title makes its header scroll, at
640×500
**When** the Product Lead tabs through the dialog
**Then** focus reaches the header's scroll area, with a visible `focus-ring`, and the
arrow keys scroll it
**And** the axe spec covers that state with no violation, in English and Cymraeg

## Decisions

## Out of scope

- A header that fits: it does not scroll and needs no stop in the tab order.
