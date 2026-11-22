# CHO-019: A published move is checked against a real test spreadsheet

- **Status**: Proposed — STY-051's delivery ran against fakes only; the owner saw each
  request's behaviour on a scratch copy, never the editor's own publish
- **Type**: Chore
- **Area**: Infrastructure + Docs
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: STY-051 (hard: its write, on the default branch)
- **Binding ADRs**: ADR-012, ADR-014
- **Suggested model**: Sonnet — a manual run with five things to look at, and a change
  to the write or the fake only if one differs

## Summary

STY-051 publishes a moved item by writing its `Horizon` cell and moving its row
(`moveDimension`) in one `spreadsheets.batchUpdate`. The owner checked a single
`moveDimension` request on a scratch copy of a roadmap tab (map ticket
[#109](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/issues/109));
the editor's own publish, with cell writes, several moves and an appended row in one
request, was never sent to Google. A wrong assumption shows as a row in the wrong
place, or as a publish Google refuses, writing nothing. Done looks like: the moves
below published from the editor to a test spreadsheet (never the live one), each row
of the table seen, and the write, the fake and the README corrected where Google
differs.

## Measurement

At STY-051's delivery. `batchRequests`
(`src/infrastructure/google-sheets/google-sheets-roadmap-repository.ts`) sends the
moves through `TabWriter.move` (`tab-writer.ts`);
`tests/fixtures/sheets/apply-batch-update.ts` is the fake that stands in for Google.

| Area                         | What the build assumes                                                                                                                               | How to judge                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A cell write, then a move    | An `updateCells` at the row as read, then a `moveDimension` of that row in the same request, leaves the new `Horizon` on the moved row               | Move an item whose row is above its new placement's rows, publish; the item reads last there, with its formatting and the new `Horizon` |
| Several moves in one request | Each `moveDimension` is applied over what the one before it left, so the second move's indexes count the first                                       | Move two items into one placement, the second from a row above the first's, publish; they end in the order moved                        |
| A move, then an appended row | `appendCells` after a `moveDimension` puts the new row after the last row in use, as it stands once the rows have moved                              | Move an item and add a new one to the same placement, publish; the new item reads after the moved one                                   |
| A protected row or cell      | Google answers HTTP 400 `INVALID_ARGUMENT` with "…protected cell or object…" for a move as for a cell write, and the editor shows its own message    | Protect a row from the account that publishes, move that item, publish; the page says a protected part of the spreadsheet stopped it    |
| A destination just after it  | Nothing: the editor never sends a `destinationIndex` equal to the row's own index or the one after it. The fake refuses both; Google was seen on one | Optional: send `moveDimension` with `destinationIndex` equal to `endIndex` from the API reference; say whether Google refuses it        |

## Acceptance criteria

### S1: Each assumption is seen, or corrected

**Given** a test spreadsheet with a roadmap tab whose item rows have a fill, the
`Horizon` dropdown and one row protected from the publishing account
**When** the moves of the table are published from the editor
**Then** each row of the table is recorded as seen or as different, in this record's
Delivery
**And** where Google differs, the write, the fake and README _What the editor writes_
are changed together, in a PR that says the format changed

## Decisions

## Out of scope

- The live spreadsheet: never used for a check.
- Reordering a placement's items: STY-050, whose own write
  [CHO-020](CHO-020-check-a-published-order-against-a-real-spreadsheet.md) checks.
