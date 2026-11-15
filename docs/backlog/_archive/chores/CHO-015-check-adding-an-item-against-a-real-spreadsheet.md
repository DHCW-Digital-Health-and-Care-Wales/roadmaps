# CHO-015: Publishing a new item is checked against a real test spreadsheet

- **Status**: Done — the owner ran the checks against a test spreadsheet, 2026-11-15; archived
- **Type**: Chore
- **Area**: Infrastructure + Docs
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: STY-045 (hard: its write) and STY-046 (hard: the screen that adds an
  item, which the check is run from), both on the default branch
- **Binding ADRs**: ADR-011, ADR-012
- **Suggested model**: Sonnet — a manual run with four things to look at, and a change
  to how the row is placed only if one fails
- **Delivered**: [#95](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/95)

## Summary

STY-045 publishes a new item as a row appended to its roadmap's tab (`appendCells`), in
the same `spreadsheets.batchUpdate` as the roadmap's other changes. Where Google puts
that row was never seen: the delivery ran against fakes only. A wrong guess shows as a
new item published below blank rows, or as a publish Google refuses, writing nothing.
Done looks like: one publish of new items run against a test spreadsheet (never the
live one), each row of the table below seen, and the fake, the README and STY-045's
record corrected where Google differs. One session can run it with
[CHO-010](CHO-010-check-adding-a-roadmap-against-a-real-spreadsheet.md).

## Measurement

At `61f1e2f`, STY-045's delivery. The fake puts an appended row after the last row
holding any value, as a new family's row and a new roadmap's index row are placed
(STY-029, STY-040), so the three share the guess. A row with no title is skipped by
the editor and by the public site (`docs/analysis/roadmap-tab-format.md`), so a new
item below blank rows still reads last. `batchRequests`
(`src/infrastructure/google-sheets/google-sheets-roadmap-repository.ts`) appends the
rows through `TabWriter.append` (`tab-writer.ts`);
`tests/fixtures/sheets/apply-batch-update.ts` is the fake that stands in for Google.

| Area                           | What the build assumes                                                                                                                            | How to judge                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Where the row goes             | `appendCells` puts it straight after the last row holding a value, whatever formatting or data validation the empty rows below have               | Publish a new item to a tab whose empty rows carry a `Horizon` dropdown and a fill colour; the row follows the last item           |
| A tab copied from `Template`   | The one emptied row STY-040 leaves under the header takes the first new item, as it holds no value                                                | Add a roadmap, then publish a new item to it; the item is in row 2                                                                 |
| Several rows, and a new column | Two `appendCells` requests in one `batchUpdate` land in the order sent, after an `appendDimension` and a header write for a column the tab lacked | Publish two new items, one with a phase, to a tab with no `Phase` column; both rows follow the last item in the order added        |
| A filter or a table on the tab | Nothing: the row is appended as on any tab                                                                                                        | Publish a new item to a tab with a filter on its header, and to one converted to a table; say where the row lands and how it reads |

## Acceptance criteria

### S1: Each assumption is seen, or corrected

**Given** a test spreadsheet whose roadmap tabs are, in turn, one copied from the
`Template`, one with formatted and validated empty rows, one filtered and one converted
to a table
**When** new items are published to each from the editor
**Then** each row of the table is recorded as seen or as different, in this record's
Delivery
**And** where Google differs, the write, the fake and README _What the editor writes_
are changed together, in a PR that says the format changed

## Decisions

## Out of scope

- The live spreadsheet: never used for a check.
- Adding a roadmap's own checks: CHO-010.

## Delivery

- **Owner's check** (2026-11-15): the owner ran the checks of the Measurement table against a test spreadsheet and reported that the write works correctly, without detail on the rows that ask what happens (a protected `Template`, a filter or table on the tab). No row was reported different, so the write, the fake and README _What the editor writes_ are unchanged, and STY-045's record stands.
