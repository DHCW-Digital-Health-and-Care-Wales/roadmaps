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
