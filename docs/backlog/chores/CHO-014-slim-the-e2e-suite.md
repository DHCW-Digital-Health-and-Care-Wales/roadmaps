# CHO-014: Each check in the test suite is held once, at the lowest layer that can see it

- **Status**: Proposed — an umbrella: its work is CHO-036 to CHO-042, each selected alone (D9); S6 is delivered (D11)
- **Type**: Refactor
- **Area**: E2E + Features/UI + Domain (tests only)
- **Epic**: standalone
- **Depends on**: none (STY-044, which re-pointed the item-form tests at a dialog as
  STY-043 did the About tests, is delivered)
- **Binding ADRs**: ADR-002, ADR-006, ADR-008, ADR-010, ADR-015
- **Suggested model**: Sonnet — each test needs reading to tell a behaviour from a
  repeat; no production code
- **Delivered**: _(add on delivery)_

## Summary

The test suite repeats itself. Re-measured at `9ee767b`, the Playwright suite takes
10 min 20 s on CI, four times its first measurement, when the chore was parked (D4).
About 35% of that time, and about 5,300 of its 19,077 lines, hold nothing a Vitest page
test does not, or repeat a run that cannot fail alone; Vitest asserts some rules at
several seams.
The owner widened the chore to the whole suite (D8) and split it into sub-chores (D9),
and a cut must leave its scenario held after the switch from Google Sheets to the API
(D10). Done looks like: CHO-036 to CHO-042 are Done.

## Measurement

### At `9ee767b` (2026-11-22)

44 specs, 19,077 lines with their fixtures, 673 runs: 10 min 20 s on CI with two
workers (the `main` run at `9ee767b`), 1,215 s summed from the list reporter's
per-test times. Vitest: 133 files, 44,654 lines, 1,777 tests, 2 to 3 minutes on CI.
One read-only audit per slice classified every E2E test against the Vitest tests of the
same screens (D12); each sub-chore's Measurement names its candidates.

| Slice                     | Specs (summed CI s)                                                                                                                                                                                                             | Removable, estimated | What repeats                                                                                                               | Sub-chore |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------- |
| The look checks           | `focus-indicator`, `accessibility`, `structure`, `styles`, `typography` (497 s)                                                                                                                                                 | ~65 s, ~180 lines    | Two page tours walk a page another tour walks; a few scans scan a state another scan holds                                 | CHO-036   |
| Editing items             | `editing`, `adding-an-item`, `quick-add`, `editing-an-item`, `removing-an-item`, `item-tags`, `field-icons`, `closing-a-dialog`, `pinned-dialog` (221 s)                                                                        | ~140 s, ~1,900 lines | 52 tests whose every assertion a page test makes: a co-lead's change per field, a cell written per field, Welsh copy alone | CHO-037   |
| The roadmap page          | `moved-travel`, `roadmap-items-compact`, `control-row`, `roadmap-header`, `roadmap-controls`, `roadmap-items-cut`, `placement-navigation`, `side-panel`, `roadmap-page`, `moved-mark`, `last-updated`, `roadmap-errors` (341 s) | ~120 s, ~900 lines   | Runs per width, language or choice that cross no breakpoint and take no other branch                                       | CHO-038   |
| Shell, list, navigation   | `shell`, `shell-navigation`, `navigation-*`, `unpublished-changes`, `roadmaps`, `families`, `adding-a-roadmap`, `editing-a-roadmap`, `landing`, `preferences` (123 s)                                                           | ~80 s, ~1,900 lines  | Navigation, list and roadmap-dialog behaviour that page tests and the repository contract hold                             | CHO-039   |
| Connecting and publishing | `auth`, `reconnect`, `session-warning`, `publishing-roadmap`, `sheets-writes` (33 s)                                                                                                                                            | ~26 s, ~430 lines    | Connect failures, session states and publish outcomes that component and page tests hold                                   | CHO-040   |
| Vitest                    | Page, component, domain and editing-state tests                                                                                                                                                                                 | a few hundred lines  | One rule asserted through the page and in its unit test; page tests repeating each other                                   | CHO-041   |
| Reflow                    | The sideways-scroll checks across the specs (S3)                                                                                                                                                                                | none; one helper     | One expression copied into many specs                                                                                      | CHO-042   |

Together about 430 s of the 1,215 summed (35%), roughly 3.5 minutes off CI. The
estimates count every cut and trim the audits proposed; each sub-chore's table lists
its main candidates, not all of them. The
Sheets adapter's own tests hold a further ~500 removable lines, left alone (D13).

### At `697fcc5` (first measured)

At commit `697fcc5`: 19 specs, 7,259 lines with their fixtures, 173 tests declared and
241 run, since 68 runs come from loops over a theme, a language, a width or a kind of
failure. Times are each test's own, summed, from one local run of the whole suite
(431 s in all; 1.9 minutes on the clock with four workers). On CI the `pnpm test:e2e`
step took 2 min 32 s on PR #80's head, the build included.

Find the candidates with:

- `rg -n 'boundingBox\(\)|toBeInViewport' apps/editor/tests/e2e --glob '*.spec.ts'` (a position or
  a size);
- `rg -n 'documentElement\.scrollWidth' apps/editor/tests/e2e` (sideways scroll);
- `rg -n 'setViewportSize|viewport:' apps/editor/tests/e2e --glob '*.spec.ts'` (a width);
- `rg -n 'for \(const .* of' apps/editor/tests/e2e --glob '*.spec.ts'` (a loop: 25 hits, of which
  those over a theme, a language or a width are the candidates).

| Area                                  | Measurement                                                                                                                                                                                                                                                                                                                                                                            | Verdict                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Positions in whole tests              | `shell.spec.ts`: pages left aligned at 80 px and 16 px, and the container stopping at 1200 px, read from a heading's `x`. 3 runs, 2.2 s, 43 lines. The 16 px run ends with the only check that the not-found page does not scroll sideways on a phone                                                                                                                                  | Cut the positions; keep that check (S3)                                 |
| Positions inside other tests          | `shell.spec.ts`: the header's controls left to right, the phase banner between header and main (5 runs, 3.0 s, with the logo's tests). `roadmap-page.spec.ts`: Edit beside About's heading, the empty panel under 160 px (4 runs, 3.8 s). Each sits beside assertions of behaviour or of a token                                                                                       | Cut the position, keep the test                                         |
| The header's logo, by its size        | `shell.spec.ts`: the logo wider than tall on a desktop, the icon under 48 px on a phone. The header swaps one image for the other by width and both have the same name, so the sizes are the only test of the swap                                                                                                                                                                     | Keep: the width changes what is shown                                   |
| A long tag or detail, at two widths   | `editing.spec.ts`: two tests, each at 375 px and at 640 px ("the narrowest card"). 4 runs, 5.1 s, 112 lines. They hold square icons and a row's alignment, and also wrapping, a refusal, every button inside the page and no sideways scroll. STY-044 moves these forms into a dialog, where a card's width no longer applies                                                          | One width: done in STY-044 (D6). The squares and the alignment: as left |
| The header, at six widths             | `shell.spec.ts`: the service name untruncated and no sideways scroll at 375, 640, 768, 900, 1024 and 1280 px, in English and Welsh. 12 runs, 8.0 s                                                                                                                                                                                                                                     | Keep a width each side of each breakpoint the header has                |
| Fitting a phone                       | Nine copies of the sideways-scroll expression in five specs (`accessibility`, `editing`, `roadmap-page`, `roadmaps`, `shell`), under three names; `roadmaps.spec.ts` also holds a long badge inside its card. They hold reflow, an accessibility rule that axe does not check                                                                                                          | Keep every check at 375 px; share one helper                            |
| A journey repeated per theme          | `roadmap-page.spec.ts`: About's panel and the empty panel run in both themes (the 4 runs above). Only their border and background come from a theme; the form, Undo and Refresh are the same twice. STY-043 moves About's form into a dialog                                                                                                                                           | About's: done in STY-043 (D5). The empty panel's: as left               |
| The accessibility scans, per theme    | `accessibility.spec.ts`: 24 tests in both themes. 48 runs, 165.8 s, 38% of the time. Each scans with axe, whose contrast rule depends on the theme; 8 of the runs are on a phone                                                                                                                                                                                                       | Keep                                                                    |
| The focus tours, per theme            | `focus-indicator.spec.ts`: five tours and one test of each kind of control, in both themes. 12 runs, 76.3 s, 18% of the time; the dark half of the two long tours (editing, a co-lead's review) is 29.3 s. The focus tokens keep their light values in the dark theme (`src/styles/globals.css`), so a dark tour fails alone only where a control's dark style overrides its indicator | Keep, unless the owner takes that risk (S4)                             |
| Tokens and type                       | `styles.spec.ts` in both themes (4 runs, 2.4 s); `typography.spec.ts` at 375 and 1280 px (2 runs, 1.4 s)                                                                                                                                                                                                                                                                               | Keep: the theme and the width are what they hold                        |
| Welsh                                 | `structure.spec.ts`: six screens snapshotted in English and Welsh (12 runs); `shell.spec.ts`: the header and footer in both                                                                                                                                                                                                                                                            | Keep: Welsh copy and structure                                          |
| The same theme set-up, declared twice | `accessibility.spec.ts` declares its own `Theme` and its own list of themes, though `fixtures/look.ts` exports both; it and `styles.spec.ts` each write the check that the page is in the theme asked for                                                                                                                                                                              | Share                                                                   |

The 28 runs first measured, 22.1 s together, are every run of the tests in the rows
above "Fitting a phone". It is an upper bound: most of those tests stay, with a check or
a width removed. The loops in `auth.spec.ts`, over each way connecting fails and each
place it starts from, are behaviour, and stay.

## Acceptance criteria

### S1: A run is repeated only where the repeat can fail alone

**Given** a test that runs per theme, language or width
**When** the suite is slimmed
**Then** it still repeats only where the second run holds something the first cannot:
a contrast or a token's colour (theme), Welsh copy or structure (language), reflow or
a layout that offers different controls (width)
**And** what is the same in every run is asserted once

### S2: Geometry is held only where it is a rule

**Given** an assertion on a position, a size or an order on the screen
**When** it holds neither an accessibility rule nor what a user can reach
**Then** it has gone, and the test around it keeps its other assertions
**And** the record it was evidence for names the cut in its Decisions (S5)

### S3: Reflow is checked by one helper

**Given** the screens checked for sideways scroll on a phone at `697fcc5`
**When** the suite is slimmed
**Then** each is still checked at 375 px, through one helper in `apps/editor/tests/e2e/fixtures/`

### S4: Nothing that guards a user is lost

**Given** the suite at `697fcc5`
**When** the chore is delivered
**Then** every assertion of behaviour still runs at least once
**And** every axe scan still runs in both themes, and every focus tour still runs,
in both themes unless the owner has said one will do

### S5: Each cut is the owner's to see

**Given** a run or an assertion the chore removes
**When** its PR is raised
**Then** the PR lists it with the scenario it was evidence for and where that
scenario is still held, or that it no longer is
**And** a cut that leaves a scenario without a test waits for the owner's word, then
gains a Decisions entry in that record, as STY-041 D9 does

### S6: The guide says when a repeat or a geometry check is earned

**Given** an agent writing a new spec
**When** it reads `apps/editor/tests/e2e/AGENTS.md`
**Then** one rule tells it to run a journey once, and what earns a second theme,
language or width, or a check of where something sits
**And** the Visible UI row of
`.agents/skills/implement-story/references/validation.md` agrees with it: that row
asks for "Light and dark, desktop (1280 px) and phone (375 px) where layout changes"
without saying whether a screenshot or a test holds each, and story Tests notes
repeat it, which is how STY-041's journey came to run four times

### S7: An E2E test holds something its Vitest tests cannot (D8)

**Given** an E2E test whose assertions a Vitest test already makes after the same
user action
**When** the suite is slimmed
**Then** it has gone, or keeps only what jsdom cannot see, as
`apps/editor/tests/e2e/AGENTS.md` lists it
**And** an assertion no other test makes moves into a Vitest test before it goes

### S8: A rule is asserted at the lowest seam that holds it, and wired once above (D8)

**Given** a rule asserted alike in a unit test, a repository contract test and a page
test
**When** the suite is slimmed
**Then** the lowest seam that holds every case keeps them, and each seam above keeps
one test of the wiring
**And** tests that differ only in data that takes no new branch are one table-driven
test

### S9: A cut leaves its scenario held after the switch from Google Sheets (D10)

**Given** a test cut because another test holds its scenario
**When** the editor's data source moves from Google Sheets to the API
**Then** the scenario is still held by a test that outlives the switch: a domain test,
the repository contract, a page or component test, or an E2E test through the fakes
**And** only an assertion about Sheets or Google sign-in alone (a request, a cell, a
column, a token) rests on the Sheets or GIS adapter's own tests, which go with it

## Decisions

- **D1** (owner, 2026-11-14, to the orchestrator after CHO-011): "e2e tests are
  getting long and testing geometry changes via playwright adds little value; do we
  need a chore to slim the suite down where only geometry or other non-behavioural
  test duplication exists?" → this chore. It follows CHO-011 D5 and STY-041 D9, where
  the add-a-roadmap journey went from four runs to one and lost its geometry checks.
- **D2** (agent, 2026-11-14): sideways scroll on a phone is kept, over treating it as
  geometry, because it is how the suite holds reflow, which a keyboard or zoom user
  depends on and axe does not check.
- **D3** (agent, 2026-11-14): the per-theme accessibility scans and focus tours stay
  out of the cuts, over halving the suite's largest cost, because a contrast failure
  or an overridden indicator shows in one theme alone, and the Vitest contrast test
  (ADR-010) holds only the tokens, not which token a component uses. The focus tours'
  dark half is put to the owner in S4, not assumed.
- **D4** (owner, 2026-11-14): not worth selecting now, given the measured saving (at
  most 5% of the suite's time; S4's focus-tour question was not decided either; D7 has since decided it).
  Revisit when the suite's run time, or the share of it that S1–S3 would remove,
  grows; re-measure first (`## Measurement` is as at `697fcc5`).
- **D5** (agent, 2026-11-15, STY-043): About's panel test now checks its border and
  background per theme and its behaviour ("Changed", "Undo changes", focus after
  Undo) once, since the edit is made in the roadmap dialog, whose journey runs once
  (CHO-011 D5). Its position check, and the empty panel's two runs, are as measured.
- **D6** (agent, 2026-11-15, STY-044): the long tag and the long detail are checked at
  375 px alone, in the item dialog. Their 640 px runs ("in the narrowest card") have
  gone: no form sits in a card now, and the dialog is narrowest on a phone. The
  square icons and the row's alignment are still asserted, as measured.
- **D7** (owner, 2026-11-15, the owner's triage of the live chores and defects): the focus tours keep running in both themes (S4). The chore stays parked as D4 set.
- **D8** (owner, 2026-11-22, a session re-assessing this chore): "are all the tests in
  the suite adding value or do we have redundancy and/or tests that only check what
  would already be verified by integration tests and a playwright test would catch
  nothing further?", then "Do step 1" on widening this record → it covers the whole
  suite, Vitest included, and D4's parking ends, its trigger met (2 min 32 s to
  10 min 20 s). Adds S7 and S8; Out of scope loses the Vitest suite.
- **D9** (owner, 2026-11-22, same session): "I want the proposed cuts/work written up
  as sub chores", this record "being the chore 'Epic'", numbered by the next free IDs
  over letter suffixes → CHO-036 to CHO-042, each naming this record as its Parent and
  delivered alone; this record is Done when they are, S6 aside (D11).
- **D10** (owner, 2026-11-22, same session): "we will soon be switching to a FastAPI
  backend instead of Google sheets, so we don't want to cut tests that would end up
  being useful after that switch", and "new tests will be written for the backend as
  well (unit and integration)" → adds S9. A rule the API takes over (ADR-015) gains
  the API's own tests then; retiring the editor's copy waits for the switch.
- **D11** (owner, 2026-11-22, same session): "Then do S6s guide rule" → S6 is
  delivered ahead of the sub-chores, in the PR that records D8 to D14.
- **D12** (agent, 2026-11-22): the `9ee767b` measurement comes from six read-only
  audits by slice, two of their largest claims checked by hand; their verdicts are
  estimates, so each sub-chore re-reads every test it cuts (S5) rather than trusting
  its candidate list.
- **D13** (agent, 2026-11-22): the Sheets adapter's own tests, its parsers and the
  spreadsheet fake's tests stay out of the cuts, over the ~500 lines they repeat,
  because the switch deletes them (`docs/operations/replacing-google-sheets.md`); and
  the repository contract keeps running whole against the in-memory repository, since
  it proves the double the page tests use matches every adapter, the API's included
  (ADR-002). Reopen if Sheets is to stay.
- **D14** (agent, 2026-11-22): S6 also changes the Features row of `validation.md`,
  over the Visible UI row alone, since its "Playwright coverage for each changed
  journey" asks for an E2E test of every journey, which is how the suite came to repeat
  its page tests (S7).
- **D15** (owner, 2026-11-23): CHO-036 to CHO-042 are all delivered, and this umbrella
  stays open (Proposed) rather than closing as Done. Revisit it in a few weeks (from
  mid-December 2026): is the suite's growth appropriate, and has redundancy crept back
  (a Playwright test whose assertions a Vitest page test makes, a run that cannot fail
  alone, a rule asserted at several seams)? Close it, or open a new sub-chore, from
  what that review finds.

## Out of scope

- Any change to production code, or to which behaviours the suite holds (S4): a cut
  moves an assertion down a layer or drops a repeat (D8).
- The Sheets adapter's own tests, its parsers and the spreadsheet fake's tests: the
  switch to the API deletes them (D13).
- Retiring the editor's tests of a rule the API takes over (conflicts, merging,
  validation; ADR-015) once the API's own tests hold it: the switch-over epic (D10).
- How the page focus tour names its stops (CHO-013): this chore decides only whether
  a tour runs in both themes.
- Running the suite faster by other means (workers, shards, a shared sign-in): no
  record yet.
