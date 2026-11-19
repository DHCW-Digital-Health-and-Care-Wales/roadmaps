# STY-077: A Product Lead edits in a side panel, chosen in the account menu

- **Status**: Proposed — grilled with the owner on 2026-11-19; a trial, settled by STY-078
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-019-edit-panels-that-keep-their-buttons-in-view](README.md)
- **Depends on**: STY-076 (hard: the pinned layout the panel reuses)
- **Binding ADRs**: ADR-002, ADR-005, ADR-008, ADR-010
- **Suggested model**: Sonnet — a placement on the existing dialog and a stored
  toggle, both with precedents (theme, compact view)

## Summary

A trial of a second way to edit. In the account menu, beside the theme, a Product Lead
chooses "Edit in a side panel". From then on, adding or editing an item, or a roadmap's
details, opens a panel along the right of the screen, full height, with the roadmap
dimmed beside it, instead of a centred dialog. The form, its buttons and how it closes
are the same. The choice is kept in this browser. It is off by default, and a phone is
unchanged. The conflict review and the removal dialog stay dialogs.

## Scope

`components/ui/dialog.tsx` gains a right-hand placement for `DialogContent`. A
preference lives beside the theme in `components/`; the account menu toggles it and
`FormDialog` reads it. Two new strings in English and Welsh. Nothing in `domain/` or
`infrastructure/`.

## Acceptance criteria

### S1: The menu offers the side panel, off by default (owner, D1, D3)

**Given** a Product Lead who has never chosen
**When** they open the account menu
**Then** it lists "Edit in a side panel" (final copy by the `copywriter` skill) beside
the theme item, with an icon
**And** choosing it closes the menu and focus returns to the menu's trigger, as the
theme item does

### S2: An item's form opens as a side panel (owner, D2, D4, D5)

**Given** the side panel chosen, on a screen at least 640px wide
**When** the Product Lead chooses Edit on an item
**Then** the form opens in a panel along the right edge, full height and 32rem wide,
sliding in, with the rest of the page dimmed
**And** its title and X are pinned at the top and its buttons at the foot, only the
fields scrolling (STY-076)

### S3: Every form dialog becomes a panel, and only those (owner, D2)

**Given** the side panel chosen
**When** the Product Lead adds an item, adds a roadmap or edits a roadmap's details
**Then** each opens as the side panel
**And** the conflict review, the removal dialog and every alert dialog still open
centred

### S4: The panel closes and holds focus as the dialog does (D6)

**Given** an item's side panel open with edits typed
**When** the Product Lead clicks the dimmed roadmap beside it
**Then** nothing happens: the panel stays and keeps its text
**And** Cancel, Escape and the X close it, dropping what was typed, and focus returns
to the control that opened it (EPC-011, _The dialogs_)

### S5: The menu offers the way back (owner, D3)

**Given** the side panel chosen
**When** the Product Lead opens the account menu
**Then** it lists "Edit in a dialog", and choosing it makes the forms open as centred
dialogs again

### S6: The choice is kept in this browser (owner, D8)

**Given** the side panel chosen
**When** the Product Lead reloads, disconnects and reconnects, or comes back another
day in the same browser
**Then** the forms still open as the side panel
**And** where the browser's storage can't be read or written, the forms open as a
dialog and nothing is reported as an error

### S7: A phone is unchanged (owner, D4)

**Given** the side panel chosen, on a screen under 640px wide
**When** the Product Lead edits an item
**Then** the form rises from the foot of the screen at full width, as the dialog
does there

### S8: A short window keeps the panel but scrolls it whole (owner, D9)

**Given** the side panel chosen, on a screen at least 640px wide and under 500px tall
**When** the Product Lead edits an item
**Then** the panel opens at the right and scrolls as one piece, unpinned (STY-076 S4)

### S9: A question over the panel shows as before (D6)

**Given** an item's side panel open
**When** the session warning, Reconnect or another question opens over it
**Then** that question shows centred above the panel, and when it closes focus returns
into the panel

### S10: Reduced motion opens the panel without sliding

**Given** the side panel chosen and the system's reduced-motion setting on
**When** a form opens
**Then** the panel shows in place without sliding, as the navigation drawer does

### S11: Welsh

**Given** the interface in Welsh
**When** the Product Lead opens the account menu
**Then** both labels of the toggle are in Welsh

## Tests

S2, S7 and S8 are geometry: Playwright at 1366×768, 390×844 and 844×390, one run each.
S1, S5 and S6 are component tests beside the theme item's, with storage failing for
S6's second half. S4 and S9 reuse the shared dialog fixtures (CHO-011) with the
placement set. Axe stays clean in both placements.

## Decisions

- **D1** (owner, 2026-11-19, brief): a trial, chosen as a preference in the account
  menu where the theme is chosen.
- **D2** (owner, 2026-11-19, round 2 Q3): only the form dialogs, the ones built on
  `FormDialog`, become panels. The conflict review and the removal dialog are
  questions, not edit panels.
- **D3** (owner, 2026-11-19, round 4 Q3): one toggle item named for what it switches
  to, as the theme item is, not a radio pair or a "Trial" badge.
- **D4** (owner, 2026-11-19, round 2 Q4, round 3 Q2, round 4 Q1): modal with the page
  dimmed, 32rem wide (the dialog's width, inside the usual 384–592px of side panels, so
  the forms lay out unchanged), and on a phone the same as today's dialog, which is
  already a bottom sheet.
- **D5** (agent, 2026-11-19): the panel uses the dialog's popover colours and border,
  not the navigation drawer's navy. It slides from the right as the drawer slides from
  the left.
- **D6** (agent, 2026-11-19): a click outside does nothing, and questions stack over it
  as over a dialog, since the panel is the same modal dialog placed elsewhere
  (EPC-011, _The dialogs_).
- **D7** (agent, 2026-11-19, the owner asked for reuse): the panel is a placement of
  `DialogContent` (`placement: "center" | "right"`), not the `Sheet` component and not
  a second form tree. `sheet.tsx` and `dialog.tsx` wrap the same Base UI `Dialog`, so
  the forms, `FormDialog`'s focus and closing rules, the X and STY-076's pinned parts
  serve both. `FormDialog` is the only caller that sets the placement.
- **D8** (owner, 2026-11-19, round 3 Q4 and round 4 Q2): off by default, kept in this
  browser's `localStorage` as the theme is, so it survives sessions on that device.
  It is not per Google account and not across devices.
- **D9** (owner, 2026-11-19, round 5 Q2): at 640px wide and under 500px tall the panel
  stays at the right but scrolls whole, by STY-076's rule.

## Out of scope

- Settling on one way to edit (STY-078).
- A non-modal panel, and the preference across devices (EPC-019, _Out of scope_).
