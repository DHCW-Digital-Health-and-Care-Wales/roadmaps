# STY-071: A Product Lead sees which item they moved, and where it went

- **Status**: Proposed — grilled with the owner on 2026-11-19 (design E, B's mark)
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-002, ADR-008, ADR-010
- **Suggested model**: Opus — page state that must follow pending edits through undo,
  publish and re-read, in two views and two languages

## Summary

After a move, nothing on the page shows which item moved: a swap of two alike items
looks like no change, and a move to another placement lands out of sight. This story
marks the item last moved with an edge and a label, "Moved up", "Moved from Now" or
"Placed", in Cards and Compact alike, until the next move or an undo; scrolls the page
to it; and says a move to another placement to a screen reader. Not in it: the item
travelling to its place (STY-072).

## Scope

`features/roadmaps` (the items area and the item's card and row) and `i18n/`. Nothing
in `domain/` or `infrastructure/`. `docs/GLOSSARY.md` gains the moved mark.

## Acceptance criteria

### S1: A move within a placement marks the item (owner, D1, D4)

**Given** a placement of four items, nothing marked
**When** the Product Lead chooses "Up one", "Down one", "To the top" or "To the bottom"
in an item's Move menu
**Then** that item, in its new place, shows a moved mark: an edge in the success tone
and a label with an arrow saying "Moved up", "Moved down", "Moved to the top" or
"Moved to the bottom"
**And** the label gives no position
**And** the edge sits over the item's own border and padding, so nothing in the item
shifts and a card keeps its foot bar
**And** no other item is marked

### S2: A move to another placement marks the item (owner, D2, D7)

**Given** an item in Now
**When** the Product Lead moves it to Later, from its Move menu or by changing "Horizon
or section" in the item dialog and saving
**Then** the item, last in Later, shows the mark labelled "Moved from Now", placed as
S3 says, with its "Changed" tag where it shows today
**And** an unplaced item given a placement either way is labelled "Placed"
**And** a new item, not yet published, keeps its "New" tag where it shows today

### S3: Where the label sits (owner, D5, D6)

**Given** a marked item
**When** the Cards view shows it
**Then** the label sits under the item's title
**When** the Compact view shows it
**Then** the label sits where the row's pending tag does, and, where the list is too
narrow for the whole label on one line (as on a 1024px screen with the navigation
open, and on a phone), shows its arrow and "Moved" only
**And** in every case a screen reader reads the whole label, "Moved up"

### S4: The page scrolls to the moved item (owner, D8)

**Given** a move whose item lands outside the room between the stuck header and the
foot bar
**When** the move is made
**Then** the page scrolls until the item is in that room, gliding, or in one jump
where the system asks for reduced motion
**And** focus goes where it does today: to the item's Move after a Move menu choice,
to its Edit as the dialog closes

### S5: A move to another placement is said (owner, D3)

**Given** an item moved to Later from its Move menu, landing second of two
**When** the move is made
**Then** a screen reader hears "Moved to Later. 2 of 2.", and for an unplaced item
given Now, third of three, "Placed in Now. 3 of 3."
**And** a move within a placement is said as today: "Moved up. 2 of 4."

### S6: One mark, which the next move takes (owner, D4)

**Given** a marked item
**When** the Product Lead moves another item, or the same one again
**Then** only the item moved last is marked, labelled for that move

### S7: What keeps the mark (owner, D4, D9)

**Given** a marked item
**When** the Product Lead switches between Cards and Compact, edits any item's fields,
opens or closes a row, scrolls, or the roadmap is read again with the move still
pending
**Then** the item keeps its mark

### S8: What clears the mark (owner, D4, D9)

**Given** a marked item
**When** the Product Lead chooses "Undo order" on the placement it is in, or an "Undo
changes" or "Discard all" that changes where the item shows; publishes the roadmap,
and the publish succeeds; removes the item; the roadmap is read again without the move
(as after taking a co-lead's version); or leaves the page
**Then** no item is marked
**And** "Undo order" on another placement, or "Undo changes" that leaves the item where
it shows (an item moved only within its placement: it undoes its fields and leaves the
order pending, STY-050), keeps the mark

### S9: The mark in Welsh and in the dark theme

**Given** the interface in Welsh, or the dark theme
**When** an item is marked
**Then** the label reads in Welsh, in full and short forms, and the edge and label keep
their contrast in the dark theme (ADR-010's success tokens)

## Tests

S7 and S8 are a pending-edit rule in all but name (what the page shows while a change
is pending): component tests on the roadmap's page, written first. S3's short label
and S4's scroll need Playwright at 375px, 1024px and 1280px, since jsdom has no
layout.

## Decisions

- **D1** (owner, 2026-11-19, analysis): design E: C's slide (STY-072), then B's mark.
- **D2** (owner, 2026-11-19, grilling round 1 Q2): every move marks, the item dialog's
  "Horizon or section" included.
- **D3** (owner, 2026-11-19, grilling round 2 Q1): a move to another placement is said
  with its position, "Moved to Later. 2 of 2."; in-placement copy is unchanged.
- **D4** (owner, 2026-11-19, review of the prototype and grilling round 1 Q3): the
  label gives no position; one mark, cleared by the next move, an undo that puts it
  back, publishing or leaving; kept through view switches, edits, rows and scrolling.
- **D5** (owner, 2026-11-19, grilling round 2 Q2): on a card the label sits under the
  title.
- **D6** (owner, 2026-11-19, review of the prototype and grilling round 2 Q3): the
  compact label shortens to its arrow and "Moved" by the list's own width, not the
  screen's.
- **D7** (owner, 2026-11-19, grilling round 3 Q4): an unplaced item given a placement
  is labelled "Placed".
- **D8** (owner, 2026-11-19, grilling round 2 Q4): the page glides to the item; jumps
  with reduced motion.
- **D9** (owner, 2026-11-19, grilling round 4 Q3): a re-read keeps the mark while the
  move is still pending, and clears it when the move is gone.
- **D10** (owner, 2026-11-19, grilling round 1 Q4): the success tone, apart from the
  blue of pending tags.
- **D11** (agent, 2026-11-19): a move from the dialog says nothing new to a screen
  reader, since focus returns to Edit with its name; S5 is the Move menu's.
- **D12** (agent, 2026-11-19, review): D4's "an undo that puts it back" read
  literally: "Undo changes" undoes an item's fields and placement, never its place in
  an order (STY-050), so it clears the mark only when it changes where the item shows,
  as when it takes back a move to another placement; "Undo order" clears it on the
  item's own placement, as the owner said, even where a moved-in item stays last. A
  refused or failed publish leaves the move pending and keeps the mark (D9).
- **D13** (owner, 2026-11-19, confirmed summary): removing the marked item clears the
  mark, though a removed published item still shows, struck through (STY-049).
- **D14** (agent, 2026-11-19, review): the edge must not shift the item's content or
  hide a card's foot bar (S1), as the prototype's first draw did.

## Starting point

Audited at `e75d846`. `EditableItem.move` announces nothing, `reorder` does
(`RoadmapItems`' `announce`); the item dialog changes a placement through the same
page items, so the mark belongs in the items area, keyed by the page item, not in
either control. `globals.css` sets `scroll-padding-top` and `-bottom` from the pinned
header and foot bar, so a scroll by `scrollIntoView` with `block: "nearest"` keeps
clear of both.

## Out of scope

- The item travelling to its place: STY-072.
- A position on the label, and a trace where the item was: dropped by the owner
  (EPC-018, _Out of scope_).
