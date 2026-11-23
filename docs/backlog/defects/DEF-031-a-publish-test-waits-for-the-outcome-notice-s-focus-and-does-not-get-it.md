# DEF-031: A publish test waits for the outcome notice's focus and does not get it

- **Status**: Needs triage — found by the retro of CHO-037 (PR #250)
- **Severity**: Low — an E2E test fails now and then under load and passes on a retry;
  Product Leads see nothing wrong
- **Area**: E2E (and Features/UI, if the cause is in the page)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Opus — the cause is not known; the first step is to make it fail on demand
- **Delivered**: _(add on delivery)_

## Summary

The test helper that confirms a publish, `confirmPublish`, returns once the "Changes
published" notice has focus. Twice within a few hours it waited its full 5 seconds with the notice
on the page and focus not on it, in two different specs: once in a local run of the
item-removing spec, and once in CI on PR #250's rebased head, where it failed the
reconnect spec's first attempt and passed the retry. The product looks right; the retry
is the workaround, and it costs CI time. Whether the page ever leaves a Product Lead
without focus on the notice is not known.

## Reproduce

Not reproduced on demand. Both failures read the same: `expect(notice).toBeFocused()` at
`apps/editor/tests/e2e/fixtures/dialogs.ts` (the last line of `confirmPublish`), "Expected:
focused, Received: inactive", the call log showing the notice resolved on each of 14 polls.

1. Local, a delivery's run of the nine item-editing specs (4 workers, load average 11,
   head `cd43e94f`, base `f9ce1e34`): `removing-an-item.spec.ts` "a published item is
   removed, pending until published, then its row is deleted", 7.3 s. It passed three
   times alone and in every later run.
2. CI run 45087674954 (PR #250's head `1299e029`, rebased on `7c29b43b`), job _Editor: E2E
   (Playwright)_: `reconnect.spec.ts` "Publish stays on offer, asks to reconnect, then asks
   to publish the changes", 6.7 s; the retry passed in 2.3 s. The run reported "1 flaky".
3. A stress run at `da424aec` on the default branch, an 8-core host at load average 8 to
   17: `playwright test removing-an-item.spec.ts -g "a published item is removed"
--repeat-each=60 --workers=10`: 60 passed.

**Expected**: the notice has focus within a second or two of the publish dialog hiding.
**Actual**: in two runs, on two of the helper's 22 calls in specs, it has not within 5 s.

## Cause

Suspected, not verified. `useFocusNoticeOnClose` focuses the notice once, in the dialog's
`onOpenChangeComplete`, and only if the notice exists at that moment; the dialog hides
first, and the notice shows when the write's outcome arrives. If the outcome renders after
the close completes, or something else takes focus in between, nothing sends focus to the
notice again, and the helper waits for a focus that does not come.DEF-024's fix added the wait for the notice's focus to the helper; this is the same wait
timing out rather than a step losing focus to the notice.

- `rg -n 'confirmPublish\(' apps/editor/tests/e2e` — 24 matches in 11 files: the
  definition, one call in `publishOnce` and 22 in 10 specs. Not checked here: whether the
  other callers' steps differ from the two that failed.
- `rg -n 'useFocusNoticeOnClose' apps/editor/src` — the publish dialog and the
  published-state dialog use it.

## Acceptance criteria

_S1 is the regression that fails at the commit above; none can be written until the failure
is reproduced (see Open questions)._

## Open questions _(while Needs triage)_

- Is the cause in the test (the helper waits for a focus move the page makes late) or in
  the page (a publish can leave focus off its outcome notice)? A stress run on a loaded
  host (CHO-030's method: `--repeat-each` with more workers than cores, on `reconnect.spec.ts`
  as well) is the first step; the page's behaviour, when it has no focus to give, is a
  product choice if it does fail.

## Decisions

_The triage outcome is D1._

## Delivery
