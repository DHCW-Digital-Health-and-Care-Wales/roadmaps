# STY-042: A roadmap's page shows About in a panel, and says when it is empty

- **Status**: Proposed — grilled with the owner on 2026-11-14 (round 1 Q5, Q6; round 3
  Q1; the owner's comment on design B)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Suggested model**: Sonnet — two presentational changes and one line in an existing
  dialog

## Summary

A roadmap added here starts empty, so its page has to read well with nothing on it.
"About this roadmap" becomes a bordered panel with Edit beside its heading, and a
roadmap with no items shows a compact "No items yet" panel with a dashed outline, as
the owner chose from the prototypes. Until items can be added here, that panel says
they are added in the spreadsheet. The "Publish roadmap" confirmation now says when
the public site would show the roadmap with no items; publishing is still allowed.

## Scope

The About section's and the empty state's presentation on the roadmap page, and one
conditional line in the "Publish roadmap" confirmation (`features/`); copy in both
catalogues. No change to the domain, the repository or what is written.

## Acceptance criteria

### S1: About is a panel with Edit beside its heading (owner, comment on design B)

**Given** any roadmap's page
**When** it shows
**Then** "About this roadmap" is a bordered panel, with Edit beside its heading, not
at its foot, as design B of the prototypes' second journey draws it: a change from
today's page
**And** the "Changed" tag, "Undo changes" and the in-place form keep working as they
do, inside the panel

### S2: A roadmap with no items shows a compact dashed panel

**Given** a roadmap with no items
**When** its page shows
**Then** in place of the items is "No items yet" in a compact panel with a dashed
outline and no icon
**And** it says the roadmap's items are added in the spreadsheet for now and show
here after Refresh (round 1 Q5)

### S3: Publishing says when the public would see no items (round 1 Q6, round 3 Q1)

**Given** a roadmap with no item in a horizon or section: one with no items, or whose
items all have no recognised horizon
**When** Sam chooses "Publish roadmap", with or without pending edits to save
**Then** the confirmation also says the public site will show this roadmap with no
items, and Sam can still publish
**And** a roadmap with an item in any horizon or section, counting an item's pending
move, gets no such line, and "Unpublish roadmap" never does

### S4: Welsh, both themes and phone

**Given** the interface is in Welsh, the theme is dark, or the screen is a phone's
**When** the page and the confirmation show
**Then** the panel, the empty state and the new line are in Welsh, use only the
theme's tokens, and fit at 375px; axe finds nothing in them

## Decisions

- **D1** (owner, 2026-11-14, comment on the prototypes): the About panel and the
  dashed "No items yet" panel of design B are kept, though they differ from today's
  page. Read as applying to every roadmap's page, since the About block is one
  component (agent).
- **D2** (owner, round 1 Q5): until adding an item is delivered (STY-046), the empty
  panel points to the spreadsheet. STY-046 replaces the sentence with its button and
  takes its copy out of both catalogues.
- **D3** (owner, round 1 Q6): publishing a roadmap the public would see empty is
  allowed and the dialog says so, over leaving the dialog as it is or refusing the
  publish.
- **D4** (owner, round 3 Q1): "empty" is no item in a horizon or section, so a
  roadmap of unplaced items counts; over no items of any kind.
- **D5** (agent, 2026-11-14, owner asked for stories that fit one agent's context):
  cut from the story that adds a roadmap, on which nothing here depends.

## Starting point

Audited at `400c90c`. The About section is unbordered with its actions at the foot
(`roadmap-about.tsx`); the empty state is the shared `StatusPanel`, with an icon, a
solid border and a minimum height, which the roadmap list, the families page and
"not found" also use and keep.

## Out of scope

- The "Add an item" button in the empty panel: STY-046.
- Moving About's form into the roadmap dialog: STY-043.
