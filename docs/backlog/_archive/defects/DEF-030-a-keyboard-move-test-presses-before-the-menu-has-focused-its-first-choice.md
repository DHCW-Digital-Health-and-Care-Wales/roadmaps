# DEF-030: A keyboard move test presses before the menu has focused its first choice

- **Status**: Done
- **Severity**: Low — a test fails now and then under CI load and holds a pull request
  until its job is re-run; Product Leads see nothing wrong
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a one-test wait, then a search for the same pattern
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/257

## Summary

One unit test of moving an item by keyboard opens the Move menu, then presses Down and
Enter at once. Under CI load it once chose the menu's first choice, "To the top",
instead of the second, "Up one", and failed; it passed in the same commit's local runs
and alone. No user is affected: the menu works, and only the test is early. Re-running
the job is the workaround.

## Reproduce

Not reproduced on demand. It failed once, in CI run 45074600368's _Editor: verify_ on PR
#245's head `f4b990de` (job 137368945012), at
`apps/editor/src/features/roadmaps/pages/roadmap-detail-page-ordering.test.tsx:271`,
with the same test file unchanged on the default branch at `83c1942b`; it passed alone
three times on that head and in four full local gates. Load the host while the file
runs (CHO-030's stress run) to try to redden it.

**Expected**: Delta moves up one: Alpha, Bravo, Delta, Charlie.
**Actual**: Delta moved to the top: Delta, Alpha, Bravo, Charlie.

## Cause

Suspected, not verified: `screen.findByRole("menu")` resolves once the menu is in the
document, before the menu has moved focus to its first item. The Down that follows at
once lands on the menu itself and highlights the first item, "To the top", which Enter
then chooses. It is the class CHO-030 found in the E2E suite (a check before the UI
settles), here in a Vitest test.

- `rg -n 'findByRole\("menu"\)' apps/editor/src` — 10 sites, in
  `roadmap-detail-page-ordering.test.tsx` (lines 106 and 267, the second this test),
  `roadmap-detail-page-removing.test.tsx:543`, `roadmap-detail-page-header.test.tsx:293`,
  `roadmap-detail-page-moved-mark.test.tsx:109`,
  `roadmap-detail-page-placement-navigation.test.tsx` (71, 203, 229),
  `features/roadmaps/testing/roadmap-page.ts:33` and `features/auth/testing/account-menu.ts:18`.
  Not checked here: which of them press a key straight after the menu appears, as this
  test does, rather than click a choice by name; the fix checks each.

## Acceptance criteria

### S1: The keyboard move waits for the menu's first choice ✅

**Given** the roadmap page's ordering test opens Delta's Move menu by keyboard
**When** it presses Down and Enter
**Then** it presses them only once "To the top" has focus, so it moves Delta up one on
every run, a loaded host included

## Decisions

- **D1** (owner, 2026-11-23, a request in the delivery session): fix it now, with
  DEF-032, on PR #257.

## Delivery

The cause was as suspected. Base UI's `FloatingFocusManager` focuses a popup's first
element through `enqueueFocus`, a `requestAnimationFrame` after the popup renders, so
`findByRole("menu")` resolves a frame before the menu's first choice has focus. A Down
pressed in that frame highlights the first choice, which Enter then chooses.

The test now waits, through `expectOpeningFocus`, for "To the top" to take focus before
it presses Down and Enter.

The sweep checked each `findByRole("menu")` the record lists, and every other site:
`rg -n 'findByRole\("menu"\)' apps/editor/src` now finds 16. One more presses a key
straight after the menu appears, and is fixed the same way:
`roadmap-detail-page-moving.test.tsx`, "moves by keyboard, naming the menu for the
item, …" (S10), which waits for "Recently delivered". The Welsh Jump to test in
`roadmap-detail-page-placement-navigation.test.tsx` already waits for the first item's
focus. The others click a choice by name, or only read the menu, and the frame does not
affect them.

### Departures

- **Red by a delayed frame, test-first** (agent): S1 has no regression test of its own,
  since the fix is to the test. Its red is the test as it stood, with
  `requestAnimationFrame` delayed by 150 ms: it moved Delta to the top, as CI saw it.
  With the wait, under the same delay, it passes. The delay was not committed.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

A test that presses a key in a menu or dialog it has just opened first waits for its
opening focus through `expectOpeningFocus` (`features/roadmaps/testing/opening-focus.ts`,
whose comment now says so).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `roadmap-detail-page-ordering.test.tsx`, "moves by keyboard, the menu opening on its first choice, …". With `requestAnimationFrame` delayed by 150 ms and no wait, it fails: Delta, Alpha, Bravo, Charlie. With the wait, under the same delay, it passes, as does the moving test's S10. The full run's counts are in the PR. |
