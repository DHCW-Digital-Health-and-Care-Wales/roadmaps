# CHO-009: The prototype stylesheet draws the app's DHCW look

- **Status**: Done — in its PR, awaiting merge
- **Type**: Chore
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — a token copy with a visual check
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/120

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
  no record yet; the retrospective of STY-037's PR weighs it.

## Delivery

Delivered with the rework of the `ux-prototypes` skill, whose proof runs were the next
round of prototypes (D1): the first, on STY-048, rebuilt the DHCW look by hand in every
fragment, which is the cost this chore names.

### Departures

- **The mode this record leaves out of scope ships beside it**, with no record of its
  own: the owner asked for it while the skill was reworked. It is the skill's
  working-component shape (`references/working-component.md`), whose starter page takes
  the same tokens by the same script.
- **The tokens are not carried in `mock.css`.** The assembler reads them from
  `src/styles/globals.css` each time it runs (`scripts/app-tokens.mjs`, shared with the
  working-component starter page) and sets them on every artboard, light and dark, under
  the app's own names. `mock.css` names tokens and holds no colour, so it cannot fall
  out of step again.
- **`mock.css` is rewritten, not retuned.** It draws the app's shell (header band,
  phase banner, page), its cards with their bar, buttons, fields, tags, alerts, dialogs,
  menus and the pending bar. The classes of an app this is not (a sidebar, a tab bar, a
  timeline, avatars, toggles) are gone, and the page check looks for links or buttons in
  `.hdr` where it looked in `.side` and `.tabbar`.
- **Roboto is named, not embedded.** A prototype page is one self-contained file, so it
  draws in Roboto where the reader has it and in the app's fallback, Arial, elsewhere.
  Sizes, weights and line heights are the app's.

### Contract for dependents

- A frames design uses `mock.css`'s classes and the app's tokens; styles every design
  shares go in one stylesheet named as the manifest's `css`
  (`.agents/skills/ux-prototypes/references/frames.md`).
- The tokens follow the app by themselves; the shell and the controls are drawn by
  hand. A change to the app's header, navigation or a control reaches `mock.css` with
  the next prototype, which draws today's screen first, compares it with its captures
  of the app and corrects the stylesheet in its own PR (the same reference, _Draw_).

### Scenario evidence

| Scenario | Evidence                                                                                                                                                                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | A fragment of a roadmap's page (shell, pending bar, About panel, item cards, a tag, an error panel, a focused field, a dialog with a focused button) assembled light and dark, read beside captures of the built app's roadmap page at 1280px and 375px in both themes; `assemble.test.mjs` "every artboard draws with the app's tokens" |
