# STY-031: A Product Lead moves an item to another horizon

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-007-item-placement-and-organisations](../../EPC-007-item-placement-and-organisations/README.md)
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

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_). A publish now also writes, in the same
`batchUpdate` as the roadmap's other edits, a moved item's `Horizon` cell alone: the
public site's English value for the placement (`Recently delivered`, `Now`, `Next`,
`Later`, `Delivered this year`, `Not doing`). No row moves, and the cell is never
blanked. A roadmap with no `Horizon` column gains one, appended as ADR-012 appends any
edited field's column.

### Departures

- **"Move to…" is a "Move" button opening a menu headed "Move to"** (agent). S10 names
  the button "Move Online booking"; a visible "Move to…" would not be part of that name
  (WCAG 2.5.3, label in name), so the button reads "Move" with the title after it for
  assistive technology, as Edit does, and the menu's group label says "Move to". The
  button sits between Undo changes and Edit.
- **The form's choice is labelled "Horizon or section" and comes last** (agent), after
  the four text fields, so the title stays first and focused. The glossary keeps
  "placement" out of copy. Its Welsh label has no "(Saesneg)": it is not English text.
- **An unplaced value in the conflict review** reads "Not on the public roadmap", the
  heading the page shows such items under (agent). A co-lead can unplace an item in the
  sheet; the editor never does. When a refused publish's re-read fails, "Use theirs" shows such an item
  under that heading with "No horizon", as the conflict holds no horizon as written; the
  next read shows what the co-lead wrote.
- **Focus after Done or Undo that moves the card** (agent, extends S10): a move makes
  the card a new one in another list, so the page hands focus to the moved card's Edit
  after Done or Undo, and to its Move after a menu move.
- **A placement the editor never sends** (blank, or none of the six) is refused by the
  publish plan as `unknown`, as a blank title is.
- **Tests.** The publish plan, contract, pending-change, grouping and page tests were
  written first and run red. The Sheets adapter's "writes a move as the public site's
  Horizon value" followed the adapter code; reverting the `HORIZON_VALUES` mapping made
  it fail (`recently-delivered` written), so it discriminates. The Playwright specs
  followed working code.

### Contract for dependents

- **Domain** (`@/domain/roadmap/roadmap-changes`): `ITEM_TEXT_FIELDS` (the four text
  fields) plus `"placement"` make up `EDITABLE_ITEM_FIELDS`; `isItemTextField`;
  `itemValue` (was `itemText`) gives a field's value, a placement as its ID (`""` while
  unplaced); `itemWelsh` takes text fields only. `isRoadmapPlacement` is in
  `roadmap-placement.ts`. A non-text item field is still one `FieldChange` string;
  STY-034 extends this model for organisations rather than adding a second one.
- **Publish plan**: `findEditedItem` matches a lost publish's placement and expects no
  written horizon on a placed item; `planRoadmapPublish` refuses an invalid placement.
- **Sheets adapter**: `HORIZON_VALUES` (`roadmap-tab-parser.ts`) holds each placement's
  `Horizon` value, read and written; `ITEM_COLUMNS.placement` is `Horizon`.
- **Features**: `applyItemChanges` shows a pending placement (no written horizon);
  `groupRoadmapItems(items, placementAt)` groups by the pending placement;
  `EditableItemCard` takes `focusRequest`, `onFocusRequest` and `onFocused`, as
  `RoadmapItems` hands focus to a card that a change moves to another list;
  `EditControls` takes a `move` slot; `EditFormOption.disabled` shows a value that
  can't be chosen; `MoveMenu` (`editing/move-menu.tsx`).
- **E2E hooks**: "Move <title>" (button), the menu's "Move to" group and its items by
  heading, the form's "Horizon or section" combobox; aria snapshot
  `edit-move-menu.aria.yml`.
- **Welsh to review** (machine-assisted): `roadmaps.edit.itemFields.placement`
  ("Gorwel neu adran"), `roadmaps.edit.move` ("Symud"), `.moveTo` ("Symud i"),
  `.choosePlacement` ("Dewiswch orwel neu adran").

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-moving.test.tsx` ("shows an item moved by its menu in its new place, in row order, pending"); `group-roadmap-items.test.ts` ("groups each item where `placementAt` puts it…"); e2e `editing.spec.ts` ("moves an item from its card, pending, then publishes its Horizon cell alone": no write before Publish)                                                                                                                                                                                                                                                                                                |
| S2       | `roadmap-detail-page-moving.test.tsx` ("offers the other five placements by heading, in page order, and no menu while the form is open"); `structure.spec.ts` (`edit-move-menu.aria.yml`); axe in `accessibility.spec.ts` ("an item's Move menu, then the moved item and an unplaced item's form", light and dark)                                                                                                                                                                                                                                                                                                                |
| S3       | `roadmap-detail-page-moving.test.tsx` ("sets the form's choice to the item's placement, offering all six"; "shows an item moved by its form…")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S4       | `pending-changes.test.ts` ("shows the item in its new placement, an unplaced one no longer flagged"); `roadmap-detail-page-moving.test.tsx` ("places an unplaced item by its menu/form, no longer flagged"; "never unplaces an item…"); contract "places an unplaced item, so it no longer has a horizon as written"; `publish-plan.test.ts` ("rejects the placement %j, which the editor never sends")                                                                                                                                                                                                                           |
| S5       | `pending-changes.test.ts` ("is no change once moved back"); `roadmap-detail-page-moving.test.tsx` ("is no change once moved back")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S6       | `publish-plan.test.ts` ("writes the item's new placement as its id"); contract "moves an item by its placement alone, keeping every row where it is"; Sheets adapter "writes a move as the public site's Horizon value, in that cell alone"; e2e (only `Discovery card: Horizon = Recently delivered` changes beside Item IDs; after a reload it shows under Recently delivered)                                                                                                                                                                                                                                                  |
| S7       | `roadmap-detail-page-moving.test.tsx` ("publishes the placement, listed among the item's changed fields")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S8       | `publish-plan.test.ts` ("is a conflict when a co-lead moved it elsewhere, and none when to the same place"); contract "refuses a co-lead's other move, writing nothing" and "moves an item over a co-lead's change to another field, keeping it"; page "shows a co-lead's other move beside yours, by heading, to keep or use"; page "shows an item a co-lead unplaced as unplaced after Use theirs, even if the roadmap couldn't be read again"; `conflicts.test.ts` ("shows a co-lead's move, and an item they unplaced as having no horizon"); e2e "a co-lead's other move is shown beside yours, by heading, nothing written" |
| S9       | `pending-changes.test.ts` ("is dropped by a read that finds the item already there, which it then holds")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S10      | `roadmap-detail-page-moving.test.tsx` ("moves by keyboard, naming the menu for the item, then focuses the moved item's card"; "returns focus to the moved card's Edit after Done/Undo changes"); e2e "moves by keyboard on a phone, focus staying on the moved card" (375 px)                                                                                                                                                                                                                                                                                                                                                     |
| S11      | `roadmap-detail-page-moving.test.tsx` ("speaks Welsh: the menu, its name, the form's label and the headings")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
