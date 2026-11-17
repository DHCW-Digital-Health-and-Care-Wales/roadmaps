# STY-050: A Product Lead reorders the items in a placement

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-051 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-002, ADR-008
- **Suggested model**: Opus — an order as a pending edit, its conflicts, and moving
  rows in a tab a co-lead may be editing
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/130

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

## Delivery

### Departures

- **D2, S16: an item with no ID is found by what it holds, wherever its row is**
  (agent). D2 finds it "by its loaded position and content" (ADR-012 Option 11). An
  order's item is looked for at its position first and then anywhere an item holds
  the same content (`findOrderedItems`). A publish of an order moves rows, so after
  one whose answer was lost no item is where it was loaded, and position alone would
  leave a pending order of items it could no longer name. Two items that hold the
  same are interchangeable in an order, so nothing is misplaced. An item with no ID
  whose content a co-lead changed is still not found: it leaves the order and shows
  last, as their item, and the order is in conflict.
- **S5: an item moved out and back joins last** (agent). "An item moved out leaves the
  order" is taken literally: its place in the pending order is not kept, so one moved
  back into the placement joins it last, as any item moved in does.
- **S8: a new item is inserted just before the item that follows it** (agent), where
  ADR-012 says each row goes "just after its new predecessor's". The plan gives a new
  item the item it precedes (`before`), which is always one the roadmap holds; its
  predecessor may be another new item, which has no row yet. The order written is the
  same. The inserted row is formatted as the row after it (`inheritFromBefore:
false`), never as the header.
- **S8: new items of one reordered placement are appended in its order** (agent), not
  the order added, when several stay last.
- **S10, S11: an order whose items already match what "Keep mine" would publish is no
  conflict** (agent). The rule compares the re-read with the base and with the order
  that would be written, a co-lead's items last, not with the pending order as the
  Product Lead left it: otherwise a co-lead who added an item and made the same order
  would raise a conflict whose two lists read the same (S13 clears such a one).
- **S13: with the read after a refusal failed, an order conflict whose two orders
  become equal stays open** (agent) until it is decided or a read succeeds: the store
  settles an order against the items it has, which then lack the co-lead's. The
  review still draws both orders rightly (`reviewedOrders`), finding each item the
  publish read among the page's by its ID or by what it holds, never by its place,
  which is another read's (found by Sol's review).
- **S11: an order conflict with no field conflict among its placement's items sits
  after every item's** (agent), such orders in page order: field conflicts are listed
  by their items' place in the roadmap, not by placement, so there is no placement to
  sit before.
- **S11: both lists show an item by the title the page shows** (agent), a pending
  title edit included, so one item reads the same in "Your order" and "Current order".
- **S15: "as Edit and Move are"** (agent). Only a new item's Edit and Move wait for a
  publish (STY-046); an item the roadmap holds can still be edited and moved. Every
  item's order choices, and "Undo order", wait.
- **S1: "To the top" and "Up one" both show for a second item, "Down one" and "To
  the bottom" for a last-but-one** (agent), though each pair then does the same: the
  rule stays "unless it is first" and "unless it is last".
- **D5: the status messages** (agent, settled with the build): "Moved to the top. 1
  of 4.", "Moved up. 3 of 4.", "Moved down. 2 of 4.", "Moved to the bottom. 4 of 4.",
  in a status line that is on the page from the start, visually hidden. A notice that
  is a status too is now found by its text (`delivery-notes.md`).
- **D10: the review's notice** (agent, with `copywriter`): "Someone else has changed
  this roadmap too" and "Choose which to keep for each, then publish again.", in
  place of "…changed text you edited" and "Choose which text to keep…". In Welsh
  "Use theirs" is "Defnyddio'r un presennol", since "Defnyddio'u testun nhw" named
  text. The Welsh position reads "Nawr: 4 o 4", with no "In", which would mutate each
  heading.
- **The store settles orders, not each caller** (agent): every update of a roadmap's
  changes is settled against its items as cached (`settleOrders`), so a move, a new
  item, an Undo or a decision in the review changes an order "at once" without each
  knowing of orders.
- **Nothing was checked against a real spreadsheet** (agent): the delivery had no
  Google account.
  [CHO-020](../../chores/CHO-020-check-a-published-order-against-a-real-spreadsheet.md)
  records the check owed, of `insertDimension` above all, which no one has seen
  Google apply.
- **Tests.** Written before the code and run red: the move plan for an order
  (`item-moves.test.ts`), the order helpers (`placement-order.test.ts`), the fake's
  `insertDimension` and `TabWriter.insert`, the pending-order rules
  (`pending-orders.test.ts`) and the conflict rules (`conflicts.test.ts`). The
  publish plan's tests and the repository contract were written first but first run
  after the plan: their red was shown against the plan as it was (30 failing), and
  the contract's against the in-memory double before it could insert, which is no
  test-first evidence. The adapter's request tests followed their code and were shown
  red by breaking it (inserts sent before moves, a new item appended). The page,
  store and Playwright tests followed their code. The review's fixes were test-first:
  "Save and publish" dropping an order sent alone (`published-state.test.ts`, the
  contract), the review's titles for items with no ID after a failed read
  (`order-review.test.ts`), a kept order staying decided, and the place of an order
  conflict among the others (`conflicts.test.ts`), five tests red before their fixes.

### Contract for dependents

- **What the editor writes** (README, _What the editor writes_): a reordered placement
  is written as row moves alone, and a new item that is not last in one is inserted
  (`insertDimension`). No column or cell format changes.
- **`RoadmapChanges.orders`** (`domain/roadmap/roadmap-changes.ts`): one
  `PlacementOrder` a placement, its `base` and `items` as `OrderedItem`s, each an ID
  or, with none, the item as read and its position. A hand-written `RoadmapChanges`
  needs `orders`: spread `NO_CHANGES`. `countChanges` counts each as one.
- **`Conflict`** is `FieldConflict | OrderConflict`: a refusal's `conflicts`, the
  store's notice and `keepMine`/`takeTheirs` take either, told apart by `subject`
  (`"order"`). `OpenConflict` is `OpenFieldConflict | OpenOrderConflict`, told apart
  by `kind`.
- **`domain/roadmap/placement-order.ts`**: `orderedItem`, `sameOrderedItem` (items of
  one read), `sameItemAcrossReads`, `sameOrder`, `arrangedOrder` (an order over the
  items a placement holds: its own first, the rest last) and `findOrderedItems`.
- **`planItemMoves(placements, moved, orders)`**: a placement of `orders` is put in
  the order given, any of its rows moving; without it, as STY-051.
- **`PublishWrites`**: `newItems[].before`, the index of the item a new item is
  inserted before, and `orders`, each written placement's IDs before and after, which
  `heldWrites` judges a lost answer by. A hand-written one needs `orders`.
- **`TabWriter.insert(before, cells)`**: after every `move`, before any `append`.
- **`features/roadmaps/editing/pending-orders.ts`**: `reorderItem`, `undoOrder`,
  `settleOrders`, `shownTurns`, `positionAfter`. `createPendingChangesStore(itemsOf)`
  settles orders on every `update`; a store made without `itemsOf`, as in a unit
  test, leaves them.
- **`PlacementHeading`** (`editing/placement-heading.tsx`) draws a placement's heading
  with its "Order changed" tag and "Undo order".
- **`PageItem.turn`** replaces `arrival`: an item's place in its placement's pending
  order, or its turn among those that show last.
- **`reviewedOrders(conflict, pageItems)`** (`editing/order-review.ts`) draws the
  review's two orders; `RoadmapPublishing` and `ConflictReview` take the page's items.
- **`publishOnce`** is `tests/e2e/fixtures/dialogs.ts`'s, for any spec.
- **Copy**: `roadmaps.edit.order.*`, and `orderField`, `yourOrder`, `currentOrder`
  under `roadmaps.publish.notice.refused`.
- **Accessible names**: a placement's "Undo order" is "Undo order Now"; a card's Move
  menu has the group "In Now: 4 of 4"; the review's buttons are "Keep mine Now:
  Order" and "Use theirs Now: Order".
- **The fakes**: `apply-batch-update.ts` applies `insertDimension` and checks a row
  inserted as it checks one appended.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-ordering.test.tsx` (`The Move menu's position group (S1)`, `In Welsh (D7)`); `tests/e2e/editing.spec.ts` (`puts an item first from its Move menu on …`); `structure.spec.ts` (`edit-move-menu.aria.yml`)                                                                                                                                                                                                                                                                                              |
| S2       | `roadmap-detail-page-ordering.test.tsx` (`Choosing a position (S2)`); `pending-orders.test.ts` (`reorderItem`); the E2E journey above, by keyboard                                                                                                                                                                                                                                                                                                                                                                         |
| S3       | `roadmap-detail-page-ordering.test.tsx` (`A pending order at the placement's heading (S3)`); `pending-orders.test.ts` (`is no change once the order is the one the page shows without it (D12)`, `undoOrder`)                                                                                                                                                                                                                                                                                                              |
| S4       | `roadmap-detail-page-ordering.test.tsx` (`is left alone by an item's “Undo changes”…`); `pending-orders.test.ts` (same)                                                                                                                                                                                                                                                                                                                                                                                                    |
| S5       | `pending-orders.test.ts` (`a pending order and the Product Lead's other changes`); `pending-changes-store.test.ts` (`is settled against the roadmap's items as last read by every update…`); `roadmap-detail-page-ordering.test.tsx` (`takes an item moved in, and one added, last…`, `lets an item moved out leave the order…`)                                                                                                                                                                                           |
| S6       | `roadmap-detail-page-ordering.test.tsx` (`names the order in one line of “What changes”…`); `structure.spec.ts` (`edit-order-publish-dialog.aria.yml`)                                                                                                                                                                                                                                                                                                                                                                     |
| S7       | `item-moves.test.ts` (`planItemMoves, for a placement's pending order`); `publish-plan.test.ts` (`moves the fewest rows to reach the order…`); `google-sheets-roadmap-repository.test.ts` (`sends one moveDimension that moves the row whole…`); `placement-order-contract.ts`; the E2E journey above                                                                                                                                                                                                                      |
| S8       | `publish-plan.test.ts` (`inserts a new item that is not last…`, `appends a new item that stays last…`, `writes several new items in the order the placement has them…`); `tab-writer.test.ts` (`TabWriter.insert`); `google-sheets-roadmap-repository.test.ts` (`sends the cell writes, then the moves, then a row inserted with its cells, then a row appended`, `orders the placement with “Save and publish” too…`); `apply-batch-update.test.ts` (`inserting a row in a roadmap's tab`); `placement-order-contract.ts` |
| S9       | `publish-plan.test.ts` (`writes nothing, not even IDs, for an order the roadmap already holds…`); `pending-orders.test.ts` (`a pending order after a read (S9)`); `pending-changes-store.test.ts` (`waits as it is while the roadmap's items are not read…`); `roadmap-detail-page-ordering.test.tsx` (`is kept with its base through Disconnect and “Keep changes”…`, `is dropped by “Discard all”`, `is dropped by a Refresh that reads the order already there…`)                                                       |
| S10      | `publish-plan.test.ts` (`a co-lead's change to the placement's items (S10)`); `placement-order-contract.ts` (`when a co-lead changed the placement's items`); `google-sheets-roadmap-repository.test.ts` (`sends nothing when a co-lead has added an item…`); `roadmap-detail-page-ordering.test.tsx` (`stops the publish and shows both orders…`, `is no conflict for a co-lead's change to another placement…`)                                                                                                          |
| S11      | `conflicts.test.ts` (`an order conflict (STY-050)`); `order-review.test.ts`; `roadmap-detail-page-ordering.test.tsx` (`stops the publish…`, `sits before the field conflicts…`); `tests/e2e/editing.spec.ts` (`shows a co-lead's change to the placement's items beside your order on a desktop / a phone…`, side by side then stacked); `structure.spec.ts` (`edit-order-conflict-review.aria.yml`)                                                                                                                       |
| S12      | `conflicts.test.ts` (`Keep mine makes the order found the base…`, `Use theirs drops the pending order`); `publish-plan.test.ts` (`writes the order kept over a co-lead's change…`); `roadmap-detail-page-ordering.test.tsx`; `tests/e2e/editing.spec.ts` (the journey above, `Use theirs drops the pending order…`)                                                                                                                                                                                                        |
| S13      | `roadmap-detail-page-ordering.test.tsx` (`deciding an item's placement (S13)`)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S14      | `publish-plan.test.ts` (`a lost answer, judged by the placement's order (S14)`); `placement-order-contract.ts` (`when the write's answer is lost`); `google-sheets-roadmap-repository.test.ts` (`is unconfirmed when the answer is lost and a re-read finds the placement in neither order`)                                                                                                                                                                                                                               |
| S15      | `roadmap-detail-page-ordering.test.tsx` (`holds the order choices and “Undo order” while the roadmap is being published`, `leaves the order as it is when a choice is made while publishing`)                                                                                                                                                                                                                                                                                                                              |
| S16      | `describePlacementOrders`, run by `in-memory-roadmap-repository.test.ts` and `google-sheets-roadmap-repository.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                    |
