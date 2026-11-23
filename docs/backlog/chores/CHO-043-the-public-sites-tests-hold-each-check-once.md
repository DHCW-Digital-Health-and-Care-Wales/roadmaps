# CHO-043: The public site's tests hold each check once, where it can fail alone

- **Status**: Proposed — the public site's counterpart of CHO-014, measured at `e13a21b9`
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only, `apps/public-site/`)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-016
- **Suggested model**: Sonnet — each test needs reading against its Vitest neighbours
  to tell a behaviour from a repeat; no production code
- **Delivered**: _(add on delivery)_

## Summary

The public site's suite repeats itself as the editor's did before CHO-014. Every
Playwright test runs in both a `desktop` and a `mobile` (Pixel 7) project, though
most cannot fail on one alone. Some specs assert what `App.test.tsx` and
`entry-server.test.tsx` already hold, and Vitest asserts several string, search and
grouping rules at three or four seams. At `e13a21b9` the E2E job takes 93 s on CI,
46 s of it the tests. About 45 of its 101 runs repeat a run that cannot fail alone
or another test. Done looks like: each check held once, at the lowest seam that holds it
(root `AGENTS.md` and `apps/public-site/AGENTS.md`, _Tests_), in the project where it
can fail, with nothing that guards a reader of the site lost.

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

| Area                    | Measurement                                                                                                                                                                                                                                                                                                                                                                | Verdict                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Both projects           | 14 hand-written tests run on mobile with nothing a phone changes: the JavaScript-off pages (`:60`, `:97`, `:121`, `:133`), navigation and history (`:145`, `:222`, `:262`, `:408`), the focus ring (`:301`), the skip link (`:338`), place-keeping (`:460`, `:492`), and the 320 px and 400% zoom checks (`:558`, `:618`), which set their own viewport                    | One project each: 14 runs                                                               |
| ARIA snapshots          | 6 of 8 pages have byte-identical desktop and mobile snapshots (accessibility, landing and landing-cy, not-found, privacy and privacy-cy). Only `product` and `product-cy` differ (the mobile menu, no section nav)                                                                                                                                                         | One project for the 6: 6 runs and 6 files                                               |
| Axe                     | 14 scans (7 pages × en, cy) per project, 28 runs. Contrast needs a browser (`App.test.tsx:528` runs axe in jsdom without it). The header differs on mobile for landing, product and a filtered product                                                                                                                                                                     | Desktop all 14; mobile landing, product and a filtered product in English (D4): 11 runs |
| Repeats of Vitest tests | `:76`, `:109`, `:166`, `:171`, `:214`, `:251` are held by `entry-server.test.tsx` or `App.test.tsx`, and `:351` by `:145` and `:301` together                                                                                                                                                                                                                              | Cut: 14 runs                                                                            |
| Partly held below       | `:66`, `:187`, `:282` each assert one thing (a link's `href`, focus after a layout switch, Back after a language switch) no Vitest test makes yet                                                                                                                                                                                                                          | Move it down, then cut: 6 runs                                                          |
| Geometry                | `:301` pins outline width, colour, box shadow and `z-index`, where the rule is a ring that is not clipped; `:618` asserts Back to top is at most 40 px wide                                                                                                                                                                                                                | Keep the rule, drop the pins                                                            |
| Vitest, several seams   | The filter status and count strings (`roadmap-helpers.test.ts`, then `App.test.tsx` and `LandingPage.test.tsx`), search matching and category grouping (helpers, then `LandingPage.test.tsx`), the title with its family (helpers, `RoadmapIntro`, `LandingPage`, `App`), bullet lists (`text.test.ts`, `RoadmapCard`, `RoadmapListItem`), the Welsh fallback (five files) | The helper keeps the cases; one wiring test above                                       |
| Vitest, data only       | About 10 groups that differ only in data, among them the 11 "rejects" tests of `roadmap-schema.test.ts:19-86`, `csv.test.ts:5-36` and `text.test.ts:23-50`                                                                                                                                                                                                                 | One `it.each` each                                                                      |

Saving: about 45 of 101 runs, about 20 s of the job's 93 s.
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
each page whose header differs there (landing, product, a filtered product), in
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
- **D4** (owner, 2026-11-23, asked while recording this chore): of the axe scans,
  "Header-differing, EN" → desktop scans every page in both languages; mobile scans
  only the pages whose header differs there (landing, product, a filtered product), in
  English. Removes 11 of 28 runs, over keeping Welsh on mobile (8) or trimming Welsh on
  desktop too (16). A contrast fault in the phone menu's Welsh copy goes unscanned.

## Out of scope

- Any change to the site's code, or to which behaviours the suite holds (S5).
- Lighthouse, which holds performance on its own job.
- Adopting the editor's test fixtures or conventions (ADR-016 keeps the site's own).
