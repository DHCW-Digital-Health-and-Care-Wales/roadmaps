# DEF-026: A pinned dialog can be scrolled so its title leaves the screen, out of reach

- **Status**: Done
- **Severity**: Low — seen only as an E2E flake; a user path to it is suspected, not
  shown
- **Area**: Features/UI + E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — one class on the dialog, held by a scroll into view
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/226

## Summary

The test that the add-item form keeps its buttons in view on the smallest pinned
screen, after an item with a very long title is added, fails now and then: in three CI
runs counted by CHO-030, and once in STY-085's local gate. A retry passes. Where the
title and buttons are pinned, the dialog and the side panel hide what overflows them,
but they still hold 421 px of it, so anything that scrolls an element into view can
scroll the whole popup, taking its title off the top of the screen. A Product Lead
cannot scroll it back, since the popup shows no scrollbar.

## Reproduce

At commit `92f7e58` on the default branch (STY-085's branch adds only the rename):

1. Open Product A at 640 × 500 and connect, then open "Add an item" (the side panel; the
   dialog, with the surface chosen in the account menu, behaves the same).
2. Run `button.scrollIntoView({ block: "start" })` on the form's Cancel, or on "Add and
   start another".

**Expected**: the popup stays put; its title, close button and buttons stay in view.
**Actual**: the popup's `scrollTop` becomes 421 (206 with `block: "center"`), and the
title is above the screen.

The case did not fail in 43 runs of it alone (40 of them at 12 workers on an 8-core
host), nor at a tenth of the CPU's speed.

## Cause

Verified for the overflow and the scroll; suspected for the CI failure.

- `DialogContent` (`src/components/ui/dialog.tsx`), pinned, sets `overflow: hidden`,
  which still makes it a scroll box. Three `sr-only` spans in the form's body are
  positioned absolutely, and their containing block is the popup, not the body, so they
  escape the body's scrolling and reach 421 px past the popup's foot (on the add-item
  form at 640 × 500; `scrollHeight` 921 for a `clientHeight` of 500).
- `rg -n 'pinned:overflow' src` — 3 sites, all in `src/components/ui/dialog.tsx`: the
  popup (line 115, the one that hid its overflow), and the header and body (lines 153
  and 167), which scroll on purpose. Every dialog and the side panel use this popup.
- Suspected trigger in CI: a click whose hit check fails on a loaded runner is retried
  by Playwright with the target scrolled into view at another alignment, which scrolls
  every scroll box around it, the popup included. Find in page may do the same for a
  Product Lead; not tried.

## Acceptance criteria

### S1: A scroll into view leaves a pinned popup where it is

**Given** the add-item side panel, and the add-item dialog, open at 640 × 500
**When** its Cancel is scrolled into view at the start, centre and end
**Then** its title, close button, Add item and Cancel are all on the screen

## Decisions

- **D1** (owner, 2026-11-21, STY-085 delivery: "Fix that flake here, it looks small to
  do"): fix it in STY-085's pull request.
- **D2** (agent, 2026-11-21): the popup clips its overflow (`overflow: clip`), so it is
  no scroll box, over making the body the hidden spans' containing block, which fixes
  only the overflow found and leaves the popup able to scroll.

## Delivery

### Departures

None.

### Scenario evidence

| Scenario | Held by                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `tests/e2e/pinned-dialog.spec.ts` (`the add-item side panel stays put…`, `the add-item dialog stays put…`), both red with `overflow-hidden`, written before the fix |
