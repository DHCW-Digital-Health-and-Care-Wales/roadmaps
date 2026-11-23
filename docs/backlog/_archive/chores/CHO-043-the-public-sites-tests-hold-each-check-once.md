# CHO-043: The public site's tests hold each check once, where it can fail alone

- **Status**: Done
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only, `apps/public-site/`)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-016
- **Suggested model**: Sonnet — each test needs reading against its Vitest neighbours
  to tell a behaviour from a repeat; no production code
- **Delivered**: _(add on delivery)_

## Summary

The public site's suite repeats itself as the editor's did before CHO-014: every
Playwright test runs in a `desktop` and a `mobile` (Pixel 7) project, most cannot fail
on one alone, some assert what Vitest already holds, and Vitest asserts several rules
at three or four seams. At `e13a21b9` the E2E job takes 93 s on CI (its test step 46 s,
build included); about 51 of its 101 runs go. Done looks like: each check held once,
at the lowest seam that holds it (root `AGENTS.md`, and `apps/public-site/AGENTS.md`,
_Tests_), in the project where it can fail, with nothing that guards a reader of the
site lost.

## Measurement

### At `e13a21b9` (2026-11-23)

2 specs (`site.spec.ts` 668 lines, `structure.spec.ts` 25), with a 416-line fixture and
16 ARIA snapshot files: 51 tests, 102 scheduled runs, 101 executed (the mobile menu
skips desktop). CI run 45147716349: E2E job 93 s (the test step 46 s, about 8 s of it
the build), verify 51 s (Vitest 10 s). Vitest: 17 files, 3,282 lines, about 216 tests
declared, about 290 expanded. The reporter logs no per-test times; the saving below
assumes about 0.45 s of wall time per run.

One read-only audit classified every test against its Vitest neighbours. Its
verdicts are estimates (D3).

| Area                    | Measurement                                                                                                                                                                                                                                                                                                                                                                | Verdict                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Both projects           | 14 hand-written tests run on mobile with nothing a phone changes: the JavaScript-off pages (`:60`, `:97`, `:121`, `:133`), navigation and history (`:145`, `:222`, `:262`, `:408`), the focus ring (`:301`), the skip link (`:338`), place-keeping (`:460`, `:492`), and the 320 px and 400% zoom checks (`:558`, `:618`), which set their own viewport                    | One project each: 14 runs                               |
| ARIA snapshots          | 6 of 8 pages have byte-identical desktop and mobile snapshots (accessibility, landing and landing-cy, not-found, privacy and privacy-cy). Only `product` and `product-cy` differ (the mobile menu, no section nav)                                                                                                                                                         | One project for the 6: 6 runs and 6 files               |
| Axe                     | 14 scans (7 pages × en, cy) per project, 28 runs. Contrast needs a browser (`App.test.tsx:528` runs axe in jsdom without it). The header differs on mobile only for product (a menu button) and the filtered landing and product pages (a filter strip)                                                                                                                    | Desktop all 14; mobile those 3 in English (D4): 11 runs |
| Repeats of Vitest tests | `:109`, `:166`, `:171`, `:214`, `:251` are held by `entry-server.test.tsx` or `App.test.tsx`, and `:351` by `:145` and `:301` together                                                                                                                                                                                                                                     | Cut: 12 runs                                            |
| Partly held below       | `:66`, `:76`, `:187`, `:282` each assert one thing (a link's `href`, `og:title`, focus after a layout switch, Back after a language switch) no Vitest test makes yet                                                                                                                                                                                                       | Move it down, then cut: 8 runs                          |
| Geometry                | `:301` pins outline width, colour, box shadow and `z-index`, where the rule is a ring that is not clipped; `:618` asserts Back to top is at most 40 px wide                                                                                                                                                                                                                | Keep the rule, drop the pins                            |
| Vitest, several seams   | The filter status and count strings (`roadmap-helpers.test.ts`, then `App.test.tsx` and `LandingPage.test.tsx`), search matching and category grouping (helpers, then `LandingPage.test.tsx`), the title with its family (helpers, `RoadmapIntro`, `LandingPage`, `App`), bullet lists (`text.test.ts`, `RoadmapCard`, `RoadmapListItem`), the Welsh fallback (five files) | The helper keeps the cases; one wiring test above       |
| Vitest, data only       | About 10 groups that differ only in data, among them the 11 "rejects" tests of `roadmap-schema.test.ts:19-86`, `csv.test.ts:5-36` and `text.test.ts:23-50`                                                                                                                                                                                                                 | One `it.each` each                                      |

Saving: about 51 of 101 runs, about 23 s of the job's 93 s.
The Vitest work saves little time; its value is one place to change each rule.

## Acceptance criteria

### S1: A spec runs in the project where it can fail alone

**Given** a Playwright test of the public site
**When** the suite is slimmed
**Then** it runs on mobile only where the phone offers different controls (the mobile
menu, the header's filter), the header differs, or it holds a reflow rule better held
on a phone, and on desktop otherwise
**And** an ARIA snapshot identical in both projects is kept once

### S2: An E2E test holds something its Vitest tests cannot

**Given** a Playwright test whose assertions a Vitest test already makes
**When** the suite is slimmed
**Then** it has gone, or keeps only what `apps/public-site/AGENTS.md` (_Tests_) lists
**And** an assertion no other test makes moves into a Vitest test before it goes

### S3: Geometry is held only where it is a rule

**Given** an assertion on a position, a size or a computed style
**When** it holds neither an accessibility rule nor what a reader can see or reach
**Then** it has gone, and the test keeps its other assertions

### S4: A rule is asserted at the lowest seam that holds it, and wired once above

**Given** a rule asserted alike in a helper's test and a component, page or `App` test
**When** the suite is slimmed
**Then** the lowest seam that holds every case keeps them, and each seam above keeps one
test of the wiring
**And** tests that differ only in data that takes no new branch are one `it.each`

### S5: Nothing that guards a reader is lost

**Given** the suite at `e13a21b9`
**When** the chore is delivered
**Then** every assertion of behaviour still runs at least once
**And** every page is still scanned by axe on desktop in both languages, and on mobile
each page whose header differs there (product, filtered landing, filtered product), in
English (D4)

### S6: Each cut is the owner's to see

**Given** a run or an assertion the chore removes
**When** its PR is raised
**Then** the PR lists it with what it was evidence for and where that is still held

### S7: The site's guide says how a spec chooses its project

**Given** an agent writing a new public-site spec
**When** it reads `apps/public-site/AGENTS.md`
**Then** it learns how a test runs on one project, by the mechanism S1 put in place

## Decisions

- **D1** (owner, 2026-11-23, after #264 put the test rule in the root guide): "we want
  to clean up the public-site test suite in a similar way to ensure it is optimised and
  adding value" → this chore, which follows CHO-014.
- **D2** (agent, 2026-11-23): one chore rather than an umbrella like CHO-014. The suite
  is 693 lines against the editor's 19,077, so one delivery can re-read every test.
- **D3** (agent, 2026-11-23): the Measurement comes from one read-only audit, and its
  claims that six snapshot pairs are identical and that the job takes 93 s were checked
  by hand. The rest are estimates, so the delivery re-reads every test it cuts (S6)
  rather than trusting the line numbers.
- **D4** (owner, 2026-11-23, asked while recording this chore, then asked again once
  review found the unfiltered landing page's header the same on a phone): "Product +
  both filtered, EN" → desktop scans every page in both languages; mobile scans only
  the pages whose header differs there (product, filtered landing, filtered product),
  in English. Removes 11 of 28 runs, over scanning them in Welsh too (8). The Welsh copy
  of the phone's filter strip and menu button goes unscanned for contrast.

## Out of scope

- Any change to the site's code, or to which behaviours the suite holds (S5).
- Lighthouse, which holds performance on its own job.
- Adopting the editor's test fixtures or conventions (ADR-016 keeps the site's own).

## Delivery

### Departures

- **The mechanism (S1, S7).** `apps/public-site/playwright.config.ts` filters by tag: the
  `desktop` project has `grepInvert: /@mobile-only/`, the `mobile` project
  `grep: /@mobile-only|@both/`, so an untagged test runs on desktop alone and nothing
  is scheduled and skipped. `apps/public-site/e2e/tags.ts` names the two tags once (`BOTH`,
  `MOBILE_ONLY`), for both specs; the guide's _Tests_ section says how to pick one.
- **Runs.** 101 executed (102 scheduled) become 48, none skipped (10 whole tests, 20 runs; 15 mobile runs; the 320 px check's desktop run; 11 axe scans; 6 snapshots): 39 on desktop, 9 on
  mobile (the menu, the 320 px reflow, the header's two filter tests, three axe scans,
  the two product snapshots). Locally the suite takes 28.5 s before and 20.1 s after
  (`pnpm site:test:e2e`, build excluded, host not idle). CI's job time is not
  measured here; the PR's CI run gives it.
- **Beyond the Measurement.** `:207` (scroll to a linked heading) was not in the audit's
  fourteen and runs once, on desktop. The 320 px check (`:558`) moved to mobile, as a
  reflow rule better held on a phone, and the 400% zoom check (`:618`) stayed on
  desktop, since zoom is a desktop browser's feature. `:362` keeps its category jump
  and loses its search half; `:408` keeps the URLs, focus and history and loses the
  status and count strings.
- **Geometry (S3).** `:301` keeps `overflow: visible` on the language group, `outline-style: solid` and
  the focused link stacking over its sibling, the three things that decide whether a
  ring is cut off or covered, and drops the width, colour and box-shadow pins. `:618`
  drops the 40 px width of Back to top and keeps it visible.
- **Vitest counts.** 445 expanded tests become 455: the tables expand to one test per
  case (itemsStatus, countItems, formatDate, showHiddenItems), so the count rises
  while the places that state a rule fall. The audit's "about 10 groups that differ
  only in data" are `roadmap-schema.test.ts` (11 rejections), `csv.test.ts` (6),
  `text.test.ts` (`parseTextBlocks`, 7) and, in `roadmap-helpers.test.ts`,
  `titleWithFamily`, `countItems`, `countText` with `countInParentheses`,
  `showHiddenItems`, `itemsStatus` and `formatDate`. `roadmapsStatus`'s table now holds
  the Welsh text too, so `LandingPage.test.tsx` no longer does.
- **Bullet lists.** `RoadmapCard` and `RoadmapListItem` each call `RichText` themselves, so each keeps one test
  that bullet lines render as lists; `text.test.ts` holds the cases. Only the card's
  line-break test went. The card with no description still shows the generic intro
  (`LandingPage.test.tsx`); only the search half of its old test went, to `matchesSearch`.
- Six identical mobile snapshot files were checked byte for byte against their desktop
  files with `cmp` before they went.

### Cuts and the test that holds each (S2, S5, S6)

Each Playwright test below ran on both projects (2 runs).

| Cut                                                                                           | Evidence for                                              | Still held by                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site.spec.ts:66` the landing page lists every roadmap (JS off)                               | each roadmap's title and link                             | `entry-server.test.tsx` "lists every roadmap…", which now asserts each `href` (moved down); `:60` loads the page with JavaScript off                                                                       |
| `:76` a product page has its content and meta tags (JS off)                                   | heading, title, `og:title`, canonical                     | `entry-server.test.tsx` "gives each product its own title…", which now asserts `og:title` (moved down); `App.test.tsx` "shows cards unless the URL asks for the list"; `:97` opens a JS-off product page   |
| `:109` a filtered link shows every item, without the filter (JS off)                          | no filter control or pressed state without JavaScript     | `entry-server.test.tsx` "leaves the organisation filter out without JavaScript"                                                                                                                            |
| `:166` opens a deep link                                                                      | a product page's heading at `#roadmap`                    | `App.test.tsx` "the %s heading in %s matches the page title" (both roadmaps, both languages); `entry-server.test.tsx` "prerenders each language"                                                           |
| `:171` shows the list view with `?view=list`                                                  | the list, and the list kept across a language switch      | `App.test.tsx` "shows the list with ?view=list" and "keeps the list when switching language"                                                                                                               |
| `:187` switches layout from the footer, keeping focus, and back                               | the URL, the list, focus on the footer link, Back         | `App.test.tsx` "switches layout from the footer link, keeping focus on it, and back" (focus and Back moved down)                                                                                           |
| `:214` shows not found for an unknown product                                                 | the heading and the slug                                  | `App.test.tsx` "shows not found for an unknown product"; `:133` loads a served 404 with JavaScript off                                                                                                     |
| `:251` the landing page has a section about the roadmaps                                      | the heading                                               | `App.test.tsx` "shows the about section on the landing page only"                                                                                                                                          |
| `:282` switches in place, and back                                                            | the hash kept, `lang`, Welsh heading, Back to English     | `LanguageProvider.test.tsx` "switches without a reload, keeping the place" and "goes back to the other language with the browser's Back" (Back moved down)                                                 |
| `:351` a keyboard user can open a roadmap                                                     | Tab to a link, Enter, focus on the heading                | `:145` (the click and the focus on the heading) and `:301` (`tabTo`)                                                                                                                                       |
| `:362` the search half (status, hidden link, no match, cleared)                               | the landing page's search                                 | `LandingPage.test.tsx` "filters cards and sections, announcing the count" and "says when nothing matches"; `roadmap-helpers.test.ts` `matchesSearch`                                                       |
| `:408` the status and count strings, the second roadmap's absence and the "All roadmaps" link | the filter's counts and links                             | `App.test.tsx` "filters the landing page from the dropdown and tick box", "opens the filter and keeps it in links…", "shows how many items match on a roadmap…"; `itemsStatus` and `roadmapsStatus` tables |
| `:301` outline width, colour, box shadow                                                      | the look of the focus ring                                | the outline's presence (`outline-style`), `overflow: visible` and the stacking over the sibling stay                                                                                                       |
| `:618` Back to top at most 40 px wide                                                         | the button shrinking at short screens                     | it stays visible at 320 × 256 and the header scrolls away, as the test asserts                                                                                                                             |
| 15 mobile runs of tests with nothing a phone changes, and the desktop run of the 320 px check | the same journeys on a Pixel 7                            | the desktop run of each; the phone's run of the 320 px check                                                                                                                                               |
| 6 mobile ARIA snapshots (accessibility, landing, landing-cy, not-found, privacy, privacy-cy)  | the same tree as desktop                                  | the desktop snapshots; the product pages keep both                                                                                                                                                         |
| 11 mobile axe scans (every page but three, and the Welsh three)                               | contrast and rules on pages whose header is the desktop's | the desktop scans of all 14; mobile scans product, filtered landing and filtered product in English (D4)                                                                                                   |

Vitest, in the same tables:

| Cut                                                                                                                                                         | Held by                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `LandingPage.test.tsx` "has no Other section when every roadmap has a category"                                                                             | `roadmap-helpers.test.ts` `groupByCategory`; "shows one section per non-empty category…" lists exactly the sections                           |
| `LandingPage.test.tsx` "searches and sorts by the Welsh text": the English-title search, the no-match search and the Welsh status                           | `matchesSearch` and `groupByCategory` (Welsh cases); `roadmapsStatus`, whose table now has the Welsh strings; the sort and one search stay    |
| `LandingPage.test.tsx` "says when nothing matches": the status                                                                                              | `roadmapsStatus`                                                                                                                              |
| `RoadmapCard.test.tsx` "keeps line breaks from the sheet as separate paragraphs"                                                                            | `text.test.ts` `parseTextBlocks`; the card's bullet test shows the paragraph                                                                  |
| `App.test.tsx` "shows a product roadmap, titled with its family"                                                                                            | `titleWithFamily`; `RoadmapIntro.test.tsx` "keeps the family inside the h1"; `entry-server.test.tsx` (the head's title); the page-title table |
| `App.test.tsx` "shows Welsh sheet content where there is some": the product-page half                                                                       | `RoadmapCard.test.tsx` "shows Welsh text, marking English fallbacks"; the landing half stays                                                  |
| `App.test.tsx` the second landing status, `5 of 9`, the "Showing all 9 items" announcement (now `all 9 items`) and the Betsi banner string (now a fragment) | `itemsStatus` and `roadmapsStatus` tables; one full string of each stays                                                                      |

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `playwright test --list` shows 48 runs, 39 desktop and 9 mobile; `pnpm site:test:e2e` passes 48 with none skipped                                                                                                                                                                                                                               |
| S2       | the cuts table; the four assertions moved down (`og:title`, each landing `href`, Back after a language switch, focus and Back after the layout switch) were each shown red by breaking the code they check: `entry-server.tsx`'s `og:title`, `ProductCard.tsx`'s `href`, `router.ts`'s `pushState` (two tests), `SiteFooter.tsx`'s layout `key` |
| S3       | the departures above                                                                                                                                                                                                                                                                                                                            |
| S4       | the Vitest table; `pnpm site:test` passes 455 tests; the status and count strings, the title with its family, the bullet lists, the search matching and the grouping each have their cases in the helper and one wiring test above                                                                                                              |
| S5       | the cuts tables name where each assertion is still held; the axe scans are 14 on desktop and 3 on mobile (`--list`)                                                                                                                                                                                                                             |
| S6       | the PR lists the cuts tables                                                                                                                                                                                                                                                                                                                    |
| S7       | `apps/public-site/AGENTS.md`, _Tests_                                                                                                                                                                                                                                                                                                           |
