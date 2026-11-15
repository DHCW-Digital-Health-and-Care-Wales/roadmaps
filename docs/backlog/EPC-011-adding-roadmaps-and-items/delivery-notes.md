# EPC-011 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **Adding a roadmap is `RoadmapRepository.addRoadmap`**: its outcomes, the `AppError`s
  it rejects with, the domain's checks and the doubles' options are in STY-040's
  _Contract for dependents_ (archived), not restated here or in `features/`.
- **A hand-made repository double needs `addRoadmap`**: the typecheck names each one.
- **A new item is `RoadmapChanges.newItems`** (STY-045; its _Contract for dependents_,
  archived, says what `checkNewItem`, `addNewItem` and the pending-edit rules do). A
  hand-written `RoadmapChanges` needs `newItems`: the typecheck names each one, so
  spread `NO_CHANGES`, which is the domain's now (`domain/roadmap/roadmap-changes.ts`),
  as `ItemValues` is.
- **Only a new item's ID says it was published**: a read that holds an item with it
  drops the new item, and a publish skips it, whatever that item then reads. Nothing
  compares its content, and a new item is never a conflict or "not found". A row a
  co-lead has cleared of its title is no item, so a read leaves that new item pending
  until the next publish, which takes it as published and writes nothing.
- **The Sheets fake fails a test whose publish appends a bad row**: one on a tab no
  index row names, or without a title, one of the public site's `Horizon` values, or an
  `Item ID`, in the editor's format, that no other row of the tab holds
  (`tests/fixtures/sheets/apply-batch-update.ts`). A test's new items take their IDs
  from `createItemId`, or use `NEW_CLINIC` and `NEW_LETTERS`
  (`domain/roadmap/testing/test-new-item.ts`).
- **An E2E spec that replaces `sheets.spreadsheet` keeps a `Template` tab** to add a
  roadmap: the example spreadsheet ends with one, and `withRoadmapIndex` keeps it.
- **An E2E spec that needs a roadmap with other items, or none, uses `withTabItems`**
  (`tests/e2e/fixtures/fake-sheets.ts`), or `withTabRows` for a tab's whole rows: it
  does not map over `EXAMPLE_SPREADSHEET` itself.
- **A dialog's closing and focus rules are `FormDialog`'s**, and a form's fields are
  `FormField`, `ChoiceField` and `FixedField`: STY-041's _Contract for dependents_
  (archived) says how each is used. A new dialog passes its form to `FormDialog`; it
  does not handle Escape, a click outside or focus itself.
- **`EditForm` is always a dialog's form** (STY-044): its buttons are the dialog's
  footer, and it leaves Escape and the first focus to `FormDialog`. A form that focuses
  a field as it mounts moves focus before the dialog has noted what opened it, and
  closing then returns focus nowhere; only a form drawn in a dialog already open, as
  after "Add and start another", takes focus itself (`takesFocus`). A field that uses
  Escape itself, as a tag's rename does, stops it reaching the dialog, which closes on
  any Escape it gets.
- **The item dialog's adding form is its editing form** (`ItemForm`, STY-046), over
  an item with nothing in it: a field added to one is in the other. `EditForm` takes
  what differs: the buttons' names and a second button, and a note. No field is
  required but one that says so (`required`), a title included.
- **A dialog is given its `opener`**, the ref of the control that opens it
  (`FormDialog`, `RoadmapDialog`): Safari leaves a clicked button unfocused, so the
  dialog can't find it by where focus was. A test clicks without focusing
  (`fireEvent.click`) to show it. "Add a roadmap" gives none yet (DEF-008).
- **A read can land while a dialog is open**, and drop or change what the dialog
  lists, what opened it or what it will send: each dialog, and each thing one comes to
  show, gets a test of that read, written with it and not left to review. Nothing
  behind an open dialog can be pressed, Refresh included, so the test asks for the
  Refresh first, holds the read, opens the dialog, then lets the read go. On a
  roadmap's page that is `holdRefresh(user, repository)`
  (`features/roadmaps/testing/held-refresh.ts`), and `readAgain(queryClient)` makes a
  further read. Two dialogs are never open at once, and nothing is published while one
  is.
- **The item dialog is the page's, not a card's** (STY-044, STY-046; their _Contract
  for dependents_, archived): the roadmap's page calls `useItemDialog`, since its "Add
  an item" opens the dialog too, and `RoadmapItems` draws it. Editing, it finds its
  item again by card key after every read; the card of the item it edits, or has just
  added, holds its `cardOpener`, so focus goes to that card wherever it now is. A card
  has no form and no hold.
- **A roadmap's page shows `PageItem`s** (`usePageItems`, STY-046): the items read, each
  at its place among them, then the new items, last. A position on the page is a place
  in that list, and `newItemId` says an item is new: its card is tagged "New", with
  Remove, and what Edit and Move change is part of it, never an edit of its own.
  Whatever changes a page's item goes through `editPageItem` or `dropPageItem`, which
  know both kinds. A new item is in no list of items read, so `matchItemChanges` and
  `changedParts` still know edits only.
- **"What changes" is one list, `WhatChanges`** (`editing/what-changes.tsx`, STY-047):
  the publish dialog and "Publish roadmap", when changes go with it, both draw it, the
  edits from `changedParts` and then the new items from `changes.newItems`. A new kind
  of pending change is listed there, not in a dialog.
- **A new item's Edit, Move and Remove wait while it may be published unseen**: while
  a publish of its roadmap is under way, and until a Refresh follows one whose answer
  was lost (`discardable`, the rule "Discard all" has). Nothing is behind a new item,
  so a change made then would be lost as the item read takes its place.
- **Each dialog's tests go through its helpers**: in Vitest
  `features/roadmaps/testing/roadmap-dialog.ts` and `item-dialog.ts`, which share
  `edit-dialog.ts` (with `expectDialogClosed` for a dialog closed another way than
  Done); in Playwright `openEditRoadmapDialog`, `editRoadmapButton`,
  `openEditItemDialog`, `editItemButton`, `openAddItemDialog`, `addItemButtons` and
  `addItem` (`tests/e2e/fixtures/dialogs.ts`). Each takes the language, English or
  Welsh, but `editRoadmapText` and `editItemText`, which are English only. A test
  that needs a new item pending adds one with `addItem` (`item-dialog.ts`), which
  opens the adding form, fills it and waits for the dialog to go.
- **While a dialog is open, the page behind it is out of reach of role queries**, in
  Vitest as in Playwright: wait for a heading of the page before reading `main`.
- **`user.selectOptions` matches an option's text as HTML**, so a name with `&` never
  matches: pass the option's element.
- **A dialog's tests share their setup, not copy it** (CHO-011, whose _Contract for
  dependents_ says how each piece is used). Playwright: `tests/e2e/fixtures/dialogs.ts`
  opens a dialog and clicks outside it, and holds each dialog's names and way in, so
  the next dialog's go there; `expectDialogTour` (`focus-indicator.spec.ts`) tours one.
  Vitest: the family and category lists are `domain/roadmap/testing/test-lists.ts`, and
  `holdCall` (`features/roadmaps/testing/held-call.ts`) holds a write or a read open.
- **A dialog's Playwright journey runs once**, at the default size and theme: the
  owner cut the add-a-roadmap journey from four runs to one and dropped its check of
  where the dialog sits (CHO-011 D5), and the accessibility spec and the focus tour
  already open a dialog in both themes. The epic's _The dialogs_ ("a story cites this
  rule and tests it", of a dialog on a phone), STY-046's Tests note ("in both themes
  and at phone width") and the phone in STY-043 S5, STY-044 S6 and STY-046 S9 predate
  that, and the owner decided (2026-11-14) that the rule holds for the dialogs of
  STY-043, STY-044 and STY-046: write the journey once, with no run per theme or
  width and no check of where a dialog sits; where a story's scenario or note says
  otherwise, this note governs, and the story's report says so.
