# STY-068: A Product Lead closes a dialog from its top corner, without scrolling to Cancel

- **Status**: Done — delivered in the PR below; the owner's grilling of 2026-11-18 settled scope and look
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-017-closing-a-dialog-from-its-top
- **Depends on**: none
- **Binding ADRs**: ADR-005, ADR-008, ADR-010
- **Suggested model**: Sonnet — one control in one shared dialog, behaviour already
  set by EPC-011
- **Delivered**: _(add on delivery)_

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

## Delivery

### Departures

- **D6**: `DialogContent` takes the corner button's hidden name as a required
  `closeLabel`, and a `closeDisabled` for S5, besides upstream's `showCloseButton`
  (default true); the button is `ghost`, `icon-sm`, placed `top-5.5 right-4` so its
  icon ends where the form's right edge does and its centre is the title's, and
  `DialogTitle` gains `pe-10` to keep clear of it (agent: the owner's "title keeps clear
  of it"). It is `DialogContent`'s last child, so it is the last Tab stop (S6).
- **S7**: the conflict review now holds two buttons named "Close", its footer's and the
  corner's, as D5 sets one name for both. Tests tell them apart by their slots
  (`dialog-close` the footer's, `dialog-close-button` the corner's); no spec or test
  queries the bare name "Close" in a review any more (agent).
- **S7**: held by a component test only, not E2E: the review's setup is a co-lead's
  conflict through the page's publish, which `editing.spec.ts` already walks to the
  footer Close (agent).

- **S8**: the session warning, an alert dialog, already draws a corner X of its own
  (`AlertDialogCancel`, "Close"), which this story leaves; S8 holds for the other eight
  alert dialogs, and its E2E test checks the Publish dialog. CHO-024 records drawing
  the two as one (agent, from review; the epic's F2 list of existing X buttons omits it).

### Contract for dependents

- **`DialogContent`** (`components/ui/dialog.tsx`): every `Dialog` shows the corner
  close button, so a new `Dialog` passes `closeLabel={t("common.close")}`;
  `AlertDialogContent` has none (S8). `closeDisabled` holds it while a write is under
  way, as `FormDialog`'s `busy` does.
- **Test hooks**: the button is named "Close" ("Cau"); its slot is
  `dialog-close-button`. Unit: `cornerClose(dialog)` (`features/roadmaps/testing/edit-dialog.ts`)
  and `reviewFooterClose(review)` (`testing/roadmap-page.ts`). E2E: `cornerClose` and
  `reviewFooterClose` in `fixtures/dialogs.ts`. A query for the name "Close" in a
  `Dialog` finds two buttons in the conflict review.
- **Data source**: nothing read or written changes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1, S9   | `tests/e2e/closing-a-dialog.spec.ts` (`on a phone, the close button is at the title's row…`, `on a desktop, …`); screenshots in the PR                                                                                         |
| S2       | `closing-a-dialog.spec.ts` (`the close button closes the item dialog as Cancel does…`); `form-dialog.test.tsx` (`closes the dialog as Cancel does, through the caller`)                                                        |
| S3       | `closing-a-dialog.spec.ts` (`every form dialog has it (S3)`, four tests)                                                                                                                                                       |
| S4       | `closing-a-dialog.spec.ts` (`it is a button named Close…`, `it is named Cau in the Welsh interface`); `form-dialog.test.tsx` (`is named for the %s interface`); `dialog.test.tsx` (`is a button named by the caller's label…`) |
| S5       | `adding-a-roadmap.spec.ts` (`…the fields are held, and the dialog stays…`); `roadmaps-page-adding.test.tsx` (`shows it is working, holding the fields…`); `form-dialog.test.tsx` (`waits while a write is under way…`)         |
| S6       | `closing-a-dialog.spec.ts` (`Tab from the last control in the footer wraps…`); `focus-indicator.spec.ts`: every dialog tour (`expectDialogTour`) now ends on the close button, which shows the fill like each button stop      |
| S7       | `roadmap-detail-page-editing.test.tsx` (`closes from the review's corner close button…`)                                                                                                                                       |
| S8       | `closing-a-dialog.spec.ts` (`an alert dialog has no close button`); `dialog.test.tsx` (`AlertDialogContent has no close button`)                                                                                               |

The component and unit tests were written after the code and each shown red by breaking
the finished code: `disabled` dropped (S5, three tests), the label fixed to English
(Welsh S4), `showCloseButton={false}` on the review (S7), the button drawn before the
form (S6). The icon's `aria-hidden` has no red: lucide sets it itself, so the S4 test
holds either way and the explicit attribute only follows the app's other icons.
