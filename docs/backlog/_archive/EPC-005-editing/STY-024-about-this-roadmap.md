# STY-024: A roadmap's page shows what the roadmap is about

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-005-editing](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-009, ADR-008, ADR-010
- **Suggested model**: Sonnet — a read-only block from data already loaded, on existing
  patterns

## Summary

A roadmap's page shows only its title and items, so a Product Lead must go back to the
list to see its status label, product lead and service description, and cannot see its
vision anywhere. An "About this roadmap" block under the title shows all four, in
Welsh where the roadmap has Welsh. It reads nothing new. It is read-only here; STY-025
adds its Edit.

## Scope

`features/roadmaps/` (a block on the detail page, from the roadmap the list already
loaded) and `i18n/` (its heading and field labels). No new read, no domain change.

## Acceptance criteria

### S1: The block shows the roadmap's text

**Given** Product A, which has a status label, a product lead, a vision and a service
description
**When** its page is opened
**Then** under the title and above the items, a section headed "About this roadmap" shows
each, labelled
**And** the vision and service description keep their line breaks

### S2: Empty fields are left out

**Given** a roadmap with no vision and no product lead
**When** its page is opened
**Then** the block shows the status label and service description only, with no empty
labels
**And** a roadmap with none of the four shows the heading and one line saying there is
nothing about it yet, so STY-025's Edit has a place

### S3: Welsh where the roadmap has it

**Given** the Cymraeg interface, and a roadmap with a Welsh vision but no Welsh status
label
**When** its page is opened
**Then** the heading and labels are Welsh, the vision is the Welsh text, the status label
falls back to the English (`localise`)
**And** the product lead's name is shown as written

### S4: Loading, failure and expiry are unchanged

**Given** the list is loading, has failed, or the session has expired with the list
cached
**When** the page is opened
**Then** the block appears exactly when the title does, and the page's states are as
before (STY-021)

### S5: Accessible in both themes

**Given** the page with the block, light and dark, desktop and 375px
**When** axe runs and the structure snapshot is taken
**Then** there are no violations, the block is a labelled section with an `h2`, and the
tab order is unchanged (it has no controls)

## Tests

S1–S3 are component tests; S4 extends the detail page's tests; S5 updates
`structure.spec.ts` (`detail.aria.yml`) and the accessibility spec.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q12): the roadmap's own text sits in an "About this
  roadmap" block on its page, which STY-025 makes editable → this story.
- **D2** (owner, 2026-11-11, grilling Q11): family, category, colour and `Last updated`
  stay where they are (the list card) and are not in the block.
- **D3** (agent, 2026-11-11): the block lands before editing so the read-only layout and
  its snapshot change can be reviewed on their own, and to run beside STY-022.

## Out of scope

- Editing: STY-025.
- Family and colour: EPC-006.

## Delivery

### Departures

None.

### Contract for dependents

- **Component**: `RoadmapAbout({ roadmap })` (`features/roadmaps/components/roadmap-about.tsx`),
  rendered by `RoadmapView` between the title block and the items area, so it appears
  exactly when the title does. STY-025's Edit goes in this section.
- **Markup**: a `<section>` labelled by its `h2` ("About this roadmap"), then a `dl` of
  the fields present, in order: status label, product lead, vision, service description.
  A field that is null or blank leaves no label; with none, one line says there is
  nothing about the roadmap yet. Text goes through `localise` per field; the product
  lead is shown as written; line breaks are kept with `whitespace-pre-line`. It has no
  controls, so the tab order is unchanged.
- **Copy**: `roadmaps.about.{title,empty,fields.*}`. The Welsh is machine-assisted and
  needs a fluent review.
- **Tests**: the page's `h2`s now start with "About this roadmap"; `detail.aria.yml`
  gained the region.

### Scenario evidence

- **S1–S3**: `roadmap-about.test.tsx`; `roadmap-page.spec.ts` (Product A's labels).
- **S4**: `roadmap-detail-page.test.tsx` (loading, failed, expired).
- **S5**: `structure.spec.ts` (`detail.aria.yml`) and the accessibility spec's roadmap
  page checks.
