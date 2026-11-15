# STY-044: An item is edited in a dialog

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Refactor
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-041 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-014, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — moves the app's largest form, with its tags and details
  editors and their focus rules, out of the card without changing what it does
- **Delivered**: _(add on delivery)_

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
- **D7** (agent, 2026-11-15): the dialog is headed "Edit this item" ("Golygu'r eitem
  hon"), over the item's title: it matches "Edit this roadmap" (STY-043 D4), a long
  title would wrap the heading, and the title is the first field under it. The form
  is named by the heading, where the card form was named by the item's title.
- **D8** (owner, 2026-11-14, CHO-011 D5 and the epic's `delivery-notes.md`): the
  dialog's Playwright journey runs once, at the default size and theme, with no check
  of where the dialog sits. Changes: S6's phone is held by `FormDialog`'s own rule
  (STY-041) and the PR's phone screenshots, not by a run of the journey at phone
  width; the accessibility spec and the focus tour still open the dialog in both
  themes.
- **D9** (agent, 2026-11-15): an item without an ID is the same item only while its
  place and content are unchanged, as its card always was (`assignItemCardKeys`), so
  a read that changes or moves one closes its dialog, as it closed the card form
  (S4's last line). S7 holds for an item with an ID, which every item has once its
  roadmap has been published or saved from the editor.

## Starting point

Audited at `400c90c`. With the form out of the card, the hold that keeps an open
card in its list (the epic's F5) has no use; the hand-over of focus to a moved card
(`FocusRequest`) still does, and S7 depends on it.

## Out of scope

- Adding an item in this dialog: STY-046.
- Any change to an item field's rules or writes: ADR-012, ADR-014.

## Delivery

### Departures

- **S7, focus as the dialog closes** (agent): the Starting point expected the
  hand-over of focus to a moved card (`FocusRequest`) to carry it. The page behind a
  dialog can't take focus until the dialog has gone, so the dialog returns focus
  itself: the page gives the dialog's `opener` ref to the card of the item it edits,
  wherever that card now is, and keeps doing so once the dialog has closed.
  `FocusRequest` still hands focus to a card moved by its Move menu or by "Undo
  changes".
- **S4, a Refresh while the dialog is open** (agent): the dialog is modal, so Refresh
  can't be pressed while it is open, where it could beside the card form. A read that
  lands while it is open is treated as the card form treated one. The tests of this
  ask for the Refresh first with its read held (`holdRefresh`), open the dialog, then
  let the read go; a second read in one test is made as the browser makes one when it
  comes back online (`readAgain`).
- **S4, two tests re-shaped, none dropped** (agent). "keeps typed text in the
  spelling another item has taken since" had two card forms open at once; the other
  item now takes the spelling by a co-lead's edit read while the dialog is open.
  "keeps another item's open form when publishing gives every item an ID" published
  beside an open form; a publish can't be confirmed behind a dialog, so the first IDs
  now arrive by a read, as a co-lead's first publish gives them.
- **The card's hold, and its test** (agent): "keeps an open form, and its card where
  it opened, when Use theirs moves the item, until Done" tested the hold this story
  deletes, and "Use theirs" can't be chosen behind a dialog. It is now S7's test: a
  read moves the item's card to another list while the dialog is open.
- **The card behind the dialog shows the item** (agent): the card form replaced the
  card's own lines for its tags and details, and two tests held that the card showed
  neither while its form was open. Those two assertions have gone with the form; S1
  holds the opposite.
- **A tag's rename and Escape** (agent): the card form let a field use Escape by
  checking whether it had been handled. A dialog closes on any Escape that reaches
  it, so the rename field now stops its own (`tags-field.tsx`); STY-037 S15's test
  and the phone test of the long tag hold it.
- **The long tag and the long detail are checked at one width** (agent): each ran on
  a phone and "in the narrowest card" (640 px, two cards across). No form sits in a
  card now, and the dialog is narrowest on a phone, so the 640 px runs have gone
  (CHO-014's row for them, and its D6).
- **The focus tour** (agent): one test toured a page with three card forms open. It
  is now two: the page with a change pending, and the item dialog, first as it opens
  and then with Tags, Organisations and Details open, in both themes.
- **S6, the phone** (owner, D8): no run of the journey at phone width.
- **Tests.** The editing tests were re-pointed at the dialog first and run red: 43
  failed for want of the dialog, S7's among them. The other four page test files
  followed the working dialog, each red until re-pointed, since the card form had
  gone. The Playwright specs followed working code.

### Deleted

- `editing/use-edit-mode.ts` (`useEditMode`).
- `EditForm`'s `onCancel` prop and the in-place branch it chose: the first focus it
  set, its Escape handler (with the lint exception for it), and its own Done and
  Cancel buttons.
- The card form in `EditableItemCard`, with the fields it built (now
  `EditItemForm`), and the card's `shownItems`, `holdKey` and `onHold` props.
- The hold in `RoadmapItems`: `held`, `cardHoldKey` and the `hold` handler.
- `RoadmapItemCard`'s `form` and `headingId` props.
- No copy key became unused: the form's labels and messages are the card form's.

### Contract for dependents

- **`ItemDialog`** (`dialogs/item-dialog.tsx`) takes `open`, `onClose`, `opener` and
  what its form takes. Its one form is `EditItemForm` (`dialogs/edit-item-form.tsx`):
  `opened` (the item as read and as shown when the dialog opened), `item` (as the
  page shows it now), `tagsInUse`, `organisations` and `onDone`. STY-046 gives the
  dialog its adding form, as `RoadmapDialog` has two.
- **`useItemDialog`** (`editing/use-item-dialog.ts`) is the page's one dialog state:
  `edit(position)` opens it, `edited` says which item it is on (`key`, `open`, `at`,
  `opened`, `item`), `done` keeps the values pending and `close` closes it. It finds
  its item again by card key after every read. `RoadmapItems` renders `ItemDialog`
  from it and gives `opener` to the card at `edited.at`.
- **Card keys are per roadmap** (`useItemCardKeys(items)`, one key per position), no
  longer per list, so a key names the same item in whichever list it shows.
- **`EditableItemCard`** takes `onEdit(position)` and `dialogOpener`, the ref its Edit
  holds while the dialog is, or was last, on its item. It has no form.
- **`EditForm` is always a dialog's form**: a `DialogFooter` with Done and a
  `DialogClose`; first focus, Escape and closing are `FormDialog`'s. A field that
  uses Escape itself stops it reaching the dialog.
- **Copy**: `roadmaps.edit.itemHeading`, in both catalogues; the Welsh is
  machine-assisted.
- **Vitest**: `features/roadmaps/testing/item-dialog.ts` has `openEditItemDialog(user,
title, language?)`, `editItemDialog(language?)`, `editItemText(user, title, field,
to)` (English only) and `confirmItemEdit(user, language?)`. It and
  `roadmap-dialog.ts` share `testing/edit-dialog.ts`. `holdRefresh(user, repository)`
  and `readAgain(queryClient)` (`testing/held-call.ts`) make a read land while a
  dialog is open.
- **E2E**: `openEditItemDialog(page, title, language?)` and `editItemButton(page,
title, language?)` (`tests/e2e/fixtures/dialogs.ts`); the dialog is
  `getByRole("dialog", { name: "Edit this item" })`. The journey is
  `tests/e2e/editing-an-item.spec.ts`. `expectEveryStopShowsAnIndicator(page, scope)`
  tours a dialog whose fields keep some controls out of the Tab order, as the details
  outline does. The four `edit-item-form-*` structure snapshots are now of the dialog;
  under its heading each holds what the card form's did, line for line.

### Scenario evidence

`editing` is `src/features/roadmaps/pages/roadmap-detail-page-editing.test.tsx`;
`moving`, `tags`, `details` and `organisations` are its siblings
`…-moving`, `…-tags`, `…-details` and `…-choosing-organisations.test.tsx`; `e2e` is
`tests/e2e/editing-an-item.spec.ts`; `fields` is `tests/e2e/editing.spec.ts`; `axe` is
`tests/e2e/accessibility.spec.ts`; `tour` is `tests/e2e/focus-indicator.spec.ts`;
`structure` is `tests/e2e/structure.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | editing "opens the item dialog prefilled with the item's English, pending edits included, its card as it was behind it"; moving "sets the dialog's choice to the item's placement, offering all six"; e2e "a Product Lead edits an item in the item dialog, the edits pending until published" (once, D8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S2       | tags "starts shut, both tags on one line beside Change tags, with no editor", "opens the editor in place, focus in Add a tag…"; details "starts shut, the details as the card lists them beside Change details, with no editor", "opens the outline in place, focus in it…"; organisations "starts shut, naming the chosen by short name beside Change organisations, with no checkboxes", "opens the checkboxes in place, the item's ticked, focus on the first"; e2e the journey (each of the three shut as the dialog opens); structure `edit-item-form-tags`, `-organisations` and `-details` (one field open, the others shut)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S3       | editing "keeps a confirmed change pending: trimmed, shown, tagged and counted, nothing written"; moving "shows an item moved by its dialog in its new place, in row order, pending", "returns focus to the moved card's Edit after Done"; e2e the journey (the outcome changed and Next to Now: the card in Now with "Changed" and "Undo changes", focus on its Edit, nothing written)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S4       | the title: editing "requires a title, linking the error to the field, and lets other fields be cleared"; tags and details by keyboard, the offered tags: every test of tags "Editing an item's tags (STY-037)" and "What the Tags field keeps", of details "Editing an item's details (STY-039)" and "Details written another way", of organisations (both blocks), each through the dialog, with tags "keeps the old name on Escape or Cancel, the form staying open, and the new one on Update" holding that a field's Escape leaves the dialog open; Welsh versions: tags "An item with Welsh tags" and details "An item with Welsh details"; no recognised horizon: moving "never unplaces an item: the menu offers all six, the dialog starts on none, which can't be chosen", editing "edits an unplaced item like any other"; a Refresh: moving "keeps the none option, and its choice, in the open dialog after a Refresh reads a co-lead's placing the item", tags "keeps no tag change made in a dialog whose item gains Welsh tags while it is open", "shows the tags it keeps when an item's Welsh tags come and go while its dialog is open", "keeps typed text in the spelling another item has taken since…", details "keeps no change of details made in a dialog whose item gains Welsh details while it is open", "shows what Done keeps when an item's Welsh details come and go while its dialog is open", "shows a field never opened as the dialog opened on it, whatever a Refresh reads since", editing "closes the dialog of an item without an ID when a read puts another item in its place", "keeps an item's open dialog when a read gives every item its first ID, as a co-lead's first publish does"; against the Sheets fake, through the dialog: fields "moving an item (STY-031)", "choosing an item's organisations (STY-034)", "the Organisations field opens on request (STY-038)", "editing an item's tags (STY-037)", "editing an item's details (STY-039)" |
| S5       | editing "Cancel closes the dialog…" and "Escape closes the dialog, dropping what was typed and keeping the edits already pending, with focus back on Edit", "returns focus to the card's Edit as it closes where the click that opened it left focus elsewhere, as Safari's does", "keeps the dialog and what was typed when the session expires, and Done still keeps the edits"; e2e "Cancel and Escape close the dialog and drop what was typed, keeping the edits already pending; a click outside does nothing", "the dialog stays through the session warning and the session's end, and Done still keeps the edits"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S6       | Welsh: editing "labels the fields as the English in Welsh, and shows the Welsh tagged", moving "speaks Welsh…", tags, details and organisations "is Welsh on the Welsh interface…", e2e "editing an item in Welsh"; named by its heading: structure, the four `edit-item-form-*` snapshots; holds focus, every control: tour "every control in the item dialog, its fields shut and then open, shows DHCW's focus indicator" (both themes); axe (both themes) "editing a roadmap, then publishing it" (the dialog refused), "an item's organisations, shut then open…", "an item's tags: shut, open…", "an item's details: shut, open…", "an item with no tags…", "an item with no details…", "an item with no organisations…"; the phone: D8, with fields "edits an unplaced item on a phone, every form and dialog fitting the width", "on a phone, the rows' buttons are icons beside a long tag…" and "on a phone, a long detail at the third level wraps…", each in the dialog at 375 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S7       | moving "keeps the open dialog and what was typed when a read moves the item's card to another list, focus on the card where it now is after Done"; `src/features/roadmaps/components/item-card-keys.test.ts` "keeps a key it took over as the item moves"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
