# CHO-030: E2E flakes of one kind are found by an audit and a stress run, not one CI failure at a time

- **Status**: Done
- **Type**: Chore
- **Area**: E2E + Docs
- **Epic**: standalone
- **Depends on**: none; DEF-024's fix to `publishOnce` is delivered here (D3)
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a search over `apps/editor/tests/e2e`, a stress script run, and one
  guide line, once the owner chooses
- **Delivered**: _(add on delivery)_

## Summary

E2E tests that act before the UI has settled have been found one CI failure at a time.
Three are confirmed flakes: DEF-016 (the item dialog's focus tour counted a focus guard,
found in local runs), DEF-024 (`publishOnce` returns before the publish notice takes
focus; cause suspected, not proven) and DEF-025 (a side panel test measures the panel
before its slide has run; fixed in #218 by `settledBoxes`, `apps/editor/tests/e2e/fixtures/layout.ts`,
which a popup's geometry read now uses). The same kind has shown in component tests (DEF-013 a
dialog's opening focus; DEF-022 under load, not seen in CI; CHO-018 once in CI, on a
clock tick), and `side-panel.spec.ts:256` (session warning) was seen to flake three
times in CI, with no record. In CI, 11 of 29 E2E runs had a flaky test (Measurement).
DEF-021 was a real layout defect, not a test. Each flake costs a failed run, a retry and
a retrospective. Done: the owner has chosen whether to look for the rest of the E2E kind
on purpose, the E2E guide says how a helper must settle, and DEF-027's quick add test
waits for its field (S3). Other component tests are out of scope here (Out of scope).

## Measurement

The audit is not done yet: it is the first step. At the delivery's commit, run these and
judge each hit by whether the next assertion can run before the thing it needs has
finished (a notice taking focus, an animation ending, a menu opening):

| Area              | Search or run                                                                                                                                                                                                                                                                            | How to judge a hit                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Shared helpers    | read each export of `apps/editor/tests/e2e/fixtures/` that triggers a close, publish or navigation                                                                                                                                                                                       | it returns before the focus or notice its action causes has arrived                          |
| Focus right after | `rg -n -B3 -e '\.focus\(\)' -e toBeFocused apps/editor/tests/e2e`                                                                                                                                                                                                                        | the line before is a click, keypress or helper that moves focus on its own                   |
| Popups' boxes     | `rg -l animate-in apps/editor/src/components/ui` lists the popups that animate in (dialog, alert dialog, sheet, menus, tooltip); then `rg -n -e 'boundingBox\(' -e 'boxe?s?Of\(' -e getBoundingClientRect apps/editor/tests/e2e` for the specs that open one, and the fixtures they call | the box is read by a call other than `settledBoxes`, or two boxes are read in separate calls |
| Load              | `cd apps/editor && ./node_modules/.bin/playwright test <spec> --repeat-each=20 --workers=12` per spec on an 8-core host (DEF-024's Reproduce used 40 repeats of one case); 44 specs at `843acf2`, so time it on one first                                                                | any failure that `--workers=4` does not show                                                 |

Seen in CI so far: every finished CI run with an E2E job, 2026-11-19 18:14 to
2026-11-20 17:09 UTC (29 runs, `gh run list --workflow ci.yml -L 60`), read from each
E2E job's check-run annotations. All 11 runs with a flaky test passed on retry. Line
numbers are the spec's at that run:

| Test                                                   | Runs with it flaky | Failure                                                               | Record                |
| ------------------------------------------------------ | ------------------ | --------------------------------------------------------------------- | --------------------- |
| `moved-travel.spec.ts:207` (keyboard "far down")       | 3                  | focus not on Move                                                     | DEF-024               |
| `item-tags.spec.ts:282` (compact row, title wraps)     | 4                  | "Not laid out" (`fixtures/layout.ts` `boxOf`)                         | none                  |
| `side-panel.spec.ts:261`, then `:256` (S9)             | 3                  | the session warning still shown after it should close                 | none                  |
| `pinned-dialog.spec.ts:303` (long title added)         | 3                  | a dialog part not in view (line 328)                                  | DEF-026               |
| `roadmap-controls.spec.ts:271` (Publish roadmap)       | 1                  | timeout waiting for a stuck row's button (`fixtures/roadmap-page.ts`) | none                  |
| `side-panel.spec.ts:134` (tall screen, form that fits) | 1                  | the panel measured mid-slide                                          | DEF-025 (fixed, #218) |

A load run does not find every kind: DEF-025 passed 205 loaded runs, and only holding
the page's animations at their start showed it (its Reproduce). Its sweep found the
navigation drawer's reads (`shell-navigation.spec.ts`, `unpublished-changes.spec.ts`) only
after two reviewers had: a search by spec missed a popup, a search by component (the
Popups' boxes row) does not.
Nor is every flake a race: DEF-026 (found in STY-085's delivery) was a popup that hid
its overflow but held 421 px of it, so a scroll into view moved it; a click's retry,
which scrolls its target into view, is the suspected trigger of the CI failures, not
shown. `rg -n 'overflow-hidden' src` lists the
boxes to check, each by its `scrollHeight` against its `clientHeight` in the test's
state.

## Acceptance criteria

### S1: The audit and the stress run have been done once

**Given** the default branch **When** the searches above are run and each hit judged
**Then** each flake they find is fixed in its helper, or recorded as a defect, and the
Delivery lists what was searched and found

### S2: The E2E guide names the rule

**Given** `apps/editor/tests/e2e/AGENTS.md` **When** an agent writes a helper that closes a dialog or
publishes **Then** it says the helper returns only once the focus or notice its action
causes has arrived

### S3: DEF-027's quick add test waits for its field (D1)

DEF-027's S1, by reference
([DEF-027](../defects/DEF-027-a-quick-add-test-looks-for-the-field-before-it-has-come-back.md)):
**Given** quick add's field comes back one render after the add-item dialog has gone
**When** a test of closing the dialog checks the field
**Then** it waits for the field to appear before checking its focus, title and cursor,
and passes. Its search: `rg -n 'expectFieldBack\(' apps/editor/src`.

## Open questions

- **Q1**: Is a stress run part of delivering a test change, or a one-off? Answered: D2.

## Decisions

- **D1** (owner, 2026-11-22, triage of DEF-027): this chore holds DEF-027's S1, a Vitest
  component test that looks for quick add's field the moment the add-item dialog
  closes, before it has rendered again, over a fix of its own; its failures on `main`
  (Actions run `44968551783`) and on PR #231 passed on a re-run
  ([DEF-027](../defects/DEF-027-a-quick-add-test-looks-for-the-field-before-it-has-come-back.md)).
- **D2** (owner, 2026-11-22, Q1): a one-off audit and stress run, not a stress run per
  test change. Agents write tests that do not flake under load (mid-animation reads and
  the like) in the first place: the guide gains whatever rules that needs, and shared
  helpers that settle by construction are added, with the existing tests moved onto them.
  Changes: S2 covers more than a closing or publishing helper.
- **D3** (owner, 2026-11-22): this chore also delivers DEF-024, the fix to `publishOnce`,
  over a delivery of its own; its S1 is held here
  ([DEF-024](../defects/DEF-024-a-moved-item-test-moves-focus-before-the-publish-notice-takes-it.md)).

## Out of scope

DEF-025's fix to the popups' box reads (`settledBoxes`), the CI runner's package mirror
(CHO-029), and Vitest component tests (DEF-013, DEF-022, CHO-018 were their own cases),
except DEF-027's, which D1 brings in. DEF-024's fix to `publishOnce` was out of scope
until D3 brought it in.

## Delivery

D2 made the work structural: a test cannot act before the UI settles once the shared
helpers wait for what their action causes, and the specs were moved onto them.

- **Box reads settle by themselves.** `boxOf` and `boxesOf`
  (`apps/editor/tests/e2e/fixtures/layout.ts`) wait for every animation that ends to end,
  then read all their boxes in one step, retrying until each element is laid out. They
  took in `settledBox(es)`, which is gone. A lint rule (`build/e2e-lint.ts`) forbids
  `boundingBox()` in `tests/e2e`, and its 63 calls moved to these helpers, about
  20 pairs of separate reads becoming one `boxesOf`.
- **Helpers return once their effect has landed.** `confirmPublish`
  (`fixtures/dialogs.ts`) waits for the publish dialog to go and its outcome's notice to
  have focus. `publishOnce` and 29 inline confirmations in 11 specs use it (DEF-024);
  `editing.spec.ts`'s own `chooseAndConfirm`, which confirms Publish or Save for outcomes
  of every kind, waits for its dialog to go, by when the outcome has focus.
  `openAccountMenu` waits for the menu's focus and `chooseFromAccountMenu` for it to go.
  `shownInStuckRow` and `namesShownInStuckRow` read the row in one step, once it has stuck,
  its bars have held still (`barsHeldStill`, taken out of `focusClearOfBars`) and nothing
  animates.
- **Specs wait before acting.** An Escape that closes a popup goes through `escapeFrom`
  (`fixtures/keyboard.ts`), which waits for focus in the popup, presses Escape and waits
  for the popup to go: 30 calls in 16 specs. Five Escapes straight after `clickOutside`
  keep their own wait for the popup to go, as the click takes focus out of it. Three
  specs gained a specific wait: `item-tags` waits for the moved row's tag before
  measuring it, the side panel's S9 waits for the session warning's focus before Escape
  (now `escapeFrom`), and `session-warning` S6 stops 30 s short of the session's end
  rather than 1 s, as the installed clock runs in real time between steps.
- **DEF-027's helper retries its lookup.** `expectOpeningFocus`
  (`apps/editor/src/features/roadmaps/testing/opening-focus.ts`) takes a function that
  finds the field and retries it with the focus check; its 42 calls pass one.
- **The guide** (`apps/editor/tests/e2e/AGENTS.md`) says how a helper and a spec wait, to
  read compared boxes in one `boxesOf`, and to stop short of a clock deadline by more than
  a loaded runner's steps.

What was searched and found, at `58564ac`:

| Search            | Found                                                                                                                                                                                                                                                                                                                                                                                                                   | Done                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Shared helpers    | `publishOnce` returned before the notice took focus (DEF-024); `chooseFromAccountMenu` returned with the menu still closing and its choice not yet acted on; `openAccountMenu` before the menu showed; the stuck row read its buttons before it had stuck, then re-found them by index (the `roadmap-controls.spec.ts:271` flake, suspected). The other dialog helpers already waited for focus or for the dialog to go | fixed in the helper, as above |
| Focus right after | `moved-travel.spec.ts:227`, a scripted focus straight after `publishOnce` (DEF-024). The other 18 `.focus()` calls follow a settled step; about 290 `toBeFocused` retry                                                                                                                                                                                                                                                 | DEF-024's fix                 |
| Popups' boxes     | Unsettled reads of the conflict review (`editing.spec.ts:961`), the search drawer (`navigation-search.spec.ts:173`), a card mid-move (`moved-mark.spec.ts:154`), a row mid-move (`item-tags.spec.ts:301`, the CI flake: it read the row the move leaves) and the page after a scroll (`roadmap-controls.spec.ts:133`)                                                                                                   | all read through `boxesOf`    |
| Escape            | An Escape before the session warning had focus (`side-panel.spec.ts` S9, the CI flake: Escape reached the panel underneath), and 12 more Escapes acting while a popup still showed or closed; then every Escape that closes a popup moved onto `escapeFrom`                                                                                                                                                             | waits added                   |
| Load              | See below                                                                                                                                                                                                                                                                                                                                                                                                               |                               |

The load run took the record's command in two shards on the 8-core host, while another
worktree's full gate ran (load average 17 to 43):

- Shard 1, 335 tests at `--repeat-each=20`: 6,548 of 6,700 passed in 79 minutes.
  - 148 failures were the 30-second test timeout, all but four in the axe checks
    (`accessibility.spec.ts`, 118) and the focus tours (`focus-indicator.spec.ts`, 26),
    whose steps time out at varying points.
  - `session-warning.spec.ts:114` failed twice (the clock deadline, fixed above).
  - `accessibility.spec.ts:697` failed twice, waiting 5 s for "Changes published" in
    `publishOnce`.
- Shard 2, the other 335 at `--repeat-each=5` (owner, to save time): 1,674 of 1,675
  passed in 14 minutes. The one failure, `editing.spec.ts:296`, saw the refusal never
  take focus after `publishOnce`, DEF-024's race.
- Control: the five specs with a failure (`accessibility`, `focus-indicator`,
  `roadmap-controls`, `editing`, `adding-an-item`) at `--repeat-each=3 --workers=4`, load
  average 6 to 16: 531 of 531 passed. Every failure was load's: the timeouts are the axe
  checks' and tours' budget on a starved host, recorded in no defect, and the rest are
  DEF-024's race and the clock deadline, both fixed.

Component tests: the CHO-031 delivery saw two time out in one local gate at load average
about 43, each passing alone and in CI (`roadmap-detail-page-adding.test.tsx`, "says when
it is saved, on a roadmap that isn't published"; `roadmaps-page-adding.test.tsx`, "no
longer follows the title once it is changed"). Both already wait, within the 3-second
`asyncUtilTimeout`, so they are counted as load, not this kind.

### Departures

- **S1's load run in two shards** (agent; owner for the lower count): one run of all 670
  tests at 20 repeats outlasts a 2-hour background job, so it ran as two shards, the
  second at 5 repeats. It ran on a host loaded by other work, so each failure was judged
  by a run at `--workers=4` and by its cause.
- **S2 is wider** (owner, D2): the guide covers how a spec waits, not only a closing or
  publishing helper.
- **S3 is fixed in the shared helper** (agent): `expectFieldBack` failed because
  `expectOpeningFocus` took an element found once. It now takes a lookup, so all 42 of its
  calls retry theirs; the component tests are otherwise left alone (Out of scope).
- **The Popups' boxes row's judge reads `boxesOf`** (agent): `settledBoxes` merged into
  `boxesOf`, so "a call other than `settledBoxes`" is now a call other than `boxOf` or
  `boxesOf`, which lint enforces.
- **A local helper renamed** (agent): `editing.spec.ts`'s own `confirmPublish` (open the
  bar, then confirm Publish or Save) is now `chooseAndConfirm`, to import the shared one.
- **Unrecorded CI flakes fixed without a red of their own** (agent): the `item-tags`,
  side panel S9 and stuck-row causes are read from the code and the CI errors, not
  reproduced; their fixes follow the shared helpers.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

- Read a box with `boxOf` or `boxesOf` (`apps/editor/tests/e2e/fixtures/layout.ts`); a test
  that must measure mid-animation reads in `page.evaluate`, as `moved-travel.spec.ts`'s
  `placeOf` does.
- Press Escape in a popup with `escapeFrom(popup)` (`fixtures/keyboard.ts`).
- Confirm a publish with `confirmPublish(page, notice?)`; `holdPublishDialogClosing(page)`
  holds the dialog's closing, for a test of what waits for it.
- `expectOpeningFocus` takes a function that finds the field.

### Scenario evidence

| Scenario                | Held by                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1                      | observed runs: the searches and load run above                                                                                                                                                                          |
| S2                      | `apps/editor/tests/e2e/AGENTS.md`; the `boundingBox()` rule by `apps/editor/build/e2e-lint.test.ts` (`reports a box read by boundingBox() in a spec or a fixture`), shown red by breaking its rule                      |
| S3                      | `apps/editor/src/features/roadmaps/testing/opening-focus.test.ts` (`waits for a field that renders after it is first looked for, as one back from a closed dialog does`), red before the fix                            |
| D2 (session warning S6) | `apps/editor/tests/e2e/session-warning.spec.ts` (`dismissing the warning leaves the session to run out (S6)`): with 2 s of real time added before the fast-forward, the old margin failed 3 of 3, the new passed 3 of 3 |
