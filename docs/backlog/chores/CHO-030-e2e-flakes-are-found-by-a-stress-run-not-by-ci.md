# CHO-030: E2E flakes of one kind are found by an audit and a stress run, not one CI failure at a time

- **Status**: In progress — `t3/cho-030-raise-pr`
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
([DEF-027](../_archive/defects/DEF-027-a-quick-add-test-looks-for-the-field-before-it-has-come-back.md)):
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
  ([DEF-027](../_archive/defects/DEF-027-a-quick-add-test-looks-for-the-field-before-it-has-come-back.md)).
- **D2** (owner, 2026-11-22, Q1): a one-off audit and stress run, not a stress run per
  test change. Agents write tests that cannot act before the UI settles: the guide gains
  the rules, and shared helpers that settle by construction are added, with the existing
  tests moved onto them. Changes: S2 covers more than a closing or publishing helper.
- **D3** (owner, 2026-11-22): this chore also delivers DEF-024, the fix to `publishOnce`,
  over a delivery of its own; its S1 is held here
  ([DEF-024](../defects/DEF-024-a-moved-item-test-moves-focus-before-the-publish-notice-takes-it.md)).

## Out of scope

DEF-025's fix to the popups' box reads (`settledBoxes`), the CI runner's package mirror
(CHO-029), and Vitest component tests (DEF-013, DEF-022, CHO-018 were their own cases),
except DEF-027's, which D1 brings in. DEF-024's fix to `publishOnce` was out of scope
until D3 brought it in.

## Delivery _(add on delivery; as in `story.md`)_
