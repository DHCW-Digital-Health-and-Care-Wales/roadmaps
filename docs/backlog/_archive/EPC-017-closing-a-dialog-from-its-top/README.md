# EPC-017: Closing a dialog from its top — Cancel sits a scroll away on a phone

- **Status**: Done — one story, raised and grilled by the owner on 2026-11-18, delivered
- **Progress**: 1 of 1 terminal (STY-068)
- **Binding ADRs**: ADR-005, ADR-008, ADR-010

## Summary

The roadmap dialog (adding a roadmap, editing product details) and the item dialog
(adding or editing an item) close only by Cancel, at the foot of the form, or by
Escape, which a phone has no key for. On a phone a dialog fills the width from the
foot of the screen and scrolls, so a Product Lead who opens Edit and changes their mind
must scroll the whole form to leave it. This epic puts a close button at the top right
of a dialog, where it is in view as the dialog opens. It leaves what closing does: it
drops what was typed, without asking (EPC-011, _The dialogs_).

## Owner decisions waiting

None.

## Findings

Audited at `7192646` on 2026-11-18.

| Dialog                             | Built on                | Closes by                  |
| ---------------------------------- | ----------------------- | -------------------------- |
| Roadmap dialog (add, edit details) | `FormDialog` (`Dialog`) | Cancel in its foot, Escape |
| Item dialog (add, edit)            | `FormDialog` (`Dialog`) | Cancel in its foot, Escape |
| Conflict review                    | `Dialog`                | Close in its foot, Escape  |
| Nine questions (discard, publish…) | `AlertDialog`           | Their own answer buttons   |
| Navigation drawer                  | `Sheet`                 | An X, "Close menu", at top |

`rg -n "<DialogContent|<AlertDialogContent|FormDialog\b" src --include=*.tsx`
reproduces the table.

### F1 — On a phone the only way out of a form dialog is at its foot

`DialogContent` drops upstream shadcn's corner close button (its comment: it carries
copy, which `components/ui` never does). An item's form runs to several screens on a
phone, so Cancel is out of view as it opens. Escape needs a keyboard.

### F2 — The app already draws a top-right X

The navigation drawer, the Beta banner and a dismissible notice each draw lucide's
`XIcon` as an icon button, named by a hidden span through `t()`. The dialog's X is
the fourth, not a new pattern.

## Design

1. Every `Dialog` (the form dialogs and the conflict review) shows an icon-only close
   button at its top right, on the title's row, at every width, named "Close" through
   `t()`; it scrolls with the title, and Cancel stays (F1, F2; STY-068 D1–D5).
2. **Unchanged:** alert dialogs have no close button; they are left by their answers.
3. **Unchanged:** what closing does (EPC-011, _The dialogs_, _Closing_): it drops what
   was typed without asking; a click outside does nothing; while a write is under way
   the dialog stays.
4. **Unchanged:** focus opens on the first field and returns to the opener.

## Stories

| ID      | Story                                                                               | Area               | Depends on | State |
| ------- | ----------------------------------------------------------------------------------- | ------------------ | ---------- | ----- |
| STY-068 | [Close a dialog from its top corner](STY-068-close-a-dialog-from-its-top-corner.md) | Features/UI + i18n | —          | ✅    |
