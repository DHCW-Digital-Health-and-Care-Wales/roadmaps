# EPC-011 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **Adding a roadmap is `RoadmapRepository.addRoadmap`** (STY-040, archived): its
  outcomes, the `AppError`s it rejects with and the domain's checks are in that
  record's _Contract for dependents_. The dialog checks what was typed with
  `checkNewRoadmapInput` and shows the address with `shortNameAddress`; neither is
  restated in `features/`.
- **A hand-made repository double needs `addRoadmap`**: the typecheck names each one. The
  in-memory double (`createInMemoryRoadmapRepository`) adds a roadmap for real, takes
  `noTemplate` to refuse and `write` to fail or lose the answer.
- **An E2E spec that replaces `sheets.spreadsheet` keeps a `Template` tab** to add a
  roadmap: the example spreadsheet ends with one, and `withRoadmapIndex` keeps it. An
  add shows in `sheets.reads` as the index and the lists, then `header:Template`, and
  in `sheets.writes` as one `batchUpdate`; the fake records a `Template` read beyond
  its header, or changed, as a violation.
- **Nothing here has met a real spreadsheet yet** (CHO-010): don't write copy or a
  scenario that promises what a copy of a protected or frozen `Template` does.
