# STY-060: A Product Lead keeps one row of controls, at the top and once scrolled

- **Status**: Done — one jump control per width, the same at the top and once stuck,
  the stuck strip shaped per width and the pending changes' foot bar on one row
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-013-tidy-page-tops](README.md)
- **Depends on**: STY-059 (hard: the header block and the control row it builds)
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/158
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

## Delivery

### Departures

- **The placement links wrap where the six do not fit** (agent, S1, the epic's
  _Widths_): in Cymraeg beside the navigation the six links need 871px, and 1024px
  leaves them 688; with the unplaced items' link, English needs more than 1024px gives
  and Cymraeg more than 1280px. The row wraps onto a second line, at the top and in the
  stuck strip, so no link passes the right edge and nothing scrolls sideways. Today's
  row scrolled inside itself, hiding the links past its edge.
- **The phone's stuck title is DHCW's extra-small heading** (agent, S3): two lines of
  the small heading would make the first row taller than the menu button by half a line
  again, so it uses the size the prototype draws; from 640px it is the small heading on
  one line, as today.
- **While a read is in flight, the stuck … spins** (agent, S3): the refresh icon takes
  the ellipsis's place, as it takes the labelled More's leading icon.
- **An empty "Match the lists" area takes no gap** (agent, S1, D4): with the links in
  the header, the empty wrapper of `MatchListsAction` put 56px between the links and
  the first placement; it is hidden while empty, leaving the page's 32px.
- **Renames**: `RoadmapHeader` takes `navigation` (the placement navigation) in place
  of a `jumpTo` node, and chooses `JumpToMenu` or `PlacementLinks` per width itself;
  the page no longer renders `PlacementLinks` under the header block.

### Contract for dependents

- **`RoadmapHeader`** (`components/roadmap-header.tsx`) renders, in one `StickyHeader`
  and in this DOM order whatever the state, the title row, the middle part (`LEFT_OUT`
  once stuck), the controls row (Add an item, More, and "Jump to" below
  `DESKTOP_WIDTH`) and, from `DESKTOP_WIDTH`, `PlacementLinks`. Stuck from `lg` its
  grid puts the title and the controls on one row and the links across both columns
  under them. No control changes parent as the header sticks, so focus stays on it.
- **`RoadmapMoreMenu`** takes `compact` (an ellipsis and a chevron, still named
  "More"), set with `AddItemButton`'s `compact` once stuck below 640px.
- **`PlacementLinks`** takes `className`; it wraps and no longer scrolls inside itself.
  **`JumpToMenu`** fills what holds it at every width.
- **`PendingBar`** is one row at every width; below 640px Publish has no icon and both
  buttons `px-3`.
- **For STY-064** (the navigation's width): the links wrap and "Jump to" cuts its
  placement's name, so a narrower page column keeps every control on the screen;
  `tests/e2e/control-row.spec.ts` holds it from 375px to 1280px, the navigation beside
  the page at 1024px and 1280px. The header's grid is one shrinkable column
  (`grid-cols-1`), so no content widens it past the page.
- **Catalogue**: no key added or removed; the comments on `roadmaps.jumpTo` say which
  width shows which control.
- **Test hooks**: `tests/e2e/control-row.spec.ts`; `jumpTo` and `placementLinks` in
  `tests/e2e/fixtures/roadmap-page.ts` find the jump control per width;
  `tests/e2e/fixtures/layout.ts` holds `boxOf` (with `right` and `bottom`), now shared by
  the control-row, roadmap-header and roadmaps specs, and `scrollsSideways`, used by the
  control-row and placement-navigation specs; the `detail` structure snapshot, at
  1280px, has the links and no "Jump to".

### Scenario evidence

`cr` is `tests/e2e/control-row.spec.ts`; `hp` is
`src/features/roadmaps/pages/roadmap-detail-page-header.test.tsx`; `pn` is
`src/features/roadmaps/pages/roadmap-detail-page-placement-navigation.test.tsx`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `cr` "shows one jump control at {375,640,768,820,1024,1280}px in {en,cy}, the same at the top and once stuck"; `hp` "One jump control per width (STY-060)" (three tests) and "reaches Add an item, More, then the placement links by Tab after Edit on a desktop"; `pn` (menu on a phone, links on a desktop); `structure.spec.ts` `detail`      |
| S2       | `cr` "puts Add an item and More on a phone's row…" and "puts Add an item, More and Jump to on one row on an iPad…" in en and cy; `cr` "keeps a phone's top to the screen's width with About open on a long address" and "…in Cymraeg, Jump to naming the unplaced items"; `roadmap-header.spec.ts` "opens on one header block on one left edge…" |
| S3       | `cr` "shapes a phone's stuck strip as two rows…"; `roadmap-controls.spec.ts` "moves Publish roadmap into More once the row sticks… Add an item and More are icons" and "fits the pinned controls in Cymraeg on a 375px phone…"; `accessibility.spec.ts` "a roadmap's placement navigation on a phone…"                                           |
| S4       | `cr` "shapes an iPad's stuck strip as the phone's two rows…" and "shapes a desktop's stuck strip as the title with Add an item and More on its right, then the links"                                                                                                                                                                            |
| S5       | `cr` "keeps a stuck Jump to on one line in Cymraeg on a phone…"; `placement-navigation.spec.ts` "keeps every control of the stuck row on screen at {768,640}px…"                                                                                                                                                                                 |
| S6       | `cr` "puts the count, Publish and Discard on one row at {375,820,1280}px in {en,cy}" and "keeps Save, for a roadmap not published, on the phone's one row…"; STY-052's specs for what each does                                                                                                                                                  |
| S7       | `cr` "keeps the heading jumped to and each control tabbed to clear of the strip and the foot bar on {a phone,an iPad,a desktop}" and "pins nothing below 500px of height…"; `roadmap-controls.spec.ts` (S5, S6); `placement-navigation.spec.ts` (jumps at three widths)                                                                          |

Every test above followed working code. Each new or rewritten one was shown red by
breaking it:

- "Jump to" rendered on a desktop too: `cr` S1 at 1024px and 1280px, and three `hp`
  tests.
- The links rendered below a desktop: `cr` S1 at 375px and 820px, and `hp` "is Jump to
  below a desktop…".
- The links kept from wrapping: `cr` S1 at 1024px in Cymraeg.
- "Jump to" on a row of its own at every width: `cr` S2 on an iPad. "Jump to" kept in
  the phone's row at the top: `cr` S2 on a phone.
- The stuck title on one line: `cr` S3.
- More labelled when stuck on a phone: `cr` S3 and `roadmap-controls.spec.ts` (D18).
- The stuck desktop grid removed: `cr` S4 on a desktop.
- "Jump to"'s label left uncut: `cr` S5.
- The foot bar on two rows below 640px: `cr` S6 at 375px in both languages, and the
  Save test. Publish's icon kept on a phone: `cr` S6 at 375px.
- The stuck strip's top inset dropped: `cr` S7 at all three widths.

`cr` "pins nothing below 500px of height…" guards STY-052 D18's `usePinning`, which this
story does not change. The two "keeps a phone's top to the screen's width…" tests guard
review round 1's concern that the header's grid could grow past a phone; it did not in
Chromium before the `grid-cols-1` hardening either, so they passed both ways.
