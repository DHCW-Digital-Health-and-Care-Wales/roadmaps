# CHO-009: The prototype stylesheet draws the app's DHCW look

- **Status**: Proposed — not to be selected now; deliver it before the next round of
  prototypes (D1)
- **Type**: Chore
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — a token copy with a visual check
- **Delivered**: _(add on delivery)_

## Summary

The `ux-prototypes` skill's `assets/mock.css` says its tokens mirror
`src/styles/globals.css`, but it still holds shadcn's neutral greys and rounded
corners from before EPC-003 gave the app DHCW's colours, square inputs and yellow
focus. A design review assembled with it shows the owner screens that don't look like
the product. STY-037's prototypes copied the tokens by hand into their own page
instead. Done looks like: `mock.css` carries the app's light and dark tokens, and its
buttons, inputs, tags and focus styles match the app's.

## Measurement

At commit `52850bf`: `.agents/skills/ux-prototypes/assets/mock.css` sets
`--foreground: oklch(0.145 0 0)`, `--radius: 0.625rem` and a violet `--brand`;
`src/styles/globals.css` sets `--foreground` to DHCW's `#212b32`, `--radius` to 4px and
has no `--brand`. No analysis under `docs/analysis/` uses the stylesheet yet.

## Acceptance criteria

### S1: A mock-up looks like the app

**Given** a fragment using `mock.css`'s card, button, input and tag classes
**When** it is assembled and shown beside the running app, light and dark
**Then** colours, corners, type and focus styles match the app's

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): deliver it before the next round of prototypes, not now.

## Out of scope

- A mode of the skill for working prototypes of one component, as STY-037's page is:
  the skill's working-component shape. Its starter page takes the app's tokens from
  `globals.css` by script (`scripts/component-page.mjs`), not from `mock.css`.
