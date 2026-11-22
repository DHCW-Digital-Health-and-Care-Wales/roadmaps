# DEF-030: A keyboard move test presses before the menu has focused its first choice

- **Status**: Needs triage — found by STY-088 delivery (PR #245's CI)
- **Severity**: Low — a test fails now and then under CI load and holds a pull request
  until its job is re-run; Product Leads see nothing wrong
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a one-test wait, then a search for the same pattern

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

### S1: The keyboard move waits for the menu's first choice

**Given** the roadmap page's ordering test opens Delta's Move menu by keyboard
**When** it presses Down and Enter
**Then** it presses them only once "To the top" has focus, so it moves Delta up one on
every run, a loaded host included

## Decisions
