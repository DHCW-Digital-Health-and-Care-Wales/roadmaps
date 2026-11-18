# STY-068: A Product Lead closes a dialog from its top corner, without scrolling to Cancel

- **Status**: Proposed — scope and look settled by the owner's grilling of 2026-11-18
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-017-closing-a-dialog-from-its-top
- **Depends on**: none
- **Binding ADRs**: ADR-005, ADR-008, ADR-010
- **Suggested model**: Sonnet — one control in one shared dialog, behaviour already
  set by EPC-011

## Summary

On a phone, a Product Lead taps Edit on an item or Product details, changes their mind,
and has to scroll to the foot of the form to find Cancel. This story puts a close
button, an X, at the top right of the roadmap and item dialogs, in view as they open.
It closes as Cancel does: what was typed is dropped, without asking. The conflict review
gets it too; the alert dialogs (Discard changes?, Publish?…) do not. It shows at every
width, scrolls away with the title, and Cancel stays in the footer.

## Acceptance criteria

### S1: The X is in view as an edit dialog opens on a phone

**Given** a Product Lead on a phone-width screen, on a roadmap's page
**When** they choose Edit on an item whose form is taller than the screen
**Then** a close button shows at the top right of the dialog, on the title's row,
without scrolling
**And** focus is in the form's first field, as before

### S2: The X closes the dialog as Cancel does

**Given** the item dialog open, with a field changed
**When** the Product Lead chooses the close button
**Then** the dialog closes without asking, the change is dropped, no pending edit is
kept, and focus returns to the Edit button that opened it

### S3: Every form dialog has it

**Given** each of: adding a roadmap, editing product details, adding an item, editing
an item
**When** that dialog opens
**Then** it shows the close button, which closes it as S2 says

### S4: It is named in both languages

**Given** a dialog open, in English and then in Welsh
**When** a screen reader reaches the close button
**Then** it is announced as a button named "Close" ("Cau" in Welsh), and the icon
itself is hidden from it

### S5: It waits while a roadmap is being added

**Given** a Product Lead has chosen Add roadmap and the write is under way
**When** they choose the close button
**Then** nothing happens: the button is disabled, as Cancel is, and the dialog stays
until the write answers

### S6: It is a stop on the dialog's keyboard tour

**Given** a form dialog open, focus in its first field
**When** the Product Lead tabs forward from the last control in the footer
**Then** focus wraps to the close button, then the first field; it shows
`focus-visible:focus-fill` while focused

### S7: The conflict review has it (D1)

**Given** a publish refused, with its conflict review open
**When** the Product Lead chooses the close button
**Then** the review closes as its footer Close and Escape do, and focus goes where
they send it

### S8: An alert dialog has none (D1)

**Given** any alert dialog open (Discard changes?, Publish?, a reconnect or session
question)
**Then** it shows no close button; it is left only by its own answers, as now

### S9: It shows at every width and scrolls with the title (D2, D3)

**Given** a form dialog open on a desktop-width screen, and on a phone-width one
**Then** the close button shows at the top right of both
**And** when a long form is scrolled, the close button scrolls away with the title,
and Cancel stays in the footer beside Done or the add button (D4)

## Decisions

- **D1** (owner, 2026-11-18, grilling round 1 Q1): which dialogs → every `Dialog`
  (the four form dialogs and the conflict review); alert dialogs get none. Adds S7, S8.
- **D2** (owner, 2026-11-18, round 1 Q2): which widths → every width. Adds S9.
- **D3** (owner, 2026-11-18, round 1 Q3): once scrolled → the X scrolls away with the
  title; no sticky header. S9.
- **D4** (owner, 2026-11-18, round 1 Q4): Cancel stays in the footer. S9.
- **D5** (owner, 2026-11-18, round 2 Q5): its name → "Close" / "Cau", the existing
  `common.close`. S4.
- **D6** (owner, 2026-11-18, asked whether to restore shadcn's X; agent recommended,
  owner proceeded): restore upstream shadcn's corner close button in `DialogContent`
  (Base UI flavour, `showCloseButton`, lucide `XIcon`) over a hand-rolled X in
  `FormDialog`, with one departure: its hidden "Close" comes from the caller as a
  prop, since `components/ui` carries no copy (ADR-010). The title keeps clear of it.

## Starting point

Audited at `7192646`. `DialogContent` in `components/ui/dialog.tsx` removed upstream
shadcn's corner close button on purpose, because `components/ui` carries no copy
(ADR-010): the X's name has to come in from the caller (a prop or a slot), not a
`t()` call inside the primitive. The navigation drawer's "Close menu" X is the look to
match. The dialog focus-tour tests (CHO-011, DEF-016) count stops, so S6 changes their
expected tours.

## Out of scope

- Asking before dropping typed text, from the X or Cancel: EPC-011 _Closing_ settles it
  as "without asking"; a change would be a new story for both.
- The navigation drawer: it already has an X ("Close menu").
