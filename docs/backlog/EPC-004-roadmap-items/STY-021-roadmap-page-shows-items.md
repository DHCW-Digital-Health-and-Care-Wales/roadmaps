# STY-021: A roadmap's page shows its items under Now, Next, Later and the other sections

- **Status**: Proposed — selectable once STY-020 is on `main`
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-004-roadmap-items
- **Depends on**: STY-020 (hard)
- **Binding ADRs**: ADR-011, ADR-008, ADR-010, ADR-002
- **Suggested model**: Sonnet — a page built from existing components and states on a
  ready hook; the copy goes through the copywriter skill

## Summary

Opening a roadmap from the home page shows its items, the thin first slice of the
roadmap page. Under the roadmap's title come six headed groups in the public site's
order: Recently delivered, Now, Next, Later, Delivered this year and Not doing. Each
item shows its title and every other field as plain text. Items the public site would
drop, because their horizon is blank or not recognised, appear in their own flagged
group showing what to fix. The page gains a Refresh and the "Not published" badge. No
editing, styled item cards or filters yet; those are later iterations.

## Scope

- `features/roadmaps/`: the roadmap page's items section, its loading, empty and error
  states, using `useRoadmapItems` (STY-020) and existing components (`StatusPanel`,
  `RoadmapsErrorState`, `Alert`, `Badge`, `Skeleton`).
- `i18n/`: placement headings, field labels, the unplaced group, the empty roadmap, the
  page's Refresh and an item-specific `invalid-data` message, in English and Welsh; the
  `roadmaps.detail.comingSoon` key goes. Organisation codes are not catalogue copy.
- The page also gains a Refresh and the roadmap's "Not published" badge (D7, D8).
- `tests/e2e/`: a roadmap page spec against the example spreadsheet.

## Acceptance criteria

### S1: The items appear under the six placements, in order (owner, decision 1)

**Given** a connected Product Lead on the home page
**When** they open "Product A roadmap"
**Then** under its title are six level-2 headings, in this order: Recently delivered,
Now, Next, Later, Delivered this year, Not doing
**And** each holds that placement's items in row order, each item's title a level-3
heading: three under Now, one under Next, two under Later and one under each section

### S2: Every field shows as plain text (owner, decision 3)

**Given** Product A's page
**When** the Product Lead reads "Example card with every column"
**Then** it shows its phase "Beta", its description, its expected outcome, its tags
"Service X" and "Service Y", its organisations by full name ("Cardiff and Vale
University Health Board", "Swansea Bay University Health Board") and its four details
as a nested list
**And** "Minimal card" shows only its title and description, with no empty labels
**And** line breaks in a cell show as line breaks

### S3: A placement with no items says so

**Given** Product B's roadmap, which has no Recently delivered or Not doing items
**When** its page loads
**Then** all six headings still show, and each empty one says it has no items

### S4: Items the public site would drop are shown, flagged (owner, decision 2)

**Given** a roadmap with an item whose horizon is blank and one whose horizon is "Soon"
**When** its page loads
**Then** both appear in a group whose heading and note say they are not on the public
roadmap until they are given a horizon, before the six placements
**And** the group is absent when every item has a recognised horizon

### S5: Welsh

**Given** the interface in Cymraeg
**When** Product A's page loads
**Then** headings, labels and organisation names are in Welsh; an item's title, phase,
description, outcome, tags and details show their Welsh where it exists ("Cerdyn
darganfod", "Darganfod") and English where it does not ("Minimal card")

### S6: A roadmap with no items

**Given** a roadmap whose tab has only a header
**When** its page loads
**Then** the title shows with a message that the roadmap has no items yet, instead of six
empty groups

### S7: Loading keeps the title

**Given** the roadmap list is loaded and the items are still being read
**When** the page shows
**Then** the title is visible and the items area is a loading placeholder announced as
loading

### S8: A failure to read the items stays on this roadmap

**Given** the items read fails with a retryable problem, with `forbidden`, or with
`invalid-data` (a missing tab or no title column)
**When** the page shows
**Then** the title still shows, with an error below it saying what went wrong in the
Product Lead's terms, and Retry only for a retryable problem
**And** the `invalid-data` message is about this roadmap's items, not the roadmap list
**And** the home page's roadmap list is unaffected

### S9: Expired session and deep links

**Given** a session that expires while a roadmap's items are shown
**When** the page updates
**Then** the items stay, with the existing expired-session alert and Reconnect
**And** a deep link opened before connecting shows the existing connect prompt, and the
items after connecting
**And** an unknown roadmap still shows "Roadmap not found"

### S10: Columns in a different order read the same (owner)

**Given** the example spreadsheet with Product A's tab columns rearranged (for example
`Horizon` first and `Title` last)
**When** Product A's page loads
**Then** it shows exactly what S1 and S2 describe

### S11: It works on a phone and for everyone

**Given** Product A's page at 375px wide, in light and dark themes, in English and
Cymraeg
**When** it is checked
**Then** nothing scrolls horizontally, the heading levels run h1, h2, h3 with none
skipped, and axe reports no WCAG 2.2 AA violations

### S12: Organisations show as their standard codes (owner, grilling rounds 1–2)

**Given** an item whose organisations cell is `sbuhb, cavuhb, Mars`
**When** its roadmap's page loads, in English or Cymraeg
**Then** the item's organisations read "CAVUHB, SBUHB", in the fixed list's order, and
"Mars" is not shown
**And** an item for all of Wales reads "National"

### S13: A flagged item shows what to fix (owner, grilling round 1)

**Given** an unplaced item whose horizon was written "Soon", and one left blank
**When** the page loads
**Then** the first shows that its horizon "Soon" is not recognised, and the second that
it has no horizon

### S14: The page can be refreshed (owner, grilling round 1)

**Given** Product A's page has loaded, and an item's horizon is then fixed in the data
source
**When** the Product Lead selects Refresh on the page
**Then** the roadmap and its items are read again and the item moves to its placement
**And** Refresh is busy while reading, and unavailable but focusable when not connected,
as the home page's is
**And** the home page's Refresh still re-reads only the roadmap list

### S15: An unpublished roadmap says so (owner, grilling round 1)

**Given** Product C, which is not published
**When** its page loads
**Then** a "Not published" badge, the same as its home-page card's, shows beside the
title
**And** Product A's page shows no badge

## Tests

S1–S9 and S12–S15 are component tests with the providers' test utility and the in-memory
repository; the page has many states and the in-memory double reaches each one. S1, S4,
S8 (one retryable and `invalid-data`), S10, S11 and S14 are also Playwright specs against the
fake Sheets: S10 because column order is a data-source property, S11 because layout and
axe need a real browser. The existing accessibility spec covers the page in both themes.

## Decisions

- **D1** (owner, 2026-11-10, analysis decision 1): all six placements, in the public
  site's order, each with a heading. Adds S1, S3.
- **D2** (owner, 2026-11-10, analysis decision 2): items with a blank or unknown horizon
  are shown, flagged. Adds S4.
- **D3** (owner, 2026-11-10, analysis decision 3): labels, organisations and details show
  as basic text too, not only the title, phase, description and outcome. Changes: S2.
- **D4** (agent, 2026-11-10; owner confirmed, grilling round 1): the unplaced group comes before the six placements (S4), so
  an item missing from the public site is seen without scrolling a long roadmap; it is
  absent when empty.
- **D5** (agent, 2026-11-10; owner confirmed, grilling round 1): a roadmap with no items shows one empty state, not six
  empty groups (S6); a roadmap with some items shows all six (S3), per D1.
- **D6** (owner, 2026-11-10, grilling rounds 1–2, ADR-011 Option 6): organisations show
  as their standard codes in the fixed order, the same in both languages, not full names;
  unknown codes are not shown. Changes: S2 (its organisations read "CAVUHB, SBUHB") and
  S5 (organisations are not translated). Adds S12.
- **D7** (owner, 2026-11-10, grilling round 1): the page gets its own Refresh for the
  roadmap and its items; the home page's Refresh stays list-only. Adds S14.
- **D8** (owner, 2026-11-10, grilling round 1): the page shows the roadmap's "Not
  published" badge beside the title, ahead of the rest of the roadmap's information
  (still out of scope). Adds S15.
- **D9** (owner, 2026-11-10, grilling round 1, ADR-011 Option 5): a flagged item shows
  its horizon as written. Adds S13.
- **D10** (owner, 2026-11-10, grilling round 1): section headings are the values a
  Product Lead types (Recently delivered, Delivered this year, Not doing), not the public
  site's longer headings; the copywriter may polish them.

## Starting point

Audited at `0f9f09e`. `RoadmapDetailPage` already handles the list's states (title from
the list via `useRoadmap`, not found, connect prompt, list errors, expired alert); the
items section sits under the title inside its `roadmap` branch. `RoadmapsErrorState`
takes an `AppError` and copies `errors.<kind>`, whose `invalid-data` text names the
roadmap list. `RoadmapsPage` has the Refresh button and `RoadmapCard` the "Not
published" badge to reuse. Visible UI changes
need before/after screenshots (`implement-story` `references/screenshots.md`).

## Out of scope

- Editing, reordering or moving items: later epics.
- Card styling to the phone-screen budget, paragraphs and bullets in descriptions,
  organisation names or filters, horizon definitions: later iterations.
- The roadmap's own vision, service description and product lead on its page: a later
  record (EPC-004 Out of scope).
