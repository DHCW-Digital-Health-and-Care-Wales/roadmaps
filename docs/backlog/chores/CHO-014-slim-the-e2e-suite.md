# CHO-014: The E2E suite holds geometry, and repeats a run, only where that proves something

- **Status**: Proposed — asked for by the owner (D1); measured here, no test changed yet; not to be selected until its measurements grow (D4)
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Depends on**: STY-043 and STY-044 (preferred order: they re-point the About and
  item-form tests at dialogs)
- **Binding ADRs**: ADR-006, ADR-008, ADR-010
- **Suggested model**: Sonnet — each test needs reading to tell a behaviour from a
  repeat; no production code
- **Delivered**: _(add on delivery)_

## Summary

The Playwright suite is long, and part of it checks where things sit on the screen or
runs the same journey again per theme, language or width. The owner asked whether to
slim it where a test holds only geometry or repeats without a behaviour of its own (D1).
Measured, the tests that do either are 28 of 241 runs and 5% of the suite's time, and
most of them stay with a check or a width removed, so slimming makes the suite shorter
to read more than faster to run. More than half the time is the accessibility scans and
focus tours, which run in both themes because contrast and the focus indicator can break
in one alone: those stay. Done looks like: a run repeats, and a position is checked,
only where that proves something, and the guide says when a new one is earned.

## Measurement

At commit `697fcc5`: 19 specs, 7,259 lines with their fixtures, 173 tests declared and
241 run, since 68 runs come from loops over a theme, a language, a width or a kind of
failure. Times are each test's own, summed, from one local run of the whole suite
(431 s in all; 1.9 minutes on the clock with four workers). On CI the `pnpm test:e2e`
step took 2 min 32 s on PR #80's head, the build included.

Find the candidates with:

- `rg -n 'boundingBox\(\)|toBeInViewport' tests/e2e --glob '*.spec.ts'` (a position or
  a size);
- `rg -n 'documentElement\.scrollWidth' tests/e2e` (sideways scroll);
- `rg -n 'setViewportSize|viewport:' tests/e2e --glob '*.spec.ts'` (a width);
- `rg -n 'for \(const .* of' tests/e2e --glob '*.spec.ts'` (a loop: 25 hits, of which
  those over a theme, a language or a width are the candidates).

| Area                                  | Measurement                                                                                                                                                                                                                                                                                                                                                                            | Verdict                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Positions in whole tests              | `shell.spec.ts`: pages left aligned at 80 px and 16 px, and the container stopping at 1200 px, read from a heading's `x`. 3 runs, 2.2 s, 43 lines. The 16 px run ends with the only check that the not-found page does not scroll sideways on a phone                                                                                                                                  | Cut the positions; keep that check (S3)                                    |
| Positions inside other tests          | `shell.spec.ts`: the header's controls left to right, the phase banner between header and main (5 runs, 3.0 s, with the logo's tests). `roadmap-page.spec.ts`: Edit beside About's heading, the empty panel under 160 px (4 runs, 3.8 s). Each sits beside assertions of behaviour or of a token                                                                                       | Cut the position, keep the test                                            |
| The header's logo, by its size        | `shell.spec.ts`: the logo wider than tall on a desktop, the icon under 48 px on a phone. The header swaps one image for the other by width and both have the same name, so the sizes are the only test of the swap                                                                                                                                                                     | Keep: the width changes what is shown                                      |
| A long tag or detail, at two widths   | `editing.spec.ts`: two tests, each at 375 px and at 640 px ("the narrowest card"). 4 runs, 5.1 s, 112 lines. They hold square icons and a row's alignment, and also wrapping, a refusal, every button inside the page and no sideways scroll. STY-044 moves these forms into a dialog, where a card's width no longer applies                                                          | After STY-044: one width; cut the squares and the alignment, keep the rest |
| The header, at six widths             | `shell.spec.ts`: the service name untruncated and no sideways scroll at 375, 640, 768, 900, 1024 and 1280 px, in English and Welsh. 12 runs, 8.0 s                                                                                                                                                                                                                                     | Keep a width each side of each breakpoint the header has                   |
| Fitting a phone                       | Nine copies of the sideways-scroll expression in five specs (`accessibility`, `editing`, `roadmap-page`, `roadmaps`, `shell`), under three names; `roadmaps.spec.ts` also holds a long badge inside its card. They hold reflow, an accessibility rule that axe does not check                                                                                                          | Keep every check at 375 px; share one helper                               |
| A journey repeated per theme          | `roadmap-page.spec.ts`: About's panel and the empty panel run in both themes (the 4 runs above). Only their border and background come from a theme; the form, Undo and Refresh are the same twice. STY-043 moves About's form into a dialog                                                                                                                                           | After STY-043: token checks per theme, the behaviour once                  |
| The accessibility scans, per theme    | `accessibility.spec.ts`: 24 tests in both themes. 48 runs, 165.8 s, 38% of the time. Each scans with axe, whose contrast rule depends on the theme; 8 of the runs are on a phone                                                                                                                                                                                                       | Keep                                                                       |
| The focus tours, per theme            | `focus-indicator.spec.ts`: five tours and one test of each kind of control, in both themes. 12 runs, 76.3 s, 18% of the time; the dark half of the two long tours (editing, a co-lead's review) is 29.3 s. The focus tokens keep their light values in the dark theme (`src/styles/globals.css`), so a dark tour fails alone only where a control's dark style overrides its indicator | Keep, unless the owner takes that risk (S4)                                |
| Tokens and type                       | `styles.spec.ts` in both themes (4 runs, 2.4 s); `typography.spec.ts` at 375 and 1280 px (2 runs, 1.4 s)                                                                                                                                                                                                                                                                               | Keep: the theme and the width are what they hold                           |
| Welsh                                 | `structure.spec.ts`: six screens snapshotted in English and Welsh (12 runs); `shell.spec.ts`: the header and footer in both                                                                                                                                                                                                                                                            | Keep: Welsh copy and structure                                             |
| The same theme set-up, declared twice | `accessibility.spec.ts` declares its own `Theme` and its own list of themes, though `fixtures/look.ts` exports both; it and `styles.spec.ts` each write the check that the page is in the theme asked for                                                                                                                                                                              | Share                                                                      |

The 28 runs of the Summary, 22.1 s together, are every run of the tests in the rows
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
**Then** each is still checked at 375 px, through one helper in `tests/e2e/fixtures/`

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
**When** it reads `tests/e2e/AGENTS.md`
**Then** one rule tells it to run a journey once, and what earns a second theme,
language or width, or a check of where something sits
**And** the Visible UI row of
`.agents/skills/implement-story/references/validation.md` agrees with it: that row
asks for "Light and dark, desktop (1280 px) and phone (375 px) where layout changes"
without saying whether a screenshot or a test holds each, and story Tests notes
repeat it, which is how STY-041's journey came to run four times

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
  most 5% of the suite's time; S4's focus-tour question is not decided either).
  Revisit when the suite's run time, or the share of it that S1–S3 would remove,
  grows; re-measure first (`## Measurement` is as at `697fcc5`).

## Out of scope

- Any change to production code, or to what a test asserts about behaviour.
- The Vitest suite, and its shared fixtures (CHO-012).
- How the page focus tour names its stops (CHO-013): this chore decides only whether
  a tour runs in both themes.
- Running the suite faster by other means (workers, shards, a shared sign-in): no
  record yet.
