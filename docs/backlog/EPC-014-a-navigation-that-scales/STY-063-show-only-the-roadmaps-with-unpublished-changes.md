# STY-063: A Product Lead shows only the roadmaps with unpublished changes

- **Status**: Proposed — the owner asked on 2026-11-18 to deliver the navigation UX
  prototype as drawn, and accepted its change to STY-055 D5
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](README.md)
- **Depends on**: STY-061 (hard, must be on the default branch), STY-062 (hard)
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Suggested model**: Sonnet — the count's link becomes a toggle on the narrowing
  STY-061 builds

## Summary

With several roadmaps changed, "3 roadmaps have unpublished changes" leads to one of
them at a time, so seeing which wait to publish means reading dots down the list. This
story makes the count, while two or more roadmaps have changes, a button that shows
only those roadmaps; pressing it again shows every roadmap. It empties any search, and
the navigation stays open, the phone's drawer too. With one roadmap changed the count
still leads to it, as today.

## Acceptance criteria

### S1: Only the roadmaps with changes

**Given** Electronic prescribing, Shared care plans and Carers' register have unpublished
changes, Single Record is closed, and the search holds "care"
**When** the Product Lead presses "3 roadmaps have unpublished changes"
**Then** the search empties and only those three roadmaps show, each under its family's
name, Shared care plans among them
**And** the count shows pressed, to sight and to a screen reader, and focus stays on it
**And** a screen reader is told only the 3 roadmaps with unpublished changes show

### S2: Every roadmap again

**Given** the count pressed
**When** the Product Lead presses it again
**Then** every roadmap shows, Single Record closed as it was, and the search stays empty
**And** a screen reader is told every roadmap shows

### S3: Typing lets the count go

**Given** the count pressed
**When** the Product Lead types in the search
**Then** the count is no longer pressed, and the search narrows the list (STY-061)
**And** spaces alone leave the count pressed, and nothing is announced

### S4: Fewer than two left

**Given** the count pressed with two roadmaps changed
**When** the Product Lead discards or publishes one roadmap's changes
**Then** every roadmap shows, and the count leads to the one left with changes, as
today (STY-055 D5, D6)

### S5: One roadmap with changes

**Given** only Electronic prescribing has unpublished changes
**When** the Product Lead chooses the count
**Then** Electronic prescribing's page opens, as today; on its own page the count is
text

### S6: Moving between pages, and the phone

**Given** the count pressed
**When** the Product Lead chooses Carers' register
**Then** its page opens, and the navigation still shows only the roadmaps with changes
**And** on a 375px phone, pressing the count leaves the drawer open and the desktop's
fold as it was, and choosing a roadmap closes the drawer

### S7: From the rail

**Given** the navigation folded to its rail, three roadmaps changed, the count pressed
or not
**When** the Product Lead presses the count's circle
**Then** the navigation opens, remembered as open, with only those three showing and
the count pressed
**And** in the rail the circle carries no pressed state, since pressing it always opens
the navigation narrowed

### S8: Welsh, keyboard and dark

**Given** the interface in Cymraeg at the navigation's narrowest and in the drawer at
375px, or a keyboard alone, or the dark theme
**When** the Product Lead presses the count
**Then** its text and the pressed state fit with no sideways scroll, it is reached and
worked by keyboard with the navigation's focus styles, and its pressed state is visible
on navy in both themes

### S9: While the roadmaps are unread

**Given** three roadmaps with unpublished changes, and the Product Lead disconnected or
the list failed to load
**When** they look at the navigation
**Then** the count is text, as STY-055 D6 says, and nothing to press

## Decisions

- **D1** (owner, 2026-11-18, request and analysis decision 9): with two or more roadmaps
  changed, the count shows only them and shows every roadmap when pressed again, without
  bringing back a search it emptied; the navigation stays open. The owner accepted this
  change to STY-055 D5.
- **D2** (agent, 2026-11-18, analysis decision 9 (a)): with one roadmap changed, the
  count still leads to it, over a button that shows that roadmap alone.
- **D3** (agent, 2026-11-18, analysis decisions 8 (a) and 10 (a)): typing lets the count
  go, over searching within the roadmaps with changes; the narrowing ends when fewer
  than two are left.
- **D4** (agent, 2026-11-18, analysis decisions 11 (a) and 12 (a)): the narrowing lasts
  while moving between pages, not past a reload; the rail's circle opens the navigation
  narrowed.
- **D5** (agent, 2026-11-18, code review, analysis decision 19 (a)): the rail's circle
  opens the navigation narrowed whether or not the count was pressed; the drawer's count
  leaves the desktop's fold alone; a blank search neither lets the count go nor
  announces anything.

## Starting point

Audited at `f46384c`. `UnpublishedTotal` renders the count as a `NavigationLink` to
`nextChangedRoadmap(...)`, or `NavigationText` where there is none to lead to. Its
round-robin (`next-changed-roadmap.ts`) serves only the one-roadmap case after this
story, where "the next" is always that roadmap: delete what no longer earns its place.

## Out of scope

- A list of the changed roadmaps elsewhere, such as Disconnect's (STY-055 D2):
  unchanged.
