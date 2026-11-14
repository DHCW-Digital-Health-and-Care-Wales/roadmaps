# STY-045: The repository publishes a new item

- **Status**: Proposed — grilled with the owner on 2026-11-14 (items rounds 1 and 3); no
  screen uses it until STY-046
- **Type**: Feature
- **Area**: Domain + Infrastructure + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-011, ADR-014, ADR-002
- **Suggested model**: Opus — extends the all-or-nothing publish with rows that have
  no base to conflict on, and its lost-answer settlement

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

## Starting point

Audited at `400c90c`. A pending change is found again by its item, as last loaded,
and its position (`ItemChanges`), so `RoadmapChanges`, `matchItemChanges` and the
publish plan (`publish-plan.ts`) have no place for an item that was never read; an
item with a pending edit and no ID is found by position among the kept rows, which a
row appended after the last cannot disturb.

## Out of scope

- The dialog, the "New" tag and Remove: STY-046.
- Removing a published item: STY-048. A place other than last: STY-049.
