# CHO-025: A published removal is checked against a real test spreadsheet

- **Status**: Proposed — STY-070's delivery ran against fakes only, and no one has
  seen Google apply its `deleteDimension`, or its cleared last row, as the editor
  sends them
- **Type**: Chore
- **Area**: Infrastructure + Docs
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: STY-070 (hard: its write, on the default branch); STY-049 (soft: its
  Remove button makes the publishes from the editor; without it, they are made from a
  test build)
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — a manual run with four things to look at, and a change
  to the write or the fake only if one differs

## Summary

STY-070 publishes a removed item by deleting its row (`deleteDimension`) last in the
roadmap's one `spreadsheets.batchUpdate`, the bottom row first, after the cell writes,
row moves, inserts and appends; and, when the removals would leave the tab no row that
is not frozen, it clears the top removed row instead (`updateCells` over the row,
`fields: "*"`). The delivery had no Google account, so the write was never sent to
Google. A wrong assumption shows as the wrong row deleted, a publish Google refuses,
writing nothing, or a roadmap that still reads an item. Done looks like: the publishes
below made to a test spreadsheet (never the live one), each row of the table seen,
and the write, the fake and the README corrected where Google differs. It can run with
[CHO-019](CHO-019-check-a-published-move-against-a-real-spreadsheet.md) and
[CHO-020](CHO-020-check-a-published-order-against-a-real-spreadsheet.md), on the same
spreadsheet.

## Measurement

At STY-070's delivery. `batchRequests`
(`apps/editor/src/infrastructure/google-sheets/google-sheets-roadmap-repository.ts`) sends the
removals through `TabWriter.remove` (`tab-writer.ts`);
`apps/editor/tests/fixtures/sheets/apply-batch-update.ts` is the fake that stands in for Google.

| Area                                  | What the build assumes                                                                                            | How to judge                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A row deleted after moves and inserts | `deleteDimension` with `startIndex` counted after the moves and inserts of the same request deletes that row      | Remove an item below one moved or inserted in the same publish; that item is gone and every other row is there        |
| Several rows deleted                  | Deleting the bottom row first leaves each higher one's index as the request counted it                            | Remove three items whose rows are not together, publish; exactly those three are gone                                 |
| Every item of a copied tab removed    | Google refuses deleting every row that is not frozen; clearing the top removed row with `fields: "*"` is accepted | Add a roadmap, add two items, publish, remove both, publish; the publish succeeds and the roadmap reads with no items |
| A row appended beside the removals    | An `appendCells` before the deletions leaves a row that is not frozen, so deleting every removed row is accepted  | On a roadmap the editor created, remove every item and add one in the same publish; it reads with the new item alone  |

## Acceptance criteria

### S1: Each assumption is seen, or corrected

**Given** a test spreadsheet with a roadmap tab whose header is frozen, and a roadmap
the editor created
**When** the publishes of the table are made
**Then** each row of the table is recorded as seen or as different, in this record's
Delivery
**And** where Google differs, the write, the fake and README _What the editor writes_
are changed together, in a PR that says the format changed

## Decisions

## Out of scope

- The live spreadsheet: never used for a check.
- A moved item's row: CHO-019. A reordered placement and an inserted row: CHO-020.
