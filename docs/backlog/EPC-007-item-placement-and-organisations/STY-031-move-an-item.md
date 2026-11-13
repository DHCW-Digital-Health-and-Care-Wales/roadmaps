# STY-031: A Product Lead moves an item to another horizon

- **Status**: Proposed — grilled in EPC-007 rounds 1–3 (2026-11-13)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-007-item-placement-and-organisations
- **Depends on**: none
- **Binding ADRs**: ADR-014 §Placement, ADR-012, ADR-011, ADR-008
- **Suggested model**: Opus — it extends the pending-change model, publish plan and
  conflict review for the first field that is not free text

## Summary

A Product Lead moves a roadmap item from Later to Next, or to Recently delivered, from a
"Move to…" menu on its card, without opening the spreadsheet. A move can also be made in
the item's edit form. The move is a pending edit: the item shows in its new place,
tagged "Changed", and goes public only when the roadmap is published. An unplaced item
can be placed the same way. The item keeps its row order, so it may land mid-list:
reordering is not in this story.

## Acceptance criteria

### S1: The menu moves an item, pending (round 1 Q4, Q5)

**Given** Sam's roadmap with "Online booking" under Later
**When** Sam chooses "Move to…" on its card, then Now
**Then** "Online booking" shows under Now, among the Now items in its row order, tagged
"Changed", and the roadmap shows it has unpublished changes
**And** nothing is written until Sam publishes

### S2: The menu offers every other placement (round 1 Q2, round 2 Q17)

**Given** an item under Next
**When** its "Move to…" menu opens
**Then** it lists the other five placements by the headings the page shows (Recently
delivered, Now, Later, Delivered this year, Not doing), in page order
**And** while the item's edit form is open, its card's menu is not shown

### S3: The edit form offers the placement too (round 2 Q17)

**Given** an item's edit form
**When** it opens
**Then** it has a placement choice of the six, set to the item's placement
**And** choosing another and confirming makes the same pending move as S1

### S4: An unplaced item can be placed, never unplaced (round 1 Q6)

**Given** an item flagged as not on the public roadmap, its horizon written as "Soon"
**When** Sam moves it to Later, by menu or form
**Then** it shows under Later, tagged "Changed", no longer flagged
**And** no menu or form choice makes a placed item unplaced; the form's choice for an
unplaced item starts with none chosen

### S5: Moving back is no change

**Given** "Online booking" moved from Later to Now, with no other pending edit
**When** Sam moves it back to Later
**Then** it shows under Later with no "Changed" tag, and the roadmap has no pending
changes

### S6: Publishing writes the horizon only (round 1 Q3, round 2 Q18)

**Given** "Online booking" moved to Recently delivered
**When** Sam publishes the roadmap
**Then** its row's `Horizon` cell reads `Recently delivered`, and no other cell or row
changes for the move
**And** after a reload it shows under Recently delivered in its row order

### S7: The publish dialog lists a move

**Given** a moved item
**When** Sam opens the publish dialog
**Then** the item is listed with the placement among its changed fields

### S8: A co-lead's different move is a conflict (round 1 Q11)

**Given** Sam moved "Online booking" from Later to Now, and a co-lead has since moved it
to Next
**When** Sam publishes
**Then** nothing is written, and the conflict review shows Sam's Now beside the
co-lead's Next, by heading, to keep or use
**And** a co-lead's move to Now as well is no conflict, and a co-lead's change to
another field of the item is not overwritten

### S9: Refresh drops a move the data source already holds

**Given** Sam moved an item to Now, and a co-lead has since moved it to Now
**When** Sam refreshes
**Then** the item shows under Now with no pending move

### S10: The menu works by keyboard and on a phone

**Given** the roadmap's page, on a phone-width screen or by keyboard alone
**When** Sam opens "Move to…" on an item and chooses a placement
**Then** the move is made, the menu's button is named for the item ("Move Online
booking"), and focus returns to the moved item's card

### S11: Welsh

**Given** the Welsh interface
**When** Sam opens "Move to…"
**Then** the menu, its name and the form's placement label are in Welsh, and the
placements show their Welsh headings

## Decisions

- **D1** (owner, 2026-11-13, EPC-007 grilling round 1 Q2): any of the six placements,
  not the three horizons only → S2.
- **D2** (owner, round 1 Q3, round 2 Q18): a move changes the `Horizon` cell only; the
  item keeps its row order, mid-list or not; reordering is a later record → S1, S6.
- **D3** (owner, round 1 Q4, round 2 Q17): a "Move to…" menu on every card, hidden
  while that item's form is open, and a placement choice in the form; no drag and drop
  → S1–S3.
- **D4** (owner, round 1 Q5, Q6): a pending move shows in its new placement, tagged
  "Changed"; moving places an unplaced item, and nothing unplaces one → S1, S4.
- **D5** (owner, round 1 Q11): placement is one field for conflicts → S8.

## Starting point

Audited at `5546d47`. Publishing finds an item's columns by header, and the conflict
check and Refresh compare string bases (`FieldChange`); grouping reads
`item.placement` (`group-roadmap-items.ts`), so a pending move must regroup through the
same pending values the card's text already uses. The publish dialog and conflict review
label item fields through `roadmaps.edit.itemFields.*` and show values as text (EPC-007
F2): a placement needs its heading. The `Horizon` value written is the public site's
(`docs/analysis/roadmap-tab-format.md`, _Horizon values_).

## Out of scope

- Reordering within a placement, drag and drop: EPC-007 _Out of scope_.
- Organisations: STY-034.
