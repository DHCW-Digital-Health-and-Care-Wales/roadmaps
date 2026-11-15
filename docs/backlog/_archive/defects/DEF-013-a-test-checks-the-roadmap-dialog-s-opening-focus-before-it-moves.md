# DEF-013: A test checks the roadmap dialog's opening focus before it has moved

- **Status**: Done
- **Severity**: Low — a Verify run fails now and then on a change that does not touch
  the file, and a rerun passes; no user is affected
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a shared helper for eight assertions, and a guide rule
- **Delivered**: _(add on delivery)_

## Summary

CI's Verify job failed once, on PR #95 (a docs-only change), in the test "edits the
roadmap's five fields, tagging the block and the title (S5)". The test checks that the
Title field has focus the moment the "Edit About this roadmap" dialog is found; in the
failing run focus was still on the Edit button that opened it. A rerun of the same
commit passed. It is the only failed Verify run in the last 100 CI runs, so it is rare,
but it will come back on any PR. The product behaves as intended; the test is early.

## Reproduce

Seen once in CI; not reproduced locally, and no method is known to. At `10f5295` on the
default branch, one way to try:

1. Rerun `./node_modules/.bin/vitest run src/features/roadmaps/pages/roadmap-detail-page-editing.test.tsx`
   repeatedly, with the CPU loaded (parallel runs), until "edits the roadmap's five
   fields, tagging the block and the title (S5)" fails (it may not).

**Expected**: the test passes on every run.
**Actual**: on a slow runner, the assertion at line 383 (387 when it failed) fails with the focus still on
the opening Edit button (CI run 43718510320, attempt 1; attempt 2 passed).

## Cause

Suspected, from the failed run's log. The dialog moves focus into its first field after
it renders; the test reads focus straight after `openEditRoadmapDialog` and the field
read, with no wait. A neighbouring test waits for the same thing
(`roadmap-detail-page-editing.test.tsx:158`, inside `waitFor`).

- `rg -n 'getByRole\("textbox", \{ name: "[A-Za-z ]+" \}\)\)?\.toHaveFocus' src` — 11 hits (lines as of `59598cb`).
  Two already sit in `waitFor` (`roadmap-detail-page-editing.test.tsx:158`,
  `roadmap-detail-page-adding.test.tsx:1243`); two read focus after an action, not after
  opening (`roadmap-detail-page-tags.test.tsx:329,611`). The other seven read an opening
  focus without waiting: `roadmap-detail-page-editing.test.tsx:383` (the failure),
  `roadmaps-page-adding.test.tsx:161`, `roadmap-detail-page-tags.test.tsx:172,195,607`,
  `opening-field.test.tsx:155,183`.
- `rg -n 'expect\(\w+\)\.toHaveFocus' src` — a field kept in a variable first is missed by
  the search above: `roadmaps-page-adding.test.tsx:243` is an eighth site. Read each
  `toHaveFocus` that follows a dialog opening, as the search cannot know them all.

## Acceptance criteria

### S1: The roadmap dialog's opening focus is read once it has moved

**Given** the "Edit About this roadmap" dialog has just opened
**When** the test reads which field has focus
**Then** it waits for focus to reach the Title field, as the item dialog's test does,
and a sibling site that reads an opening focus without waiting is checked the same way

## Decisions

- **D1** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, Q1): fix, high priority
  — a flaky Verify can fail any PR.
- **D2** (owner, 2026-11-15, Q2): every site that reads an opening focus waits for it,
  through one shared test helper (all eight sites in Cause, and any the delivery finds),
  and a rule that a dialog's opening focus is read through it goes in the narrowest
  guide by the ladder in `docs/operations/authoring-agent-instructions.md`.

## Delivery

The cause was as stated. `expectOpeningFocus` (`features/roadmaps/testing/opening-focus.ts`)
waits, with `waitFor`, for a field to hold focus, and every site that reads the focus a
dialog or an opened field moves to goes through it: the eight in Cause; the three that
already waited by hand (`roadmap-detail-page-editing.test.tsx`,
`roadmap-detail-page-adding.test.tsx`); and the others the read-through found: an opened
field's first focus in `opening-field.test.tsx` (three), the tags field's Rename and
Add a tag, the details field's outline and the organisations field's first box. A
`toHaveFocus` after an action (Done refused, an undo, a close) is left as it was: focus
moves there as part of the action. The rule is `src/features/roadmaps/AGENTS.md`, the
nearest guide to every site.

### Departures

- **A new nested guide** (agent): no guide sat nearer the sites than the root, whose
  rule would cost every task; `src/features/roadmaps/AGENTS.md` and its `CLAUDE.md`
  are new, for this one rule.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

A test that opens a dialog or a field and reads where focus went calls
`expectOpeningFocus(field)`; the helper's own test is
`testing/opening-focus.test.ts`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `opening-focus.test.ts` (waits for focus that moves after the field is found; fails when it never does), red before the helper existed. On the page, with every `focus()` deferred 100 ms in `src/test/setup.ts` (a scratch edit, reverted), "edits the roadmap's five fields" failed at its old line 383 with focus still on the Edit button, and passes that line with the helper |
