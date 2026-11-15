# DEF-013: A test checks the roadmap dialog's opening focus before it has moved

- **Status**: Needs triage — found by retro of DEF-009 (a CI flake on PR #95)
- **Severity**: Low — a Verify run fails now and then on a change that does not touch
  the file, and a rerun passes; no user is affected
- **Area**: Features/UI (test)
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one assertion wrapped in `waitFor`, and a look at the sibling sites
- **Delivered**: _(add on delivery)_

## Summary

CI's Verify job failed once, on PR #95 (a docs-only change), in the test "edits the
roadmap's five fields, tagging the block and the title (S5)". The test checks that the
Title field has focus the moment the "Edit About this roadmap" dialog is found; in the
failing run focus was still on the Edit button that opened it. A rerun of the same
commit passed. It is the only failed Verify run in the last 100 CI runs, so it is rare,
but it will come back on any PR. The product behaves as intended; the test is early.

## Reproduce

Seen once, not reproduced locally (not tried under load). At `10f5295` on the default branch:

1. Rerun `./node_modules/.bin/vitest run src/features/roadmaps/pages/roadmap-detail-page-editing.test.tsx`
   repeatedly, with the CPU loaded (parallel runs), until "edits the roadmap's five
   fields, tagging the block and the title (S5)" fails.

**Expected**: the test passes on every run.
**Actual**: on a slow runner, the assertion at line 387 fails with the focus still on
the opening Edit button (CI run 43718510320, attempt 1; attempt 2 passed).

## Cause

Suspected, from the failed run's log. The dialog moves focus into its first field after
it renders; the test reads focus straight after `openEditRoadmapDialog` and the field
read, with no wait. A neighbouring test waits for the same thing
(`roadmap-detail-page-editing.test.tsx:161`, inside `waitFor`).

- `rg -n -B1 'getByRole\("textbox", \{ name: "[A-Za-z ]+" \}\)\)\.toHaveFocus' src` —
  the sites that read an opening focus without `waitFor`, to check each for the same
  early read: `roadmap-detail-page-editing.test.tsx:387` (the failure),
  `roadmaps-page-adding.test.tsx:166`, `roadmap-detail-page-tags.test.tsx:177`,
  `opening-field.test.tsx:155,183`.

## Acceptance criteria

### S1: The roadmap dialog's opening focus is read once it has moved

**Given** the "Edit About this roadmap" dialog has just opened
**When** the test reads which field has focus
**Then** it waits for focus to reach the Title field, as the item dialog's test does,
and a sibling site that reads an opening focus without waiting is checked the same way

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
