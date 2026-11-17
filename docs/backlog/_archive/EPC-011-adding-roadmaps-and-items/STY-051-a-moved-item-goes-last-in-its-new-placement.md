# STY-051: A moved item goes last in its new placement

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-014, ADR-012, ADR-011, ADR-002, ADR-008
- **Suggested model**: Fable 5.2 — the owner is testing the model (D7); the first story
  to move rows in a tab a co-lead may be editing
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/128

## Summary

Today a moved item keeps its row, so it can land in the middle of its new placement,
here and on the public site. With this story it goes last there, as soon as it is
moved, and publishing moves its row to match. A Product Lead who moves "Online
booking" from Next to Now sees it fourth of four, and so does the public. A row the
account may not edit now refuses the publish with an error that says so. Reordering a
placement's items is STY-050, which builds on these row moves.

## Scope

The page shows a pending moved item last in its new placement (`features/`). The
publish plan moves the item's row after the re-read (`domain/`, with the contract
test), the Sheets adapter sends the moves and the in-memory double keeps the same
order (`infrastructure/`, `tests/`). A new `AppError` kind for a refused protected row,
with its copy in English and Welsh (`lib/`, `i18n/`). README _What the editor writes_
changes in this story's PR, which says so, and so does
`docs/operations/replacing-google-sheets.md` (a moved item is returned last; the new
error kind). The ADR-014 and ADR-012 amendments are
already written (D5); this story checks the build against them.

## Acceptance criteria

### S1: A moved item shows last in its new placement while pending (D1)

**Given** Now holds "A", "B" and "C", and Next holds "Online booking"
**When** Sam moves "Online booking" to Now
**Then** the roadmap's page shows it fourth in Now, after "C"
**And** an item moved into a placement after it shows after it: moved items show in
the order they were moved (D3), and new items after every moved item (D4)

### S2: Undoing a move, or moving back, restores the loaded position (D1)

**Given** Sam has moved "Online booking" from Next to Now
**When** Sam undoes the move, or moves the item back to Next
**Then** it shows in Next where it was loaded, and nothing about its row is pending
**And** a later publish neither writes its `Horizon` cell nor moves its row

### S3: Publishing moves the row after the placement's last item (D1, D2)

**Given** a pending move of "Online booking" into Now
**When** the roadmap is published, or saved, or "Save and publish" is chosen
**Then** the same all-or-nothing `batchUpdate` writes its `Horizon` cell and, unless
its row is already where Now's new order puts it (S5), moves the row to just after
the row of Now's last item in the re-read, by `moveDimension`, after the cell and
`Item ID` writes and before any appended row
**And** no cell of the row is rewritten, and the rows of every other placement keep
their order relative to each other

### S4: "Last" counts what a co-lead added, and is no conflict (D2)

**Given** a pending move of "Online booking" into Now, and a co-lead has since added
"D" to Now
**When** the roadmap is published
**Then** the row goes after "D", and the publish is not stopped for review
**And** the page, once the publish is read back, shows "Online booking" fifth of five

### S5: A row already where the new order puts it is not moved (D2)

**Given** a pending move whose row already sits where the placement's new order puts
it: after every row of the placement's items and of the items moved in before it, as
a Next item does below Now's rows when it is the one item moved to Now, or the one
item moved into a placement with no items
**When** the roadmap is published
**Then** only its `Horizon` cell is written, and no `moveDimension` request is sent: it
already shows last, and Google refuses a move to the row's own position, failing the
whole publish

### S6: Several moved items go last in the order they were moved (D3)

**Given** Sam moves "X" and then "Y" into Now
**When** the roadmap is published
**Then** Now's rows end "X", "Y", as the page showed them, with the fewest moves
**And** when Now held no items and Y's row sits above X's, Y's row is moved after X's:
a placement with no items exempts only a row the order already puts last (S5)
**And** a new item added to Now is still appended after the tab's last row in use, so
it shows after both (D4)

### S7: A protected row refuses the publish, and keeps the changes (D6)

**Given** a pending move whose row, or any cell the publish writes, the connected
account may not edit
**When** the roadmap is published
**Then** nothing is published, the Product Lead is told a protected part of the
spreadsheet stopped the publish, in English or Welsh
**And** every pending change stays pending; the error is its own `AppError` kind,
not `unknown` or `forbidden`

### S8: A lost answer is settled by the `Horizon` cell (D2)

**Given** a publish with a pending move whose answer never arrives
**When** the adapter reads the roadmap back (ADR-012 Option 16)
**Then** the move is judged by its `Horizon` cell as it is today: the batch is all or
nothing, so the cell holding the new placement proves the row moved too

### S9: A hidden row counts as an item (D2)

**Given** Now's last item row is hidden by hand in the spreadsheet
**When** a move into Now is published
**Then** the moved row goes after the hidden row, which keeps its position though
the public site does not show it

### S10: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S3 to S6 and S8 hold for both: `listRoadmapItems` returns a published
moved item last in its placement

## Tests

S3–S7 need the adapter against MSW, asserting the requests sent and their order. The
Sheets fake (`tests/fixtures/sheets/apply-batch-update.ts`) applies `moveDimension`
by the before-removal index rule (D2) and fails a move to the row's own position, as
Google does. S1, S2 and S7's message need component tests; one Playwright journey
moves an item and publishes it.

## Decisions

- **D1** (owner, 2026-11-16, map ticket
  [Where does a moved item land, and where does a new item go?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/106)
  Q1, Q3, Q5, Q7): a moved item goes last in its new placement, in all six,
  replacing "keeps its row" (STY-031); undoing a move or moving back restores its
  loaded position; a published move moves its row too. Lost: first (wrong for a
  demotion), kept row (unpredictable), chosen at move time (reordering covers it).
- **D2** (owner, 2026-11-16, map tickets
  [How do row moves behave in one Sheets batchUpdate?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/103),
  [What do row moves do to a real roadmap tab?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/109),
  [What does publishing write for an order change?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/107)
  Q2, Q5, Q7; #106 Q6): rows are moved by `moveDimension`, never rewritten;
  `destinationIndex` counts rows before the moved row is taken out (up to `f`: `f`;
  down to `f`: `f + 1`); "last" is resolved against the re-read, and a co-lead's
  change is no conflict; a row already after every row of the placement's items is not
  moved (#107 point 1: rows already in order stay), and a no-op move is never sent; a
  hidden row is an item; a lost
  answer is judged by the `Horizon` cell, since the batch is atomic (confirmed with the
  owner on ticket
  [How is STY-050 sliced into stories?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/126)).
- **D3** (agent, 2026-11-16): several items moved into one placement go last in the
  order they were moved, over their loaded row order, because D1 applied to each move
  in turn shows them so, and the publish must match the page. The pending changes
  therefore keep the order of moves.
- **D4** (agent, 2026-11-16): a new item stays after every moved item, over showing
  it by when it was added, because it is still appended after the tab's last row
  (STY-045) until STY-050 inserts one that is not last (#107 Q1).
- **D5** (owner, 2026-11-16, #126 Q1, Q2, Q4): this story ships first, before STY-050;
  ADR-014 and ADR-012 are amended in place by the PR that wrote this record, and this
  story's PR changes README _What the editor writes_: a moved item's row moves to
  after its new placement's last item; moved rows keep their formatting, dropdown and
  references; a protected row refuses the whole publish; a hidden row holds a position
  the public site does not show; a co-lead's in-progress edit to a moved row is lost.
- **D6** (owner, 2026-11-16, #107 Q4; #126 Q1): Google refuses a move of a row the
  account may not edit (`400 INVALID_ARGUMENT`, "You are trying to edit a protected
  cell or object"), failing the whole batch. A new `AppError` kind covers any such
  refusal on a publish, whatever the request; its copy is settled with `copywriter`.
- **D8** (agent, 2026-11-16, from review): a row move shifts the positions of the rows
  it passes. A co-lead who loaded the roadmap while one of its items had no `Item ID`
  then finds that item "not found" on their publish (ADR-012 Option 13), as after a row
  moved by hand. No new rule: Option 13 already governs it, and any publish gives every
  item an ID, so it can happen once per such item. Recorded so the owner can see it.
- **D7** (owner, 2026-11-16, #126 Q5): suggested model Fable 5.2, "I'm testing the
  model".

## Starting point

Audited at `881ea16`.

- The page shows a pending moved item in row order: `groupRoadmapItems`
  (`features/roadmaps/group-roadmap-items.ts`) keeps the loaded order and places each
  item by its pending placement, with new items last. S1 changes this.
- What #109 saw on a scratch copy of a roadmap tab: a moved row carries its fill,
  `Horizon` dropdown and value, and the rest of the row; `=A3` on another tab became
  `=A5`; a co-lead finishing an edit in a row that moved sees "The cell that you are
  trying to edit may have been moved or deleted", and the edit is lost; a row hidden by
  hand moves and stays hidden, and is left out of the public site's CSV export.
- The public site orders a placement's items by row order alone
  ([parse-roadmap.ts L503-L540](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/parse-roadmap.ts#L503-L540)):
  its format does not change.

## Out of scope

- Reordering a placement's items, an order conflict and inserting a new item that is
  not last: STY-050.
- Choosing where a moved item lands: reordering it afterwards covers that (D1).

## Delivery

### Departures

- **S3, S5: "the placement's last item" is the last that stays in it** (agent). An
  item this same publish moves out of a placement is none of its items, so a row
  moved in goes after the last item staying, and one already below that is left
  alone, though it sits above a row that is leaving. Counting the leaver would send a
  move that changes no placement's order (#107 point 1: rows already in order stay).
- **S6: "the fewest moves" holds the placement's own items still** (agent). Only a
  moved item's row moves: the longest run of them already in the order moved, below
  the placement's last item, stays (the earliest moved of two runs as long), and each
  other goes just after the item it follows. With no item to follow, as in a placement
  that had none, the first goes just before the first that stays, ADR-012's "the
  first just before the placement's first row". A plan that moved the placement's
  items instead could be shorter, and would move rows the Product Lead never touched.
- **D3: the order of moves is the order of `RoadmapChanges.items`** (agent), not a
  field of its own. An edit that moves an item puts its entry after the others; any
  other edit of it keeps its turn, where every edit used to put it last. An item moved
  back to where it was loaded and out again is last, as a new move.
- **S7, D6: the kind is `protected`, set by the Sheets client on any request** (agent),
  as D6's "whatever the request" asks: Google's HTTP 400 `INVALID_ARGUMENT` whose
  message holds "protected cell or object". Every write shows one message for it,
  under its own title, naming no roadmap: adding a roadmap and a family write can be
  refused so too. `errors.protected` holds the same words, as every kind has copy
  there, though no read is refused so.
- **S9: nothing was built** (agent). The editor reads every row it is given and has
  no way to tell a hidden one: the tab-list read asks for no row properties, a mask
  the E2E fake checks exactly. The owner's check (#109) saw a hidden row read, move
  and stay hidden.
- **S8: `heldWrites` is unchanged** (agent): it never looks at a row's place, so a
  move is judged by its `Horizon` cell alone.
- **D8: nothing was built**, as it says. Review (Opus) found the same effect nearer
  home: the Product Lead's own edit, made while their publish is being written, to an
  item with no ID whose row that publish moves, is dropped at the next publish as
  "removed or changed".
  [DEF-017](../../defects/DEF-017-an-edit-made-while-a-publish-moves-its-item-is-reported-as-removed.md)
  records it for the owner, not fixed here: how such an item is found is ADR-012's
  rule (Options 11, 13).
- **The Sheets fake refuses a move to just after the row too** (agent): a
  `destinationIndex` equal to the row's `endIndex` leaves it where it is, as one
  equal to its `startIndex` does. The owner saw Google refuse the second (#109); the
  first is refused here untested, and the editor sends neither. It records as
  violations a move of a header row, above one, of columns, or in a tab no index row
  names.
- **Nothing was checked against a real spreadsheet** (agent): the delivery had no
  Google account. The owner saw one `moveDimension` on a scratch copy (#109);
  [CHO-019](../../chores/CHO-019-check-a-published-move-against-a-real-spreadsheet.md)
  records the check owed of the editor's own request: a cell write, several moves and
  an appended row together.
- **Two older tests changed their claim** (agent): STY-031's "keeping every row where
  it is" (the contract and the adapter) and "in row order" (the page and the E2E
  journey) now hold the row's move, or name the case where it stays.
- **Tests.** Written before the code and run red: the move plan
  (`item-moves.test.ts`, against a stub that plans nothing), the order of moves and
  the page's grouping (`pending-changes.test.ts`, `group-roadmap-items.test.ts`), the
  contract under both repositories (8 failing each), the fake's `moveDimension`, and
  the protected refusal in the adapter. The plan's own wiring
  (`publish-plan.test.ts`) was written first but first run after it: its red was
  shown by taking the move plan out, which is no test-first evidence. The page tests
  beyond the one that already held row order, the copy tests and `tab-writer.test.ts`
  followed their code; the page and copy tests were shown red by breaking it.

### Contract for dependents

- **What the editor writes** (README, _What the editor writes_; ADR-012 and ADR-014,
  _STY-051 amendments_): a published move now also moves the item's row, and a
  protected cell or row refuses the whole write.
- **`PublishWrites.moves`** (`domain/roadmap/publish-plan.ts`): the rows to move, as
  `ItemMove`s, each an item's index among the snapshot's items put just `after`
  another's, or just `before` it, made in order, each over what the moves before it
  left. `planItemMoves` (`domain/roadmap/item-moves.ts`) plans them from each item's
  placement as read and the items moved, in the order moved; `movedItems` applies them
  to a list, as the in-memory double does. A hand-written `PublishWrites` needs
  `moves`: the type check names each one.
- **`TabWriter.move(row, { after } | { before })`**
  (`infrastructure/google-sheets/tab-writer.ts`): rows numbered as the tab was read;
  it sends `moveDimension` after the cells and before the appended rows, and never a
  move that leaves a row where it is.
- **The order of `RoadmapChanges.items` is the order of moves** (D3): `editItem`
  keeps it, `moveTurn` reads an entry's turn and `newItemTurn` a new item's, after
  them all. Code that rebuilds `items` keeps their order.
- **`PageItem.arrival`** (`features/roadmaps/editing/page-items.ts`): the turn of an
  item that shows last in its placement, a moved one and then a new one;
  `groupRoadmapItems` takes it as its third argument. A page item's `position` is
  still its place among the items read, then the new ones: only where a card is drawn
  changed.
- **`AppError` kind `protected`**, with the keys `errors.protected` and
  `roadmaps.writeFailure.protected`; a notice that shows `writeFailureMessage` handles
  it already.
- **The repository contract** has `describeMovedItems`
  (`domain/roadmap/testing/moved-item-contract.ts`): `listRoadmapItems` returns a
  published moved item last in its placement.
- **The fakes**: `apply-batch-update.ts` applies `moveDimension` by the before-removal
  rule; the E2E fake's `sheets.refuseProtected()` refuses the next write as Google
  refuses a protected one.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-moving.test.tsx` (`shows an item moved by its … last in its new place`, `shows items moved into one placement in the order they were moved…`, `shows an item moved after a new item was added before it…`); `pending-changes.test.ts` (`the order of moves`); `group-roadmap-items.test.ts`; `tests/e2e/editing.spec.ts` (`moves an item from its card, last in its new placement…`)                                |
| S2       | `roadmap-detail-page-moving.test.tsx` (`shows an item where it was loaded once its move is undone / moved back, with nothing pending`); `pending-changes.test.ts` (`is no change once moved back`); `publish-plan.test.ts` (`moves no row for an edit that is no move`)                                                                                                                                                                  |
| S3       | `google-sheets-roadmap-repository.test.ts` (`writes the Horizon cell at the row as read, then moves the row…`, `moves the row after the cell and Item ID writes and before an appended row`, `moves the row with “Save and publish” too`); `tab-writer.test.ts`; `item-moves.test.ts`; `moved-item-contract.ts`; the E2E journey above                                                                                                   |
| S4       | `google-sheets-roadmap-repository.test.ts` (`goes after a row a co-lead added to the placement since, without a conflict`); `moved-item-contract.ts` (`counts an item the placement holds that the page never read…`); `roadmap-detail-page-moving.test.tsx` (`shows a published move last in its placement once it is read back, after a co-lead's item too`)                                                                           |
| S5       | `google-sheets-roadmap-repository.test.ts` (`writes the Horizon cell alone, and no move, for a row already last`); `tab-writer.test.ts` (`sends no move that would leave the row where it is`); `item-moves.test.ts`; `moved-item-contract.ts`; `apply-batch-update.test.ts` (`rejects a move of a row to its own position…`)                                                                                                            |
| S6       | `item-moves.test.ts` (`several items moved into one placement`); `google-sheets-roadmap-repository.test.ts` (`moves several rows in the order they were moved…`, `moves the later moved after the earlier…`, `moves one row up, to just before the first of a run already in order…`); `moved-item-contract.ts` (`returns a new item after every moved one`)                                                                             |
| S7       | `google-sheets-roadmap-repository.test.ts` (`rejects with protected, publishing nothing and trying once…`); `sheets-client.test.ts`; `sheets-schemas.test.ts` (`isProtectedRefusal`); `roadmap-detail-page-moving.test.tsx` (`says a protected part of the spreadsheet stopped the publish…`, en and cy); `write-failure-message.test.ts`; `tests/e2e/editing.spec.ts` (`says a protected part of the spreadsheet stopped the publish…`) |
| S8       | `publish-plan.test.ts` (`judges a move by its placement alone, wherever the item then is`); `moved-item-contract.ts` (`when the write's answer is lost`)                                                                                                                                                                                                                                                                                 |
| S9       | No test: see Departures. The read's mask, which asks for no row properties, is held by `tests/e2e/fixtures/fake-sheets.ts` (`METADATA_FIELDS`) and the adapter's tests                                                                                                                                                                                                                                                                   |
| S10      | `describeMovedItems`, run by `in-memory-roadmap-repository.test.ts` and `google-sheets-roadmap-repository.test.ts`                                                                                                                                                                                                                                                                                                                       |
