# DEF-007: Status panels have rounded corners; cards and the About panel beside them are square

- **Status**: Needs triage — found by STY-042's review (Opus, round 1), recorded by its
  retro
- **Severity**: Low — two kinds of corner on one page, hard to see at normal size;
  nothing is broken
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Haiku — one class on one shared component, with a look check
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead sees two kinds of bordered box. Roadmap cards, item cards and the
"About this roadmap" panel have square corners. The panels that stand in for content
("No items yet", "No roadmaps yet", a roadmap that isn't found, the prompts to connect)
have corners rounded by 4px. A roadmap with no items now shows both on one page: the
square About panel above the rounded "No items yet" panel. DHCW's design system draws
its own panels and cards square. Since the shared components took DHCW's look
(STY-015); on one page since STY-042. No workaround is needed.

## Reproduce

At commit `a10192b` on the default branch, as a scratch Playwright spec over the
production build with the E2E fakes (`sheets.spreadsheet = withTabItems("ProductC")`):

1. Connected, open `#/roadmaps/productc`, a roadmap with no items.
2. Read the computed `border-top-left-radius` of the "About this roadmap" region and of
   the "No items yet" panel (`[data-slot=empty]`).
3. Open the roadmap list and read the same of a roadmap card.

**Expected**: to be decided (_Open questions_).
**Actual**: About `0px`, a roadmap card `0px`, the "No items yet" panel `4px`.

## Cause

Verified: `Empty` (`src/components/ui/empty.tsx`) carries `rounded-lg`, which is
`--radius`, DHCW's button radius of 4px, where upstream shadcn has `rounded-xl`.
`StatusPanel` draws every status panel with it. The cards and the About panel are
plain `border bg-card` boxes with no radius, and `roadmap-card.test.tsx` holds the
card square. In the pinned `dhcw-design-system` (0.1.104), `_panel.scss`,
`_summary-card.scss`, `_inset-text.scss` and `_timeout-modal.scss` set no corner radius
and `cards/_card.scss` rounds only its icon; `_button-base.scss` sets 4px and
`_input-base.scss` 0.

- `rg -n 'rounded-(sm|md|lg|xl)' src --glob '!*.test.*'` — 20 matches in 10 files. Boxes
  that hold content: `src/components/ui/empty.tsx:12` (the status panel),
  `src/components/ui/alert-dialog.tsx:57` and `src/components/ui/dialog.tsx:69` (the
  dialogs). The rest are controls, menus and their items, icon tiles, the skeleton and
  focus targets.

## Open questions

The right outcome is a look choice, not a fault against a written scenario: no story
says which corners a panel has, and both looks were chosen on purpose.

1. **Which corners should a box that holds content have?**
   - (a) Square for status panels (recommended): they match the cards and the About
     panel beside them, as DHCW's panels do. Removes one class from the shared empty
     panel and adds a look check; dialogs keep their 4px.
   - (b) Square for status panels and dialogs: (a), and the dialogs lose their 4px, as
     DHCW's modal has none. Changes how every dialog looks.
   - (c) Keep both looks: nothing to build; this record closes as Won't fix.

## Decisions

## Delivery _(add on delivery)_
