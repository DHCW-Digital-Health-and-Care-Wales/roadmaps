# DEF-016: The item dialog's focus tour counts a focus guard as a stop

- **Status**: Done
- **Severity**: Low — an E2E run fails now and then on a change that does not touch
  the dialog, and a rerun passes; no user is affected
- **Area**: E2E
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one test helper, and a stress run to show it holds
- **Delivered**: _(add on delivery)_

## Summary

The focus-indicator test that tours the item dialog with its fields open fails now and
then: it reports a nameless stop and misses the Title field. It failed once in each of
two full E2E runs on the DEF-015 branch, in different themes, and passed on rerun. With
the CPU loaded it fails about one run in five at the default branch, so any PR's
Playwright run can hit it. It failed the same way in one of two full runs at STY-051's
first head (`94b0063`, PR #128), which does not touch the dialog. The product behaves as
intended; the test reads focus while the dialog is still moving it.

## Reproduce

At commit `e35675e` on the default branch:

1. `./node_modules/.bin/playwright test tests/e2e/focus-indicator.spec.ts -g "item dialog, its fields" --repeat-each=12`

**Expected**: all 24 runs pass.
**Actual**: 5 of 24 failed (19 passed), each with the tour's stops showing `page: span `
in place of `page: input Title`.

## Cause

Suspected, from the failures' diffs and Base UI's source. A modal Base UI dialog puts a
focus guard at each end of its popup (`FocusGuard`, a `span` with `tabIndex 0` and
`data-base-ui-focus-guard`); Tab from the last control lands on the guard, which then
moves focus to the first. `expectEveryStopShowsAnIndicator` reads `:focus` after each
Tab and counts whatever it finds, so on a slow run it counts the guard. The guard's
`span` fills the tour's count, and the tour ends before Tab reaches Title, the first
field, which comes after the wrap.

- `rg -n 'expectEveryStopShowsAnIndicator\(' tests/e2e` — 5 calls: one with a
  dialog's scope (`focus-indicator.spec.ts:333`, the failing test); the four page tours
  (`:265`, `:277`, `:306`, `:396`) wrap through the browser, not a guard.
- `rg -n 'data-base-ui-focus-guard' tests/e2e` — none: no tour skips a guard.

## Acceptance criteria

### S1: A tour never counts a focus guard

**Given** a tour of an open dialog whose last control Tab leaves
**When** focus passes through the dialog's focus guard on the way to its first control
**Then** the tour does not count the guard as a stop, and the stress run above passes
all 24 times

## Decisions

- **D1** (owner, 2026-11-19, request "Fix DEF-016"): fix — a flaky Playwright run can
  fail any PR.

## Delivery

The cause was as stated. In `expectEveryStopShowsAnIndicator`
(`tests/e2e/focus-indicator.spec.ts`) the tour skips a press that lands on a Base UI
focus guard (`data-base-ui-focus-guard`) as it already skips one that leaves focus on
`body`: the next Tab moves on, and the guard is neither counted nor given an indicator
check. The four page tours never meet a guard, so they behave as before.

### Departures

- **Test-first by reproduction** (agent): the red is the stress run at the default
  branch, not a new test; the helper is the test.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

A tour of a dialog goes through `expectEveryStopShowsAnIndicator(page, dialog)`; it
never counts a focus guard as a stop.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | Before the change, `playwright test tests/e2e/focus-indicator.spec.ts -g "item dialog, its fields" --repeat-each=12` failed 2 of 24, each showing `page: span ` in place of `page: input Title`. After it, two runs of the same command passed 24 of 24 each. |
