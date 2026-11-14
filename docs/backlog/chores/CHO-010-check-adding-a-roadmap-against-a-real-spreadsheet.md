# CHO-010: Adding a roadmap is checked against a real test spreadsheet

- **Status**: Proposed — STY-040's delivery had no Google account to run the checks its
  _Starting point_ asks for; they need a person, or an agent given a test spreadsheet
- **Type**: Chore
- **Area**: Infrastructure + Docs
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: STY-040 (its write, on the default branch); easier once STY-041 gives
  it a screen
- **Binding ADRs**: ADR-011, ADR-012
- **Suggested model**: Sonnet — a manual run with five things to look at, and a small
  change to the copy's requests only if one fails
- **Delivered**: _(add on delivery)_

## Summary

STY-040 adds a roadmap by copying the `Template` tab and appending an index row in one
`spreadsheets.batchUpdate`. What Google does with three parts of that write was never
seen: the delivery ran against fakes only, which model Google as its documentation and
error messages describe it. The write was built to hold whichever way each unknown
falls, but a wrong guess shows as an add that fails with nothing written, or as a new
roadmap's tab nobody can edit. Done looks like: one add run against a test spreadsheet
(never the live one), each row of the table below seen, and the fake, the README and
STY-040's record corrected where Google differs.

## Measurement

At STY-040's head. `src/infrastructure/google-sheets/template-tab.ts`
(`copyTemplateRequests`) sends the requests; `tests/fixtures/sheets/apply-batch-update.ts`
is the fake that stands in for Google.

| Area                         | What the build assumes                                                                                                                                           | How to judge                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Rows under a frozen header   | Google refuses to delete every row that is not frozen, so the copy keeps one row under its header, cleared (`updateCells` over the row, `fields: "*"`)           | The add succeeds with the `Template`'s header frozen, and with it not; the new tab has its header and one empty, plain row |
| A hidden `Template`          | Its copy may be hidden, so the write unhides the copy (`updateSheetProperties`, `hidden: false`) when the `Template` is hidden                                   | The new tab shows                                                                                                          |
| A protected `Template`       | Nothing: if the copy takes the protection, the same write's later requests may be refused (nothing written), or a Product Lead may be unable to edit the new tab | Add with the `Template` protected, as the owner and as another editor; say what happens                                    |
| A tab name's length          | 100 characters is the limit, counted in UTF-16 units (`SHORT_NAME_MAX_LENGTH`)                                                                                   | A 100-character short name is added; note what a longer tab name does in the spreadsheet                                   |
| `duplicateSheet`'s chosen ID | Google accepts any unused whole number below 2³¹ as `newSheetId`, and `insertSheetIndex` equal to the number of tabs places the copy last                        | The add succeeds; the tab is last                                                                                          |

## Acceptance criteria

### S1: Each assumption is seen, or corrected

**Given** a test spreadsheet with a `Template` tab, in turn frozen, hidden and protected
**When** a roadmap is added from the editor
**Then** each row of the table is recorded as seen or as different, in this record's
Delivery
**And** where Google differs, the write, the fake and README _What the editor writes_
are changed together, in a PR that says the format changed

## Decisions

## Out of scope

- The live spreadsheet: never used for a check.
