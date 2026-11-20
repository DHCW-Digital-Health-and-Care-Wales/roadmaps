# EPC-019: Edit panels that keep their buttons in view — a long form scrolls its buttons away

- **Status**: Active — raised and grilled by the owner on 2026-11-19
- **Progress**: 3 of 4 terminal (STY-076, STY-077, STY-083); next selectable: none; blocked on: STY-078
  waits for the owner's trial of the side panel
- **Binding ADRs**: ADR-005, ADR-008, ADR-010

## Summary

A dialog scrolls as one piece, so on a laptop a Product Lead editing a long item scrolls
Done and Cancel out of view, and the title and its X with them. This epic splits every
`Dialog` into a pinned header, a scrolling middle and a pinned footer when the screen is
large enough. A phone, and a short window, keep today's single scroll. It then trials a
second way to edit: the item and roadmap forms open as a right-hand side panel instead
of a centred dialog, chosen in the account menu and remembered in the browser. It opens
as a dialog until chosen (STY-077), then as the side panel until a dialog is chosen
(STY-083). What closing does, and the alert dialogs, are unchanged. After the trial the
owner keeps one way or both (STY-078).

## Owner decisions waiting

- [STY-078](STY-078-settle-on-one-way-to-edit-after-the-trial.md): after the trial,
  keep the side panel, the dialog or both. The trial must run first.

## Findings

Audited at `bd635d9` on 2026-11-19.

| Dialog                             | Built on                | Scrolls today | Footer holds                          |
| ---------------------------------- | ----------------------- | ------------- | ------------------------------------- |
| Roadmap dialog (add, edit details) | `FormDialog` (`Dialog`) | Whole popup   | Add or Done, Cancel; adding's failure |
| Item dialog (add, edit)            | `FormDialog` (`Dialog`) | Whole popup   | Done or Add item, Add another, Cancel |
| Conflict review                    | `Dialog`                | Whole popup   | Publish, Close                        |
| Removal                            | `Dialog`                | Whole popup   | Move to Not doing, Remove, Cancel     |
| Ten questions (discard, publish…)  | `AlertDialog`           | Short, never  | Their answers                         |
| Navigation drawer                  | `Sheet` (left, navy)    | Its own list  | —                                     |

`rg -n "<DialogContent|<AlertDialogContent|<FormDialog\b|<SheetContent" src -g '*.tsx' -g '!*.test.tsx'`
reproduces the table.

### F1 — The whole popup scrolls, so its buttons and its X leave the screen

`DialogContent` is one `overflow-y-auto` flex column. An item's form is taller than a
laptop screen (about 650px of page on a 1366×768 display), so Done and Cancel are out
of view as it opens, and the X scrolls away once the Product Lead scrolls (STY-068 chose
that while only the phone was considered).

### F2 — The footer is drawn inside each form, not by the dialog

`EditForm` and `AddRoadmapForm` render their own `DialogFooter` at the end of their
`<form>`, so the submit buttons stay inside it. Pinning the footer means the form, not
only `DialogContent`, becomes the flex column that holds a scrolling middle and a fixed
foot. The conflict review and the removal dialog put `DialogFooter` straight under
`DialogContent`.

### F3 — A dialog and a side panel are the same primitive

`components/ui/dialog.tsx` and `components/ui/sheet.tsx` both wrap Base UI's `Dialog`.
They differ only in where the popup sits and how it animates. A side panel is therefore
`DialogContent` placed at the right edge, not a second component tree: the forms,
`FormDialog`'s focus and closing rules and the X carry over unchanged.

## Design

1. Every `Dialog` is header, body and footer. At a screen at least 640px wide **and**
   500px tall the header and footer are pinned and only the body scrolls. Each pinned
   part is set apart by a hairline `border-border` on the popover's white, with no
   grey band (owner, look A). Below either size the popup scrolls as one piece, as
   today (F1, F2; STY-076).
2. A failure said after a press of the footer's button (adding a roadmap: a failed
   write, or an expired session with Reconnect) sits in the footer above its buttons.
   A form's information note (adding an item) stays in the body (STY-076).
3. One preference, "Edit in a dialog", is toggled in the account menu beside the theme and
   kept in this browser. The forms open as a modal side panel at the right unless it is
   chosen, and the menu then offers "Edit in a side panel" to go back. While the panel is
   in force and the screen is at least 640px wide, it is full height, 32rem wide, page
   dimmed, sliding in, and follows the same pinning rule (F3; STY-077, whose first version
   was off by default and named the preference "Edit in a side panel"; STY-083 flipped it).
4. A side panel is `DialogContent` with a position, not a new component: `FormDialog`
   chooses the position from the preference and nothing else changes (F3; STY-077 D7,
   which named the prop `placement` before it was built as `position`).
5. **Unchanged:** alert dialogs. They are short and are left by their answers.
6. **Unchanged:** closing (EPC-011, _The dialogs_, _Closing_). Cancel, Escape and the X
   drop what was typed, a click outside does nothing, and a dialog stays while its
   write is under way. Focus opens on the first field and returns to the opener.
7. **Unchanged:** a phone (under 640px). The dialog rises from the foot of the screen
   at full width and scrolls as one piece, whichever way of editing is chosen.

## Shared assumptions and contracts

### Breakpoints

"Large enough to pin" is `sm` (640px) wide and at least 500px tall, one media query
both stories use, so a dialog and a side panel change together.

### The preference lives below the features

The account menu (`features/auth`) writes the preference and `FormDialog`
(`features/roadmaps`) reads it. Neither may import the other, so it lives where the
theme does, in `components/`. Like the theme, the language and the compact view, it is
a per-browser convenience in `localStorage`: a value that can't be read or kept leaves
the dialog, and is never an error. It is never written to the spreadsheet.

### Copy

Every new string (the menu item's two labels) goes through `t()` in English and Welsh,
written with the `copywriter` skill. Copy says "side panel", never "sheet": the
glossary keeps "sheet" away from the Product Lead's words.

## Stories

| ID      | Story                                                                                                                                                                                   | Area                     | Depends on | State |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------- | ----- |
| STY-076 | [A dialog's title and buttons stay in view while its form scrolls](../_archive/EPC-019-edit-panels-that-keep-their-buttons-in-view/STY-076-a-dialogs-title-and-buttons-stay-in-view.md) | Features/UI + E2E        | —          | ✅    |
| STY-077 | [A Product Lead edits in a side panel, chosen in the account menu](../_archive/EPC-019-edit-panels-that-keep-their-buttons-in-view/STY-077-edit-in-a-side-panel.md)                     | Features/UI + i18n + E2E | STY-076    | ✅    |
| STY-083 | [The forms open in a side panel unless a Product Lead chooses a dialog](../_archive/EPC-019-edit-panels-that-keep-their-buttons-in-view/STY-083-edit-in-a-side-panel-by-default.md)     | Features/UI + E2E        | STY-077    | ✅    |
| STY-078 | [Settle on one way to edit after the trial](STY-078-settle-on-one-way-to-edit-after-the-trial.md)                                                                                       | Features/UI              | STY-077    |       |

## Sequencing

STY-076 first: it builds the three-part layout that STY-077's side panel reuses. STY-078
is a Placeholder, promoted once the owner has tried the side panel. STY-083, which the
owner asked for once the trial had begun, made the side panel the default after STY-077.

## Out of scope

- **Alert dialogs.** None is tall enough to scroll. They come back into scope if one
  grows.
- **A non-modal side panel**, editing beside a live roadmap. The owner chose modal; a
  panel that stays open while another card is chosen raises questions about losing
  what was typed.
- **A different phone layout.** On a phone the dialog already is a bottom sheet.
- **The preference across devices.** That needs storage the app does not have until the
  API replaces Sheets (ADR-002).
- **The navigation drawer**, which stays a left-hand, navy `Sheet`.

## Defects

- [DEF-025](../defects/DEF-025-a-side-panel-test-measures-the-panel-before-it-has-slid-in.md):
  a side panel test measures the panel before it has slid in, so E2E fails now and
  then, seen in CI on PR #216. Needs triage; found by STY-082's retro.

## Related

- [EPC-017](../_archive/EPC-017-closing-a-dialog-from-its-top/README.md): the X,
  whose "scrolls away with the title" STY-076 changes at the pinned sizes
- [EPC-011](../EPC-011-adding-roadmaps-and-items/README.md), _The dialogs_: the closing
  and focus rules both stories keep
- ADR-010 (DHCW look): why the footer is not upstream shadcn's muted band
