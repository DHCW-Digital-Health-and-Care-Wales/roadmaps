# STY-045: The repository publishes a new item

- **Status**: Done — delivered in its PR, which awaits the owner's merge; no screen uses
  it until STY-046
- **Type**: Feature
- **Area**: Domain + Infrastructure + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-011, ADR-014, ADR-002, ADR-006
- **Suggested model**: Opus — extends the all-or-nothing publish with rows that have
  no base to conflict on, and its lost-answer settlement
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/87

## Summary

A roadmap's pending changes can include new items, and publishing writes each as a
new row after the roadmap's last item, in the same all-or-nothing write as its other
changes. A new item has a title and a horizon or section, and may have every other
field an item's form edits. It can't conflict with a co-lead, and a publish refused
for another reason leaves it pending. No screen adds one yet: that is STY-046. This
story also records the change to the format's contract: publishing now adds item
rows.

## Scope

New items in a roadmap's pending changes and in the publish plan (`domain/`, with the
contract test), the Sheets adapter's write and the in-memory double
(`infrastructure/`, `tests/`). README _What the editor writes_; the ADR-012
amendment; the glossary's **Pending edit** and **Roadmap item** entries. No
`features/` screen and no copy.

## Acceptance criteria

### S1: A new item is part of a roadmap's pending changes (items round 1 Q2)

**Given** a roadmap's pending changes
**When** a new item is added to them, with a title and a placement, and any of
description, expected outcome, phase, tags, organisations and details
**Then** the changes hold it with an item ID made then, in the `Item ID` format, that
no item of the roadmap as read has
**And** a blank title, or no placement, is refused: a new item is never unplaced
(items round 1 Q4; ADR-014)

### S2: Publishing writes it after the roadmap's last item (items round 1 Q3)

**Given** pending changes with the new item "Choose a clinic closer to home" in Next
**When** the roadmap is published
**Then** the same all-or-nothing write as its other changes adds one row after the
tab's last row in use, with its `Item ID`, its `Title`, its `Horizon` as the public
site's English value, and each other field it has, written as that field's edit is
written (README, _What the editor writes_)
**And** no Welsh cell is written, a column the row needs and the tab lacks is added
as a publish adds one, and several new items are written in the order they were
added

### S3: A new item never conflicts, and a refusal keeps it

**Given** pending changes with a new item and an edit to another item that a co-lead
has changed
**When** the roadmap is published
**Then** the conflict publishes nothing, as today, and the new item stays pending
with the rest
**And** nothing a co-lead did to other rows makes a new item a conflict or "not
found"; when the roadmap's own row or tab has gone, the publish fails as it does
today

### S4: A re-read that holds it drops it

**Given** a pending new item, and a re-read of the roadmap that finds an item with
its ID
**When** Refresh, or the settlement of a write whose answer was lost, reads it
**Then** the new item is no longer pending, and the item read is shown
**And** a lost answer is settled as a publish's is (ADR-012 Option 16): every new
row and written cell there is published, none is `network`, anything else is
unconfirmed

### S5: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S2 to S4 hold for both, and a published new item is returned by
`listRoadmapItems`, last, with its ID and fields

## Tests

S2–S4 need the adapter against MSW, asserting the requests sent, with a new item
alone, with other edits, and with a missing column.

## Decisions

- **D1** (owner, 2026-11-14, items round 1 Q2): a new item is pending until the
  roadmap is published or saved, over written at once.
- **D2** (owner, items round 1 Q3): it goes last in its horizon, over first or a
  place Sam chooses: its row is appended, and no existing row moves.
- **D3** (owner, items round 1 Q4): any of the six placements, and always one.
- **D4** (owner, items round 3 Q3, confirming the agent's choices): English only; a
  new item can never conflict with a co-lead.
- **D5** (agent): the item's ID is made when it is added, not when it is published,
  so a re-read can tell that an unconfirmed write landed (S4); over an ID made by the
  write, which Refresh could not match.
- **D6** (agent, 2026-11-14, owner asked for stories that fit one agent's context):
  the write is this story and its screen STY-046.
- **D7** (agent, 2026-11-15): a new item is its own list in a roadmap's changes
  (`RoadmapChanges.newItems`, each an ID and its values), required, over an entry among
  the edited items with nothing behind it, or an optional list: an edit is found, has a
  base and can conflict, a new item none of those, and the typecheck names every place
  that builds a roadmap's changes, so none drops a new item unseen.
- **D8** (agent, 2026-11-15): a new item is held by its ID alone, whatever its row
  then reads, over comparing its content: a co-lead who has edited the new row since
  must not make it "not written" (S3, S4). A publish looks in every row of the roadmap,
  read or not; Refresh has only the items read.
- **D9** (agent, 2026-11-15; review, Sonnet): `checkNewItem`, `addNewItem` and
  `dropPublishedNewItems` are the domain's (`domain/roadmap/new-item.ts`), as Scope
  says and as the checks of a new roadmap and a new family are, over sitting with the
  pending-edit rules in `features/`: what a new item must hold and how its ID is made
  are rules of a roadmap, whatever screen adds one. They take the form's `ItemValues`,
  which moved to the domain with `NO_CHANGES` so both layers share one of each.

## Starting point

Audited at `400c90c`.

- An item with a pending edit and no ID is found by its position among the kept rows
  (ADR-012), which a row appended after the last cannot disturb.
- The Sheets fake records a row appended to any tab but `Families` as a violation
  (STY-023 S11, `tests/fixtures/sheets/apply-batch-update.ts`). The guard narrows to
  allow a roadmap's own tab, and stays for every other.

## Out of scope

- The dialog, the "New" tag and Remove: STY-046.
- Removing a published item: STY-049. A place other than last: STY-050.

## Delivery

### Departures

- **The rules of pending edits in `features/` changed, though Scope names no
  `features/` work** (agent). `RoadmapChanges` is one type, and
  `features/roadmaps/editing/pending-changes.ts` is where a read and a publish settle
  it: `reconcileItems` now drops a new item a read holds (S4's Refresh),
  `settlePublished` one that was sent, and `countChanges` counts each as one change, as
  STY-046 D7 sets, since the store forgets a roadmap that counts none. No screen,
  component, hook or copy changed.
- **S1: "refused" is a check and a throw** (agent), as adding a roadmap is (STY-040):
  `checkNewItem` gives the problems for a screen to show at the field, and `addNewItem`
  and the publish plan throw `AppError('unknown')` for a blank title or no placement,
  so neither repository can write one.
- **S1: "no item of the roadmap as read has" is checked against the items read and the
  other pending new items** (agent). A row the read skips keeps its ID out of sight of
  the page; a new ID that repeated one (one chance in some 2×10¹¹) would be taken as
  already published at the next publish (D8).
- **S4: a new item whose row a co-lead has cleared of its title stays pending through
  Refresh** (agent; review, Sol). S4 drops it when a re-read "finds an item with its
  ID", and a row with no title is no item, so `listRoadmapItems` gives Refresh nothing
  to find it by. The next publish, which sees every row's ID, takes it as published
  and writes nothing more, so the co-lead's removal stands and no second row is
  written. Telling Refresh would mean the repository giving the page the IDs of rows
  it doesn't list, a wider change to the port than this case, a lost answer followed by
  a co-lead clearing that very row, has earned.
- **S2, S4: two new items with one ID are rejected** (agent) with `AppError('unknown')`,
  as input a screen never sends, over writing two rows with it.
- **S2: a row without an ID is never given a new item's** (agent): the IDs a publish
  makes for rows without one skip those of the new items in the same write.
- **“Save and publish” takes new items too** (agent): `setRoadmapPublished` plans its
  pending edits as a publish does. A roadmap a co-lead had already published used to
  settle as `set` when no field was edited; with only a new item pending that wrote
  nothing, so a new item now counts as a pending edit sent. A new item, always placed,
  also clears "no `Horizon` column", as a move does, since its row adds the column.
- **The Sheets fake's guard checks the new row too** (agent; _Starting point_): a row
  appended to a tab is allowed only on a tab a row of the index names, never
  `Template`, `Families` or `Categories`, and is a violation without a title, a
  `Horizon` value the public site writes, or an `Item ID`, in the editor's format, that
  no other row of the tab holds, or with a cell under no header. The fake now finds
  every column it checks as the adapter does, ignoring case, spaces and punctuation
  (review, Sol). It can't tell which roadmap a publish is for, so a row appended to
  another roadmap's tab passes it.
- **Nothing was checked against a real spreadsheet** (agent): the delivery had no
  Google account. The row is appended as a new family's and a new roadmap's index row
  are (STY-029, STY-040), and
  [CHO-015](../chores/CHO-015-check-adding-an-item-against-a-real-spreadsheet.md)
  records the check owed. Asked of the owner in the delivery run: accept that, or
  check before merge.
- **No Playwright spec** (agent): no screen adds an item until STY-046. The E2E Sheets
  fake changed in step, through `apply-batch-update.ts`, and the suite passes over it.
- **Tests.** Every test of this story was written before the code it holds and run
  red: 58 failing across eight files (the domain rules, the plan, the contract under
  both repositories, the adapter against MSW, the fake's guard, the pending-edit rules)
  before any production file changed.

### Contract for dependents

- **What the editor writes** (README, _What the editor writes_; ADR-012, _STY-045
  amendments_): a publish now also adds a row for each new item to its roadmap's tab.
  The public site reads it as any item row.
- **The type** (`domain/roadmap/roadmap-changes.ts`): `RoadmapChanges.newItems`, in the
  order added, each a `NewItem`: its `id` and its `values`, one string for every
  `EditableItemField` as an edit's value holds it (`""` for none; tags, organisations
  and details as their one value). A hand-written `RoadmapChanges` needs `newItems`:
  spread `NO_CHANGES`, which now lives beside the type, as does `ItemValues`, the
  item form's values (both were `features/roadmaps/editing/pending-changes.ts`'s).
- **Adding** (`domain/roadmap/new-item.ts`): `checkNewItem(input)`, which takes the
  item form's `ItemValues`, gives the trimmed
  `values` and `problems` (`title: "blank"`, `placement: "none"`);
  `addNewItem(changes, input, items)` gives the changes with the new item last, its ID
  made then, and throws for input the check refuses; `items` is the roadmap's items as
  the page read them. `dropPublishedNewItems(changes, items)` is the read's half, which
  `reconcileItems` already calls.
- **Publishing** needs nothing new: `publishRoadmapChanges` and `setRoadmapPublished`
  take the changes as they are. Their outcomes are unchanged, and `refused` never names
  a new item: after one, the store still holds it. `settlePublished` drops each new
  item that was sent.
- **Left for STY-046**, which makes a new item visible and editable: its card (a new
  item is in no list of items until a read holds it; `applyItemChanges`,
  `matchItemChanges` and `publishesNoItems` know edits only), Edit, Move and Remove
  (replace its `values`, keep its `id`; drop it from `newItems`), the tags offered, and
  what an edit to a new item made while its publish is under way becomes, since
  `settlePublished` drops the new item it was made to. **Left for STY-047**:
  `changedParts` lists edits only, so the publish dialog names no new item.
- **The in-memory double** adds a published new item after the roadmap's stored items;
  `coLead` can then change it. `domain/roadmap/testing/test-new-item.ts` holds the
  tests' new items: `NEW_CLINIC`, with a title and a placement alone, `NEW_LETTERS`,
  with every field, and `addingItems(...newItems)`, the changes that hold them alone.
  A test that needs another spreads one of them, or exports the file's
  `createTestNewItem`.
- **The E2E Sheets fake**: a publish with a new item is still one `batchUpdate` in
  `sheets.writes`, ending with an `appendCells` request for each; the fake fails a test
  whose appended row breaks the guard above.

### Scenario evidence

`rules` is `domain/roadmap/new-item.test.ts`; `plan` is
`domain/roadmap/publish-plan.test.ts`, _new items, written after the roadmap's last_;
`contract` is `domain/roadmap/testing/new-item-contract.ts`, run by both repositories'
tests; `adapter` is `google-sheets-roadmap-repository.test.ts`, _a new item (STY-045)_;
`fake` is `tests/fixtures/sheets/apply-batch-update.test.ts`, _a row appended to a
roadmap's own tab_; `pending` is `features/roadmaps/editing/pending-changes.test.ts`,
_a new item (STY-045)_.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | rules "holds the new item with an ID made then, in the Item ID format", "gives it an ID no item of the roadmap as read has, nor another new item", "refuses a blank title", "refuses no placement, or one that is none of the six", "refuses input that was not checked"; plan "rejects a blank title / no placement …, which the editor never sends"; contract "rejects one with a blank title / no placement …, writing nothing"; `pending-changes-store.test.ts` "keeps a roadmap whose only change is a new item"; pending "is one pending change, beside the fields edited"                                                                                                                                                                                                                                                                                                                                       |
| S2       | adapter "appends one row after the tab's last row in use, with its Item ID, Title and Horizon, in the one batchUpdate", "writes each field it has as that field's edit is written, and no Welsh cell", "sends several in the order added, after the cells of the roadmap's other changes", "adds a column the row needs and the tab lacks, and none for a field it lacks", "adds the Item ID and Horizon columns to a tab with neither", "gives no row without an ID the ID of a new item"; plan "writes a new item's ID, title and placement, and no field it lacks", "writes each field it has as that field's edit is written, in the order added"; fake "appends a new item's rows after the tab's last row in use" and the violations it records                                                                                                                                                                  |
| S3       | contract "publishes nothing, the new item neither, when a co-lead changed a field edited with it", "… when an item edited with it is gone", "is added whatever a co-lead did to the roadmap's other items, even one with its title", "fails as an edit does when the roadmap is no longer listed, or its items can't be read"; adapter "keeps a row a co-lead added after the read, appending after it"; plan "publishes nothing of it when an edit is refused, and is never itself a conflict or missing"                                                                                                                                                                                                                                                                                                                                                                                                             |
| S4       | pending "is dropped by a read that holds an item with its ID, whatever a co-lead made of it since, the edits kept", "stays pending over a read that doesn't hold it", "is no longer pending once the publish it was sent in lands, and one added since is"; rules (`dropPublishedNewItems`); contract "takes a new item the roadmap already holds as published, writing no second one" and _when the write's answer is lost_ (found with every other change, found alone, none found, a co-lead's value where an edit was written, the re-read fails); adapter "writes nothing for a new item the tab already holds, even in a row it no longer reads", "reads no item for a new item's row whose title a co-lead has cleared, so a read alone leaves it pending", "settles a lost answer by one more read of the roadmap, which finds the new row by its ID"; plan (`heldWrites`, _a new item, held by its ID alone_) |
| S5       | contract, run by `google-sheets-roadmap-repository.test.ts` and `in-memory-roadmap-repository.test.ts`: "adds it after the roadmap's last item, with its ID, title and placement", "writes every field it has as that field's edit is written, in English alone", "adds several in the order they were added, in the one write with the roadmap's other changes", "starts a roadmap that has no items", and _with the roadmap published at once_                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
