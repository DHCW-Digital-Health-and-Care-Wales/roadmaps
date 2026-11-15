# STY-041: A Product Lead adds a roadmap

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-040 (hard, must be on the default branch)
- **Binding ADRs**: ADR-009, ADR-012, ADR-013, ADR-003, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — the app's first dialog form, whose closing and focus
  rules three later stories reuse, with six refusals to show at their fields
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/75

## Summary

A Product Lead starts a new roadmap from the roadmap list instead of the spreadsheet.
"Add a roadmap" opens a dialog asking its title, a short name suggested from the title
(the end of its public address), and optionally its product family, category and
product lead. Adding writes it at once, not published, and the Product Lead lands on
the new roadmap's page with a notice. A short name already in use or a missing
template is said at the dialog, which keeps what was typed. Adding items is STY-046;
editing "About this roadmap" in this dialog is STY-043.

## Scope

The dialog primitive (shadcn CLI, Base UI) and the roadmap dialog in its adding form,
the action on the roadmap list, the hook that calls STY-040's write, and the landing
notice (`features/`, `components/ui/`); copy in both catalogues. No change to the
domain or the adapter.

## Acceptance criteria

### S1: The roadmap list offers "Add a roadmap"

**Given** Sam is connected and the roadmap list has loaded, with roadmaps or with none
**When** the page shows
**Then** an "Add a roadmap" button sits with Refresh, and the empty list offers it too
**And** while not connected, or while the session has expired, the button is
unavailable, as "Publish changes" is

### S2: The dialog asks five things (round 1 Q1, round 2 Q2)

**Given** Sam chooses "Add a roadmap"
**When** the dialog opens
**Then** it asks for a title and a short name, both required, and a product family, a
category and a product lead, each optional, with "No family" and "No category" chosen
**And** it says the roadmap starts not published, with no items, and that the public
site doesn't show it until it is published
**And** focus is in the title

### S3: The short name is suggested from the title (round 1 Q2)

**Given** the dialog is open and Sam has not changed the short name
**When** Sam types the title "Community Nursing roadmap"
**Then** the short name reads "Community Nursing": the title without a final
"roadmap", and without any character a short name can't hold
**And** under it the dialog shows how the public address will end
(`community-nursing`), updated as either field changes, and says the short name can't
be changed here later
**And** once Sam changes the short name, it no longer follows the title

### S4: A field that can't be sent says why

**Given** Sam has left the title blank, or typed a short name STY-040's rule refuses
("Community Nursing (Pilot) / 2027"), or one whose address a roadmap in the list
already has
**When** Sam chooses "Add roadmap"
**Then** nothing is sent; each such field shows what is wrong, linked to the field,
and focus moves to the first of them

### S5: Adding shows it is working, then opens the new roadmap (round 2 Q1)

**Given** Sam has filled the dialog in
**When** Sam chooses "Add roadmap"
**Then** the button shows it is working and the fields can't be changed until the
write answers
**And** once added, the dialog closes and Sam is on the new roadmap's page, with a
notice that "Community Nursing roadmap" was added and isn't published yet, its "Not
published" badge, "Publish roadmap", what Sam entered under "About this roadmap", and
no items
**And** the roadmap list shows its card under its family, or under "No product
family", with the count of roadmaps and of unpublished roadmaps one higher each

### S6: A refusal is said where it can be put right (round 2 Q3, round 3 Q3)

**Given** STY-040's write found the short name in use, by a roadmap a co-lead added
meanwhile or by a tab that already has the name
**When** it answers
**Then** the dialog stays with everything Sam typed, and the short name says it is
already in use and to choose another
**And** a family or category that has gone says at its field that it is no longer
listed, and offers the list as it now is

### S7: No usable template, and other failures (round 1 Q7)

**Given** the write rejected because the template for new roadmaps is missing or not
in the expected format
**When** it answers
**Then** the dialog says the roadmap couldn't be added for that reason, and to ask
the spreadsheet owner to check it, and keeps everything Sam typed
**And** a refused, unsent or rate-limited write says what happened and who can put it
right, as a family's failed write does; a write that may have been applied says so
and to refresh the list

### S8: Closing the dialog (round 3 Q2)

**Given** Sam has typed into the dialog and no write is under way
**When** Sam chooses Cancel, presses Escape or clicks outside it
**Then** it behaves as the epic's _The dialogs_ sets, and focus returns to "Add a
roadmap" as it closes

### S9: No family or category list to choose from

**Given** the data source has no usable family list, or no usable category list
**When** the dialog opens
**Then** that field can't be chosen and says so, as the About form does, and the
roadmap is added without it

### S10: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a keyboard or a screen reader
**When** Sam adds a roadmap
**Then** the action, the dialog, its hints, messages and notice are in Welsh; the
suggestion still drops only a final "roadmap" from an English title
**And** the dialog is named by its heading, holds focus while open, links each
message to its field and announces the notice; axe finds nothing in its open and
refused states

### S11: Reconnecting from the dialog

**Given** the session has expired while the dialog is open, before or after Sam chose
"Add roadmap"
**When** Sam looks at the dialog
**Then** it says the session has expired and offers Reconnect inside the dialog, with
"Add roadmap" unavailable; nothing behind the dialog can be reached
**And** once Sam has reconnected, everything typed is still there and "Add roadmap"
is available again

## Tests

S1–S3, S5, S8 and S11 need Playwright against the Sheets fake, in both themes and at
phone width; S6 and S7 can be component tests against the in-memory double.

## Decisions

- **D1** (owner, 2026-11-14, round 1 Q1): the form is a dialog asking the essentials
  (design B), over a title-only form on the list (A, recommended) and a page of its
  own (C).
- **D2** (owner, round 1 Q2): the short name is suggested from the title and may be
  changed, over taking the whole title, squeezing it like `ProductA`, or always
  typing it.
- **D3** (owner, round 2 Q1): after adding, the new roadmap opens (design B), over
  staying on the list (A) or a set-up checklist (C).
- **D4** (owner, round 2 Q2): the five fields as prototyped; status is not asked.
- **D5** (owner, round 3 Q2): Cancel and Escape close and drop the text; a click
  outside does nothing; an expired session keeps the dialog. S8, and the epic's
  _The dialogs_.
- **D6** (owner, round 3 Q3, confirming the agent's choices): anyone connected may
  add; the empty list offers the action; a refusal is shown at its field.
- **D7** (agent): the short name's address is checked against the list as cached
  before sending, and again by the write; over waiting for the write to refuse.
- **D8** (agent): the dialog offers Reconnect itself while the session is expired,
  since it is modal and the header's is out of reach behind it, and Cancel would drop
  the text the owner asked to keep (D5); over closing the dialog to reconnect. S11.

- **D9** (owner, 2026-11-14, CHO-011 D5): the journey that held S1–S3 and S5 in both
  themes, on a desktop and a phone, runs once, without the dialog's geometry: the
  end-to-end suite is getting long. Changes: Tests, and the Playwright runs the
  Scenario evidence cites for S1–S3 and S5.
- **D10** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, recorded by
  [DEF-015](../defects/DEF-015-a-write-the-editor-can-t-read-back-leaves-the-app-out-of-step.md)
  D3): S7's "may have been applied" notice in the dialog ("Cancel, then refresh your
  roadmaps") goes: a lost answer, or a read after the write that fails, holds the
  whole app in a dialog until a Refresh reads the roadmaps. DEF-015 delivered
  it.

## Starting point

Audited at `400c90c`. The About form's family and category fields, with their
unavailable state, come from `use-roadmap-choices.ts`; the family form
(`family-form.tsx`) is the pattern for problems shown by field with focus moved to
the first. Reconnect must call `connect()` inside its own click (ADR-003), and no
dialog offers it today: `family-change-dialog.tsx` only makes its button
unavailable.

## Out of scope

- Adding an item: STY-046. Editing "About this roadmap" in this dialog: STY-043.
- The About panel's new look and the empty state: STY-042.
- A Welsh title: ADR-012 Option 3.

## Delivery

### Departures

- **Scope, "no change to the domain": the suggestion is in the domain** (agent). S3's
  rule is `suggestShortName`, beside `checkShortName` in
  `domain/roadmap/short-name.ts`, so what a short name can hold is written once and
  the suggestion is cut to the same limit. Nothing that existed there changed.
- **S2: the family's label is "Family"** (agent), the About form's, not "Product
  family": one dialog adds and edits (STY-043), so its fields are named once. The
  title, family, category and product lead labels, "No family", "No category" and S9's
  notices are the About form's keys.
- **S9: the notice reads "The family can't be changed right now."** (agent), the
  About form's words under "No family", as S9 asks, rather than new copy saying
  "chosen".
- **S6: a family or category that has gone is put back to none** (agent), with its
  message at the field and the list read again, since the select can no longer show
  it. Adding again without choosing adds the roadmap with none. The same happens
  without a write when a list read again, as after a reconnect, no longer has what was
  chosen (review, Sol): the form never sends a choice it can't show. A field whose
  whole list has gone shows the message with its "can't be changed" notice, and takes
  focus as a group, having no control.
- **S7: "refresh the list" is "Cancel, then refresh your roadmaps"** (agent): the
  dialog is modal, so Refresh is behind it. The list is also read again after every
  add, whatever it came to.
- **S7 and S11: failures and the expired session are said above the buttons** (agent),
  not at the dialog's head: on a phone the dialog scrolls, and the Product Lead has
  just pressed "Add roadmap" at its foot.
- **S11: a Reconnect that Google's window stopped says why in the dialog** (agent),
  blocked or closed, since the page's own notice is behind it. A write the session
  ended under is said once reconnected ("Your session expired before it could be
  added. Try again."), where the family form says nothing.
- **S11: a reconnect Google refuses outright loses the dialog** (agent; review, Sol):
  access denied, or sign-in failing to load, leaves the roadmap list for the start
  page, as any failed connection has since the first sign-in story, and the dialog and
  its text go with the list. Not changed here: what a failed connection shows is the
  owner's to choose,
  [DEF-006](../defects/DEF-006-a-refused-reconnect-drops-the-add-a-roadmap-dialog.md).
- **S5: the notice is said once** (agent; review, Opus): by the page as it opens, until
  the dwell ends or it is dismissed. Going back to the page, or reloading it, says
  nothing, and publishing the roadmap ends it for good.
- **S5: a roadmap this tab had found removed opens when added again** (agent; review,
  Opus): the add tells the pending-edit store the roadmap is listed, as only a read did
  (DEF-003), so its page doesn't say "removed" while the list is read again. Items
  this tab read under the address before the roadmap was removed are forgotten, so
  the new roadmap shows none (review, Sol).
- **S8: Escape pressed in the instant the session warning opens** (agent), before
  focus has reached the warning, is the dialog's Escape and closes it.
- **Tests.** Written first and run red: `suggestShortName` and the whole of
  `roadmaps-page-adding.test.tsx` (32 cases, failing for want of the button). The
  Playwright specs followed working code. The five cases for the review's findings
  followed their fixes; run against the head before the fixes, each fails, which shows
  they discriminate, not that they came first. The case for the forgotten items was
  written first and run red.

### Contract for dependents

- **The dialog primitive** is `src/components/ui/dialog.tsx` (shadcn CLI, Base UI):
  the alert dialog's look, at most 32rem wide, never taller than the screen, and on a
  phone the width of the screen from its foot. It has no corner close button.
  `DialogClose` is the secondary button.
- **`FormDialog`** (`features/roadmaps/dialogs/form-dialog.tsx`) holds the epic's
  _The dialogs_ rules for every dialog: `open`, `title` (its heading names it),
  `busy` (a write under way: Cancel, Escape and a second submit wait) and `onClose`.
  Its child is a function given the heading's id, for the form's `aria-labelledby`;
  the form is drawn afresh at each opening, so closing drops what was typed. A form's
  Cancel is `<DialogClose type="button">`, its buttons sit in `DialogFooter`.
- **`RoadmapDialog`** (`dialogs/roadmap-dialog.tsx`) is the roadmap dialog: `open`,
  `roadmaps` (the list as cached), `onAdded`, `onClose`. Its one form is
  `AddRoadmapForm`, with its state in `useNewRoadmapForm`; STY-043 gives it the
  editing form.
- **Form fields**: `FormField` (`components/form-field.tsx`) is a label, a hint, a
  message (`FieldError`) and a control tied together; `ChoiceField` and `FixedField`
  (`editing/`) are the select chosen from a list and the field shown as it is, which
  takes an `error` and a `ref` for a form that refuses it. The family form, the
  edit form and the adding form all use them; `EditFormOption` is now `ChoiceOption`.
  `useRoadmapChoices(...).fields(null)` gives the family and category fields of a
  roadmap being added.
- **`SessionExpiredAlert`** (`components/session-expired-alert.tsx`) says the session
  has expired and offers Reconnect; its children say what reconnecting is for.
  `RoadmapsErrorState` uses it, and so does the adding form: a dialog that writes at
  once shows it in place of its failure notice while not connected.
- **The write** is `useAddRoadmap()` (`hooks/use-add-roadmap.ts`), with
  `useAddingRoadmap()` for whether one is under way. A roadmap added joins the cached
  list at once; the list is read again after every add, and the family and category
  lists after `choice-not-listed`.
- **The landing notice** travels in the history entry's state (`roadmapAdded`,
  `hooks/use-added-roadmap.ts`): `useOpenAddedRoadmap()` opens the page, and
  `useAddedRoadmapNotice(roadmap)` takes the word, which the entry then forgets. It is
  in memory with the entry, never in the URL.
- **Copy**: `roadmaps.add.*` in both catalogues. Its write failures are
  `roadmaps.writeFailure`, shared with the other writes
  ([CHO-004](../chores/CHO-004-share-the-write-failure-copy.md)). The Welsh is
  machine-assisted, as all of `cy.ts` is.
- **E2E**: the dialog is `getByRole("dialog", { name: "Add a roadmap" })`; while it is
  open the page behind it is out of reach of role queries. The example spreadsheet
  has no family or category list unless a spec adds `EXAMPLE_LISTS`, so by default
  both fields say they can't be changed.

### Scenario evidence

`page` is `src/features/roadmaps/pages/roadmaps-page-adding.test.tsx`; `e2e` is
`tests/e2e/adding-a-roadmap.spec.ts`; `axe` is `tests/e2e/accessibility.spec.ts`
("adding a roadmap: the dialog open, refused, failed and expired…", both themes);
`structure` is `tests/e2e/structure.spec.ts`; `tour` is
`tests/e2e/focus-indicator.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | page "the action (S1)" (three cases); e2e "a Product Lead adds a roadmap and lands on its page", "the empty list offers Add a roadmap too…", "Add a roadmap is unavailable once the session has expired"; structure `main-roadmaps`, `main-empty`, `main-expired` (and `-cy`)                                                                                         |
| S2       | page "asks a title and a short name, and offers a family, a category and a product lead"; e2e the journey, both themes, desktop and phone; structure `add-roadmap-dialog`                                                                                                                                                                                             |
| S3       | `domain/roadmap/short-name.test.ts` (`suggestShortName`); page "the short name (S3)"; e2e the journey                                                                                                                                                                                                                                                                 |
| S4       | page "a field that can't be sent (S4)" (six cases); e2e "a short name in use is said at its field, before sending and by the write"                                                                                                                                                                                                                                   |
| S5       | page "adding (S5)" (eight cases); `hooks/use-add-roadmap.ts` through them; e2e the journey, which holds the write to see it working, then the new page, one write, and the list's card and counts                                                                                                                                                                     |
| S6       | page "a refusal from the write (S6)" (a co-lead's roadmap; a family and a category gone), "a choice the lists no longer offer (S6)" (a whole list gone; a list read again after a reconnect); e2e "a short name in use…" (a tab no roadmap lists)                                                                                                                     |
| S7       | page "a write that failed (S7)" (no template, refused, unsent, rate limited, may have been applied, the next attempt); e2e "a spreadsheet with no template says who can put it right…"                                                                                                                                                                                |
| S8       | page "closing (S8)" (Cancel, Escape); e2e "Cancel and Escape close the dialog and drop what was typed; a click outside does nothing"                                                                                                                                                                                                                                  |
| S9       | page "no list to choose from (S9)"; e2e "the empty list offers Add a roadmap too…"                                                                                                                                                                                                                                                                                    |
| S10      | page "is in Welsh, and still drops only a final “roadmap” from the title"; e2e "adding a roadmap in Welsh"; axe (open, refused, failed, expired, the notice); tour "every control in the Add a roadmap dialog shows DHCW's focus indicator", which ends where it began; structure `add-roadmap-dialog` (the dialog named by its heading, each message with its field) |
| S11      | page "an expired session (S11)" (three cases); e2e "the dialog stays through the session warning, then offers Reconnect itself, keeping what was typed", "a write the session ended under says so, and adds once reconnected"                                                                                                                                         |
