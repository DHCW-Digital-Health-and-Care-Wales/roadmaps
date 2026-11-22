# DEF-024: A moved item test moves focus before the publish notice has taken it

- **Status**: Done — with CHO-030 (D1)
- **Severity**: Low — an E2E run fails now and then on a change that does not touch the
  move, and a retry passes; no user is affected
- **Area**: E2E
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a wait in one shared test helper, checked by a stress run
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/242

## Summary

The test that a keyboard "To the top" moves the last of 20 Now items, in the cards view,
failed in CI three times since STY-080 merged, each time passing on a retry: on main
after STY-080 (`94d1e8c`), on STY-081's PR #209 and on STY-082's PR #216. Under load it fails locally about 1 run
in 40. The product looks right. The test sets up with a publish, then focuses the item's
Move, presses Enter and chooses from its menu. Under load, the publish notice takes focus
anywhere in that sequence: before the first Enter, so no menu opens; before the choice,
so nothing moves; or after the move, so focus is not back on Move when the test checks
it. With CI's retries the run still passes, so this costs time, not merges, and it can
come back on any PR.

## Reproduce

At commit `d6bbc69` on the default branch, on an 8-core host:

1. `./node_modules/.bin/playwright test tests/e2e/moved-travel.spec.ts -g "far down" --repeat-each=40 --workers=12`

**Expected**: 160 passed.
**Actual**: 159 passed. The case "“To the top” from far down, in cards, chosen by
keyboard" (repeat 18) timed out at `moved-travel.spec.ts:231`, waiting for the
"To the top" menu item. The page shows the "Changes published" notice holding focus.
On PR #209, CI's first attempt failed the same way and its second at line 236, with no
travel recorded. On main at `94d1e8c` it failed at line 241 instead: the move had
landed, and the notice held focus where the test expected Move. With `--workers=4`, 30
runs of that case alone all passed.

STY-087's delivery, which changed no editor code, saw it twice locally at `6d79b65`: in
the full gate (669 of 670 passed) and in the spec alone at `--repeat-each=3` (71 of 72),
each failing at line 236 with no travel recorded.

## Cause

Suspected, not proven. The spec's `open` calls `publishOnce`
(`apps/editor/tests/e2e/fixtures/dialogs.ts`), which returns once the "Changes published" notice is
visible. The publish dialog sends focus to that notice in `onOpenChangeComplete`
(`useFocusNoticeOnClose`), so only once its closing animation has ended, which under load
can be some time later. Every step the case takes in between, from
`moveButton(...).focus()` to the closing check that Move has focus, can lose focus to the
notice. A `publishOnce` that also waits for the notice to have focus would close the gap
for every caller.

- `rg -n "publishOnce\(" apps/editor/tests/e2e`: 17 calls in 6 specs (`moved-travel`, `editing`,
  `structure`, `removing-an-item`, `roadmap-controls`, `accessibility`), and the
  definition.
- `rg -n -A8 "await open\(page\)" apps/editor/tests/e2e/moved-travel.spec.ts | rg "\.focus\(\)|keyboard"`:
  `moved-travel.spec.ts:227` is the one call that moves focus by script straight after
  the publish. The case at line 323 opens its menu by pointer first.

## Acceptance criteria

### S1: The test's keyboard move holds when the publish dialog finishes closing late

**Given** the 20-item Now placement, opened and published as the spec does, with the
publish dialog's close delayed so that it ends after `publishOnce` has returned but while
the case's own steps still run (for example, its closing animation slowed by the test to
end between `.focus()` and the closing focus check) **When** the keyboard "far down" cases
run **Then** each passes; at `d6bbc69` the delay makes them fail every time

## Decisions

- **D1** (owner, 2026-11-22, CHO-030 delivery): delivered with CHO-030, whose shared
  helpers settle by construction, over a delivery of its own
  ([CHO-030](../chores/CHO-030-e2e-flakes-are-found-by-a-stress-run-not-by-ci.md)).

## Delivery

The cause was as suspected. `publishOnce` (`apps/editor/tests/e2e/fixtures/dialogs.ts`)
now ends with `confirmPublish`, which waits for the publish dialog to go and for the
notice to have focus. That notice takes focus as the dialog finishes closing, in
`onOpenChangeComplete`. CHO-030 moved the inline publish confirmations onto
`confirmPublish` too, and made `editing.spec.ts`'s own confirming helper wait for its
dialog to go, so the race is gone for those callers, not just this spec.

### Departures

- **Its red is the helper's** (agent): S1 asks that the delayed close make the keyboard
  "far down" cases fail every time at the old helper. `holdPublishDialogClosing` pauses
  the dialog's closing animation until a second after the notice shows. With it, the
  old helper failed the far-down cases in 1 to 4 of 6 to 10 runs, not every time: the
  case's own steps often outrun the notice. So the red that holds every time is a test
  of the helper itself, which reads focus once, the moment `publishOnce` returns. It
  failed 3 of 3 runs with the old helper. The far-down keyboard cases also run with the
  hold, and pass.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/editor/tests/e2e/moved-travel.spec.ts` (`publishing once hands over only when the notice has focus, however late the publish dialog closes (DEF-024 S1)`; `“To the top” from far down, in cards/compact, chosen by keyboard, the publish dialog closing late (DEF-024 S1)`) |
