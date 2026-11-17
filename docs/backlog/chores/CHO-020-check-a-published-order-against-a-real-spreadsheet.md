# CHO-020: A published order is checked against a real test spreadsheet

- **Status**: Proposed — STY-050's delivery ran against fakes only, and no one has
  seen Google apply `insertDimension` as the editor sends it
- **Type**: Chore
- **Area**: Infrastructure + Docs
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: STY-050 (hard: its write, on the default branch)
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — a manual run with four things to look at, and a change
  to the write or the fake only if one differs

## Summary

STY-050 publishes a placement's order as `moveDimension` requests, and a new item that
is not last in a reordered placement as an `insertDimension` followed by its cells, in
one `spreadsheets.batchUpdate`. The delivery had no Google account, so the editor's
own publish was never sent to Google; the owner's check on a scratch copy (map ticket
[#109](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/109))
covered one `moveDimension` alone. A wrong assumption shows as a row in the wrong
place, a new item formatted as the header, or a publish Google refuses, writing
nothing. Done looks like: the publishes below made from the editor to a test
spreadsheet (never the live one), each row of the table seen, and the write, the
fake and the README corrected where Google differs. It can run with
[CHO-019](CHO-019-check-a-published-move-against-a-real-spreadsheet.md), on the same
spreadsheet.

## Measurement

At STY-050's delivery. `batchRequests`
(`src/infrastructure/google-sheets/google-sheets-roadmap-repository.ts`) sends the
moves through `TabWriter.move` and the inserted rows through `TabWriter.insert`
(`tab-writer.ts`); `tests/fixtures/sheets/apply-batch-update.ts` is the fake that
stands in for Google.

| Area                               | What the build assumes                                                                                                           | How to judge                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Several moves within one placement | Each `moveDimension` is applied over what the one before it left, and the rows of other placements between them keep their order | Reorder a placement of four or more items whose rows are not together, publish; it reads in the new order, every other placement as it was |
| A row inserted after moves         | `insertDimension` with `startIndex` counted after the moves puts a blank row before the row then at that index                   | Add an item, put it second in a reordered placement, publish; it reads second there                                                        |
| The inserted row's format          | `inheritFromBefore: false` gives the new row the format, and the `Horizon` dropdown, of the row after it                         | Look at the inserted row: it has the fill and the dropdown of the item row below it, not the header's                                      |
| Cells written to an inserted row   | `updateCells` at the inserted row's index, later in the same request, lands in the new row                                       | The inserted row holds the item's `Item ID`, `Title` and `Horizon`, and no other row changed                                               |

## Acceptance criteria

### S1: Each assumption is seen, or corrected

**Given** a test spreadsheet with a roadmap tab whose item rows have a fill and the
`Horizon` dropdown, and a header row formatted otherwise
**When** the publishes of the table are made from the editor
**Then** each row of the table is recorded as seen or as different, in this record's
Delivery
**And** where Google differs, the write, the fake and README _What the editor writes_
are changed together, in a PR that says the format changed

## Decisions

## Out of scope

- The live spreadsheet: never used for a check.
- A moved item's row and a protected row: CHO-019.
