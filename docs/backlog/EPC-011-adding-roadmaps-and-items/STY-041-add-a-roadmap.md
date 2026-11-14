# STY-041: A Product Lead adds a roadmap

- **Status**: Proposed — grilled with the owner on 2026-11-14 (rounds 1–3); dialog B and
  landing B chosen from the prototypes
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-040 (hard, must be on the default branch)
- **Binding ADRs**: ADR-009, ADR-012, ADR-013, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — the app's first dialog form, whose closing and focus
  rules three later stories reuse, with six refusals to show at their fields

## Summary

A Product Lead starts a new roadmap from the roadmap list instead of the spreadsheet.
"Add a roadmap" opens a dialog asking its title, a short name suggested from the title
(the end of its public address), and optionally its product family, category and
product lead. Adding writes it at once, not published, and the Product Lead lands on
the new roadmap's page with a notice. A short name already in use, a family that has
gone or a missing template is said at the dialog, which keeps what was typed. Adding
items is STY-046; editing "About this roadmap" in this dialog is STY-043.

## Scope

The dialog primitive (shadcn CLI, Base UI) and the roadmap dialog in its adding form,
the action on the roadmap list, the hook that calls STY-040's write, and the landing
notice (`features/`, `components/ui/`); copy in both catalogues. No change to the
domain or the adapter.

## Acceptance criteria

### S1: The roadmap list offers "Add a roadmap"

**Given** Sam is connected and the roadmap list has loaded, with roadmaps or with none
**When** the page shows
**Then** an "Add a roadmap" button sits with Refresh, and the empty list offers it too
**And** while not connected, or while the session has expired, the button is
unavailable, as "Publish changes" is

### S2: The dialog asks five things (round 1 Q1, round 2 Q2)

**Given** Sam chooses "Add a roadmap"
**When** the dialog opens
**Then** it asks for a title and a short name, both required, and a product family, a
category and a product lead, each optional, with "No family" and "No category" chosen
**And** it says the roadmap starts not published, with no items, and that the public
site doesn't show it until it is published
**And** focus is in the title; on a phone the dialog fills the width from the foot of
the screen and scrolls

### S3: The short name is suggested from the title (round 1 Q2)

**Given** the dialog is open and Sam has not changed the short name
**When** Sam types the title "Community Nursing roadmap"
**Then** the short name reads "Community Nursing": the title without a final
"roadmap", and without any character a short name can't hold
**And** under it the dialog shows how the public address will end
(`community-nursing`), updated as either field changes, and says the short name can't
be changed here later
**And** once Sam changes the short name, it no longer follows the title

### S4: A field that can't be sent says why

**Given** Sam has left the title blank, or typed a short name STY-040's rule refuses
("Community Nursing (Pilot) / 2027"), or one whose address a roadmap in the list
already has
**When** Sam chooses "Add roadmap"
**Then** nothing is sent; each such field shows what is wrong, linked to the field,
and focus moves to the first of them

### S5: Adding shows it is working, then opens the new roadmap (round 2 Q1)

**Given** Sam has filled the dialog in
**When** Sam chooses "Add roadmap"
**Then** the button shows it is working and the fields can't be changed until the
write answers
**And** once added, the dialog closes and Sam is on the new roadmap's page, with a
notice that "Community Nursing roadmap" was added and isn't published yet, its "Not
published" badge, "Publish roadmap", what Sam entered under "About this roadmap", and
no items
**And** the roadmap list shows its card under its family, or under "No product
family", with the count of roadmaps and of unpublished roadmaps one higher each

### S6: A refusal is said where it can be put right (round 2 Q3, round 3 Q3)

**Given** STY-040's write found the short name in use, by a roadmap a co-lead added
meanwhile or by a tab that already has the name
**When** it answers
**Then** the dialog stays with everything Sam typed, and the short name says it is
already in use and to choose another
**And** a family or category that has gone says at its field that it is no longer
listed, and offers the list as it now is

### S7: No usable template, and other failures (round 1 Q7)

**Given** the write rejected because the template for new roadmaps is missing or not
in the expected format
**When** it answers
**Then** the dialog says the roadmap couldn't be added for that reason, and to ask
the spreadsheet owner to check it, and keeps everything Sam typed
**And** a refused, unsent or rate-limited write says what happened and who can put it
right, as a family's failed write does; an expired session keeps the dialog and its
text, with "Add roadmap" unavailable until Sam reconnects; a write that may have
been applied says so and to refresh the list

### S8: Closing the dialog (round 3 Q2)

**Given** Sam has typed into the dialog and no write is under way
**When** Sam chooses Cancel or presses Escape
**Then** the dialog closes, what was typed is dropped without asking, and focus
returns to "Add a roadmap"
**And** a click outside the dialog does nothing

### S9: No family or category list to choose from

**Given** the data source has no usable family list, or no usable category list
**When** the dialog opens
**Then** that field can't be chosen and says so, as the About form does, and the
roadmap is added without it

### S10: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a keyboard or a screen reader
**When** Sam adds a roadmap
**Then** the action, the dialog, its hints, messages and notice are in Welsh; the
suggestion still drops only a final "roadmap" from an English title
**And** the dialog is named by its heading, holds focus while open, links each
message to its field and announces the notice; axe finds nothing in its open and
refused states

## Tests

S1–S3, S5 and S8 need Playwright against the Sheets fake, in both themes and at phone
width; S6 and S7 can be component tests against the in-memory double.

## Decisions

- **D1** (owner, 2026-11-14, round 1 Q1): the form is a dialog asking the essentials
  (design B), over a title-only form on the list (A, recommended) and a page of its
  own (C).
- **D2** (owner, round 1 Q2): the short name is suggested from the title and may be
  changed, over taking the whole title, squeezing it like `ProductA`, or always
  typing it.
- **D3** (owner, round 2 Q1): after adding, the new roadmap opens (design B), over
  staying on the list (A) or a set-up checklist (C).
- **D4** (owner, round 2 Q2): the five fields as prototyped; status is not asked.
- **D5** (owner, round 3 Q2): Cancel and Escape close and drop the text; a click
  outside does nothing; an expired session keeps the dialog. S8, and the epic's
  _The dialogs_.
- **D6** (owner, round 3 Q3, confirming the agent's choices): anyone connected may
  add; the empty list offers the action; a refusal is shown at its field.
- **D7** (agent): the short name's address is checked against the list as cached
  before sending, and again by the write; over waiting for the write to refuse.

## Starting point

Audited at `400c90c`. `src/components/ui/` has `alert-dialog` and no `dialog`. The
About form's family and category fields, with their unavailable state, come from
`use-roadmap-choices.ts`; the family form (`family-form.tsx`) is the pattern for
problems shown by field with focus moved to the first.

## Out of scope

- Adding an item: STY-046. Editing "About this roadmap" in this dialog: STY-043.
- The About panel's new look and the empty state: STY-042.
- A Welsh title: ADR-012 Option 3.
