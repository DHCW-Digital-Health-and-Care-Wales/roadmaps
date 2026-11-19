# STY-070: The repository publishes a removed item

- **Status**: Done — delivered in its PR; split from STY-049 on the owner's word in
  its grilling, 2026-11-19 (STY-049 D8); no screen uses it until STY-049
- **Type**: Feature
- **Area**: Domain + Infrastructure + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-011, ADR-014, ADR-002, ADR-006
- **Suggested model**: Opus — deletes rows inside the all-or-nothing publish, after
  moves and inserts, with an item-level conflict and its lost-answer settlement
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/175

## Summary

A roadmap's pending changes can include removing an item the data source already
holds, and publishing deletes its row in the same all-or-nothing write as the other
changes. A co-lead's change to the item since it was loaded stops the publish as a
conflict; an item already gone counts as removed. No screen removes one yet: that is
STY-049. This story also records the change to the format's contract: publishing now
deletes item rows.

## Scope

Removed items in a roadmap's pending changes and in the publish plan (`domain/`, with
the contract test), the Sheets adapter's write and the in-memory double
(`infrastructure/`, `tests/`). README _What the editor writes_; the ADR-012
amendment; the glossary's **Pending edit** and **Conflict** entries. No `features/`
screen and no copy, beyond what the type change forces on the pending-edit rules
(as STY-045's Departures found).

## Acceptance criteria

### S1: A removal is part of a roadmap's pending changes (STY-049 D1, D5, D8)

**Given** a roadmap's pending changes and an item the roadmap as read holds, with or
without an ID, with or without pending field edits
**When** its removal is added to the changes
**Then** the changes hold the removal with the item as loaded and its position, so it
can be found again as an edited item is (ADR-012, _Finding what to write_)
**And** the item's pending field edits are kept beneath the removal, not published
with it, and come back when the removal is undone; the item leaves any pending order
of its placement, and undoing the removal puts it back where it was in that order

### S2: Publishing deletes its row, last (STY-049 D8)

**Given** pending changes that remove "Fax referrals" and also edit cells, move or
reorder rows and add new rows
**When** the roadmap is published
**Then** the same all-or-nothing `batchUpdate` deletes the item's row with
`deleteDimension`, after every cell and `Item ID` write, move, insert and append,
removed rows bottom first, so every other request keeps the re-read's row numbers
**And** each deletion targets the removed row where it sits once every move, insert
and append has applied, not its re-read row number; an item without an ID is found by
its position, as an edited one is, and is removed without being given one; no other
row's cells are rewritten

### S3: A tab is never left without a non-frozen row (D2)

**Given** removals whose rows are every non-frozen row of the tab's grid as it stands
after every move, insert and append, such as removing all the items of a roadmap the
editor created (its grid is the frozen header and one row per item)
**When** the roadmap is published
**Then** the top removed row is cleared, every cell of it, instead of being deleted,
and the other removed rows are deleted, since Google refuses to delete every
non-frozen row; the publish succeeds
**And** a row left without a title is no item (ADR-011), so the roadmap reads with no
items; when an append or insert in the same write leaves another non-frozen row, every
removed row is deleted

### S4: A co-lead's change to the item is a conflict (STY-049 D2)

**Given** a pending removal, and a re-read in which any field the editor reads of
that item (its `Horizon` included) differs from what was loaded
**When** the roadmap is published
**Then** nothing is published, and the outcome carries the removal's conflict with
each changed field, loaded beside current
**And** a co-lead's reorder of the placement alone is no conflict; resolving it "Remove
anyway" makes the current row the base and keeps the removal, and "Keep the item"
drops the removal, leaving its field edits pending to be compared as any edit is

### S5: An item already gone counts as removed (STY-049 D7)

**Given** a pending removal of an item with an ID, and a re-read in which no row of
the tab holds that ID
**When** the roadmap is published, or Refresh reads it
**Then** the removal is no longer pending, as a pending field the re-read already
holds is not, and the rest of the changes publish
**And** an item without an ID whose position no longer holds what was loaded, or
whose repeated ID's first row no longer does, is not taken as removed: Option 13
applies (D3), so nothing is published and Sam is told which item; Option 13 still
refuses an edited item that is gone

### S6: A lost answer is settled for a removal (STY-049 D12)

**Given** a publish carrying a removal whose answer never arrives (ADR-012 Option 16)
**When** the adapter re-reads the roadmap
**Then** the removal counts as written when no row holds the item's ID, or, for an
item without an ID, when its position no longer holds the loaded content and every
other write is found written
**And** a batch found wholly unwritten is `network`, as Option 16 has it; anything
else, or a failed re-read, is unconfirmed and opens the DEF-015 hold

### S7: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S2 to S6 hold for both, and `listRoadmapItems` no longer returns a removed
item

## Tests

S2–S6 need the adapter against MSW, asserting the requests sent and their order, with
a removal alone, with edits, a move, a pending order and a new item, with a removed
row below an inserted or moved one, with every item of a copied `Template` tab
removed (one item, and several), with that and a new item in the same write,
and with an item without an ID that a co-lead edited or moved a row past.

## Decisions

- **D1** (owner, 2026-11-19, STY-049 grilling, Decision 8): the write is its own story
  ahead of STY-049's screen, as STY-040 and STY-045 were, and owns README _What the
  editor writes_ and the ADR-012 amendment.
- **D2** (agent, 2026-11-19, review of the grilling's PR): when the deletions would
  leave the grid no non-frozen row, the top removed row is cleared whole, not deleted
  (S3), over inserting a blank row first: Google refuses to delete every non-frozen
  row, which would refuse a removal STY-049 D9 says works as today. Clearing every
  cell, Welsh and unknown columns included, leaves what a delete would: nothing of the
  item.
- **D3** (agent, 2026-11-19, review of the grilling's PR): "already gone" is "no row
  holds its ID" (S5), over every Option 13 rule: an item without an ID, or with a
  repeated ID, is also "not found" when a co-lead edits it or moves a row past it
  (STY-051 D8, DEF-017), and taking that as removed would drop the removal silently,
  past STY-049 D2's conflict, while the item stays public. The owner may overrule.
- Every other rule here is STY-049's Decisions (D1, D2, D5, D7, D8, D12), which this
  story builds.

## Starting point

Audited at `3cd6b8f`.

- `deleteDimension` is already a `BatchRequest` variant of the tab writer, sent only to
  trim a copied `Template` tab. No publish deletes a row.
- `RoadmapChanges` holds `roadmap`, `items`, `newItems` and `orders`, all required;
  `countChanges` counts each field, new item and order. A removal is a fifth kind, so
  the typecheck names every place that builds a roadmap's changes (STY-045 D7).
- Conflicts are per field (`FieldConflict`) or per order (`OrderConflict`); a missing
  item is `missingItems` in a `refused` outcome, which the page then discards.
- The Sheets fake guards which tabs a batch may touch (`apply-batch-update.ts`); it
  must allow deleting a roadmap tab's row and keep refusing every other tab.

## Out of scope

- The Remove button, its confirmation, the struck card and the conflict review's
  removal form: STY-049.
- Removing a roadmap: STY-048.
- Checking the write against a real spreadsheet: a chore raised on delivery, as
  CHO-019 and CHO-020 were.

## Delivery

### Departures

- **S4: "any field the editor reads" is all a field holds** (agent): its English and
  Welsh, a placement with its horizon as written, organisations with the codes the list
  doesn't know, tags and details with their Welsh (`changedFields`). The conflict gives
  each changed field's English value as loaded and as read; one whose English reads
  the same changed in what only the item read shows, which the review (STY-049 S6)
  takes from `current`. A first build compared English alone; Sol's review held that
  to D2's words.
- **S5: an ID that only a row the read skips holds** (agent): a row a co-lead cleared
  of its title still holds the ID, so the publish finds the item neither gone nor
  present and refuses it as not found (Option 13), as it does an edited item there.
  Refresh, which reads no such row, drops the removal, as it drops a removal of any
  item it no longer reads (`reconcileRemovals`). Either way nothing is left pending
  and nothing public changes: a row with no title is no item.
- **S1: the domain's rules for a removal live in `domain/roadmap/item-removal.ts`**
  (agent), as a new item's do in `new-item.ts`: `removeItem`, `undoRemoval`,
  `removeAnyway`, `reconcileRemovals` and `planRemovals`. `features/` gains only what
  the type change forces or S1, S4 and S5 need of the pending-edit rules:
  `settlePublished` drops a sent removal with its item's edits, `reconcileItems` calls
  `reconcileRemovals`, `countChanges` counts a removal (or the store would forget a
  roadmap whose only change is one), `discardItems` drops a missing removal with its
  item's edits, and "Keep mine" and "Use theirs" on a removal's conflict are "Remove anyway" and
  "Keep the item". `sameTarget` moved from `pending-changes.ts` to the domain, as
  `planRemovals` needs it.
- **Test order** (agent): the publish plan's tests, and `settlePublished`'s and
  `reconcileItems`' for a removal, were written first and seen red. The tests of
  `item-removal.ts`'s helpers, of `discardItems`, "Keep mine" and "Use theirs" on a
  removal, of the Sheets fake's new rule and of the adapter's requests followed the
  code, and were shown red by breaking it (Scenario evidence).
- **Nothing was checked against a real spreadsheet** (agent): the delivery had no
  Google account.
  [CHO-025](../../chores/CHO-025-check-a-published-removal-against-a-real-spreadsheet.md)
  records the check owed, of the cleared last row above all.

### Contract for dependents

- **A removal is `RoadmapChanges.removals`**, each an `ItemRemoval`
  (`{ item, position }`, the item as read when removed, found again as an edited item
  is: `ItemTarget`). `removeItem(changes, item, position)` adds one, once per item;
  `undoRemoval(changes, target)` drops it, by `sameTarget`; `removalOf(changes,
target)` says whether an item is removed. Neither touches `items` or `orders`.
- **An item's edits stay in `RoadmapChanges.items` beneath its removal**: the publish
  plan skips them, and `countChanges` counts the removal as one and its item's edits
  as none (STY-049 D5), so the store keeps a roadmap whose only change is a removal
  and a publish sends it. Nothing else in `features/` hides them yet: `changedParts`,
  `matchItemChanges`, `applyItemChanges`, `publishesNoItems`, the jump navigation's
  counts and the pending order the page draws still show a removed item and its edits
  as before: STY-049 (S2 to S4, S8) makes each skip them, with `removalOf`.
- **A refusal can carry a `RemovalConflict`** (`subject: "removal"`: the `removal`
  given, the `current` item read and each changed `field` with its `base` and
  `current`), and a missing removal in `missingItems`, which then holds
  `ItemChanges | ItemRemoval`. `openConflicts` leaves a removal's conflict out, so the
  review draws none and the store retires it at once: STY-049 S6 adds its open
  conflict and form. `keepMine` on it is "Remove anyway" (`removeAnyway`: the current
  item becomes the base) and `takeTheirs` is "Keep the item" (`undoRemoval`).
  `discardItems` drops a missing removal and its item's edits.
- **Refresh and publish settle a removal**: `reconcileItems` drops one whose item (with
  an ID) the read no longer holds, along with that item's edits, and moves one found to its
  new position;
  `settlePublished` drops a sent one with its item's edits.
- **`PublishWrites.removals`** (`{ index, item }`, the item as the publish read it)
  are deleted last; `heldWrites` judges each with `heldRemoval`. A hand-written
  `PublishWrites` needs `removals`.
- **`TabWriter.remove(row)`** deletes a row as read, where every other request leaves
  it, after them all, or clears it when it is the last row that is not frozen. The
  Sheets fake now allows deleting and clearing a roadmap tab's rows; any other tab's
  but a copy's is still a violation.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `src/domain/roadmap/item-removal.test.ts` (`removeItem and undoRemoval`); `pending-changes-store.test.ts` (`keeps a roadmap whose only change is a removal (STY-070 S1)`); `pending-changes.test.ts` (`is one pending change, its item's edits beneath it none (STY-049 D5)`); `src/domain/roadmap/publish-plan.test.ts` (`publishes none of the item's edits…`, `leaves the removed item out of its placement's pending order`); `src/features/roadmaps/editing/pending-changes.test.ts` (`a removed item (STY-070)`); contract `deletes it in the one write with every other change…`, `leaves the removed item out of its placement's pending order (S1)`                                                      |
| S2       | `publish-plan.test.ts` (`a removed item (STY-070)`); `google-sheets-roadmap-repository.test.ts` (`a removed item's row (STY-070)`: alone, last after cells, a move and an append, below an inserted row, without an ID)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S3       | `google-sheets-roadmap-repository.test.ts` (`every row of a copied Template's grid (S3)`: one item, several, beside an append, a spare row); `tests/fixtures/sheets/apply-batch-update.test.ts` (`applyBatchUpdate removing a roadmap tab's rows (STY-070)`); contract `leaves the roadmap no items but new ones…`                                                                                                                                                                                                                                                                                                                                                                                                |
| S4       | `publish-plan.test.ts` (`a co-lead's change to the item (S4)`, its Welsh, an unplaced item's written horizon, an unknown organisation code and Welsh tags included, `finds it by its ID wherever a co-lead's reorder has put it…`); `item-removal.test.ts` (`removeAnyway`); `src/features/roadmaps/editing/conflicts.test.ts` (`a removal's conflict (STY-070 S4)`); contract `a co-lead's change to the item (S4)`, its Welsh title alone included                                                                                                                                                                                                                                                              |
| S5       | `publish-plan.test.ts` (`an item already gone (S5)`); `item-removal.test.ts` (`reconcileRemovals`); `pending-changes.test.ts` (`is no longer pending over a read…`); `conflicts.test.ts` (`discards the removal of an item not found…`); adapter `sends nothing for an item without an ID that…`; contract `an item already gone (S5)`                                                                                                                                                                                                                                                                                                                                                                            |
| S6       | `publish-plan.test.ts` (`heldWrites with a removed item (STY-070 S6)`); contract `a write whose answer is lost (S6)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S7       | `src/domain/roadmap/testing/removed-item-contract.ts`, run by `in-memory-roadmap-repository.test.ts` and `google-sheets-roadmap-repository.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Red      | The plan's tests failed before `planRemovals` existed (43 failures, the new key included) and `settlePublished`'s and `reconcileItems`' before their change. Broken finished code turned the rest red: sorting removals lowest-index-first and never clearing failed six adapter and contract tests; giving a removed item an ID failed two; dropping `reconcileRemovals`' gone rule, `removeAnyway`'s rebase and `removeItem`'s once-only check failed three `item-removal.test.ts` tests; "Keep mine" and "Use theirs" leaving a removal as it was, and `discardItems` keeping a missing removal's edits, failed the three of `conflicts.test.ts`; the fake refusing a roadmap tab's rows failed two of its own |
