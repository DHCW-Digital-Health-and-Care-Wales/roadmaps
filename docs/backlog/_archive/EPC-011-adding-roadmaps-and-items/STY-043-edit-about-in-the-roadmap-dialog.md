# STY-043: “About this roadmap” is edited in the roadmap dialog

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Refactor
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-041 (hard, must be on the default branch), STY-042 (preferred
  order)
- **Binding ADRs**: ADR-012, ADR-013, ADR-005, ADR-008, ADR-010
- **Suggested model**: Sonnet — an existing form moved into an existing dialog, with
  no change to what is written
- **Delivered**: _(the PR's URL, once it is open)_

## Summary

Editing what a roadmap is about opens the same dialog that adds a roadmap, instead of
a form in place on the page. The dialog shows every About field: title, status,
product lead, product family, category, vision, service description and last
updated. It has no short name, which can't be changed. Nothing else changes: the
edits are still pending until the roadmap is published or saved, and conflicts,
Refresh and "Undo changes" work as they do. The owner asked for one dialog for adding
and editing a roadmap; the in-place form goes.

## Scope

The roadmap dialog's editing form and the removal of the About section's in-place form
(`features/`); copy in both catalogues. No change to the domain, the repository or
what is written.

## Acceptance criteria

### S1: Edit opens the roadmap dialog (items round 3 Q1, items round 4 Q1)

**Given** Sam is on a roadmap's page
**When** Sam chooses Edit on "About this roadmap"
**Then** the dialog STY-041 built opens, headed for editing this roadmap, holding its
title, status, product lead, product family, category, vision, service description
and last updated, each with its current value, pending edits included
**And** it has no short name field, and the page behind it is unchanged

### S2: Done keeps the edits pending, as today

**Given** Sam has changed the vision and the category in the dialog
**When** Sam chooses Done
**Then** the dialog closes, the About panel shows the new values with its "Changed"
tag and "Undo changes", and the roadmap has unpublished changes, exactly as the
in-place form left it (STY-025, STY-028, STY-036)
**And** nothing is written until Sam publishes or saves

### S3: Every rule of the in-place form holds in the dialog

**Given** the dialog is open for editing
**When** Sam leaves the title blank, picks a date after today, opens it on a roadmap
whose family isn't listed, or opens it while the family or category list can't be
read
**Then** each behaves as the in-place form does today: the same messages, the same
choices offered, the same fields unavailable
**And** a Refresh that reads a co-lead's change while the dialog is open treats the
open form as the in-place form does

### S4: Closing follows the epic's rule

**Given** Sam has changed fields in the dialog
**When** Sam chooses Cancel, presses Escape or clicks outside it, or the session
expires
**Then** it behaves as the epic's _The dialogs_ sets; edits that were already pending
stay, Done still works while expired, as the in-place form's does, and focus returns
to Edit as the dialog closes

### S5: Welsh, phone and assistive technology

**Given** the interface is in Welsh, the screen is a phone's, or Sam uses a keyboard
or a screen reader
**When** Sam edits About
**Then** the dialog is in Welsh, fits the phone as the epic's _The dialogs_ sets, is
named by its heading, holds focus and links each message to its field; axe finds
nothing in it

## Tests

S2 and S3 are held by the in-place form's existing component and Playwright tests,
re-pointed at the dialog: none is dropped, and each rule S3 names keeps its test.

## Decisions

- **D1** (owner, 2026-11-14, items round 3 Q1): About editing moves into a dialog in
  this epic, over leaving it in place (recommended) or a story for later.
- **D2** (owner, items round 4 Q1): it is the same dialog as "Add a roadmap", with fewer
  fields when adding: title, short name, product family, category and product lead
  to add; every About field and no short name to edit. Over the same fields in both,
  or two dialogs.
- **D3** (agent): Done, not Save, confirms the form, as the in-place form does: Save
  names the write on an unpublished roadmap.
- **D4** (agent, 2026-11-15): the dialog is headed "Edit this roadmap" ("Golygu'r map
  trywydd hwn"), over "About this roadmap": it shares its verb with the Edit that
  opens it, as "Add a roadmap" does with its button, and it holds the title, family
  and category, which the About panel does not show.
- **D5** (owner, 2026-11-14, CHO-011 D5 and the epic's `delivery-notes.md`): the
  dialog's Playwright journey runs once, at the default size and theme, with no check
  of where the dialog sits. Changes: S5's phone is held by `FormDialog`'s own rule
  (STY-041) and the PR's phone screenshots, not by a Playwright run; the accessibility
  spec and the focus tour still open the dialog in both themes.
- **D6** (agent, 2026-11-15): the fields keep the in-place form's order (the domain's
  `EDITABLE_ROADMAP_FIELDS`: the text, then family and category, then the date), over
  the order S1 lists them in, so nothing about the form changes but where it opens.

## Out of scope

- Any change to what an About edit writes, or to conflicts: ADR-012, ADR-013.
- CHO-007 and DEF-005, which concern the open About form and a Refresh: they keep
  their own records, and S3 carries today's behaviour across unchanged.

## Delivery

### Departures

- **S3, a Refresh while the dialog is open** (agent): the dialog is modal, so Refresh
  can't be pressed while it is open, where it could beside the in-place form. A
  Refresh asked for before the dialog opens and read while it is open is treated as
  the in-place form treated one: Done keeps only what was changed in the dialog, from
  the roadmap as it opened on it, and the lists read again are offered. The two tests
  of this hold the read, open the dialog, then let the read go.
- **S5, the phone** (owner, D5): no Playwright run at phone width.
- **S4, focus** (agent): `EditForm` no longer focuses its own first field when it is
  in a dialog. Doing so moved focus before the dialog had noted the control that
  opened it, so closing returned focus nowhere; the dialog focuses the first field
  itself.
- **"Undo changes" moves focus to Edit as it is chosen** (agent), not after the next
  render: Edit is always there now, where the in-place form took its place.
- **STY-042's panel test runs its behaviour once** (agent): `roadmap-page.spec.ts`
  checked "Changed", "Undo changes" and the focus after Undo in both themes, with the
  in-place form. With the edit now made in the dialog that part is one test, and the
  border and background stay per theme (D5; CHO-014's row for it is marked).
- **Tests.** The component tests were re-pointed at the dialog first and run red: 38
  failed across four files for want of the dialog (five more in a fifth once the form
  had gone), with the four new cases among them. The Playwright specs followed working
  code. None was dropped; the two Refresh tests are re-sequenced as above.

### Contract for dependents

- **`RoadmapDialog`** (`dialogs/roadmap-dialog.tsx`) takes `open`, `onClose`, and
  either `roadmaps` and `onAdded` (it adds, STY-041) or `roadmap` and `onDone` (it
  edits that roadmap, as the page shows it). Its editing form is `EditRoadmapForm`
  (`dialogs/edit-roadmap-form.tsx`), which gives `EditForm` the About fields.
- **`EditForm` with no `onCancel` is a form in a dialog**: its buttons are a
  `DialogFooter` with a `DialogClose`, and it neither handles Escape nor focuses its
  first field, which are `FormDialog`'s. With `onCancel` it is the item's in-place
  form, as before. STY-044 moves the item form the same way and then deletes
  `onCancel`, the in-place branch and `useEditMode`.
- **`EditableRoadmapAbout`** holds the roadmap as read and as shown when the dialog
  opened, and makes the edits from them on Done. `RoadmapAbout` has no `form` prop.
- **Copy**: `roadmaps.edit.roadmapHeading`, in both catalogues; the Welsh is
  machine-assisted. No key became unused: the form's labels and messages are the ones
  the in-place form had.
- **Vitest**: `features/roadmaps/testing/roadmap-dialog.ts` opens the dialog from
  About's Edit (`openEditRoadmapDialog`), finds it (`editRoadmapDialog`), sets one
  text field and confirms (`editRoadmapText`) and chooses Done, waiting for the
  dialog to go (`confirmRoadmapEdit`), in English or Welsh.
- **E2E**: `openEditRoadmapDialog(page, { offersLists, language })` and
  `editRoadmapButton(page, language)` (`tests/e2e/fixtures/dialogs.ts`); the dialog is
  `getByRole("dialog", { name: "Edit this roadmap" })`. `expectDialogTour` now takes a
  date field as one stop, though Tab goes through its day, month and year. The
  structure snapshot is `edit-roadmap-dialog.aria.yml`.
- **DEF-005 and CHO-007** are still open, each with a note of what the modal dialog
  changes about reaching it.

### Scenario evidence

`editing` is `src/features/roadmaps/pages/roadmap-detail-page-editing.test.tsx`;
`choices` is `…/roadmap-detail-page-choices.test.tsx`; `date` is
`…/roadmap-detail-page-last-updated.test.tsx`; `e2e` is
`tests/e2e/editing-a-roadmap.spec.ts`; `axe` is `tests/e2e/accessibility.spec.ts`;
`tour` is `tests/e2e/focus-indicator.spec.ts`; `structure` is
`tests/e2e/structure.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | editing "opens the roadmap dialog on every About field and no short name, the page behind it as it was", "edits the roadmap's five fields, tagging the block and the title"; e2e "a Product Lead edits About in the roadmap dialog, the edits pending until published" (once, D5); structure `edit-roadmap-dialog`                                                                                                                                                                                                                                                                        |
| S2       | editing "edits the roadmap's five fields…", "tags only the block when the title is unchanged, and undoes it all", and every publish and co-lead case that edits About through the dialog; choices (S1–S3, S5); e2e the journey (nothing written until published); `tests/e2e/editing.spec.ts` "a family and category (STY-028)" and "a co-lead's change (STY-026)"; `tests/e2e/roadmap-page.spec.ts` "About's panel holds “Changed” and “Undo changes”, which returns focus to Edit"                                                                                                      |
| S3       | the title: e2e "editing About in Welsh", axe "editing a roadmap, then publishing it"; the date: date (S3, S4, the day past midnight, a date already after today, one the browser can't read) and `tests/e2e/last-updated.spec.ts`; an unlisted family and a list that can't be read: choices (S6, "holds the family at its value while the list is read") and `editing.spec.ts` "is shown read-only…"; a Refresh: editing "leaves alone a co-lead's change, read while the roadmap dialog was open…", choices "offers the lists a Refresh asked for, read again while the dialog is open" |
| S4       | editing "Cancel…" and "Escape closes it, dropping what was typed and keeping the edits already pending, with focus back on Edit", "keeps the dialog and what was typed when the session expires, and Done still keeps the edits"; e2e "Cancel and Escape close the dialog…; a click outside does nothing", "the dialog stays through the session warning and the session's end, and Done still keeps the edits"                                                                                                                                                                           |
| S5       | Welsh: date "is in Welsh, the field, Today, the tick box and the messages", e2e "editing About in Welsh"; named by its heading, each message with its field: structure `edit-roadmap-dialog`, date (S4); holds focus: tour "every control in the roadmap dialog, editing About, shows DHCW's focus indicator" (both themes); axe "editing a roadmap, then publishing it" (the dialog open, then refused), "choosing a family, then its pending colour", "a co-lead's change to review, in Cymraeg on a phone" (both themes); the phone: D5                                                |
