# Reordering a placement's items: nine mock-ups over three journeys

- **Date**: 2026-11-16
- **Question**: how does a Product Lead reorder a placement's items, on a desktop and
  a phone, by keyboard, touch and screen reader, and how does a changed order show as
  pending and get undone?
- **Scope**: a roadmap's page, for
  [STY-050](../backlog/EPC-011-adding-roadmaps-and-items/STY-050-reorder-items-in-a-horizon.md),
  answering the wayfinder ticket
  [How does a Product Lead reorder a placement's items?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/105)
  on the map
  [Reordering a placement's items](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/102).
  Base `69ff0d1`. Only documents and one prototype page were added; no application
  code.
- **Prototypes**: [`reorder-items-ux-analysis/prototypes.html`](reorder-items-ux-analysis/prototypes.html),
  one self-contained page of static mock-ups, each with a desktop and a phone frame;
  open it in a browser. The mock-ups approximate the app's look.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a
desk, with a phone for small jobs (A2). Today the order of a placement's items can be
changed only by moving rows in the shared spreadsheet (A3). The usual job is small:
put a promoted or newly added item first, or swap two. A full reshuffle of a
placement is rarer, perhaps when a roadmap is first tidied. A co-lead may be editing
the same roadmap (A12), and nothing is public until a deliberate publish (A9, A10).

## Journeys covered

| Group                                        | Journeys                                                                                 | Source                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| 1. Put an item in its place                  | find the control; move an item to the top, up or down; know its position; focus after    | STY-050 Q1; ticket 105         |
| 2. See a changed order, pending, and undo it | see which placement's order is pending; see the unpublished change count; undo the order | ticket 104 points 1, 5, 6      |
| 3. Publish a changed order                   | see the order in "What changes" before publishing                                        | STY-025 S9 (the dialog exists) |

STY-050 has no acceptance scenarios yet, so each design is traced against the
ticket's question and the decisions already made on the map:
[What is an order change, and when is it a conflict?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/104)
and
[Where does a moved item land, and where does a new item go?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/106).
Each journey relies on A1 (short visits), A2 (desktop first, phone second), A9 and A10
(pending until published) and A12 (a co-lead).

Excluded: the conflict review of an order, which is
[How is an order conflict reviewed?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/117);
what publishing writes
([What does publishing write for an order change?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/107));
reordering roadmaps in the roadmap list and an item's tags (out of the map's scope);
the Welsh interface; connecting to Google.

## What every design shares

- **An order is one pending edit of a placement** (ticket 104): it counts as one
  unpublished change, whatever number of items moved, and nothing is written until
  the roadmap is published or saved.
- **Every placement with two or more placed items can be reordered**: the three
  horizons and the three sections. A placement with one item, and the unplaced items,
  show no order control.
- **A moved or new item lands last** in its placement, and joins a pending order last
  (ticket 106), so reordering is how it gets anywhere else.
- **An order is undone on its own.** An item's "Undo changes" undoes its fields only;
  "Discard all" drops the order too (ticket 104 points 5, 6).
- **Positions are numerals**: "4 of 4", never "4th". Welsh ordinals change with the
  noun and the number, so numerals translate cleanly.
- **Focus follows the moved item**: after a move, focus is on the same control of the
  moved card or row, and a status message says its new position ("Moved up. 1 of 4.").
- The order controls are held, though focusable, while the roadmap is being published,
  as Edit and Move are today.
- The app's look: its header band, cards, buttons and tags.

The sample is invented. On Monday 16 November 2026 at 09:15, Sam Evans opens
Outpatient Booking, published on Saturday 14 November, with nothing pending. Now holds
four items, the newest last: "Offer video appointments where suitable", "Text
reminders before every appointment", "See your place on the waiting list" and "Check
in from your phone on arrival" (added and published on 14 November). Next holds two,
Later and Delivered this year one each, Recently delivered and Not doing none. At
09:18 Sam starts putting "Check in from your phone on arrival" first in Now (journey
1). At 09:19 that order is pending, one unpublished change, which the frames at now,
09:20, show (journeys 2 and 3).

## 1. Put an item in its place

Sam wants the newest item in Now shown first, here and on the public site.

| Design                                    | Idea                                                                                                                                                                                                                                                                             | Strengths                                                                                                                                                                                                                                                         | Risks                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Move menu (inline)                     | Each card's Move menu gains a group above "Move to", labelled with the item's position ("In Now: 4 of 4"): "To the top", "Up one", "Down one", "To the bottom", each shown only where it applies. Each choice changes the order at once; focus returns to the moved card's Move. | One control for every kind of move, so a moved item put last (ticket 106) is put first from the same menu. Built from the existing menu: the same by keyboard, touch and screen reader, and on the phone. The common jobs, first or one place up, are one choice. | A middle position takes several trips through the menu: 6th to 3rd is three "Up one". The menu grows from five choices to as many as nine. In the three-column grid, "up" is left-to-right reading order, and the card jumps rows.                                                                                                                                                                  |
| B. Drag a handle, or the Move menu        | Each card gets a handle. Drag it, or on a phone press and hold, to a drop line between cards. From the keyboard, Space lifts, the arrows move and Space drops, with spoken positions. A's menu stays, as the way for anyone who can't drag.                                      | Familiar from other tools; any position in one gesture on a desktop.                                                                                                                                                                                              | A new interaction and library to build and test: Base UI has no sortable list. Cards are as tall as a phone screen, so a drag on a phone needs the page to scroll under the finger, and press-and-hold fights the page's own scrolling. The drop line in a grid is ambiguous: before this card, or after the one to its left. Everything in A has to be built too (WCAG 2.5.7, dragging movements). |
| C. Reorder mode for one placement (mode)  | "Reorder" beside a placement's heading turns its cards into one numbered row per title, with up and down arrows, as the details editor moves a detail. "Done" makes the new order pending; "Cancel" leaves the order as it was. One placement at a time.                         | The whole order on one screen, even on a phone, so a reshuffle is quick and its result seen. Follows a pattern the editor already has ("Move up", "Move down", "Moved up."). Cards stay uncluttered outside the mode.                                             | Two more presses, in and out, for a one-step job. Titles only: phase and description are out of sight while ordering. A second way of moving items besides the Move menu. What happens to Edit, Move and the other placements while a mode is open has to be settled.                                                                                                                               |
| D. Position in the item's dialog (guided) | The item dialog gains "Position in Now", a choice of "1 of 4" to "4 of 4", beside "Horizon or section".                                                                                                                                                                          | No new control on the page; the position sits with the item's other details.                                                                                                                                                                                      | The order is a placement's edit, not the item's (ticket 104 point 5), so the item's "Undo changes" could not undo what its own form changed. One item per trip, choosing a number with the other items out of sight. Choosing a position moves every item between, which the form doesn't show.                                                                                                     |

**Recommendation**: **A, the Move menu**. It answers the usual job in one or two
choices, uses a control every card already has, and behaves the same for every
reader and device, with nothing new to build but the choices. Add-on, only if Product
Leads report reshuffles as slow: **C**'s reorder mode, beside the heading. B is not
recommended: it costs a new interaction and library and still needs A.

## 2. See a changed order, pending, and undo it

It is 09:20. Now's new order is pending: "Check in from your phone on arrival" first.

| Design                                    | Idea                                                                                                                                                    | Strengths                                                                                                                                                                                 | Risks                                                                                                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Tagged at the heading                  | Beside the placement's heading, the "Order changed" tag and "Undo order", as an item card shows "Changed" and "Undo changes". The cards are not tagged. | The change is shown where it lives, the placement, and undone there, matching the item card's pattern. The cards stay as they are, so a card's own "Changed" still means its fields only. | Doesn't say what the order was. Two different undos in view at once on a placement with a changed item: "Undo order" and the card's "Undo changes".                                                                           |
| B. Each card's position, with what it was | A's tag and "Undo order", plus each card's position and its loaded one ("1 of 4, was 4").                                                               | The old order can be read back without undoing.                                                                                                                                           | Moving one item changes every card's position, so every card is marked: noise for a one-step change. Grows a line on cards that have no change of their own.                                                                  |
| C. Listed from the publish bar            | The publish bar gains "Show changes", a panel listing each pending change with its own Undo: "Now: order changed". Nothing marks the heading.           | One place for every pending change, which could grow to items and roadmap fields too.                                                                                                     | A new panel and a new way to undo, for the one change that has no card of its own. Nothing on the page says which placement's order changed until the panel is opened. Out of step with how fields show today, on their card. |

**Recommendation**: **A, tagged at the heading**. Undoing an order puts focus on the
placement's heading, since "Undo order" goes with it, and a status message says
"Order of Now undone".

## 3. Publish a changed order

Sam has chosen "Publish changes". The dialog's "What changes" lists each changed part
by name with its changed fields (STY-025 S9).

| Design           | Idea                                                                            | Strengths                                                                                                             | Risks                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A. One line      | "Now", then "Order changed", as a changed item shows its title then its fields. | Consistent with every other line: the dialog names what changed, not its values. Short, whatever the placement holds. | The new order isn't in the dialog; it is on the page behind it.                                                                    |
| B. The new order | "Now", then "New order:" and its items numbered.                                | The order can be checked at the last step before it goes public (the persona's "publishing by mistake").              | Long for a placement of ten items, and the only line that lists values. Long on a phone, where the dialog is already a tall sheet. |

**Recommendation**: **A, one line**.

## Decisions needed

| Decision                                | Options                                                                                                        | Where it is asked |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- |
| How a Product Lead reorders             | A, the Move menu (recommended); B, drag with the menu; C, a reorder mode; D, a position in the item's dialog   | ticket 105        |
| If A: which choices                     | top, up one, down one and bottom, each where it applies (recommended); up and down only; top and bottom only   | ticket 105        |
| If A: C as an add-on                    | later, only if reshuffles prove slow (recommended); now, with A                                                | ticket 105        |
| If B: a drag-and-drop library           | a new dependency beside Base UI (ADR-005), and A built as well                                                 | ticket 105        |
| If C: when the order becomes pending    | on Done, with Cancel leaving it (as drawn); at each arrow press                                                | ticket 105        |
| If D: the order as the item's field     | a departure from ticket 104 point 5 (an order is undone on its own)                                            | ticket 105        |
| How a pending order shows and is undone | A, the heading's tag and "Undo order" (recommended); B, positions on the cards; C, a list from the publish bar | ticket 105        |
| Focus after "Undo order"                | the placement's heading, with a status message (recommended); the first card's Move                            | ticket 105        |
| An order in "What changes"              | A, one line, "Order changed" (recommended); B, the new order listed                                            | ticket 105        |
| Positions in words                      | numerals, "4 of 4" (recommended, as drawn); ordinals, "4th"                                                    | ticket 105        |

Reads and writes: every design reads only the roadmap's items on the page, pending
edits included, and makes the order a pending edit (ticket 104). Writing it is
[What does publishing write for an order change?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/107);
a co-lead's change to the same placement is
[How is an order conflict reviewed?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/117).
No design needs a read or write those don't supply.

## Not yet drawn

- The conflict review of an order (ticket 117).
- An item moved or added into a placement whose order is pending, joining it last.
- A placement with one item, and the unplaced items, with no order controls.
- A section's order (Recently delivered, Delivered this year, Not doing), the same as
  a horizon's.
- The status messages and focus after each move, given here as text only.
- The page while publishing, with the order controls held; an expired session, which
  keeps the pending order.
- Undo order, Discard all and Refresh dropping an order; an order equal to its base,
  which is no change.
- The Welsh interface; dark mode.

## What does not change

- Row order within a placement is the order, here and on the public site; no order
  column, and nothing changes on the public site.
- A move between placements still uses the Move menu's "Move to" list.
- Edits are pending until the Product Lead publishes or saves; publishing, Refresh,
  Discard all and Disconnect work as ADR-012 sets.
- An item's "Changed" and "Undo changes" cover its own fields only.

## Related

- [STY-050](../backlog/EPC-011-adding-roadmaps-and-items/STY-050-reorder-items-in-a-horizon.md)
  and [EPC-011](../backlog/EPC-011-adding-roadmaps-and-items/README.md).
- The map:
  [Reordering a placement's items](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/102).
- [`roadmap-tab-format.md`](roadmap-tab-format.md): items keep their row order within a
  placement.
- [STY-039](../backlog/_archive/EPC-010-item-details/STY-039-edit-an-items-details.md):
  the details editor's "Move up" and "Move down", which C follows.
- Persona: `docs/backlog/personas/product-lead.md`.

## Outcome

Decided with the owner on 2026-11-16, on the wayfinder ticket
[How does a Product Lead reorder a placement's items?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/105).
Every recommendation was taken.

- **Put an item in its place**: A, the Move menu, with "To the top", "Up one", "Down
  one" and "To the bottom", each shown only where it applies, under the item's
  position ("In Now: 4 of 4").
- **C as an add-on**: not now; only if Product Leads report reshuffles as slow. B and
  D are not built.
- **A pending order**: A, the "Order changed" tag and "Undo order" beside the
  placement's heading. After "Undo order", focus goes to the heading, and a status
  message says "Order of Now undone".
- **In "What changes"**: A, one line, "Now" then "Order changed".
- **Positions**: numerals, "4 of 4".

The decisions stay on the ticket and the map until the map reaches its destination,
when they are written into STY-050.
