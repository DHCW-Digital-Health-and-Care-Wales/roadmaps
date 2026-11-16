# STY-050: A Product Lead reorders the items in a placement

- **Status**: Proposed — settled on the wayfinder map "Reordering a placement's items"
  (owner, 2026-11-16); waits for STY-051
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-051 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-002, ADR-008
- **Suggested model**: Opus — an order as a pending edit, its conflicts, and moving
  rows in a tab a co-lead may be editing

## Summary

Items show in a placement in the order they have in the spreadsheet, here and on the
public site, and only the spreadsheet can change it. With this story a Product Lead
puts any placement's items in the order they want from each card's Move menu: "To the
top", "Up one", "Down one" or "To the bottom". The new order is a pending change of
that placement, shown and undone at its heading, and publishing moves the rows to
match. A co-lead's change to the same placement's items stops the publish for review,
with both orders shown. A reorder mode is not built (D4).

## Scope

The order as a pending edit of a placement, its conflict rule and the publish plan's
row moves and inserts (`domain/`, with the contract test); the Sheets adapter and the
in-memory double (`infrastructure/`, `tests/`); the Move menu's position group, the
heading's tag and Undo, the publish dialog's line and the order conflict in the
publish review (`features/`, `i18n/`). README _What the editor writes_ and
`docs/operations/replacing-google-sheets.md` change in this story's PR. The ADR-012
amendment is already written (D11).

## Acceptance criteria

### S1: The Move menu shows an item's position and where it can go (D3)

**Given** Now holds four items
**When** Sam opens the Move menu of the fourth
**Then** above "Move to" a group labelled "In Now: 4 of 4" offers "To the top" and
"Up one", each choice shown only where it applies
**And** a placement with one item, and the unplaced items, show no order group;
positions are numerals in both languages, never ordinals (D7)

### S2: A choice changes the order at once (D3)

**Given** the Move menu of Now's fourth item
**When** Sam chooses "To the top"
**Then** the item shows first in Now, focus returns to its card's Move, and a status
message gives its new position
**And** "Up one", "Down one" and "To the bottom" change the order the same way

### S3: A pending order shows, and is undone, at the placement's heading (D2, D5)

**Given** Sam has reordered Now
**When** the roadmap's page shows
**Then** Now's heading shows an "Order changed" tag and "Undo order"; no card is
tagged for its position
**And** "Undo order" restores the loaded order, sends focus to Now's heading and
announces "Order of Now undone"; an order reordered back to the one the page shows
without it is no change, and the tag goes (D12)

### S4: An item's own Undo leaves the order alone (D2)

**Given** Sam has reordered Now and edited the title of one of its items
**When** Sam chooses that item's "Undo changes"
**Then** its title is restored and its position in the pending order is kept

### S5: Items moved or added into a pending order join it last (D2)

**Given** a pending order of Now
**When** Sam moves an item into Now, or adds one there
**Then** it joins the order last, and can be reordered
**And** an item moved out leaves the order, and undoing a move into Now takes it back
out

### S6: The publish dialog names the order in one line (D6)

**Given** a pending order of Now
**When** Sam opens the publish dialog
**Then** "What changes" shows one line, "Now", then "Order changed"; the new order is
not listed

### S7: Publishing moves the fewest rows (D8)

**Given** Now's rows hold A, B, C and D, and Sam's pending order is D, A, B, C
**When** the roadmap is published
**Then** one `moveDimension` request moves D's row to just before A's, after the cell
and `Item ID` writes, and nothing else in the tab changes
**And** no cell content or column is written for an order, and a move that would
leave a row where it is is never sent

### S8: A new item not last is inserted; one that stays last is appended (D8)

**Given** a new item that Sam has put second in Now
**When** the roadmap is published
**Then** a row is inserted at its slot (`insertDimension`) and its cells written
there, after the moves; a new item that stays last is appended as before (STY-045)
**And** the requests go: column growth and headers, cell and `Item ID` writes, moves,
inserts, appends; the same for "Save and publish"

### S9: An order the re-read already holds is no longer pending (D2)

**Given** a pending order of Now that the spreadsheet already holds
**When** the roadmap is published or refreshed
**Then** publishing writes nothing for it and Refresh drops it, as for a field;
"Discard all" drops orders, and Disconnect then Keep keeps them with their bases

### S10: A co-lead's change to the placement's items is a conflict (D2, D9)

**Given** a pending order of Now, and a co-lead has since reordered Now, or added,
moved in, moved out or removed one of its items
**When** the roadmap is published
**Then** nothing is published, and the review shows the order conflict
**And** a co-lead's change to another placement, or to an item's text, is no
conflict with the order; an item a co-lead removed is reported "not found" first and
leaves the order, and if that was the only difference there is no order conflict

### S11: The review shows both orders (D10)

**Given** an order conflict in Now
**When** the review shows
**Then** its target reads "Now: Order", with "Your order" (what "Keep mine" would
publish: Sam's order of the items Sam knows, a co-lead's added or moved-in items
last, removed or moved-out items gone) beside "Current order", both numbered lists of
titles, side by side, stacked on a phone
**And** it sits before the field conflicts of Now's items, and the review's notice is
worded to cover orders as well as text

### S12: "Keep mine" and "Use theirs" (D9, D10)

**Given** the order conflict in Now
**When** Sam chooses "Keep mine"
**Then** the order's base becomes the current order, Now still shows "Order
changed", and Sam publishes again
**And** "Use theirs" drops the pending order

### S13: Deciding an item's placement updates the order conflict (D10)

**Given** Sam moved X into Now, a co-lead moved X to Later, and Now's order is in
conflict
**When** Sam chooses "Use theirs" for X's placement
**Then** X leaves Sam's order at once; the order conflict clears if the two orders
are now equal, and otherwise both lists are redrawn

### S14: A lost answer is judged by the placement's order (D8)

**Given** a publish with a pending order whose answer never arrives
**When** the adapter reads the roadmap back (ADR-012 Option 16)
**Then** a placement whose order equals the pending one is published, one equal to
its base is not written (`network`, changes kept), and anything else is unconfirmed

### S15: The order controls are held while publishing

**Given** the roadmap is being published
**When** Sam opens an item's Move menu
**Then** its order choices are held, as Edit and Move are, and "Undo order" too

### S16: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S7 to S10 and S14 hold for both, and `listRoadmapItems` returns each
placement's items in the published order

## Tests

S7, S8, S10 and S14 need the adapter against MSW, asserting the requests and their
order; the Sheets fake applies `insertDimension` as well as STY-051's
`moveDimension`. S1–S6 and S11–S13 need component tests. Playwright: a reorder
published, and an order conflict reviewed, at desktop and phone width.

## Decisions

- **D1** (owner, 2026-11-14, STY-046 grilling, items round 1 Q6): record the gap of
  reordering a horizon's items for later grilling. The title said "horizon"; the owner
  confirmed all six placements on the map, so title and file say "placement" (glossary:
  a horizon is Now, Next or Later only).
- **D2** (owner, 2026-11-16, map ticket
  [What is an order change, and when is it a conflict?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/104)
  Q1–Q7; answers former Q3 with (a)): an **order** is one pending edit per placement,
  every placed item in sequence, its base the order as loaded, compared as one value;
  it exists only once Sam reorders; moved-in and added items join it, moved-out ones
  leave; it is undone on its own; one already in place is no longer pending.
- **D3** (owner, 2026-11-16, map ticket
  [How does a Product Lead reorder a placement's items?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/105);
  answers former Q1 with (a)): the Move menu, from nine mock-ups
  (`docs/analysis/reorder-items-ux-analysis.md`). Lost: drag and drop (a new library,
  and still needs the menu), a position in the item dialog (departs from D2).
- **D4** (owner, 2026-11-16, #105): no reorder mode (mock-up C) now; add one beside
  the heading only if Product Leads report reshuffles as slow.
- **D5** (owner, 2026-11-16, #105): "Order changed" and "Undo order" at the heading;
  focus and status message after "Undo order". **D6**: one "Order changed" line in the
  publish dialog. **D7**: numerals ("4 of 4"), since Welsh ordinals change with the noun
  and the number. The status messages after a move are settled with the build.
- **D8** (owner, 2026-11-16, map ticket
  [What does publishing write for an order change?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/107)
  Q1, Q2, Q5–Q7; answers former Q2 with (a)): rows are moved, never rewritten and no
  order column; the fewest moves; a new item not last is inserted; the request order
  of S8; a lost answer judged by the order; hidden rows count as items.
- **D9** (owner, 2026-11-16, #107 Q3, Q8; #104 Q4): any co-lead change to the
  placement's items is a conflict; merging relative orders lost, needing a rule for
  where a co-lead's item goes. "Keep mine" puts co-lead items last.
- **D10** (owner, 2026-11-16, map ticket
  [How is an order conflict reviewed?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/117)
  Q1–Q7): the review of S11–S13; "Your order" shows what "Keep mine" publishes. The
  review's notice and labels are settled with `copywriter`, in English and Welsh.
- **D11** (owner, 2026-11-16, map ticket
  [How is STY-050 sliced into stories?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/126)
  Q1, Q2, Q4): STY-051 ships first and carries row moves and the protected-row error;
  this story carries the conflict review, not a stopgap. ADR-012 is amended in place
  by the PR that wrote this record; this story's PR changes README _What the editor
  writes_ (a reorder moves rows, writing no cell content and no column; a new item not
  last is inserted rather than appended).
- **D12** (agent, 2026-11-16, from review): "equal to its base is no change" (D2)
  compares the pending order with the order the page shows without one: the loaded
  order without the items moved out, then the items moved in and the new items, as
  STY-051 shows them. Comparing with the loaded order alone lost: an order holding a
  moved-in item could never equal it, so "Order changed" would stay with the page back
  at its default, and a co-lead's change to the placement would become a conflict. The
  conflict rule (D9) still compares the re-read with the loaded order.

## Starting point

Audited at `881ea16`. STY-051's _Contract for dependents_ holds the row-move plumbing
this story builds on; read it first. What a moved row carries in a real tab, and how
the public site orders items, are in STY-051's Starting point.

## Out of scope

- An order column, or any public-site change: row order is already its contract
  (`docs/analysis/roadmap-tab-format.md`).
- Reordering roadmaps in the roadmap list, and an item's tags (EPC-009's later
  record).
- A reorder mode for one placement, unless Product Leads ask (D4).
