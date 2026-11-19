# DEF-020: The compact view's press-on-a-row test fails now and then

- **Status**: Needs triage — found by DEF-016 delivery
- **Severity**: Low — an E2E run fails now and then on a change that does not touch
  the compact view, and a rerun passes; no user is known to be affected
- **Area**: E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one spec, a stress run under load, and either a wait
  for the row to settle or a real fault in the row's press to fix
- **Delivered**: _(add on delivery)_

## Summary

The test that a press on a compact row's line opens and closes the row, at 1280 px,
failed once in a full E2E run on DEF-016's branch, which changes only another spec's
helper. Run on its own four times, it failed once more: the row stayed open after the
second press on its heading. The product may be right and the test may press while the
row is still moving, or a press on an opening row may really be lost; which is not
known.

## Reproduce

On DEF-016's branch (no screen changed from the default branch at `dd19400`):

1. `./node_modules/.bin/playwright test tests/e2e/roadmap-items-compact.spec.ts -g "opens and closes a row by a press" --repeat-each=4`

**Expected**: all 4 runs pass.
**Actual**: 1 of 4 failed (3 passed) at the last of its first three presses, with
`aria-expanded` still `"true"` after the press that should close the row; the full
suite run failed the same test once. A stress run at the default branch commit is the
next step.

## Cause

Not known. Suspected: `pressOn` waits for its target to stop moving, but the row's
height is still changing from the previous press when the next one lands, so the
press misses the stretched line, as
[DEF-016](../_archive/defects/DEF-016-the-item-dialog-s-focus-tour-counts-a-focus-guard-as-a-stop.md)'s
focus tour read focus before the dialog had moved it.

## Acceptance criteria

### S1: A press on a row's line closes it each time

**Given** the compact view with a row opened by a press on its line
**When** the row is pressed again on its line, with the CPU loaded
**Then** the row closes, and a stress run of the test passes every time

## Decisions
