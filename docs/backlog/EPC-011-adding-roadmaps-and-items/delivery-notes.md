# EPC-011 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **Adding a roadmap is `RoadmapRepository.addRoadmap`**: its outcomes, the `AppError`s
  it rejects with, the domain's checks and the doubles' options are in STY-040's
  _Contract for dependents_ (archived), not restated here or in `features/`.
- **A hand-made repository double needs `addRoadmap`**: the typecheck names each one.
- **An E2E spec that replaces `sheets.spreadsheet` keeps a `Template` tab** to add a
  roadmap: the example spreadsheet ends with one, and `withRoadmapIndex` keeps it.
- **An E2E spec that needs a roadmap with other items, or none, uses `withTabItems`**
  (`tests/e2e/fixtures/fake-sheets.ts`), or `withTabRows` for a tab's whole rows: it
  does not map over `EXAMPLE_SPREADSHEET` itself.
- **Nothing here has met a real spreadsheet yet** (CHO-010): don't write copy or a
  scenario that promises what a copy of a protected `Template` does.
- **A dialog's closing and focus rules are `FormDialog`'s**, and a form's fields are
  `FormField`, `ChoiceField` and `FixedField`: STY-041's _Contract for dependents_
  (archived) says how each is used. A new dialog passes its form to `FormDialog`; it
  does not handle Escape, a click outside or focus itself.
- **An edit form in a dialog is `EditForm` with no `onCancel`** (STY-043): its buttons
  are the dialog's footer, and it leaves Escape and the first focus to `FormDialog`. A
  form that focuses a field as it mounts moves focus before the dialog has noted what
  opened it, and closing then returns focus nowhere.
- **Nothing behind an open dialog can be pressed, Refresh included**: a test of a read
  that lands while a dialog is open asks for the Refresh first, holds the read
  (`holdCall`), opens the dialog, then lets the read go.
- **The roadmap dialog's tests go through its helpers**:
  `features/roadmaps/testing/roadmap-dialog.ts` in Vitest, and `openEditRoadmapDialog`
  and `editRoadmapButton` (`tests/e2e/fixtures/dialogs.ts`) in Playwright, each in
  English or Welsh. The item dialog's go beside them.
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
