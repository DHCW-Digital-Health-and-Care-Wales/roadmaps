# CHO-037: The item-editing specs hold only what their page tests cannot

- **Status**: Proposed — part of CHO-014 (its D9); the largest E2E saving
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-006, ADR-008
- **Suggested model**: Sonnet — each test is weighed against the page test that may
  hold it
- **Delivered**: _(add on delivery)_

## Summary

The specs for adding, editing and removing an item take 221 s of the E2E suite's 1,215 s
summed. About half of their tests drive an action a Vitest page test already drives, to
the outcome it already asserts: a co-lead's change per field, a cell written per field,
Welsh copy alone. Cutting them, and the repeats that cannot fail alone, saves about
140 s and 1,900 lines, and removes a test that was flaky on `main`. Done looks like: each
item-editing spec asserts what jsdom cannot see, and one round trip per kind of write.

## Measurement

At `9ee767b`, nine specs (`editing`, `adding-an-item`, `quick-add`, `editing-an-item`,
`removing-an-item`, `item-tags`, `field-icons`, `closing-a-dialog`, `pinned-dialog`):
106 tests, 134 runs. Candidates, estimates re-read at delivery (CHO-014 D12), with the
Vitest test that holds each
(`roadmap-detail-page-<name>.test.tsx` as `<name>.test`):

| Candidates                                                                                                                                                                                                                                                           | CI s | Held by                                                                                                                                                                                   | Verdict                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `editing.spec.ts` a co-lead's change per field: `:1463` tags, `:1844` details, `:1114` organisations, `:583` family, `:747` move, `:1011` order, `:371` date, `:399` removed item, `:432` removed roadmap                                                            | ~38  | `tags.test:666`, `details.test:871`, `choosing-organisations.test:252`, `choices.test:312`, `moving.test:443`, `ordering.test:746`, `last-updated.test:360`, `editing.test:1760`, `:1799` | Cut; keep `:303` and the desktop run of `:917`. `:1011` was flaky on `main` |
| `editing.spec.ts` a cell written or a column added per field: `:1065`, `:1092`, `:1358`, `:1422`, `:1689`, `:1789`, and the Welsh-locked `:1486`, `:1515`, `:1907`, `:1936`                                                                                          | ~28  | The fields' page tests; the request shapes in the Sheets adapter's tests                                                                                                                  | One test editing tags, organisations and details, published; keep `:1422`   |
| Welsh copy alone: `editing.spec.ts:1300`, `:1616`, `:2030`; `editing-an-item.spec.ts:181`; `adding-an-item.spec.ts:518`; `field-icons.spec.ts:61`; `closing-a-dialog.spec.ts:169`                                                                                    | ~11  | `choosing-organisations.test:138`, `tags.test:195`, `details.test:258`, `adding.test:1447`, `field-icons.test:305`, `form-dialog.test:35`                                                 | Cut, once the Welsh plural moves down (S2)                                  |
| `adding-an-item.spec.ts:201`, `:251`, `:317`, `:387`, `:567`; `:479` repeats `editing-an-item.spec.ts:148`                                                                                                                                                           | ~14  | `adding.test:845`, `:1098`, `:427`, `:1243`, `:1197`                                                                                                                                      | Cut, `:201` only if the 503 read retry is held elsewhere                    |
| `quick-add.spec.ts`: seven behaviour tests, and three of five Welsh widths                                                                                                                                                                                           | ~11  | `quick-add.test:120`–`:420`, `:511`–`:720`                                                                                                                                                | Cut; keep pointer and touch, the session warning, axe and layout            |
| Repeats that cannot fail alone: the phone runs of `removing-an-item.spec.ts:67`, `:164`, `item-tags.spec.ts:71`, `:89`, `:102`, `field-icons.spec.ts:19`; the no-preference runs of `item-tags.spec.ts:282`, `:312`, `:333`; the phone tail of `editing.spec.ts:917` | ~10  | The other run of each                                                                                                                                                                     | One run                                                                     |
| `editing-an-item.spec.ts:39`, `:113`; `adding-an-item.spec.ts:448`                                                                                                                                                                                                   | ~5   | `editing.test:168`, `:202`, `:223`; focus return in `closing-a-dialog.spec.ts:145`                                                                                                        | Fold click-outside into that loop                                           |
| `pinned-dialog.spec.ts:186`                                                                                                                                                                                                                                          | ~1   | `adding.test:290`                                                                                                                                                                         | Cut                                                                         |

Not settled: whether `adding-an-item.spec.ts:201` is the only test of the real read
retry after a 503; whether `editing.spec.ts:768`'s focus after a move to another
placement races in a real browser; whether the edit dialog's click-outside is held in
jsdom (the add and removal dialogs' are).

## Acceptance criteria

### S1: Each item-editing spec holds what jsdom cannot

**Given** the nine specs above at `9ee767b`
**When** the chore is delivered
**Then** each test left holds layout, focus, timing, the built bundle or a round trip
through the fakes, as `apps/editor/tests/e2e/AGENTS.md` lists them
**And** one round trip remains for each kind of write: a cell, a new column, a moved
row, an appended row, a removed row

### S2: No assertion is lost on the way down

**Given** an assertion only an E2E test cut here makes, such as the Welsh plural
"2 newid heb eu cyhoeddi" on a roadmap's page
**When** the chore is delivered
**Then** a Vitest test makes it, shown red by breaking the code it checks

### S3: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S1, S4, S5, S7 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- Vitest tests that repeat each other in the same files: CHO-041.
- The item dialog's focus tour and scans: CHO-036.
