# DEF-019: The compact view's accessibility check fails now and then on target size

- **Status**: Won't fix — owner, 2026-11-19 (D1); archived. Found by STY-070 delivery
- **Severity**: Low — an E2E run fails now and then on a change that does not touch
  the compact view, and a rerun passes; no user is known to be affected
- **Area**: E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one spec, a stress run under load, and either a wait
  for the view to settle or a real target-size fault to fix
- **Delivered**: _(add on delivery)_

## Summary

The axe check of a roadmap's compact view on a phone, in the light theme, reported a
`target-size` violation once in a full E2E run on STY-070's branch, which changes no
screen. The same test passed when the two specs were rerun, and 20 times in a row on
its own. It has not been seen on the default branch yet. Either axe measures a control
while the view is still laying out under load, or a control really is under 24 px for
a moment; which is not known.

## Reproduce

On STY-070's branch (no screen changed from the default branch at `c4e3934`):

1. `pnpm test:e2e` (the whole suite, 543 tests, six workers)

**Expected**: `roadmap-items-compact.spec.ts` › "has no axe violation in the compact
view in the light theme at 375px (S13)" passes.
**Actual**: once in one full run it failed with `["target-size"]`; rerunning the spec
passed, and
`./node_modules/.bin/playwright test tests/e2e/roadmap-items-compact.spec.ts -g "light theme at 375px" --repeat-each=20 --workers=6`
passed 20 of 20; the screens it checks are the same at `c4e3934` on the default
branch, where a stress run under load is the next step. The failing run's report was
not kept.

## Cause

Not known. Suspected: the check runs before the compact rows have settled. The same
full run failed
[DEF-016](DEF-016-the-item-dialog-s-focus-tour-counts-a-focus-guard-as-a-stop.md)'s
test too, whose cause was a focus guard, not timing, so that run does not point to one.

## Acceptance criteria

### S1: The check names a real fault or none

**Given** the full E2E suite run with the CPU loaded
**When** the compact view's axe check runs at 375 px in either theme
**Then** it fails only for a control that stays under the target size once the view
has settled

## Decisions

- **D1** (owner, 2026-11-19, triage in the orchestrator's session): Won't fix; reopen
  if it recurs. It has failed once, off the default branch, and its test passed 30 of 30
  in a stress run at `a6a9683` and 60 of 60 under load in the DEF-020+018 delivery. The
  suite carries no CPU load (DEF-020 D2), so S1's loaded run is not a test step.
