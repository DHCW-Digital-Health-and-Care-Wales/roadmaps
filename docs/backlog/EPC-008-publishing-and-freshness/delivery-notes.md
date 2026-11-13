# EPC-008 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **The published-state write finds its row by what it holds** (`findLoadedRow` in
  `domain/roadmap/published-state.ts`): every field the page showed, `Last updated`
  included, apart from those with pending edits sent. A write that also sets
  `Last updated` must exempt it there and count it in `heldPublishedState`, or a lost
  answer can't be settled and a co-lead's date reads as "changed".
- **Both repositories run the same planners**: a change to what the write sends goes
  through `findPublishedStateRow`, `planPublishedStateWrite` and
  `heldPublishedState`, and the contract in
  `domain/roadmap/testing/published-state-contract.ts`; the in-memory double holds index
  rows (several may share an id) and fakes sync problems by `syncFaults`.
