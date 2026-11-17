# STY-053: A Product Lead jumps between a roadmap's placements

- **Status**: Proposed — grilled over the UX prototypes' four rounds (D1–D8);
  selectable, as STY-052, its hard dependency, is done
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: STY-052 (hard: "Jump to" lives in its sticky title row, D5)
- **Binding ADRs**: ADR-011, ADR-012, ADR-010, ADR-008
- **Suggested model**: Opus — in-page navigation with scroll position, focus and
  pending markers across six placements

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
