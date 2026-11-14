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
**When** Sam chooses Cancel, presses Escape or clicks outside it, or the session
expires
**Then** it behaves as the epic's _The dialogs_ sets; edits that were already pending
stay, Done still works while expired, as the card form's does, and focus returns to
the card's Edit as the dialog closes

### S6: Welsh, phone and assistive technology

**Given** the interface is in Welsh, the screen is a phone's, or Sam uses a keyboard
or a screen reader
**When** Sam edits an item
**Then** the dialog is in Welsh, fits the phone as the epic's _The dialogs_ sets with
its buttons reachable, is named by its heading and holds focus; axe finds nothing in
it, with each field shut and open

### S7: The dialog outlives a card that moves

**Given** the dialog is open on an item in Next, with text typed
**When** the roadmap is read again and now has that item in Now, so its card is a
new one in another list
**Then** the dialog stays open with everything typed, and Done or Cancel returns
focus to the item's card where it now is

## Tests

S3 and S4 are held by the card form's existing component and Playwright tests,
re-pointed at the dialog: none is dropped, and each rule S4 names keeps its test. S7
is new.

## Decisions

- **D1** (owner, 2026-11-14, request during grilling): editing an item converges on
  the dialog chosen for adding one, so one component adds and edits; the in-place
  card form goes.
- **D2** (owner, items round 3 Q2): Tags, Organisations and Details still start shut,
  over all open or open when they hold something.
- **D3** (owner, items round 3 Q3, confirming the agent's choices): the dialog holds
  today's item form; nothing in what is written changes.
- **D4** (agent): Move stays a menu on the card, and "Undo changes" a button on it,
  over putting them in the dialog: only the form moves.
- **D5** (agent): the dialog is built here in its editing form, over building it
  first for adding (STY-046), so the move is proved against every existing item test.
- **D6** (agent): the open dialog is held by the page, not by its card, over keeping
  the card's hold: a card that moves lists is a new card, and a form inside it would
  be lost. S7.

## Starting point

Audited at `400c90c`. With the form out of the card, the hold that keeps an open
card in its list (the epic's F5) has no use; the hand-over of focus to a moved card
(`FocusRequest`) still does, and S7 depends on it.

## Out of scope

- Adding an item in this dialog: STY-046.
- Any change to an item field's rules or writes: ADR-012, ADR-014.
