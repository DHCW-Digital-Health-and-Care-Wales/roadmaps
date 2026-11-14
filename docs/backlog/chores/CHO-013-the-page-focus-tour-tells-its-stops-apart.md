# CHO-013: The page focus tour tells its stops apart, so it can't miss a text field

- **Status**: Proposed — found delivering CHO-011, which left the page tour as it was
- **Type**: Refactor
- **Area**: E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — one helper, but every tour runs through it
- **Delivered**: _(add on delivery)_

## Summary

The page focus tours (`expectEveryStopShowsAnIndicator`, `focus-indicator.spec.ts`)
name each tab stop by its `aria-label` or its text and end once every name has had
focus. A text field has neither, so every one in a region is named alike, and the
tour's promise that "a control a tour never reaches fails the test" does not hold for
them. Done looks like: each stop has its own name, and the tour ends only when each
has had focus.

## Measurement

At commit `858be74`, by logging `tabStops(page).count()` beside the size of the set
of names in `expectEveryStopShowsAnIndicator`, light theme.

| Tour                           | Stops | Distinct names | Verdict       |
| ------------------------------ | ----- | -------------- | ------------- |
| Start page                     | 6     | 6              | Holds         |
| Main page                      | 12    | 12             | Holds         |
| A roadmap's page while editing | 80    | 52             | 28 stops lost |
| A co-lead's review             | 32    | 32             | Holds         |

The editing tour still passes through most of the 28 on its way to the stops after
them, and checks the indicator of each one it lands on. It would not fail if Tab
skipped one, and it can end before the last of them.

## Acceptance criteria

### S1: Every stop has its own name

**Given** a page with several text fields
**When** the tour lists its stops
**Then** it lists as many names as the page has stops

### S2: A stop Tab never reaches fails the tour

**Given** a text field taken out of reach of Tab by mistake
**When** the tour runs
**Then** it fails, naming the field

## Decisions

## Out of scope

- The dialog tour (`expectDialogTour`), which takes each stop in turn and has no names.
