# CHO-024: The session warning's X is a dialog's corner close button, drawn once

- **Status**: Proposed — found by STY-068's quality review; the owner has not asked for it
- **Type**: Refactor
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — one alert dialog and one primitive
- **Delivered**: _(add on delivery)_

## Summary

The session warning, an `AlertDialog`, draws its own corner X by hand
(`absolute top-4 right-4`, `AlertDialogCancel`, `ghost` `icon-sm`, "Close"), and its
header keeps clear of it with `pr-8`. STY-068 put the same button in `DialogContent`
at `top-5.5 right-4`, level with the title, with the title kept clear by `pe-10`. The
two sit 6px apart in height and are written twice. Done is one corner close button
that both dialogs share, at one place.

## Measurement

At commit `8b251d3`.

| Area                  | Measurement                                                                        | Verdict                        |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| `session-warning.tsx` | its X is `top-4` and its header `pr-8`                                             | differs from `DialogContent`'s |
| `dialog.tsx`          | its X is `top-5.5` and `DialogTitle` has `pe-10`                                   | level with the title's centre  |
| S8 of STY-068         | "an alert dialog has no close button": true of the Publish dialog, not of this one | recorded in STY-068's Delivery |

## Acceptance criteria

### S1: The session warning's X sits where a dialog's does

**Given** the session warning open
**When** the Product Lead looks at its top right
**Then** its close button is level with the title, as a form dialog's is
**And** it is named "Close" ("Cau"), closes the warning as before, and is drawn from one
definition shared with `DialogContent`'s (or deliberately left, with a Decisions entry)

## Decisions

- **D1** (agent, 2026-11-18): a chore though the X moves 6px, since the change is one
  definition drawn once, and the move is its side effect; the owner may make it a story.

## Out of scope

- Giving every alert dialog an X: STY-068 D1 leaves the others without.
