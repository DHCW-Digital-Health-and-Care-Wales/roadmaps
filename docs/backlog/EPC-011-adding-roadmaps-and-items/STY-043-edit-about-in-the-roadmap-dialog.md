# STY-043: “About this roadmap” is edited in the roadmap dialog

- **Status**: Proposed — grilled with the owner on 2026-11-14 (items round 3 Q1, items
  round 4 Q1)
- **Type**: Feature + Refactor
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-041 (hard, must be on the default branch), STY-042 (preferred
  order)
- **Binding ADRs**: ADR-012, ADR-013, ADR-005, ADR-008, ADR-010
- **Suggested model**: Sonnet — an existing form moved into an existing dialog, with
  no change to what is written

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

## Out of scope

- Any change to what an About edit writes, or to conflicts: ADR-012, ADR-013.
- CHO-007 and DEF-005, which concern the open About form and a Refresh: they keep
  their own records, and S3 carries today's behaviour across unchanged.
