# DEF-038: A publish test waits for the outcome notice's focus and does not get it

- **Status**: Needs triage — found by STY-092 delivery
- **Severity**: Low — an E2E test fails now and then under load and passes when run
  again; no failure seen in use
- **Area**: E2E (and Features/UI, if the cause is in the page)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Opus — the cause is not known; the first step is to make it fail
  on demand

## Summary

The test helper that confirms a publish returns once the "Changes published" notice has
focus. Now and then, on a busy machine, it waits its full 5 seconds with the notice on
the page and focus not on it. The page looks right. Whether a Product Lead is ever left
without focus on the notice is not known.

## Reproduce

Not reproduced on demand. Each failure reads the same: `expect(notice).toBeFocused()`,
the last line of `confirmPublish` in `apps/editor/tests/e2e/fixtures/dialogs.ts`,
"Expected: focused, Received: inactive", the notice resolved on each of 14 polls.

1. STY-092's full gate, on its branch at `e4bb27e2` (base `d38185bd`; nothing on the
   publish or focus path changed), 8 cores at load average about 8: 449 of 450 passed,
   failing `reconnect.spec.ts` "Publish stays on offer, asks to reconnect, Cancel keeps
   the change, then asks to publish the changes". The failure's screenshot shows the
   notice at the foot of the page. The same head: the spec alone passed, that test passed
   15 of 15 with 4 workers, and the whole suite then passed 450 of 450.
2. Two earlier failures that the retro of CHO-037 recorded in the unmerged PR #253: a
   local run of `removing-an-item.spec.ts` at load average 11, and CI run 45087674954
   on PR #250's head, the reconnect spec again, which passed on its retry. That record
   there is numbered DEF-031, a number `main` has since given another defect.

**Expected**: the notice has focus soon after the publish dialog hides.
**Actual**: now and then it has none within 5 seconds.

## Cause

Suspected, not verified: the outcome is set before the dialog closes, and
`useFocusNoticeOnClose` (`apps/editor/src/features/roadmaps/editing/use-focus-notice-on-close.ts`)
focuses the notice once, as the dialog finishes closing. If that callback runs very
late or not at all, or something takes focus after it, nothing focuses the notice again.
DEF-024's fix added this wait to the helper; this is the same wait running out.

- `rg -n 'confirmPublish\(' apps/editor/tests/e2e` — 22 matches in 10 files, the
  definition and its callers.
- `rg -n 'useFocusNoticeOnClose' apps/editor/src` — the hook, and its use in the
  publish dialog and the published-state dialog.

## Acceptance criteria

### S1: A publish's notice always takes focus, and a test shows it

**Given** a publish confirmed in its dialog, with the machine busy
**When** the dialog closes
**Then** the "Changes published" notice has focus, held by a test that goes red on
demand without the fix

## Decisions

_None yet: awaiting triage._
