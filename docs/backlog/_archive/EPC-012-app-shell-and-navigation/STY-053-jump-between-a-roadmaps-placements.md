# STY-053: A Product Lead jumps between a roadmap's placements

- **Status**: Done — "Jump to" in the title row and a row of links under a folded
  "About this roadmap" reach every placement, with counts, pending marks and the
  current one
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-012-app-shell-and-navigation](../../EPC-012-app-shell-and-navigation/README.md)
- **Depends on**: STY-052 (hard: "Jump to" lives in its sticky title row, D5)
- **Binding ADRs**: ADR-011, ADR-012, ADR-010, ADR-008
- **Suggested model**: Opus — in-page navigation with scroll position, focus and
  pending markers across six placements
- **Delivered**: _(add on delivery)_

## Summary

A roadmap's six placements stack under "About this roadmap", so reaching Later means
scrolling past everything above it, and a Product Lead never sees Now, Next and Later
at a glance. This story adds a way to reach any placement directly, with how many items
each holds and which have pending changes, and folds "About this roadmap" so the items
start on the first screen. A "Jump to" menu in the sticky title row, and a row of links
under "About this roadmap", reach any placement (D5). The item card does not change.

## Acceptance criteria

### S1: Every placement can be reached directly

**Given** a roadmap's page with items in several placements
**When** the Product Lead chooses Later from the placement navigation
**Then** Later's items are in view, under its heading, and focus moves to that heading

### S2: Counts and pending changes per placement

**Given** a roadmap with 7 items in Now, one of them with a pending change
**When** the Product Lead looks at the placement navigation
**Then** Now shows 7 and a mark that it holds pending changes

### S3: Where the Product Lead is

**Given** the page scrolled into Next
**When** the Product Lead looks at the placement navigation
**Then** Next is marked as the current placement, to sight and to a screen reader

### S4: Unplaced items

**Given** a roadmap with unplaced items
**When** the Product Lead looks at the placement navigation
**Then** the unplaced items can be reached from it too

### S5: Empty placements

**Given** a placement with no items
**When** the Product Lead looks at the placement navigation
**Then** it shows 0, and choosing it shows that it has none, as today

### S6: "About this roadmap" folds

**Given** a roadmap's page
**When** it opens
**Then** "About this roadmap" shows a one-line summary (status, product lead, last
updated) with a way to show the rest and its Edit, and the first placement starts on
the first screen at 1280×800
**And** a pending change to it is still marked

### S7: Keyboard, screen reader, phone and Welsh

**Given** a 375px phone in Cymraeg, or a keyboard alone
**When** the Product Lead uses the placement navigation
**Then** every placement is reachable, named and marked current without sideways page
scroll

## Decisions

- **D1** (owner, 2026-11-17, UX prototypes grilling round 1, Q6; answers former Q1 with
  (a)): jump links over the whole page, the current placement marked as it scrolls.
  Lost: tabs (Now, Next and Later never seen together, a moved card leaves the tab)
  and a switch between the two.
- **D2** (owner, 2026-11-17, UX prototypes grilling round 1, Q7; answers former Q3 with
  (a)): "About this roadmap" folds to a one-line summary (status, product lead, last
  updated) that expands in place, keeping its Changed tag.
- **D3** (owner, 2026-11-17, UX prototypes grilling round 1, Q8; answers former Q4 with
  (a)): the navigation lists all six placements, an empty one with 0, as S5 has it.
- **D4** (owner, 2026-11-17, UX prototypes grilling round 2, Q9): explore two of Q2's
  options as designs D (a row of links in the sticky title row) and E (a "Jump to"
  menu button naming the current placement). Lost: a side rail, left to STY-054's
  design beside its navigation; and links under the title only, which fail S3.
- **D5** (owner, 2026-11-17, UX prototypes review, owner's choice; answers former Q2
  with (b), adding D's links): a "Jump to" menu button in STY-052's sticky title row
  names the current placement, on a desktop and a phone; D's row of links stays too, in
  the page below "About this roadmap", not sticky, so it scrolls away. Both show each
  placement's count and pending mark.
- **D6** (owner, 2026-11-17, UX prototypes review, owner's choice): "About this roadmap"
  stays one line (D2) and takes in the Family and Category line, which leaves its place
  under the title. Changes: S6 (what the line holds and what shows the rest).
- **D7** (owner, 2026-11-17, UX prototypes grilling round 3; answers round 3's Q3 with
  (a)): the unplaced group stays first and may push the first placement below the first
  screen (S6); rare, and expected to go with the move from the spreadsheet.
- **D8** (owner, 2026-11-17, UX prototypes grilling round 3; accepts the analysis's
  rules): Family and Category sit in About's expanded part, since on its one line they
  wrap it at 1280px; "Jump to" reads alone until a placement is in view; jumping moves
  focus and scrolls without changing the address (ADR-004).

## Out of scope

- A compact item card or a Now / Next / Later board: EPC-012 _Out of scope_.

## Delivery

### Departures

- **No navigation for a roadmap with no items** (agent): its dashed panel stands in for
  the placements (STY-042 S2), so there is no heading to jump to; "Jump to" and the
  links show once the items are shown with their placements.
- **The current placement** (agent, S3, D8): the last whose heading has reached the
  foot of the stuck title row, none above the first. A jump names its target until the
  page next scrolls, or its target leaves the page (the unplaced items, once placed),
  so a short placement near the end, which can never reach the top, still reads as
  current once chosen.
- **Links whose address is the page's own** (agent, review round 1): the router owns
  the fragment (ADR-004), so a link to `#placement-later` opened in a new tab would
  find no route; each link's address is the roadmap's, and a click jumps instead.
- **"Jump to" has a row of its own narrower than a desktop** (agent, review round 1):
  at a tablet's width, with "Publish roadmap" in the row and a long placement named
  (in Cymraeg at 768px, in English at 640px), the stuck row was wider than the screen.
  Below 1024px, "Jump to" runs across the page under the other controls, as on a phone;
  above it, should the row still be short of room, the controls may shrink, "Jump to"
  first, cutting its label (its name stays whole), and the title keeps some room.
- **About's one line** (agent, as the prototypes draw S6): folded, it holds the status
  as a tag, "Product lead: …", "Updated …" (the card's facts, each only when the
  roadmap has it) and Changed, then "Show more" and Edit; "Undo changes" shows once
  it is open. Open, Family keeps its colour swatch beside its name, which the removed
  family line carried, so a pending family still shows "with the family's colour"
  (STY-028 S1).
- **The links on a phone scroll inside their row** (agent, as drawn): the page never
  scrolls sideways (S7), and Tab brings each link into view. The row scrolls away with
  About, so it does not scroll the current link into view.
- **The stuck row's inset under reduced motion** (agent, found here): with
  `prefers-reduced-motion`, `globals.css`'s 0.01ms transition on every element brought
  the stuck row's padding and border in a frame late, and the inset, measured from a
  content box that did not change, stayed 28px short, so a heading jumped to, or a
  control focused, sat under the row (STY-052 S5). `useMeasuredHeight` now observes
  the border box. The E2E config runs without reduced motion, which is why STY-052's
  tests passed; the new spec holds it with `reducedMotion: "reduce"`.

### Contract for dependents

The epic's `delivery-notes.md` carries the seams as they stand. Besides those:

- **`RoadmapTitleRow`** takes `jumpTo`, a slot placed among the controls on a desktop
  (`DESKTOP_WIDTH`, `lib/use-media-query.ts`) and in its own row below that.
  **`RoadmapItems`** takes the page's `groups` (`groupPageItems(pageItems)`,
  `editing/page-items.ts`), computed once in `RoadmapView`, in place of `pageItems`.
- **`placement-navigation/`**: `summariseJumpTargets(groups, orders)`,
  `jumpTargetHeadingId(target)` and `jumpTargetName(target, t)` (`jump-targets.ts`),
  `usePlacementNavigation`, `JumpToMenu`, `PlacementLinks` and `JumpTargetLabel`.
  `hasGroupedItems(groups)` (`group-roadmap-items.ts`) is the one test of whether the
  page has items to show, for the items area and the navigation alike.
- **`useMenuChoice`** (`lib/use-menu-choice.ts`) replaces More's own deferred-action
  state; **`usePinnedHeight(edge)`** (`components/layout/pinning.ts`) reads a pinned
  inset for a scroll by script.
- **Removed**: `RoadmapFamilyLine` and `roadmaps.lists.{family,category}`.
  **Renamed**: `roadmaps.card.*` to `roadmaps.facts.*`, shared by the card and About's
  line. **Copy**: `roadmaps.jumpTo.*`, `roadmaps.about.{showMore,showLess}`,
  `roadmaps.about.fields.{family,category}`.
- **E2E**: `openRoadmapIn` (any spreadsheet) and `openLongRoadmap`
  (`fixtures/roadmap-page.ts`); `tabTo` (`fixtures/keyboard.ts`), shared with the focus
  tours.
- **Data source**: nothing read or written changes.

### Scenario evidence

`e2e` is `tests/e2e/placement-navigation.spec.ts`; `nav` is
`src/features/roadmaps/pages/roadmap-detail-page-placement-navigation.test.tsx`;
`targets` is `src/features/roadmaps/placement-navigation/jump-targets.test.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | e2e "jumps to Later from "Jump to", its heading under the title row, focused, the address unchanged, on a desktop" and "… on a phone" (D8), "jumps to a heading clear of the title row, as it sticks for the first time" (reduced motion), "jumps from the links under About, and from a heading jumped to, on to the next"; nav "moves focus to the placement's heading from the menu…" and "… from a link, without changing the address"                         |
| S2       | targets (counts; an edited, moved, new or reordered item's mark where it shows); nav "lists the unplaced items and all six placements with their counts…" and "marks where a change is pending…"; e2e "shows each placement's count and marks those with pending changes"                                                                                                                                                                                          |
| S3       | e2e "marks the placement the page is in, to sight and to a screen reader, and none at the top" (D8); nav "… and names it the current one" (`aria-current` on the link and menu item, the button's name) and "names no placement once the one jumped to has gone from the page"                                                                                                                                                                                     |
| S4       | targets "lists the unplaced items first, only while there are some"; nav "leaves the unplaced items out while there are none"; e2e "reaches the unplaced items, and an empty placement…"                                                                                                                                                                                                                                                                           |
| S5       | targets (an empty placement with 0); nav "reaches an empty placement, which says it has none"; e2e "reaches the unplaced items, and an empty placement, which says it has none"                                                                                                                                                                                                                                                                                    |
| S6       | `components/roadmap-about.test.tsx` (the one line, what it leaves out, Changed on it, the fields once open, Family and Category among them); e2e "folds About to one line, so the first placement starts on the first screen at 1280×800"; `structure` `detail`                                                                                                                                                                                                    |
| S7       | e2e "is used by keyboard alone, in Cymraeg on a 375px phone, with no sideways scroll" (Tab, Enter and the arrow keys) and "keeps every control of the stuck row on screen at 640px, in en…", "… at 640px, in cy…" and "… at 768px, in cy…"; nav "is Welsh, its names and counts"; `focus-indicator.spec.ts` (the links, Show more and Jump to on the page's tour); `accessibility.spec.ts` "a roadmap's placement navigation: Jump to open…" (axe, light and dark) |

`summariseJumpTargets` was test-first: its six tests failed on a stub before it was
written. The rest followed working code, each shown red by breaking it: no focus on the
heading after a jump fails four nav tests; no `aria-current` on the links fails "…
names it the current one"; the entry's phrase without "unpublished changes" fails "marks
where a change is pending…"; "Undo changes" while folded fails the editing test of S5
(STY-025); and the inset measured from the content box puts Later's heading at 40px
under the 68px row in the reduced-motion e2e test. Review round 1's fixes: the jump
kept after its target left fails "names no placement once the one jumped to has gone"
(written first, red before the fix); the stuck row as it was puts "Add an item"
(640px, English) and "Ychwanegu eitem" (768px, Cymraeg) past the right edge in the e2e
tests "keeps every control of the stuck row on screen…"; and About's actions given
`true` whatever its state fails "shows its controls in the heading's row…". After the
round 2 re-check, the title's minimum width kept below 1024px puts "Ychwanegu eitem"
past the right edge in "… at 640px, in cy…".
