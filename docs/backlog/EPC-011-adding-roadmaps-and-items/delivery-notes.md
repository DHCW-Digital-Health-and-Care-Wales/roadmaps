# EPC-011 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **Adding a roadmap is `RoadmapRepository.addRoadmap`**: its outcomes, the `AppError`s
  it rejects with, the domain's checks and the doubles' options are in STY-040's
  _Contract for dependents_ (archived), not restated here or in `features/`.
- **A hand-made repository double needs `addRoadmap`**: the typecheck names each one.
- **An E2E spec that replaces `sheets.spreadsheet` keeps a `Template` tab** to add a
  roadmap: the example spreadsheet ends with one, and `withRoadmapIndex` keeps it.
- **Nothing here has met a real spreadsheet yet** (CHO-010): don't write copy or a
  scenario that promises what a copy of a protected `Template` does.
