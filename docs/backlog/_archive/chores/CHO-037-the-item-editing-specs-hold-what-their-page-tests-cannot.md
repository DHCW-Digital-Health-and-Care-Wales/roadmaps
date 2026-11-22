# CHO-037: The item-editing specs hold only what their page tests cannot

- **Status**: Done
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

## Delivery

### Departures

- Estimates re-read at delivery (CHO-014 D12), against `f9ce1e34` (CHO-036 merged):
  the nine specs take 133 runs and 189.6 s summed on CI there. After: 83 runs, 50
  fewer; the 65 test names that are gone or renamed took 102.5 s on CI there, of which
  the renamed and trimmed tests (the desktop runs, the double click, the closing loop,
  the combined test) keep about 22 s, so about 80 s summed go. The record's ~140 s
  was measured at `9ee767b` against a 221 s baseline.
- The nine specs go from 4,602 to 3,067 lines (1,872 deleted, 337 inserted);
  `accessibility.spec.ts` gains 12 lines and the Vitest tests 104 (2 deleted). Tests only.
- One round trip per kind of write remains (S1): a cell (`editing.spec.ts` "publishes a
  roadmap's changes in one write", and the combined test below), a new column
  ("adds a Labels column"), a moved row (the order test on a desktop, and
  the Move test), an appended row (`adding-an-item.spec.ts` "a Product Lead adds an
  item in the item dialog") and a removed row (`removing-an-item.spec.ts`).
- The combined test (`editing.spec.ts`, "an item's tags, organisations and details
  together") edits all three fields of "Earlier delivery this year" in one dialog and
  asserts the three cells of its row that the publish changes. It replaces the five
  per-field cell and column tests (the Labels column test stays) and the four
  Welsh-locked ones.
- The Welsh-locked tests are cut as the record says: their page-level behaviour is held
  by `roadmap-detail-page-tags.test.tsx` and `-details.test.tsx` (locked and
  "gained Welsh since read"), the cell shapes by the Sheets adapter's tests and the
  repository contract.
- `editing.spec.ts` "puts an item first … on a phone" is kept: the phone run holds the
  no-sideways-scroll check with an order pending, which the record did not list. Its
  phone run of the co-lead's order test is trimmed to the layout (stacked, no
  sideways scroll), as the record's "phone tail".
- `adding-an-item.spec.ts` "Add and start another" is trimmed to what jsdom cannot
  hold, a double click adding one item as the dialog closes; `editing-an-item.spec.ts`
  keeps "Done sends focus to the card's Edit in the list the item now is in" and the
  session warning over the open dialog.
- The edit dialog's click-outside was not held in jsdom (Not settled): it moves to the
  loop in `closing-a-dialog.spec.ts` that closes each of the four form dialogs, which
  now clicks outside each first. The read hold's click-outside and Tab move into the
  hold test of `accessibility.spec.ts`, in the light theme alone, since nothing there
  differs by theme.
- `quick-add.spec.ts` keeps the Welsh layout at 375 px, the reflow width, and 768 px,
  where Add and Cancel move beside the field (`md`); 640, 1024 and 1280 go, since they
  take the controls of one of the two. "Add more details" is trimmed to where focus
  returns once its dialog closes (to the field as typed, to the new card's Edit, to
  the placement's "Add an item"), which jsdom's instant close cannot hold; its data
  assertions and the tooltip are in `roadmap-detail-page-quick-add.test.tsx`. Every axe
  scan stays (CHO-014 S4), the dialog's among them.
- `adding-an-item.spec.ts:201` (the read after a 503) is cut: the retry policy is held
  by `query-client.test.ts`, the real HTTP failures and back-off by
  `roadmap-errors.spec.ts`, and the hold's states by the page tests and the
  accessibility spec's hold test. It never counted the retries.
- The phone runs of the two removal tests are cut: the dialog and the page's "Add an
  item" have no width-dependent code, and `clickOutside` geometry is the only thing a
  phone could change.
- `editing.spec.ts` "Use theirs drops the pending order" is cut as the record says (it
  was flaky on `main`), which gives up its real-browser check that focus lands on the
  review's Close and then the page's heading once every change is decided; those
  focus moves are held in jsdom by `roadmap-detail-page-editing.test.tsx`. "Keep mine"
  and Publish's focus return stay in the desktop order test.
- Not cut, though near the candidates: the STY-038 tests of the Organisations field
  (the publish half of "Done keeps a choice" goes, since the combined test holds the
  cell), and the tags' and details' phone-width tests, which hold layout.
- Not settled: focus after a move to another placement is held in a real browser by
  "moves by keyboard on a phone, focus staying on the moved card" and by
  `editing-an-item.spec.ts` (Done after a change of placement); both stay.
- Archived records that cite a cut or renamed test stay as they were.

### Cuts and the test that holds each (S5, S9)

| Cut                                                                                                                                                               | Held by                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editing.spec.ts` a co-lead's different tags, details, organisations, family, move                                                                                | `roadmap-detail-page-tags`, `-details`, `-choosing-organisations`, `-choices`, `-moving` tests "shows a co-lead's … beside yours" (the conflict review through the in-memory repository)                              |
| `editing.spec.ts` "Use theirs drops the pending order" (flaky on `main`)                                                                                          | `roadmap-detail-page-ordering.test.tsx` "“Use theirs” drops the pending order"; the review's close focus by `-editing.test.tsx`                                                                                       |
| `editing.spec.ts` the date's review, a removed item, a removed roadmap                                                                                            | `-last-updated.test.tsx`; `-editing.test.tsx` "discards the changes to items a co-lead removed", and its removed-roadmap cases                                                                                        |
| `editing.spec.ts` organisations, tags and details cells, the Organisations and Details columns                                                                    | the fields' page tests; the cell shapes by the Sheets adapter's tests; one round trip by the combined test and "adds a Labels column"                                                                                 |
| `editing.spec.ts` four Welsh-locked tests                                                                                                                         | `-tags.test.tsx`, `-details.test.tsx` (locked, and gained Welsh since read), the repository contract                                                                                                                  |
| `editing.spec.ts` three Welsh copy tests                                                                                                                          | `-choosing-organisations.test.tsx` "is Welsh on the Welsh interface"; `-tags` and `-details` (now asserting "Tynnwyd" and the undo button)                                                                            |
| `editing-an-item.spec.ts` the field values, Cancel and Escape, Welsh                                                                                              | `-editing.test.tsx`; the Welsh plural by `create-i18n.test.ts`; click-outside by `closing-a-dialog.spec.ts`                                                                                                           |
| `adding-an-item.spec.ts` the read hold, the publish dialog beside an edit, the empty panel, Cancel and Escape, the session's end, Welsh, a title only             | `-adding.test.tsx` and `-editing.test.tsx` (hold, conflict, then publish of the new item), `-adding.test.tsx` (panel, Cancel and Escape, Welsh, listed title); the session over a dialog by `editing-an-item.spec.ts` |
| `quick-add.spec.ts` the run, Cancel and Tab, the empty placement, the expired session, the read, and the data half of "Add more details" (its focus returns stay) | `roadmap-detail-page-quick-add.test.tsx` (the empty placement and the tooltip now asserted there)                                                                                                                     |
| `quick-add.spec.ts` three Welsh widths                                                                                                                            | the 375 and 768 px runs                                                                                                                                                                                               |
| the phone runs of two removal tests, three card tests, `field-icons`; the no-preference runs of three compact-row tests                                           | the desktop run, or the `reduce` run, of each                                                                                                                                                                         |
| `closing-a-dialog.spec.ts` Welsh "Cau"; `field-icons.spec.ts` Welsh icons; `pinned-dialog.spec.ts` the note                                                       | `form-dialog.test.tsx`; `roadmap-detail-page-field-icons.test.tsx`; `-adding.test.tsx` (now asserting the note is the body's last child)                                                                              |

Each holder runs against the in-memory repository or through the fakes, so it outlives
the switch from Google Sheets; only a cell, a column or a request shape rests on the
Sheets adapter's tests.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | the nine specs pass; one round trip per kind of write remains (above)                                                                                                                                                                                                                                                                                                                    |
| S2       | red shown by breaking the code each checks: the Welsh plural (`cy.ts` `publish_two`), "Tynnwyd" (`cy.ts`), the empty placement's words and the tooltip text (`en.ts`, `quick-add.tsx`), the new item's publish after a conflict (`use-publish-roadmap-changes.ts`), the note's place (`edit-form.tsx`). The hold's click-outside is held by Base UI's alert dialog and was not shown red |
| S3       | the PR lists each cut and its holder                                                                                                                                                                                                                                                                                                                                                     |
