# DEF-020: The compact view's press-on-a-row test fails now and then

- **Status**: Done
- **Severity**: Low — an E2E run fails now and then on a change that does not touch
  the compact view, and a rerun passes; no user is known to be affected
- **Area**: E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one spec, a stress run under load, and either a wait
  for the row to settle or a real fault in the row's press to fix
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/180

## Summary

The test that a press on a compact row's line opens and closes the row, at 1280 px,
failed once in a full E2E run on DEF-016's branch, which changes only another spec's
helper. Run on its own four times, it failed once more: the row stayed open after the
second press on its heading. The product may be right and the test may press while the
row is still moving, or a press on an opening row may really be lost; which is not
known.

## Reproduce

On DEF-016's branch (no screen changed from the default branch at `dd19400`):

1. `./node_modules/.bin/playwright test tests/e2e/roadmap-items-compact.spec.ts -g "opens and closes a row by a press on its line at 1280px" --repeat-each=4`

**Expected**: all 4 runs pass.
**Actual**: 1 of 4 failed (3 passed) at the last of its first three presses, with
`aria-expanded` still `"true"` after the press that should close the row; the full
suite run failed the same test once. A stress run at the default branch commit is the
next step.

## Cause

Verified at `a6a9683` (agent, DEF-020+018 delivery). The row is right and no press is
lost by it: the press landed on the row's Description, below the line, because the page
moved under it. `pressOn` brought its target to the middle of the screen every time. The
third press, on the heading again, scrolled the page up from where the second press on
the Description had left it, and the roadmap header, which had stuck, let go. For a frame
or two as it did so its placement links wrapped, 49 px taller (DEF-021), after the two
frames the helper waited on had drawn the heading still and before Playwright worked
out where to press. Sampled in the page on a failing run, the pointer events were at
`y=557`, the heading's middle in that frame, and their target was the
Description's `div`, with the heading's top back at `y=496`. The row's own height is not
involved: it has no transition but the chevron's turn.

## Acceptance criteria

### S1: A press on a row's line closes it each time

**Given** the compact view with a row opened by a press on its line
**When** the row is pressed again on its line, with the CPU loaded
**Then** the row closes, and a stress run of the test passes every time

## Decisions

- **D1** (owner, 2026-11-19, triage in the orchestrator's session): fix, high priority
  — it reproduces on the default branch and slows every delivery's E2E run.

## Delivery

The cause was as stated above, in the test's helper, not the row: `pressOn` now leaves
the page where it is when its target is already clear of the stuck header and the
pinned foot (`--pinned-top`, `--pinned-bottom`), as the third press's heading is, since
the Description it pressed before sits a line below it. A target outside that room is
still brought to the middle and waited on until two frames draw it still. The header's
own 49 px excursion is a product fault in its own right, recorded as DEF-021, not fixed
here: a user is unlikely to press in the one or two frames it lasts. The test also
runs with the CPU slowed fourfold, so the load S1 asks for is part of the suite, not a
flag on a run.

### Departures

- **Test-first by reproduction** (agent): as DEF-016's, the red is the stress run at the
  default branch with the slowed CPU, which fails now and then rather than every time;
  the helper is the test. The slowed CPU is the first commit; the helper's fix the
  second.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

`pressOn` (`tests/e2e/roadmap-items-compact.spec.ts`) scrolls only a target not wholly
clear of the stuck header, the pinned foot and the viewport. A test that presses a row
after the header's state changes with a scroll still meets DEF-021 until it is fixed.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | Before the fix, with the CPU slowed fourfold, `playwright test tests/e2e/roadmap-items-compact.spec.ts -g "opens and closes a row by a press on its line" --repeat-each=60 --workers=8` (both widths) failed 4 of 120, each at the third press with `aria-expanded` still `"true"`. After it, the same command passed 120 of 120 in two runs, and 180 of 180 with the axe test beside it. The whole suite, `playwright test`, passed 551 of 551. |
