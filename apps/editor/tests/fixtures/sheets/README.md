# Example spreadsheet (fake data)

These CSVs are the **layout** of the roadmap spreadsheet, filled with **fake example data**.
All but `Template.csv` are copied unchanged from the `sheets/` folder of
[DHCW-Digital-Health-and-Care-Wales/product-roadmaps](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/tree/main/sheets)
(MIT licence, © 2026 Digital Health and Care Wales, kept in [`LICENSE`](LICENSE); commit
`50e67f9`), the public site that
publishes the same spreadsheet. The format is analysed in
[the roadmap index analysis](../../../../../docs/analysis/roadmaps-tab-format.md) and
[the roadmap tab analysis](../../../../../docs/analysis/roadmap-tab-format.md), and decided in
[ADR-009](../../../../../docs/adr/ADR-009-roadmap-list-from-the-first-tab.md) and
[ADR-011](../../../../../docs/adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md).

**Never put data from the live spreadsheet in this repository.** Unit tests, E2E fakes and
screenshots use only these files or inline fakes.

| File           | Tab name   | What it shows                                                                                                                                                        |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Roadmaps.csv` | `Roadmaps` | The roadmap index (first tab): `Enabled` Yes/No, a blank category, both date formats, colours, blank optional cells, a `Product Lead` on two rows, Welsh for one row |
| `ProductA.csv` | `ProductA` | A roadmap tab with every `Horizon` value, phases, labels, nested details, organisations and `(cy)` columns                                                           |
| `ProductB.csv` | `ProductB` | A smaller roadmap tab with empty horizons and cards without organisations                                                                                            |
| `ProductC.csv` | `ProductC` | The tab of a roadmap whose `Enabled` is `No`                                                                                                                         |
| `Template.csv` | `Template` | This repository's own stand-in for the live `Template` tab: `ProductA`'s header over two example rows, which the editor copies to start a roadmap (STY-040)          |

The E2E Sheets fake (`apps/editor/tests/e2e/fixtures/fake-sheets.ts`) serves all five files as the
example spreadsheet: `Roadmaps` first, the roadmap tabs (`Product*.csv`), then `Template`.
The live spreadsheet's second tab, `Template`, has the same columns as `ProductA.csv`;
the editor reads its header row alone, to check it, and copies it to start a roadmap
(ADR-011). `Template.csv` is not the live tab's content, which is never put here.

`apply-batch-update.ts` applies a `spreadsheets.batchUpdate` body to tabs as Google does,
for the Vitest and E2E fakes, and records what the editor must never write.

`parse-csv.ts` reads a file's text into rows of cells, as the Sheets API returns a tab.
Vitest tests import the text with `?raw` (`import csv from "…/Roadmaps.csv?raw"`); Node
code reads it from disk.

## Keeping them in step

If the public repository changes its sheet format, copy the new CSVs here, update the
commit above, the analysis and ADR-009, and adjust the parser and its tests in the same change. Edge
cases the examples do not cover (missing columns, bad dates, duplicate ids, unknown
categories) belong in inline test data, not in these files, so the files stay importable
as a realistic test spreadsheet.

## Importing into a test Google spreadsheet

1. Create a spreadsheet you own (never the live one).
2. **File → Import → Upload** `Roadmaps.csv` with **Replace current sheet**, rename the tab
   `Roadmaps` and keep it first.
3. Import each `Product*.csv` with **Insert new sheet(s)**, naming each tab exactly as the
   `Sheet` column of `Roadmaps` does, and `Template.csv` as `Template`, to add a roadmap.
4. Put the spreadsheet's id in `apps/editor/.env.local` (`VITE_GOOGLE_SPREADSHEET_ID`) to try the app
   against it.
