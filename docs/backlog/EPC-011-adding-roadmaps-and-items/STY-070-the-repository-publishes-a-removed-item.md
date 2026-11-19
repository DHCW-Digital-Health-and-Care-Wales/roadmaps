# STY-070: The repository publishes a removed item

- **Status**: Proposed — split from STY-049 on the owner's word in its grilling,
  2026-11-19 (STY-049 D8); no screen uses it until STY-049
- **Type**: Feature
- **Area**: Domain + Infrastructure + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-011, ADR-014, ADR-002, ADR-006
- **Suggested model**: Opus — deletes rows inside the all-or-nothing publish, after
  moves and inserts, with an item-level conflict and its lost-answer settlement

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

### S1: A removal is part of a roadmap's pending changes (STY-049 Q1, D5)

**Given** a roadmap's pending changes and an item the roadmap as read holds, with or
without an ID, with or without pending field edits
**When** its removal is added to the changes
**Then** the changes hold the removal with the item as loaded and its position, so it
can be found again as an edited item is (ADR-012, _Finding what to write_)
**And** the item's pending field edits are kept beneath the removal, not published
with it, and come back when the removal is undone; the item leaves any pending order
of its placement, and undoing the removal puts it back where it was in that order

### S2: Publishing deletes its row, last (STY-049 Q4, Decision 7)

**Given** pending changes that remove "Fax referrals" and also edit cells, move or
reorder rows and add new rows
**When** the roadmap is published
**Then** the same all-or-nothing `batchUpdate` deletes the item's row with
`deleteDimension`, after every cell and `Item ID` write, move, insert and append,
removed rows bottom first, so every other request keeps the re-read's row numbers
**And** an item without an ID is found by its position, as an edited one is, and is
removed without being given one; no other row's cells are rewritten

### S3: A co-lead's change to the item is a conflict (STY-049 Q2)

**Given** a pending removal, and a re-read in which any field the editor reads of
that item (its `Horizon` included) differs from what was loaded
**When** the roadmap is published
**Then** nothing is published, and the outcome carries the removal's conflict with
each changed field, loaded beside current
**And** a co-lead's reorder of the placement alone is no conflict; resolving it "Remove
anyway" makes the current row the base and keeps the removal, and "Keep the item"
drops the removal, leaving its field edits pending to be compared as any edit is

### S4: An item already gone counts as removed (STY-049 Decision 6)

**Given** a pending removal, and a re-read in which the item can no longer be found
(ADR-012 Option 13's rules)
**When** the roadmap is published, or Refresh reads it
**Then** the removal is no longer pending, as a pending field the re-read already
holds is not, and the rest of the changes publish
**And** Option 13 still refuses an edited item that is gone, when it is not removed

### S5: A lost answer is settled for a removal (STY-049 D12)

**Given** a publish carrying a removal whose answer never arrives (ADR-012 Option 16)
**When** the adapter re-reads the roadmap
**Then** the removal counts as written when no row holds the item's ID, or, for an
item without an ID, when its position no longer holds the loaded content and every
other write is found written
**And** anything else, or a failed re-read, is unconfirmed and opens the DEF-015 hold

### S6: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S2 to S5 hold for both, and `listRoadmapItems` no longer returns a removed
item

## Tests

S2–S5 need the adapter against MSW, asserting the requests sent and their order, with
a removal alone, with edits, a move, a pending order and a new item, and with an item
without an ID below a moved row.

## Decisions

- **D1** (owner, 2026-11-19, STY-049 grilling, Decision 8): the write is its own story
  ahead of STY-049's screen, as STY-040 and STY-045 were, and owns README _What the
  editor writes_ and the ADR-012 amendment.
- Every other rule here is STY-049's Decisions (D1, D2, D5, D6, D7, D12), which this
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
