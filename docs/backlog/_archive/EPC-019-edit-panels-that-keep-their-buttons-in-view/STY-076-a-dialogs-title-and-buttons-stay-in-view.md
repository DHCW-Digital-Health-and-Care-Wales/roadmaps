# STY-076: A Product Lead keeps a dialog's title and buttons in view while its form scrolls

- **Status**: Done — delivered in the PR below; the owner's grilling of 2026-11-19 settled scope and look
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-019-edit-panels-that-keep-their-buttons-in-view](../../EPC-019-edit-panels-that-keep-their-buttons-in-view/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-005, ADR-010
- **Suggested model**: Sonnet — one shared primitive and two forms, with the rules
  already settled
- **Delivered**: _(the PR, added once it exists)_

## Summary

On a laptop, a Product Lead edits a long item and scrolls to Expected outcomes. Done
and Cancel are out of view, and so are the title and the X. With this story every
dialog keeps its title and X pinned at the top and its buttons pinned at the foot, and
only the form between them scrolls. A failed "Add a roadmap" is said beside the button
that failed. A phone, or a window under 500px tall, keeps today's single scroll, where
space is too tight to pin. Alert dialogs are not in it.

## Scope

`components/ui/dialog.tsx` gains a body slot and the pinned layout. The roadmap form,
the item form, the conflict review and the removal dialog place their parts in it.
Nothing changes in `domain/` or `infrastructure/`, and there is no new copy.

## Acceptance criteria

### S1: A long form's buttons and title stay in view on a laptop (owner, D1, D2)

**Given** a Product Lead on a 1366×768 screen, on a roadmap's page
**When** they choose Edit on an item whose form is taller than the dialog
**Then** the title and the X show at the top and Done and Cancel at the foot, and only
the fields between them scroll
**And** a hairline border sets the header and the footer apart from the fields, on the
dialog's white (D4)

### S2: Every Dialog pins, and a short one looks as it does today (owner, D3)

**Given** a screen at least 640px wide and 500px tall
**When** the roadmap dialog, the item dialog, the conflict review or the removal dialog
opens
**Then** its header and footer are pinned while its body scrolls
**And** a dialog whose content fits shows no scrollbar and stays its content's height,
not the screen's

### S3: A phone keeps today's single scroll (owner, D2)

**Given** a screen under 640px wide
**When** any dialog opens
**Then** it rises from the foot of the screen at full width and scrolls as one piece,
the title, X and buttons scrolling with the fields, as before

### S4: A short window keeps today's single scroll (owner, D2)

**Given** a screen at least 640px wide but under 500px tall, as a phone held landscape
**When** a dialog taller than the screen opens
**Then** it scrolls as one piece, as before

### S5: A failed "Add a roadmap" is said in the footer (owner, D5)

**Given** the Add a roadmap dialog pinned, scrolled to its first field
**When** the Product Lead presses Add and the write fails, or the session has expired
**Then** the failure, with Reconnect where the session expired, shows in the footer
above Add and Cancel, in view without scrolling
**And** what was typed is kept, as before (EPC-011, _The dialogs_)

### S6: The item form's note stays with the fields (D6)

**Given** a Product Lead adding an item in a pinned dialog
**When** the dialog opens
**Then** the note about the item being added unpublished sits at the end of the
scrolling body, not in the footer

### S7: Focus, closing and the X are unchanged

**Given** a pinned dialog
**When** it opens, Tab moves through it, and it is closed by Cancel, Escape or the X
**Then** focus opens on the first field, tabs from the header through the body to the
footer in DOM order, and returns to the opener on close
**And** a field that takes focus scrolls into view in the body, not hidden under the
pinned header or footer

## Tests

S1–S4 are geometry: Playwright at 1366×768, 390×844 and 844×390 (STY-068's dialog
specs), one run each, not per theme or language (CHO-014). S5 and S7 are component
tests with the shared dialog fixtures (CHO-011). Axe stays clean.

## Decisions

- **D1** (owner, 2026-11-19, grilling round 1 Q1): pin the header as well as the
  footer, a true three-part dialog. Changes STY-068's "the X scrolls away with the
  title" at the pinned sizes; on a phone it still does.
- **D2** (owner, 2026-11-19, round 1 Q3 and round 2 Q2): pin only at 640px wide and
  500px tall or more, so a phone and a short window keep the whole height for the form.
- **D3** (owner, 2026-11-19, round 1 Q2): every `Dialog` pins, built into
  `DialogContent`; alert dialogs do not change.
- **D4** (owner, 2026-11-19, round 3 Q1, from a mock of three looks): a hairline
  `border-border` on white, not upstream shadcn's muted band (`bg-muted/50`). The band
  was removed in STY-041 to match DHCW's modal (ADR-010), and the secondary Cancel
  would sit grey on grey.
- **D5** (owner, 2026-11-19, round 4 Q4): the adding form's failure moves into the
  pinned footer, above its buttons.
- **D6** (agent, 2026-11-19): the adding item's note stays in the body. It is
  information shown as the form opens, not an answer to a press.
- **D7** (agent, 2026-11-19, delivery): a dialog whose parts are only a header and a
  footer (the removal question, whose description is in the header) shows one hairline
  between them, drawn by the footer, rather than two touching. The question keeps its
  description in the header, not in a body, so it is not moved at the phone and short
  sizes; pinned, the space from its description to its buttons is the header's and the
  footer's padding either side of the hairline (see Departures).

## Starting point

Audited at `bd635d9`. The forms draw their own `DialogFooter` inside their `<form>`
(EPC-019 F2), so the `<form>` must become the column that holds the scrolling body and
the footer (`flex min-h-0 flex-col`), with the header outside it in `FormDialog`. The
popup's `overflow-y-auto` moves to the body at the pinned sizes only. Tailwind's
`max-sm:` alone cannot express the height cut, so use one custom variant for "pinned"
(`sm` wide and `min-height: 500px`).

## Out of scope

- The side panel (STY-077), which reuses this layout.
- Alert dialogs (EPC-019, _Out of scope_).

## Delivery

### Departures

- **S5**: on a phone and a short window, where the popup scrolls as one piece, the
  adding form's failure sits in the footer too, so it is 12px (`gap-3`) above the
  buttons and not the 16px of the form's other gaps (agent: the footer is one flex row
  that wraps, and one place for the notice is simpler than a second layout).
- **S2**: pinned, a dialog's header and footer carry the padding the popup had, so the
  removal question's description sits 32px above its buttons, with the hairline between,
  where it sat 16px; the space under the buttons stays 24px (agent: a hairline needs
  room on both sides).
- **S5**: a failed write or an expired session is said in the footer without a
  Reconnect button. STY-057 moved reconnecting into its own dialog, which pressing Add
  again opens, so the notice repeats no control (agent, keeping STY-057's behaviour).
- **S2**: a header over two fifths of the screen (an item with a very long title, in the
  removal question) scrolls itself, at the pinned sizes, so the footer's buttons stay in
  view; the other dialogs' headers are never that tall (agent, from review).
- **S2**: the add-item dialog's line saying an item was added (after "Add and start
  another") stays outside the form, so its live region is announced at once, and is
  not in the scrolling body: pinned, it sits under the header in a band of at most a
  quarter of the screen that scrolls when a long title fills it (agent, from review).
- **Starting point**: the `<form>` became `DialogForm` (a `form` slot in `dialog.tsx`)
  rather than each form carrying `flex min-h-0 flex-col` itself, so the two forms and
  any later one share the column (agent, routine structure).

### Contract for dependents

- **`pinned` variant** (`styles/globals.css`): `sm` wide and 500px tall,
  `@media (width >= 40rem) and (height >= 500px)`. STY-077's side panel uses it for the
  same parts.
- **`dialog.tsx`**: `DialogContent` is header, body and footer. Place `DialogHeader` and
  `DialogFooter` as before; put what scrolls in `DialogBody`; a form is `DialogForm`
  holding its `DialogBody` and `DialogFooter` (its header stays outside, in
  `FormDialog`). Slots: `dialog-header`, `dialog-body`, `dialog-form`, `dialog-footer`.
  At the pinned size the popup is `overflow-hidden` with no padding; each part carries
  its own, so a dialog added without the parts has none.
- **The X** stays a child of the popup, so it is pinned with the header at the pinned
  size and scrolls with the popup below it.
- **`AddRoadmapFailed`** takes a `className`; it is the footer's first child.
- **E2E**: `pinned-dialog.spec.ts` measures by slot. Data source: nothing read or
  written changes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `tests/e2e/pinned-dialog.spec.ts` (`on a laptop, a long form's title, close button and buttons stay in view…`); `closing-a-dialog.spec.ts` (`on a desktop, the close button …`); screenshots in the PR                                                                                                                                           |
| S2       | `pinned-dialog.spec.ts` (`…stays its content's height and shows no scrollbar when its content fits`, the removal question; `the add-item dialog pins too…`; `…a removal question about an item with a very long title…`); the conflict review and the roadmap dialog share `DialogContent` with the two it measures                              |
| S3, S4   | `pinned-dialog.spec.ts` (`on a phone, …`, `on a phone held landscape, …`)                                                                                                                                                                                                                                                                        |
| S5       | `pinned-dialog.spec.ts` (`…a failed Add a roadmap is said in the footer…`); `roadmaps-page-adding.test.tsx` (`says it in the footer, above Add roadmap and Cancel…`)                                                                                                                                                                             |
| S6       | `roadmap-detail-page-adding.test.tsx` (`keeps the note about being unpublished with the fields…`); `pinned-dialog.spec.ts` (`the note about an item being added unpublished …`)                                                                                                                                                                  |
| S7       | `pinned-dialog.spec.ts` (`a field that takes focus scrolls into the body…`); `dialog.test.tsx` (`tabs from the body to the footer, then to the close button, in DOM order (S7)`: the header holds no control, and the X follows the footer in the DOM); `closing-a-dialog.spec.ts` (`Tab from the last control in the footer wraps…`, unchanged) |

Geometry, tests and the layout were written after the code, then each shown red by
breaking the finished code: the `pinned` variant set to a width no screen has (S1, S2
and S5 fail; S3 and S4 pass, as the phone is unchanged), the failure drawn outside
the footer (the component test for S5), the add-item dialog's wrapper left as a plain
block (its test), the header's `max-h` removed (the long-title test) and the add-item wrapper's
`min-h-0` unconditional with the added-note band unbounded and `w-auto` dropped (four tests: the
laptop one, the long-title one and the phone and landscape padding ones). The S6 and S7 tests hold the layout as built
and were not shown red: S6's note was never in the footer, so its test guards a later
change; S7's clear-of-the-bars result follows from the parts being flex siblings, not
overlays.
