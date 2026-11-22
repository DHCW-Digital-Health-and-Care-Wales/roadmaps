# DEF-027: A quick add test looks for the field before it has come back

- **Status**: Superseded by CHO-030 — the owner's triage (2026-11-22, D1); found by
  STY-087 delivery
- **Severity**: Low — the editor's unit run fails now and then on a change that does not
  touch quick add, and a re-run passes; no user is affected
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a wait in one test helper, shown by a delayed render
- **Delivered**: _(add on delivery)_

## Summary

Two tests of closing the add-item dialog having added nothing failed in CI, each once,
and passed on their own and in a full local run: on `main` at `fa8ae32` (Actions run
`44968551783`, Verify) and on STY-087's branch at `c9c1ad9` (run `45011093662`, the
editor's verify job). Each could not find Next's quick add field once the dialog had
closed. It costs a re-run, not a merge, but it fails the _CI result_ check that `main`'s
ruleset requires until then.

## Reproduce

At commit `99ba35b` on the default branch it has not been reproduced locally: the file
alone (36 tests) and the editor's whole unit run pass. CI's failures:

1. `roadmap-detail-page-quick-add.test.tsx`, _Closing the dialog having added nothing
   (STY-081 S4)_: "can be expanded again, and Enter in the field back adds the title as
   quick add does" (run `44968551783`), and "the corner's Close adds nothing and brings
   Next's field back, …" (run `45011093662`).

**Expected**: the test waits for the field to come back, then checks its focus, title
and cursor.
**Actual**: `Unable to find an accessible element with the role "textbox" and name
"Title of a new item in Next"`.

## Cause

Suspected, not shown: `expectFieldBack` in that file passes `field("Next")`, a
synchronous `getByRole`, to `expectOpeningFocus`, whose `waitFor` retries only the focus
check. The field is looked up once, the moment the dialog has gone; on a loaded runner
it has not been rendered again yet, and the lookup throws without a retry.

- `rg -n 'expectFieldBack\(' apps/editor/src` — 4 sites, all in
  `apps/editor/src/features/roadmaps/pages/roadmap-detail-page-quick-add.test.tsx`.

## Acceptance criteria

### S1: The field's return is waited for

**Given** the field comes back one render after the dialog has gone
**When** a test of closing the dialog checks the field
**Then** it waits for the field to appear before checking its focus, title and cursor,
and passes

## Decisions

- **D1** (owner, 2026-11-22, triage of STY-087's delivery): Superseded by
  [CHO-030](../../chores/CHO-030-e2e-flakes-are-found-by-a-stress-run-not-by-ci.md),
  over fixing it next on its own or Won't fix — the flake audit holds S1, so the field's
  return is waited for with the rest of its kind.
