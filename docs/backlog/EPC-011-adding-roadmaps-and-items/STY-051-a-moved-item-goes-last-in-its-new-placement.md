# STY-051: A moved item goes last in its new placement

- **Status**: Proposed — settled on the wayfinder map "Reordering a placement's items"
  (owner, 2026-11-16); ships before STY-050
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-014, ADR-012, ADR-011, ADR-002, ADR-008
- **Suggested model**: Fable 5.2 — the owner is testing the model (D7); the first story
  to move rows in a tab a co-lead may be editing

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
changes in this story's PR, which says so. The ADR-014 and ADR-012 amendments are
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
**Then** the same all-or-nothing `batchUpdate` writes its `Horizon` cell and moves its
row to just after the row of Now's last item in the re-read, by `moveDimension`, after
the cell and `Item ID` writes and before any appended row
**And** no cell of the row is rewritten, and the rows of every other placement keep
their order relative to each other

### S4: "Last" counts what a co-lead added, and is no conflict (D2)

**Given** a pending move of "Online booking" into Now, and a co-lead has since added
"D" to Now
**When** the roadmap is published
**Then** the row goes after "D", and the publish is not stopped for review
**And** the page, once the publish is read back, shows "Online booking" fifth of five

### S5: A move that would leave the row where it is sends no move (D2)

**Given** a pending move whose row already sits just after the new placement's last
item, or a move into a placement with no items
**When** the roadmap is published
**Then** only its `Horizon` cell is written, and no `moveDimension` request is sent
(Google refuses a move to the row's own position, failing the whole publish)

### S6: Several moved items go last in the order they were moved (D3)

**Given** Sam moves "X" and then "Y" into Now
**When** the roadmap is published
**Then** Now's rows end "X", "Y", as the page showed them, with the fewest moves
**And** a new item added to Now is still appended after the tab's last row in use, so
it shows after both (D4)

### S7: A protected row refuses the publish, and keeps the changes (D6)

**Given** a pending move whose row, or any cell the publish writes, the connected
account may not edit
**When** the roadmap is published
**Then** nothing is published, the Product Lead is told a protected part of the
spreadsheet stopped the publish and who can change that, in English or Welsh
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
  change is no conflict; a no-op move is never sent; a hidden row is an item; a lost
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
