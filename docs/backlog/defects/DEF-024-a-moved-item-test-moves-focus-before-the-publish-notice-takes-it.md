# DEF-024: A moved item test moves focus before the publish notice has taken it

- **Status**: Needs triage — found by STY-081's retro
- **Severity**: Low — an E2E run fails now and then on a change that does not touch the
  move, and a retry passes; no user is affected
- **Area**: E2E
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a wait in one shared test helper, checked by a stress run
- **Delivered**: _(add on delivery)_

## Summary

The test that a keyboard "To the top" moves the last of 20 Now items, in the cards view,
failed in CI twice since STY-080 merged, both times passing on a retry: on main after
STY-080 (`94d1e8c`) and on STY-081's PR #209. Under load it fails locally about 1 run in 40. The product looks right. The test sets up with a publish, then focuses the item's
Move, presses Enter and chooses from its menu. Under load, the publish notice takes focus
somewhere in that sequence: before the first Enter, so no menu opens, or after the move,
so focus is not back on Move when the test checks it. With CI's retries the run still
passes, so this costs time, not merges, and it can come back on any PR.

## Reproduce

At commit `d6bbc69` on the default branch, on an 8-core host:

1. `./node_modules/.bin/playwright test tests/e2e/moved-travel.spec.ts -g "far down" --repeat-each=40 --workers=12`

**Expected**: 160 passed.
**Actual**: 159 passed. The case "“To the top” from far down, in cards, chosen by
keyboard" (repeat 18) timed out at `moved-travel.spec.ts:231`, waiting for the
"To the top" menu item. The page shows the "Changes published" notice holding focus.
On PR #209, CI's first attempt failed the same way and its second at line 236, with no
travel recorded. On main at `94d1e8c` it failed at line 241 instead: the move had
landed, and the notice held focus where the test expected Move. With `--workers=4`, 30 runs of that case alone all passed.

## Cause

Suspected, not proven. The spec's `open` calls `publishOnce`
(`tests/e2e/fixtures/dialogs.ts`), which returns once the "Changes published" notice is
visible. The publish dialog sends focus to that notice in `onOpenChangeComplete`
(`useFocusNoticeOnClose`), so only once its closing animation has ended, which under load
can be some time later. Every step the case takes in between, from
`moveButton(...).focus()` to the closing check that Move has focus, can lose focus to the
notice. A `publishOnce` that also waits for the notice to have focus would close the gap
for every caller.

- `rg -n "publishOnce\(" tests/e2e`: 17 calls in 6 specs (`moved-travel`, `editing`,
  `structure`, `removing-an-item`, `roadmap-controls`, `accessibility`), and the
  definition.
- `rg -n -A8 "await open\(page\)" tests/e2e/moved-travel.spec.ts | rg "\.focus\(\)|keyboard"`:
  `moved-travel.spec.ts:227` is the one call that moves focus by script straight after
  the publish. The case at line 323 opens its menu by pointer first.

## Acceptance criteria

### S1: The test's keyboard move holds when the publish dialog finishes closing late

**Given** the 20-item Now placement, opened and published as the spec does, with the
publish dialog's close held until after `publishOnce` has returned (for example, its
closing animation slowed by the test) **When** the keyboard "far down" cases run **Then**
each passes; at `d6bbc69` the held close makes them fail every time

## Decisions
