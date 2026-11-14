# STY-044: An item is edited in a dialog

- **Status**: Proposed — grilled with the owner on 2026-11-14 (the owner's request after
  items round 2; items round 3 Q2, Q3)
- **Type**: Feature + Refactor
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-041 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-014, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — moves the app's largest form, with its tags and details
  editors and their focus rules, out of the card without changing what it does

## Summary

Edit on an item's card opens a dialog holding the item's form, instead of turning the
card into a form. The fields, their rules and what they write are the ones the card
form has today, and Tags, Organisations and Details still start shut and open on
request. The owner asked for one dialog for adding and editing an item: this story
builds it for editing, and STY-046 uses it to add. Edits stay pending until the
roadmap is published or saved. Move stays on the card.

## Scope

The item dialog in its editing form, and the removal of the card's in-place form with
the code that held an open card in place (`features/`); copy in both catalogues. No
change to the domain, the repository or what is written.

## Acceptance criteria

### S1: Edit opens the item dialog (owner's request)

**Given** Sam is on a roadmap's page
**When** Sam chooses Edit on an item's card
**Then** a dialog opens, headed for editing that item, holding its title, description,
expected outcome, phase, horizon or section, tags, organisations and details, each
with its current value, pending edits included
**And** the card stays as it was behind the dialog, in its place

### S2: Tags, Organisations and Details start shut (items round 3 Q2)

**Given** the dialog is open on an item with two tags and seven details
**When** Sam looks at those fields
**Then** each shows what it holds, shut, and opens when chosen, as in the card form
(EPC-009 _A field that opens on request_; STY-039 S17)

### S3: Done keeps the edits pending, as today

**Given** Sam has changed the outcome and moved the item from Next to Now in the
dialog
**When** Sam chooses Done
**Then** the dialog closes, the item's card shows in Now with the new outcome, its
"Changed" tag and "Undo changes", and the roadmap has unpublished changes, exactly as
the card form left it
**And** focus is on that card's Edit, in whichever list the card now is

### S4: Every rule of the card form holds in the dialog

**Given** the dialog is open for editing
**When** Sam leaves the title blank, edits tags or details by keyboard, opens an item
whose tags or details have Welsh versions, or opens an item with no recognised
horizon
**Then** each behaves as the card form does today: the same messages, keys, offered
tags, read-only fields and choices (STY-031, STY-034, STY-037, STY-039)
**And** a Refresh while the dialog is open treats the open form as the card form does

### S5: Closing follows the epic's rule

**Given** Sam has changed fields in the dialog
**When** Sam chooses Cancel or presses Escape
**Then** the dialog closes and the changes made in it are dropped, without asking;
edits that were already pending stay
**And** a click outside does nothing, an expired session keeps the dialog and its
text, and focus returns to the card's Edit

### S6: Welsh, phone and assistive technology

**Given** the interface is in Welsh, the screen is a phone's, or Sam uses a keyboard
or a screen reader
**When** Sam edits an item
**Then** the dialog is in Welsh, fills the width from the foot of the screen and
scrolls with its buttons reachable, is named by its heading and holds focus; axe finds
nothing in it, with each field shut and open

## Decisions

- **D1** (owner, 2026-11-14, request during grilling): editing an item converges on
  the dialog chosen for adding one, so one component adds and edits; the in-place
  card form goes.
- **D2** (owner, items round 3 Q2): Tags, Organisations and Details still start shut,
  over all open or open when they hold something.
- **D3** (owner, items round 3 Q3, confirming the agent's choices): the dialog holds
  today's item form; nothing in what is written changes.
- **D4** (agent): Move stays a menu on the card, and "Undo changes" a button on it;
  only the form moves.
- **D5** (agent): the dialog is built here in its editing form, before adding
  (STY-046), so the move is proved against every existing item test first.

## Starting point

Audited at `400c90c`. An open card form is held in its list while a pending change
would move it (`held`, `cardHoldKey` and `onHold` in `roadmap-items.tsx` and
`editable-item-card.tsx`), and focus is handed to a moved card by `FocusRequest`:
with the form in a dialog the hold has no use, and the focus hand-over still does.

## Out of scope

- Adding an item in this dialog: STY-046.
- Any change to an item field's rules or writes: ADR-012, ADR-014.
