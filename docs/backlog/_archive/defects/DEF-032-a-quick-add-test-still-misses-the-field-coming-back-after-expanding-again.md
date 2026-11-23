# DEF-032: A quick add test still misses the field coming back, after expanding again

- **Status**: Done
- **Severity**: Low — the editor's unit run fails now and then on a change that does not
  touch quick add, failing _CI result_ and holding back that push's deploy until the next
  push or a re-run; no user is affected
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one test's timing, shown red by a delayed render
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/257

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

Suspected from the code and the log, not reproduced. The lookup now retries (CHO-030
S3), so this is not DEF-027's cause: the field stayed away for the whole 3 seconds, not
one render. At the failure the dialog had closed too: the log's page dump marks nothing
`aria-hidden`, as an open modal dialog marks the page behind it.

The field's `keepFocus` (`apps/editor/src/features/roadmaps/editing/quick-add.tsx`)
keeps focus in its title when "Add more details" is pressed, and the dialog takes its first focus
later, a frame on (Base UI's deferred initial focus; the adding form does not take it on
a first open, `takesFocus` in `item-dialog.tsx`). The test presses Escape straight after
`expand` returns. An Escape in that gap reaches the field's own `onKeyDown`, whose
`close(true)` drops the title and closes the field, and Base UI's document listener
closes the dialog as well: both end closed. The test before it, which waits on releasing
a held read before its Escape, passed in the same run. DEF-030 is the same kind of race:
a key pressed before a Base UI popup's deferred first focus lands.

- `rg -n 'await expand\(user\)' apps/editor/src/features/roadmaps/pages/roadmap-detail-page-quick-add.test.tsx`:
  9 sites. Three discard the dialog `expand` returns (lines 707, 719, 730); 707 and 730
  act at once, and the failing test is line 730.

## Acceptance criteria

### S1: Expanding again waits for the dialog before closing it ✅

**Given** the add-item dialog takes focus one render or more after "Add more details"
is pressed
**When** the test closes it with Escape and checks the field
**Then** it waits for the dialog to be ready before pressing Escape, and passes

## Decisions

- **D1** (owner, 2026-11-23, a request in the delivery session): fix it now, with
  DEF-030, on the PR that raised it (#257).

## Delivery

The cause was as suspected. Base UI's `FloatingFocusManager` focuses the dialog's title
through `enqueueFocus`, a `requestAnimationFrame` after the dialog renders, and the
field's `keepFocus` holds focus in its title until then. An Escape pressed in that frame
reaches the field's `onKeyDown`, which closes the field and drops its title, and closes
the dialog as well.

`expand` in `roadmap-detail-page-quick-add.test.tsx` now waits, through
`expectOpeningFocus`, for the dialog's title to take focus before it returns. All nine
of its callers wait, the three that discard the dialog it returns among them: "does
nothing on a click outside the dialog" clicked at once too.

The sweep for the same race in other tests is DEF-030's: a key pressed in a menu or
dialog straight after it opens. The edit dialog's Escape in
`roadmap-detail-page-compact.test.tsx` is pressed before the dialog's first focus too,
but focus is then on the row's Edit, which has no key handler of its own, and the
dialog closes either way.

### Departures

- **Red by a delayed frame, test-first** (agent): S1 has no regression test of its own,
  since the fix is to the test. Its red is the test as it stood, with
  `requestAnimationFrame` delayed by 150 ms: `Unable to find role="textbox" and name
"Title of a new item in Next"`, after the 3-second timeout, as CI saw it. With the
  wait, under the same delay, it passes. The delay was not committed.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

As DEF-030's: a key pressed in a dialog just opened waits first for its opening focus.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-quick-add.test.tsx`, "can be expanded again, and Enter in the field back adds the title as quick add does". With `requestAnimationFrame` delayed by 150 ms and no wait in `expand`, it fails as CI did. With the wait, under the same delay, it passes, as do "does nothing on a click outside the dialog" and the S2 test of the opened form. The full run's counts are in the PR. |
