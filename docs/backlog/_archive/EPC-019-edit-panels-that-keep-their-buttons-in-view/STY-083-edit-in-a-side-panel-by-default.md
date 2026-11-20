# STY-083: The forms open in a side panel unless a Product Lead chooses a dialog

- **Status**: Done — delivered in the PR below; the owner asked for it on 2026-11-20
- **Type**: Feature
- **Area**: Features/UI + E2E
- **Epic**: [EPC-019-edit-panels-that-keep-their-buttons-in-view](../../EPC-019-edit-panels-that-keep-their-buttons-in-view/README.md)
- **Depends on**: STY-077 (hard: the side panel and its toggle)
- **Binding ADRs**: ADR-005, ADR-010
- **Suggested model**: Sonnet — a flipped default in one preference, with its tests and fixtures
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/207

## Summary

STY-077 made the side panel a trial, off until a Product Lead chose it in the account
menu. The owner now wants it the other way round: adding or editing an item, or a
roadmap's details, opens a panel along the right of the screen from the first visit,
and "Edit in a dialog" in the account menu is the opt-in. Nobody who chose the panel
loses it. The toggle, the panel, a phone and the questions that stay dialogs are
unchanged. Whether the toggle stays at all is still STY-078's.

## Acceptance criteria

### S1: The forms open as a side panel with no choice made (owner, D1)

**Given** a Product Lead who has never chosen where forms open, on a screen at least
640px wide
**When** they add or edit an item, add a roadmap or edit a roadmap's details
**Then** each opens as the side panel STY-077 built (S2, S3 there), with no change to
its form, its buttons or how it closes
**And** the conflict review, the removal dialog and every alert dialog still open
centred

### S2: The menu offers the dialog, with an icon (owner, D1)

**Given** a Product Lead who has never chosen
**When** they open the account menu
**Then** it lists "Edit in a dialog", with an icon, beside the theme item, and not
"Edit in a side panel"
**And** choosing it closes the menu, focus returns to the menu's trigger, and the
forms open as centred dialogs

### S3: The menu offers the way back (owner, D1)

**Given** the dialog chosen
**When** the Product Lead opens the account menu
**Then** it lists "Edit in a side panel", and choosing it makes the forms open as the
side panel again

### S4: The choice of a dialog is kept in this browser (D2)

**Given** the dialog chosen
**When** the Product Lead reloads, disconnects and reconnects, or comes back another day
in the same browser
**Then** the forms still open as dialogs
**And** where the browser's storage can't be read, the forms open as the side panel and
nothing is reported as an error
**And** where it can't be written, choosing "Edit in a dialog" does nothing and the
forms stay the side panel, with nothing reported as an error

### S5: An earlier choice of the panel still holds (D2)

**Given** a browser where the side panel was chosen under STY-077, or whose stored
value is not one this app knows
**When** a form opens
**Then** it opens as the side panel

### S6: A phone is unchanged (D1)

**Given** a screen under 640px wide, whichever way of editing is in force
**When** the Product Lead edits an item
**Then** the form rises from the foot of the screen at full width, as the dialog does
there

## Tests

S1 and S6 are geometry, so Playwright's existing specs for the panel hold them with the
panel now the start state; the specs that hold the centred dialog's own geometry start
the page with the dialog chosen. S2 to S5 are the preference's component tests, with
storage failing for S4 and S5.

## Decisions

- **D1** (owner, 2026-11-20, brief): the side panel is the default and the dialog the
  opt-in, going forward. Nothing was said about the toggle's removal, which stays
  STY-078's decision, so the account menu keeps one toggle, named for what it switches
  to (STY-077 D3).
- **D2** (agent, 2026-11-20): keep the `roadmaps.edit.surface` key and store the
  exception instead of the rule: `dialog` is written, `panel` removes the key. A
  browser that chose the panel under STY-077 has `panel` stored, which reads as the
  default, so nobody is migrated or reset. A new key was rejected: it would drop a
  Product Lead's earlier choice for no gain. Where a dialog can't be stored it is not
  chosen, as STY-077's S6 did for the panel.

## Out of scope

- Removing the toggle or either surface (STY-078, the owner's call after the trial).
- Any change to the panel, the dialog, the labels or the Welsh copy, which stay as
  STY-077 wrote them.

## Delivery

### Departures

- **Process**: the owner asked for a quick, unreviewed delivery, so the story went from
  the brief to the PR without grilling or the independent review lanes; the PR says so
  (owner, 2026-11-20).
- **Tests**: the component tests were written first and seen red (ten failures) before
  the preference was flipped; the E2E specs followed the code, as Playwright may.

### Contract for dependents

- **`readEditSurface()`** gives `panel` unless `dialog` is stored under
  `roadmaps.edit.surface`; `storeEditSurface("panel")` removes the key. The menu item,
  provider, strings and Welsh are STY-077's, unchanged.
- **`useDialog(page)`** in `tests/e2e/fixtures/look.ts` replaces `useSidePanel`: a spec
  that holds the centred dialog starts with it. The panel needs no set-up.
- **STY-078** reads with the stored value inverted (its D1).

### Scenario evidence

| Scenario   | Held by                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1         | `form-dialog.test.tsx` (`opens along the right until a Product Lead chooses a dialog`); `side-panel.spec.ts` (the panel tests, now with no set-up)                                                                                                          |
| S2, S3     | `edit-surface-menu-item.test.tsx` (`…offers the dialog, with an icon…`, `closes the menu and hands focus back…`, `offers the way back…`); `side-panel.spec.ts` (`the account menu offers the dialog, and the way back…`); the account menu's aria snapshots |
| S4         | `edit-surface-menu-item.test.tsx` (`keeps the dialog in this browser…`, storage failing to read and to write); `side-panel.spec.ts` (the reload)                                                                                                            |
| S5         | `edit-surface-menu-item.test.tsx` (`still opens the side panel for a browser that chose it under STY-077`, `ignores an unknown stored value`)                                                                                                               |
| S6         | `side-panel.spec.ts` (`on a phone, …`) at 390×844                                                                                                                                                                                                           |
| Dialog axe | `accessibility.spec.ts` (`the item form as a dialog, once a Product Lead chooses it`)                                                                                                                                                                       |

The STY-076 E2E specs now open the panel by default and still pass, so they hold the
pinned layout in both surfaces' shared code; the centred dialog's own position is held
by the reload test and the axe test above.
