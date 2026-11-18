# STY-060: A Product Lead keeps one row of controls, at the top and once scrolled

- **Status**: Proposed — the owner accepted the page headers UX analysis's decisions
  2, 7, 8 and 12 on 2026-11-18
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-013-tidy-page-tops](README.md)
- **Depends on**: STY-059 (hard: the header block and the control row it builds)
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Suggested model**: Opus — the sticky strip, the jump control and the foot bar
  across three widths and two languages, with pinned insets and focus

## Summary

Below a desktop, a roadmap's page shows "Jump to" and a row of placement links one
above the other, and once scrolled on a phone the strip and the pending bar take four
rows between them. This story gives each width one jump control, the same at the top
and once stuck: "Jump to" below 1024px, the six links from 1024px. It shapes the stuck
strip per width (two rows on a phone, with + and … icons) and puts the pending changes'
foot bar on one row at every width. What the controls do does not change.

## Acceptance criteria

### S1: One jump control per width

**Given** a roadmap's page below 1024px, in English or Cymraeg
**When** it opens
**Then** "Jump to" is the only jump control, at the top and once stuck, and the row of
placement links is not shown
**And** from 1024px the six placement links, with their counts and pending marks, are
the only jump control, under Add an item and More at the top, and in the stuck strip
under the title once stuck, with the current placement marked (STY-053 S3)

### S2: The controls at the top, per width

**Given** a roadmap's page at the top
**When** the Product Lead looks at its controls
**Then** on a phone Add an item and More share a row, each as wide as its label, and
"Jump to" runs across the row below
**And** on an iPad Add an item, More and "Jump to" share one row, "Jump to" growing to
the content's right edge

### S3: The stuck strip on a phone

**Given** a 375px phone, scrolled into Next, with 2 unpublished changes
**When** the Product Lead looks at the strip
**Then** its first row holds the menu button and the title, cut after two lines with an
ellipsis, its full text kept as its name
**And** its second row holds + (named "Add an item"), … with a chevron (named "More"),
then "Jump to: Next" growing to the right edge, all 40px tall and top-aligned

### S4: The stuck strip on an iPad and a desktop

**Given** the page scrolled at 820px and at 1280px
**When** the Product Lead looks at the strip
**Then** at 820px it is the phone's two rows with Add an item and More labelled
**And** at 1280px the title has Add an item and More on its right, and the six links
run under it

### S5: A long placement's name in Cymraeg

**Given** the page in Cymraeg at 375px, scrolled into the placement with the longest
name
**When** the Product Lead looks at the strip
**Then** "Jump to" stays on one line, the placement's name cut with an ellipsis, and the
button's name and the open list keep it whole

### S6: The pending changes on one row

**Given** 2 unpublished changes, at 375px, 820px and 1280px, in English and Cymraeg
**When** the Product Lead looks at the foot bar
**Then** the count, Publish and Discard share one row; on a phone the count may wrap
onto two lines and Publish shows no icon
**And** its names, its "Save" for a roadmap not yet published, and what each does are
unchanged (STY-052)

### S7: Nothing hides focus or content, and short screens

**Given** the page scrolled, at each width, or a viewport below 500px tall
**When** the Product Lead tabs through the page or jumps to a placement
**Then** the focused control and the heading jumped to sit clear of the strip and the
foot bar, and below 500px nothing pins, as today (STY-052 D18)

## Decisions

- **D1** (owner, 2026-11-18, page headers UX analysis decision 2 (a)): "Jump to" below
  1024px and the six links on a desktop, each the same at the top and once stuck.
  Changes STY-053 D5, which kept both.
- **D2** (owner, 2026-11-18, analysis decision 7 (a)): once stuck on a phone, Add an
  item and More are icons (+, …). Extends STY-052 D18 and D19 to More.
- **D3** (owner, 2026-11-18, analysis decision 8 (a)): the phone's pending bar is one
  row, the count wrapping, Publish without its icon. Changes STY-052's two-row foot bar.
- **D4** (owner, 2026-11-18, analysis decision 12 (a)): on a desktop, Add an item and
  More sit on the left of the action row at the top and on the right of the title once
  stuck, as drawn.
- **D5** (owner, 2026-11-18, accepting the analysis's _Not yet drawn_): the stuck
  "Jump to" stays on one line, cut with an ellipsis; the stuck … keeps a chevron; the
  phone's foot bar trims Publish's and Discard's padding to give the count room.

## Starting point

Audited at `0f7b22c`. STY-053's departure "'Jump to' has a row of its own narrower than
a desktop" put "Jump to" on its own row below 1024px; S2 changes that on an iPad. The
seams are in EPC-012's `delivery-notes.md` (archived): `usePinnedInset`,
`usePinnedHeight`, `useMenuChoice`, `usePlacementNavigation`, `focusClearOfBars`; and
`tests/e2e/roadmap-controls.spec.ts` and `placement-navigation.spec.ts` hold the
strip's layout, including "keeps every control of the stuck row on screen" at 640px and
768px.

## Out of scope

- The header block and the controls' order: STY-059.
- What the foot bar's buttons do, and the publish dialog: STY-052, unchanged.
