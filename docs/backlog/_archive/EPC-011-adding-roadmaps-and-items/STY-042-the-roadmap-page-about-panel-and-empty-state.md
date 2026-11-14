# STY-042: A roadmap's page shows About in a panel, and says when it is empty

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Suggested model**: Sonnet — two presentational changes and one line in an existing
  dialog
- **Delivered**: _the PR, once it is open_

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

## Delivery

### Departures

- **S3: the line is settled as the dialog opens** (agent), with the rest of what the
  dialog asks, so it does not change under Sam while the write goes or the dialog
  closes. Asked before the roadmap's items have been read, or when they can't be,
  the dialog has no line: the editor does not then know what the public would see.
- **S1: where the heading and its controls don't fit one line, the controls go under
  the heading** (agent), still above the fields: on a phone in Welsh, and on a phone
  once "Changed" and "Undo changes" show.
- **S2: the dashed outline is the theme's `--border`** (agent), the token for a
  boundary that marks no control (ADR-010), so it is lighter than the prototype's
  grey.
- **Tests.** Written first and run red: the rule (`publishesNoItems`), the About
  panel's layout, the empty panel and its Welsh, and five of the publish dialog's
  seven cases; the two that assert no line passed before the code, as they must. The
  Playwright specs followed working code.

### Contract for dependents

- **The About panel** is `RoadmapAbout` (`components/roadmap-about.tsx`): `actions`
  now sit beside the heading. Its `form` prop still draws the in-place form inside the
  panel; STY-043 takes it out.
- **The empty panel** is drawn in `RoadmapItems` (`components/roadmap-items.tsx`) with
  the `Empty` primitive, which is dashed; `StatusPanel` is as it was for its other
  users. Its sentence is `roadmaps.items.empty.description`, which STY-046 replaces
  with its button (D2).
- **The rule** is `publishesNoItems(items, changes)` (`editing/pending-changes.ts`):
  no item is in a horizon or section, counting a pending move. STY-046 S10 counts a
  new item here. `usePublishedState` asks it of the items as read, and keeps the
  answer in `PublishedStateQuestion.noItems`.
- **Copy**: `roadmaps.publishRoadmap.confirm.noItems`, said between the nightly note
  and the line about pending edits. The Welsh of it and of
  `roadmaps.items.empty.description` is machine-assisted, as all of `cy.ts` is.
- **E2E**: the panel is the region named "About this roadmap"; the empty panel is
  found by its heading, "No items yet".

### Scenario evidence

`about` is `src/features/roadmaps/components/roadmap-about.test.tsx`; `items` is
`src/features/roadmaps/pages/roadmap-detail-page-items.test.tsx`; `publishing` is
`src/features/roadmaps/pages/roadmap-detail-page-publishing-roadmap.test.tsx`; `page`
is `tests/e2e/roadmap-page.spec.ts`; `axe` is `tests/e2e/accessibility.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | about "is a bordered panel with its controls beside the heading, ahead of the fields"; page "About is a bordered panel with Edit beside its heading" (both themes: the border and fill by their tokens, Edit level with the heading and above the first field, then the form, "Changed" and "Undo changes" inside the panel); `tests/e2e/structure.spec.ts` `detail`                                                                                        |
| S2       | items "says a roadmap with no items has none, instead of six empty groups, in a dashed panel with no icon"; page "a roadmap with no items shows a compact dashed panel" (both themes: dashed, no icon, under 160px high, then the items after Refresh)                                                                                                                                                                                                      |
| S3       | `src/features/roadmaps/editing/pending-changes.test.ts` "leaves the public nothing to see until an item is in a horizon or section, counting a pending move"; publishing "publishing a roadmap the public would see with no items" (seven cases); `tests/e2e/publishing-roadmap.spec.ts` "says the public site will show a roadmap with no items, and still publishes it", "says so while no item has a recognised horizon, until a pending move gives one" |
| S4       | items "says so in Welsh"; publishing "says so in Welsh"; page "an empty roadmap's page is in Welsh and fits a phone"; axe "an empty roadmap on a phone in Cymraeg, then its publish dialog saying so" and "a roadmap's page on a phone" (both themes)                                                                                                                                                                                                       |
