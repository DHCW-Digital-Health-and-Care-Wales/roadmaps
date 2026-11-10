# STY-012: Roadmap cards show each roadmap's information, sorted by title

- **Status**: Proposed — waits for STY-011 on the default branch
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-002-roadmap-list-from-roadmaps-tab
- **Depends on**: STY-011 (hard)
- **Binding ADRs**: ADR-009 §"What a roadmap is", §"Which roadmaps, in what order";
  ADR-005; ADR-008
- **Suggested model**: Sonnet — presentation work on a settled model; screenshots needed

## Summary

A Product Lead scanning the main page sees, on each roadmap's card, what the public site
knows about it: its title, family, category, status, product lead, a short summary, when
it was last updated, and a "Not published" badge for any roadmap the public can't see.
The cards form one list sorted by title in the user's language. Nothing new is
interactive: the card still opens the detail page, which keeps its placeholder.

## Scope

`features/roadmaps` (card, sorting, list) and the catalogues only. Category names (with
the Welsh from the analysis), the badge, labels and the date format are catalogue copy
written with the `copywriter` skill.

## Acceptance criteria

### S1: One list, sorted by title

**Given** the example roadmaps, plus roadmaps titled "Zebra", "éclair" and "Product 10
roadmap"
**When** a connected user opens the main page
**Then** the cards are in one list sorted by title as people read it in the current
language (accents and numbers in natural order), not by data-source order
**And** switching to Cymraeg re-sorts by the Welsh titles, falling back to English ones

### S2: A card shows the roadmap's information

**Given** Product A (family, category, status, product lead, summary, date)
**When** its card is shown
**Then** it shows the family with a colour swatch, the title, the category name, the
status, "Product lead" with "Alex Jones", the service description as a summary of at
most three lines, and the last-updated date written out in the current language
**And** the card's link is named by the title alone, with the rest available to screen
readers as its description

### S3: Missing information leaves no gaps

**Given** Product B (no category, no product lead) and a roadmap with only a title
**When** their cards are shown
**Then** they show only what exists: no empty labels, no "Other", no blank lines
**And** cards in the same row line up, whatever they hold

### S4: Unpublished roadmaps are marked

**Given** Product C, which is not published
**When** its card is shown
**Then** it carries a "Not published" badge, distinct from the status
**And** published cards carry no publication badge

### S5: Welsh content and copy

**Given** the user has chosen Cymraeg
**When** the main page shows the example roadmaps
**Then** Product B shows its Welsh title, family, status and summary, the others fall
back to English, and every label, category name, badge and date is Welsh
**And** the product lead's name is shown as written

### S6: Sheet colours never carry meaning or text

**Given** roadmaps with a colour, without one, and with a very light or very dark colour
**When** the main page is shown in the light and the dark theme
**Then** the colour appears only as a decorative swatch (a theme colour when there is
none), and an automated accessibility check (WCAG 2.2 AA) passes in both themes

### S7: Every list state still works

**Given** loading, empty, a failed load, a failed refresh with cards shown, and an expired
session
**When** the main page is shown
**Then** each state behaves as before, at desktop and phone widths, with no horizontal
scroll at 375px

## Tests

Sorting is a unit test. S2–S5 are component tests. S1, S5 and S6 also run in Playwright
against the example data, since the language switch and axe need the real page.
Screenshots: main page at 1280px and 375px, light and dark, English and Welsh.

## Decisions

- **D1** (owner, 2026-11-10, grilling round 1 Q3): one list sorted by title, with the
  category as a label on each card, over the public site's category groups. Changes: S1,
  S2.
- **D2** (owner, 2026-11-10, grilling round 1 Q1): unpublished roadmaps are shown with a
  badge. Holds in S4.
- **D3** (owner, 2026-11-10, grilling round 1 Q5): the detail page is unchanged. Out of
  scope below.

## Out of scope

- The detail page showing vision and the full service description: the roadmap detail
  epic (EPC-002 Out of scope).
- Filtering or grouping by category: not asked for; would follow the owner's call.
