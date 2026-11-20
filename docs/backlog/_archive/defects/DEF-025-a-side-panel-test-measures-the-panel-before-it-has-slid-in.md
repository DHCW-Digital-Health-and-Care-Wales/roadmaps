# DEF-025: A side panel test measures the panel before it has slid in

- **Status**: Done
- **Severity**: Low — an E2E run fails now and then on a change that does not touch
  the panel, and a retry passes; no user is affected
- **Area**: E2E
- **Epic**: EPC-019-edit-panels-that-keep-their-buttons-in-view
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a wait in two helpers of one spec, shown by a paused
  animation
- **Delivered**: _(add on delivery)_

## Summary

The test that a short form still has its buttons at the panel's foot on a tall screen
failed once in CI, on STY-082's PR #216, and passed on its retry. The panel was where it
should be; the test measured it on the first frame of its opening slide, a tenth of its
width to the right. The spec turns motion down, but the slide still starts at that
offset and only ends on the next frame, which a loaded runner can delay. Every geometry
check in the spec measures the same way, so any of them can fail like this. It costs a
retry, not a merge.

## Reproduce

At commit `93b12d4` on the default branch. A loaded run did not show it: 40 runs of the
case at 12 workers and 165 runs of the whole spec at 16 workers on an 8-core host all
passed. Holding the page's animations at their start shows the measurement CI saw:

1. In a scratch spec beside `side-panel.spec.ts`, with `reducedMotion: "reduce"`, open
   Product A at 1366 × 1300 and connect.
2. Pause the page's animations:
   `const cdp = await page.context().newCDPSession(page)`, then
   `Animation.enable` and `Animation.setPlaybackRate` with `playbackRate: 0`.
3. `openEditItemDialog(page, "Card being explored")`, then read the dialog's
   `boundingBox()`.

**Expected**: its right edge is at 1366, the screen's.
**Actual**: 1417.199951171875, which is CI's value to the last digit
(`side-panel.spec.ts:51`, via line 147): 51.2 px, a tenth of the panel's 512 px, the
whole offset of `slide-in-from-right-10` (`calc(.1*100%)` in the built CSS).

## Cause

Verified as above, for the one case seen. `openDialog` (`tests/e2e/fixtures/dialogs.ts`)
returns once the form's first field has focus, which it takes as the panel opens, before
the slide has run. `expectPanel` and `expectFooterAtFoot` then read boxes at once. With
reduced motion, `globals.css` cuts the animation to 0.01 ms, but its first keyframe still
applies until the next frame.

- `rg -n "boxOf\(|boundingBox\(\)" tests/e2e/side-panel.spec.ts`: `boxOf` (lines 41–42)
  and its 5 callers, lines 50 (`expectPanel`, 10 calls), 94, 182, 226 and 272, and
  `expectFooterAtFoot` (lines 63–64). Each measures a popup that animates in.

## Acceptance criteria

### S1: The panel's geometry holds while its opening slide is held back

**Given** the side panel spec's geometry checks, with the page's animations paused at
their start until the check's helper waits for them **When** a form opens on a tall
screen **Then** the check passes, its helper having waited for the popup's animations to
finish before reading a box; at `93b12d4` it fails with the panel's right edge 51.2 px
past the screen's

## Decisions

- **D1** (owner, 2026-11-20, a request in the delivery session): fix, with a sweep for
  the same kind of fault in the specs' other popup measurements, in one PR.

## Delivery

The cause was as stated, in the specs' helpers, not the panel. `animationsDone(page)` and
`settledBoxes(...locators)` in `tests/e2e/fixtures/layout.ts` wait until every animation
that ends has ended, then read the boxes of all the locators in one step (`boxesOf`).
`side-panel.spec.ts`'s `panelBox` (was `boxOf`) and `expectFooterAtFoot` read through
it, so `expectPanel`'s callers, its footer check and the spec's other readers all wait.

The sweep found the same read in the shared fixtures and four more specs, and moved them
to `settledBoxes`: `isInView` and `clickOutside` (`fixtures/dialogs.ts`, used by 8
specs), the dialog boxes in `pinned-dialog.spec.ts` (six reads), the close button's
placement check in `closing-a-dialog.spec.ts`, and the navigation drawer's two checks
that a link fits inside it (`shell-navigation.spec.ts`, `unpublished-changes.spec.ts`),
which read the drawer's and the link's boxes in separate calls as it slid in over 200 ms.
`pinned-dialog.spec.ts` and `closing-a-dialog.spec.ts` do not turn motion down, so a
dialog there opens with a 100 ms zoom.

Left alone, each for a reason: the Jump to menu's alignment test
(`placement-navigation.spec.ts`) runs both motions on purpose and reads all its edges in
one `evaluateAll`; `moved-travel.spec.ts` tests an animation; `editing.spec.ts`'s
dialog reads (`:961`, `:1567`, `:1997`) compare boxes under one shared zoom or on a
phone, where the dialog only fades; `navigation-search.spec.ts:173` compares `y` values,
and a sheet slides only sideways; the other `boundingBox()` calls read cards, headers
and rows.

The other flakes in CHO-030's table (`item-tags` `:282`, the session warning at
`side-panel` S9, `roadmap-controls` `:271`) were not shown to be this kind, and are left
to that chore's audit.
The `pinned-dialog` `:303` flake, "a dialog part not in view" after a long title is
added, is touched: its `isInView` calls and its note's box now settle. Whether that was
its cause is not shown, so the audit counts it as touched, not fixed.

`settledBoxes` throws "Not laid out" on a box of nothing, as `boundingBox()` gave none
for a hidden element, since `boxesOf` reads zeros there. S10 of the side panel spec now
asserts the slide's computed duration, since waiting for the panel left no animation for
its old check to inspect.

### Departures

- **A slowed slide, not a paused one** (agent): S1 holds the animations "paused at their
  start until the helper waits". The test slows them instead: a style rule sets
  `animation-duration: 1.5s !important` after the page loads, so the panel is a tenth of
  its width off the screen for as long as the old helper took to read it. A CDP pause
  released from the test races the helper's own first calls, so the old helper could pass
  it; the slowed slide fails the old helper whenever the test's own precondition, a
  running animation, holds. Where a delay of over 1.5 s means it does not, the test
  fails on that precondition and says so, rather than passing. It shows the same
  measurement CI saw.
- **Sweep conversions without a red of their own** (agent): `isInView`, `clickOutside`
  and the reads in the other specs follow the shared helper; no test of theirs failed
  before the change, as none had failed in CI. The red is the helper's.
- **No screenshots** (agent): no visible UI changes.

### Contract for dependents

A spec that reads a popup's geometry, a dialog's, a drawer's or a menu's, calls
`settledBoxes` (`tests/e2e/fixtures/layout.ts`), not `boundingBox()`: a dialog is ready as
focus reaches its first field, before it has slid or zoomed in. `animationsDone` ignores
animations that never end. CHO-030's guide rule on how a helper settles can name
`settledBoxes`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `side-panel.spec.ts`, "the panel's geometry is read once its opening slide has finished" (1366 × 1300, Edit item). With `panelBox` reading `boundingBox()` as before the change, it fails in `expectPanel` with the panel's right edge past the screen's, as CI saw it; with `settledBoxes` it passes. The counts and the full run are in the PR. |
