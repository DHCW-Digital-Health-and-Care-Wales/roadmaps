# DEF-025: A side panel test measures the panel before it has slid in

- **Status**: Needs triage — found by STY-082's retro, in CI on PR #216
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

## Delivery _(add on delivery; as in `story.md`)_
