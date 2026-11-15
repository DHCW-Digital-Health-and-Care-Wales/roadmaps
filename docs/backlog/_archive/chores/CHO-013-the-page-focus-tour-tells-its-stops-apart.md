# CHO-013: The page focus tour tells its stops apart, so it can't miss a text field

- **Status**: Done — in its PR, awaiting merge
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

- **D1** (agent, 2026-11-15, STY-044): the tour measured above as "A roadmap's page
  while editing" is now two. The page is toured with a change pending and no form
  open, and the item dialog with Tags, Organisations and Details open, through the
  same helper and so with the same names. Measure both again before starting: the
  text fields that share a name are now in the dialog's tour.

## Out of scope

- The dialog tour (`expectDialogTour`), which takes each stop in turn and has no names.

## Delivery

### Departures

- **D1's measurement**, at `0e07b35`, light theme, by logging `tabStops(scope).count()`
  beside the size of the set of names, as the Measurement did:

  | Tour                                                      | Stops | Distinct names | Verdict       |
  | --------------------------------------------------------- | ----- | -------------- | ------------- |
  | Start page                                                | 6     | 6              | Holds         |
  | Main page                                                 | 12    | 12             | Holds         |
  | A roadmap's page, a change pending, no form open          | 34    | 34             | Holds         |
  | The item dialog, Tags, Organisations and Details open     | 36    | 23             | 13 stops lost |
  | A co-lead's review (33 stops now, 32 when first measured) | 33    | 33             | Holds         |

  The 13 are the dialog's 12 organisation checkboxes and its Title, Phase and tag
  fields among them, named alike by `describeElement`.

- **The checkbox's mirror input is no stop.** Base UI keeps a hidden `input`
  (`aria-hidden`, `tabindex="-1"`) behind each checkbox. Once a text field out of the
  Tab order counts, it would be a stop Tab can never reach, so `NOT_A_STOP` leaves it
  out.

### Contract for dependents

- **Naming a stop**: `describeElement` names a stop by its `aria-label`, then the
  label or `aria-labelledby` naming it, then its text. `expectEveryStopShowsAnIndicator`
  fails when two stops share a name, listing them, so a tour can no longer end with one
  of two alike unvisited. A new text field needs a label of its own.
- **What is no stop**: `NOT_A_STOP` (`tests/e2e/focus-indicator.spec.ts`): an element
  that takes focus only from a script (a notice), the mirror input behind a custom
  control, and the details outline's text fields but the selected one (STY-039 S24).
  Any other text field with `tabindex="-1"` is a stop, and the tour fails on it.

### Scenario evidence

| Scenario | Evidence                                                                                                                                                                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | The item dialog's tour lists 36 stops and 36 names; the helper expects the two counts to agree, and fails naming any stops that share a name. The old naming gave 23 names for the same 36 stops (Measurement above)                                                                                      |
| S2       | With `tabIndex={-1}` added to the item dialog's "Add a tag" input (`tags-field.tsx`, reverted), the STY-044 tour fails in both themes with `"page: input Add a tag"` the one name expected and never visited; the old spec, run against the same break, passed. Playwright: 18 focus-indicator tests pass |
