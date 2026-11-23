# DEF-032: A quick add test still misses the field coming back, after expanding again

- **Status**: Needs triage — found by DEF-031 delivery (`main`'s CI after PR #254)
- **Severity**: Low — the editor's unit run fails now and then on a change that does not
  touch quick add, failing _CI result_ and holding back that push's deploy until the next
  push or a re-run; no user is affected
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one test's timing, shown red by a delayed render
- **Delivered**: _(add on delivery)_

## Summary

A test of closing the add-item dialog failed in CI on `main`, though the same tree had
passed in the pull request's CI and in two full local runs. It is the test DEF-027
recorded, failing again after CHO-030 made its lookup wait. Like any red check on
`main`, it fails _CI result_, so that push does not deploy the editor.

## Reproduce

At commit `d194496c` on the default branch it has not been reproduced locally: the
editor's whole unit run passed twice on the same tree (3,078 tests), and the pull
request's CI passed it. CI's failure, in run `45091291744` (_Editor: verify_):

1. `roadmap-detail-page-quick-add.test.tsx`, _Closing the dialog having added nothing
   (STY-081 S4)_: "can be expanded again, and Enter in the field back adds the title as
   quick add does", 3,142 ms, against about 270 ms for its neighbours.

**Expected**: once Escape closes the dialog, Next's quick add field comes back, focused,
and the test goes on.
**Actual**: `Unable to find role="textbox" and name "Title of a new item in Next"`, from
`expectOpeningFocus`'s `waitFor` at `expectFieldBack`, after the 3-second
`asyncUtilTimeout` (`apps/editor/src/test/setup.ts`).

## Cause

Suspected, not shown. The lookup now retries (CHO-030 S3), so this is not DEF-027's
cause: the field stayed away for the whole 3 seconds, not one render. The test presses
Escape straight after `expand` clicks "Add more details" and returns the dialog, without
waiting for the dialog to take focus. On a loaded runner Escape may land before the
dialog is ready to close, leaving it open and the field closed. The test before it,
which also presses Escape straight after `expand` (once a held read is released),
passed in the same run.

- `rg -n 'await expand\(user\)' apps/editor/src/features/roadmaps/pages/roadmap-detail-page-quick-add.test.tsx`:
  9 sites. Three discard the dialog `expand` returns and act at once (lines 707, 719,
  730); the failing test is line 730.

## Acceptance criteria

### S1: Expanding again waits for the dialog before closing it

**Given** the add-item dialog takes focus one render or more after "Add more details"
is pressed
**When** the test closes it with Escape and checks the field
**Then** it waits for the dialog to be ready before pressing Escape, and passes
