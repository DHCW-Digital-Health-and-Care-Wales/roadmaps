# STY-012: Roadmap cards show each roadmap's information, grouped by product family

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-002-roadmap-list-from-roadmaps-tab
- **Depends on**: STY-011 (hard)
- **Binding ADRs**: ADR-009 §"What a roadmap is", §"Which roadmaps, in what order";
  ADR-005; ADR-008
- **Suggested model**: Sonnet — presentation work on a settled model; screenshots needed
- **Delivered**: <PR URL>

## Summary

A Product Lead scanning the main page sees, on each roadmap's card, what the public site
knows about it: its title, category, status, product lead, a short summary, when it was
last updated, and a "Not published" badge for any roadmap the public can't see. Cards are
grouped under their product family, families in name order and roadmaps by title within
each; roadmaps with no family follow, by title. Nothing new is interactive: the card
still opens the detail page, which keeps its placeholder.

## Scope

`features/roadmaps` (card, grouping and sorting, list) and the catalogues only. Category names (with
the Welsh from the analysis), the badge, labels and the date format are catalogue copy
written with the `copywriter` skill.

## Acceptance criteria

### S1: Roadmaps are grouped by product family, then sorted by title (owner, round 2)

**Given** the example roadmaps: Product A in "Single Record", Product B in "Medicines &
Diagnostics", Product C in no family
**When** a connected user opens the main page
**Then** they see a "Medicines & Diagnostics" group with Product B, then a "Single Record"
group with Product A, then Product C under a heading for roadmaps with no family
**And** families are in name order and roadmaps within each group in title order, as
people read them in the current language (accents and numbers in natural order), never
in data-source order

### S2: A card shows the roadmap's information

**Given** Product A (family, category, status, product lead, summary, date)
**When** its card is shown
**Then** it shows a colour swatch, the title, the category name, the
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

### S8: Family names group and sort the way people read them (owner, round 2; D5)

**Given** roadmaps in families written "Single Record", " single record" and "Single
Récord", roadmaps titled "Zebra", "éclair" and "Product 10 roadmap" in one family, and a
family with a Welsh name
**When** the main page is shown, then switched to Cymraeg
**Then** the three spellings form one group, titles sort as "éclair", "Product 10
roadmap", "Zebra", and in Welsh the groups and titles re-sort by their Welsh names,
falling back to English ones
**And** when no roadmap has a family, the page shows one list by title with no group
heading

### S9: Unpublished roadmaps sort like any other (owner, round 3)

**Given** a family holding "Alpha" (not published) and "Beta" (published)
**When** the main page is shown
**Then** "Alpha" comes before "Beta", carrying its "Not published" badge
**And** publishing "Alpha" changes only its badge, not its place

### S10: The count says how many are not published (owner, round 3)

**Given** the example roadmaps (three, one not published), and a list where every roadmap
is published
**When** the main page is shown in English and in Welsh
**Then** the first says the equivalent of "3 roadmaps, 1 not published" and the second
only "3 roadmaps", with correct plurals in both languages

## Tests

Grouping and sorting (S1, S8, S9) are unit tests; S10's plurals are component tests in
both languages. S2–S5 are component tests. S1, S5 and S6 also run in Playwright
against the example data, since the language switch and axe need the real page.
Screenshots: main page at 1280px and 375px, light and dark, English and Welsh.

## Decisions

- **D1** (owner, 2026-11-10, grilling round 1 Q3): one list sorted by title, with the
  category as a label on each card, over the public site's category groups. Replaced by
  D4.
- **D2** (owner, 2026-11-10, grilling round 1 Q1): unpublished roadmaps are shown with a
  badge. Holds in S4.
- **D3** (owner, 2026-11-10, grilling round 1 Q5): the detail page is unchanged. Out of
  scope below.
- **D4** (owner, 2026-11-10, round 2, chat): group by product family (not category),
  families and roadmaps within them sorted, then roadmaps with no family sorted by title.
  Changes: S1, S2 (family moves from the card to its group heading), adds S8. The
  category stays a label on each card.
- **D5** (agent, 2026-11-10): roadmaps with no family get their own group heading
  (copywriter to name it) when other groups exist, so every card sits under a heading;
  families match ignoring case, accents, spaces and punctuation, like the public site's
  other values, so a typo in spacing doesn't split a family. Easily reversed.
- **D6** (owner, 2026-11-10, grilling round 3 Q1): unpublished roadmaps sort by title
  with the rest, badged, over published-first. Adds S9.
- **D7** (owner, 2026-11-10, grilling round 3 Q3): roadmaps with no family sit under a
  heading when family groups exist, none otherwise. Holds in S1, S8.
- **D8** (owner, 2026-11-10, grilling round 3 Q2): the count mentions unpublished
  roadmaps, and only when there are any. Adds S10.
- **D9** (owner, 2026-11-10, grilling round 3 Q4): each card shows its own roadmap's
  colour for now (S6); family-wide colours are in EPC-002 Out of scope.
- **D10** (owner, 2026-11-10, grilling round 3 Q5–Q6): the detail page keeps only the
  title (confirms D3), and no stale marker yet.
- **D11** (agent, 2026-11-10, Opus review): a merged family group is named by the family
  as written on its first roadmap in index order; its Welsh name is that roadmap's Welsh,
  else the first member's with Welsh. The group sorts by that name. Holds in S8.

- **D12** (agent, 2026-11-10, copywriter): category names are written as the public site
  writes them ("GP & Community Services"), not in sentence case, with its Welsh from the
  analysis: a Product Lead recognises the six fixed names from the public site, as they do
  a product name. Easily reversed in `roadmaps.categories`.

## Out of scope

As EPC-002 Out of scope, plus filtering or grouping by category (D4).

## Delivery

### Departures

- **S2, how the card is built** (agent): axe's `label-content-name-mismatch` (WCAG 2.5.3)
  rejects a link named by `aria-labelledby` while it holds more visible text than the
  name. So the link is the title alone, stretched over the whole card with `::after`, and
  the rest of the card is a sibling that is `aria-hidden` and referenced by the link's
  `aria-describedby`, one id per part present, so a screen reader pauses between them. A
  roadmap with only a title has no `aria-describedby`. Component tests therefore look at the
  card (the list item), not the link, for what the card shows.
- **S2, the date** (agent): the month names are catalogue copy (`common.months`) and
  `formatCalendarDate(date, t)` (`@/i18n`) writes "1 October 2026" / "1 Hydref 2026" from
  them, because Playwright's Chromium has no Welsh locale data (`Intl` falls back to
  English there), so a browser-supplied date could not be tested in Welsh.
- **S1, category casing** is D12. The group heading for roadmaps with no family is
  "No product family" / "Dim teulu cynnyrch" (D5, D7).
- **S10, one count key**: `roadmaps.countWithUnpublished` nests `roadmaps.count` and
  `roadmaps.unpublishedCount`, so each part keeps its own plural forms (Welsh has all six
  of both); `unpublishedCount_zero` exists only because the Welsh catalogue must spell all
  six forms and is never shown.
- **Loading** (agent): the skeleton's placeholder cards now have the new card's shape, so
  the page does not jump when roadmaps arrive.
- **Shared code** (agent): the parser's `fold` moved to `@/lib/text` (`foldText`), as
  grouping uses it for D5; the parser's header matching is unchanged.
- **E2E** (agent): groups are several lists, so `roadmapCards` still counts every card
  link but a card's content is asserted on its list item (`card(page, name)` in
  `roadmaps.spec.ts`), and order with `toContainText([...])`. `roadmapRow(cells)` in
  `fake-sheets.ts` builds an index row by header name. The existing test "an expired token
  keeps the roadmaps on screen until reconnected" asserted the reload's tokens straight
  after the cached cards, which were already visible; it now polls for the two reads
  (a race, failing intermittently once the cards were taller).
- **Test order**: the grouping tests were written before the module, but I did not observe
  them failing first; their discrimination was not shown by a red run. The component and
  E2E tests followed the code.

### Contract for dependents

- `groupRoadmaps(roadmaps, language): RoadmapGroup[]` (`features/roadmaps/group-roadmaps.ts`,
  `{ key, family: LocalisedText | null, roadmaps }`): families by `Intl.Collator(language,
{ numeric: true })` of their localised name, the no-family group last (`family: null`),
  titles by localised title, ties in data order; `<RoadmapGroups>` shows a heading per
  group (`h2`, naming its list), or no heading for the one no-family group.
- `<RoadmapCard>`: the link's name is the title; the colour is `<RoadmapSwatch>` (only a
  `#rrggbb` value reaches a style, else a theme colour). The detail page is unchanged.
- E2E hooks (en): `h2` headings "Medicines & Diagnostics", "Single Record", "No product
  family"; each group a `list` named by its heading; a card is the `listitem` holding the
  link; count "3 roadmaps, 1 not published".
- Welsh strings added or changed, for a fluent review (machine-assisted): `common.months`
  and `common.date`; `roadmaps.categories.*`, `roadmaps.card.*`, `roadmaps.noFamily`,
  `roadmaps.unpublishedCount_*`, `roadmaps.countWithUnpublished`. "Arweinydd cynnyrch",
  "teulu cynnyrch" and "Heb ei gyhoeddi" in particular.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `group-roadmaps.test.ts` (`groups by family…`, `never uses data-source order`); `roadmaps-page.test.tsx` (`shows families in name order…`); `roadmaps.spec.ts` (`connecting shows the roadmaps…grouped by family (S1)`, `cards sit under…`) |
| S2       | `roadmap-card.test.tsx` (`shows the title, category…`, `names the link by the title alone…`); `format-calendar-date.test.ts`; `roadmaps.spec.ts` (`cards sit under…`)                                                                       |
| S3       | `roadmap-card.test.tsx` (`shows only what exists…`); rows lining up is by the grid (`auto-rows-fr`, footer `mt-auto`), seen in the after screenshots                                                                                        |
| S4       | `roadmap-card.test.tsx` (`badges a roadmap the public can't see…`); `roadmaps.spec.ts`                                                                                                                                                      |
| S5       | `roadmap-card.test.tsx` (`is Welsh in Cymraeg…`); `roadmaps.spec.ts` (`the cards show Welsh content and copy in Cymraeg (S5)`)                                                                                                              |
| S6       | `roadmap-card.test.tsx` (`RoadmapCard colour (S6)`); `accessibility.spec.ts` (`roadmaps with very light, very dark and no colours (S6)`, both themes, WCAG 2.2 AA)                                                                          |
| S7       | the existing `roadmaps-page.test.tsx` state tests and `roadmap-errors.spec.ts`, unchanged and passing; screenshots of every state at 1280px and 375px                                                                                       |
| S8       | `group-roadmaps.test.ts` (`groups spellings that differ…`, `names a merged group…`, `re-sorts…`, `is one group…`); `roadmaps-page.test.tsx` (`grouping by product family`); `roadmaps.spec.ts` (`a language switch re-sorts… (S8)`)         |
| S9       | `group-roadmaps.test.ts` (`sorts an unpublished roadmap like any other (S9)`)                                                                                                                                                               |
| S10      | `roadmaps-page.test.tsx` (`the count of roadmaps not published`, English and Welsh plurals); `roadmaps.spec.ts`                                                                                                                             |
