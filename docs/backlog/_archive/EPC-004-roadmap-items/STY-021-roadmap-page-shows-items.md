# STY-021: A roadmap's page shows its items under Now, Next, Later and the other sections

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-004-roadmap-items
- **Depends on**: STY-020 (hard)
- **Binding ADRs**: ADR-011, ADR-008, ADR-010, ADR-002
- **Suggested model**: Opus — many page states, new copy in two languages, E2E specs and
  screenshots in one context (Sonnet review)
- **Delivered**: _(PR link added once raised)_

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
University Health Board", "Swansea Bay University Health Board"; changed by D6) and its four details
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
**Then** headings, labels and organisation names (changed by D6) are in Welsh; an item's title, phase,
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

### S16: A roadmap removed since the list loaded is not found (Opus review)

**Given** the cached roadmap list still shows Product A, and its row has since left the
roadmap index
**When** the Product Lead opens Product A and its items read fails as not found
**Then** the page reads the roadmap list again and shows "Roadmap not found", not a
message about the spreadsheet

## Tests

S1–S9 and S12–S16 are component tests with the providers' test utility and the in-memory
repository; the page has many states and the in-memory double reaches each one. S1, S4,
S8 (one retryable and `invalid-data`), S10, S11 and S14 are also Playwright specs against the
fake Sheets: S10 because column order is a data-source property, S11 because layout and
axe need a real browser. The existing accessibility spec covers the page in both themes, but waits only for the
h1, which comes from the list before the items arrive: it must wait for an item heading
(e.g. "Example card with every column") before axe runs, as S11's heading check must.

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
- **D11** (agent, 2026-11-10, Opus review): a `not-found` items read refetches the
  roadmap list, so the page falls through to the existing "Roadmap not found" state, over
  item-specific copy, because the roadmap really is gone and the shared `errors.not-found`
  text names the spreadsheet. Adds S16. If the list re-read fails too (the spreadsheet
  itself is gone), the list's own error shows under the title and the items area adds
  nothing.
- **D12** (agent, 2026-11-10, Sonnet review): S14 and S15 stay in this story, over a
  fourth story, since both reuse home-page pieces on the page this story builds; the
  Suggested model moves to Opus for the size.

## Starting point

Audited at `0f9f09e`; re-checked at `215c0c1` (STY-017 left the page alone). `RoadmapDetailPage` already handles the list's states (title from
the list via `useRoadmap`, not found, connect prompt, list errors, expired alert); the
items section sits under the title inside its `roadmap` branch. `RoadmapsErrorState`
takes an `AppError` and copies `errors.<kind>`, whose `invalid-data` text names the
roadmap list. `RoadmapsPage` has the Refresh button and `RoadmapCard` the "Not
published" badge to reuse. STY-018 (merged after this record was written) snapshots the page's accessibility tree
in `tests/e2e/structure.spec.ts-snapshots/detail.aria.yml`: regenerate it on purpose as
`tests/e2e/AGENTS.md` says, and review the new tree. Visible UI changes
need before/after screenshots (`implement-story` `references/screenshots.md`).

## Out of scope

- Editing, reordering or moving items: later epics.
- Card styling to the phone-screen budget, paragraphs and bullets in descriptions,
  organisation names or filters, horizon definitions: later iterations.
- The roadmap's own vision, service description and product lead on its page: a later
  record (EPC-004 Out of scope).

## Delivery

### Departures

- **S11's phone axe run covers `main` only** (agent): at 375px in English the header's
  home link fails WCAG 2.5.3 on every page, which predates this story and is recorded as
  [DEF-002](../../defects/DEF-002-header-home-link-name-on-phones.md). The roadmap page's
  whole-page axe runs stay at desktop width in both themes; S11's overflow, heading and
  `main` axe checks run at 375px in both themes and languages, in
  `accessibility.spec.ts` beside them rather than in the new spec.
- **Shared pieces** (agent): the "Not published" badge is `NotPublishedBadge`, its key
  moved from `roadmaps.card.notPublished` to `roadmaps.notPublished`, and the home page's
  Refresh is `RefreshButton`; both pages use them. `RoadmapsErrorState` takes
  `subject: "roadmaps" | "items"`, which picks the titles and, for `invalid-data`, the
  items' own description.
- **D11 lives in `useRoadmapItems`** (agent): a `not-found` items read invalidates the
  roadmap list. While that re-read runs the items area shows its loading placeholder; if
  the list still lists the roadmap afterwards (a race the adapter cannot produce, as it
  reads the same index), the area shows nothing rather than the spreadsheet-not-found copy.
- **States the criteria leave open** (agent): with items shown, a failed Refresh of the
  items is a warning alert, "Couldn't refresh this roadmap's items", above them, as the
  home page does for the list; with no items read and no session, the items area is empty
  under the list's expired-session alert, which already offers Reconnect.
- **Test order**: the grouping and detail-nesting suites and the page's 21 item tests were
  written first and seen failing (missing modules, then 21 red); the D11 hook test was
  written after its code and shown to discriminate by disabling the invalidation (it and
  S16 fail). The Playwright specs followed the working page.

### Contract for dependents

- `features/roadmaps`: `groupRoadmapItems(items)` (`group-roadmap-items.ts`;
  `{ unplaced, placements }`, each entry `{ item, position }`, position being the key
  while items have no identity), `nestItemDetails(details)` (`nest-item-details.ts`),
  `organisationCodes` (`organisation-codes.ts`), `RoadmapItems`/`RoadmapItemsSkeleton`
  (`components/roadmap-items.tsx`), `RoadmapItemCard` (an `li`), `NotPublishedBadge`,
  `RefreshButton`.
- Copy: `roadmaps.items.*` (placements, fields, unplaced group, empty, loading, failures,
  `invalidData`) and `roadmaps.notPublished`; `roadmaps.detail.comingSoon` is gone. The
  Welsh is machine-assisted; "Nawr", "Nesaf" and "Hwyrach" are the public site's.
- E2E: `tests/e2e/roadmap-page.spec.ts`; `detail.aria.yml` now holds Product A's items.

### Scenario evidence

- **S1**: `roadmap-detail-page-items.test.tsx` "shows the items under the six
  placements, in order"; `roadmap-page.spec.ts` "a roadmap's items appear under its six
  placements" (also its five reads: the list's two, then the items' three).
- **S2, S12**: "shows every field as plain text…" (labels, `whitespace-pre-line` with the
  `\n` kept, "Service X, Service Y", "CAVUHB, SBUHB", "National", the nested details
  outline, the minimal card's only label); the E2E S1 test checks the same terms and
  definitions. `organisationCodes` follows `ORGANISATIONS` order from the model.
- **S3**: "says so under a placement with no items" (Product B's shape).
- **S4, S13**: "shows unplaced items first, flagged…", "has no unplaced group…"; E2E
  "items with no recognised horizon are shown first, flagged".
- **S5**: "shows Welsh where an item has it…" (Welsh headings and labels, Welsh tags and
  details, "Cerdyn darganfod", "Darganfod", "Minimal card" in English, codes unchanged).
- **S6**: "says a roadmap with no items has none…".
- **S7**: "keeps the title while the items load" (`role=status` "Loading roadmap items…").
- **S8**: the "when the items can't be read" block: network with Retry, `forbidden`
  without, `invalid-data` with the items' own copy, the home list unaffected; E2E
  "a retryable failure stays on this roadmap, with Retry" (500 ×3 on fake time) and
  "a tab with no title column…".
- **S9**: "keeps the items, with Reconnect, once the session expires" (one alert), "shows
  the items after connecting from a deep link", "still says an unknown roadmap is not
  found, reading no items"; the existing deep-link and not-found E2E tests pass.
- **S10**: E2E "columns in a different order read the same" (`Horizon` first, the
  middle reversed, `Title` last) runs S1 and S2's checks.
- **S11**: `accessibility.spec.ts` "a roadmap's page on a phone in en/cy" in both themes
  (no horizontal overflow, headings 1→2→3 with none skipped, axe on `main`), and
  "roadmap detail" now waits for an item before the whole-page axe run.
- **S14**: "Refresh (S14)" block: both reads again and the item moves, busy while
  reading, `aria-disabled` but focusable when expired, the home Refresh reads no items;
  E2E "Refresh reads the roadmap and its items again".
- **S15**: "the Not published badge (S15)" block, in English and Welsh.
- **S16**: "says a roadmap removed since the list loaded is not found" (list read twice,
  no spreadsheet copy); `use-roadmap-items.test.tsx` D11 pair.
- Runs at the head before review: typecheck, lint and format clean; 829 unit tests;
  118 E2E tests, and the structure, roadmap page and roadmaps specs under
  `GITHUB_REPOSITORY=collisdigital/roadmaps-editor` (33).
