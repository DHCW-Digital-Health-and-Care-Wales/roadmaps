# Example spreadsheet (fake data)

These CSVs are the **layout** of the roadmap spreadsheet, filled with **fake example data**:
one file per tab, as the live spreadsheet is laid out. Both apps' tests read them from
here, so a change to the format fails the editor and the public site in the same pull
request. The format is the root README's
[_Spreadsheet format_](../../README.md#spreadsheet-format), analysed in
[the roadmap index analysis](../../docs/analysis/roadmaps-tab-format.md) and
[the roadmap tab analysis](../../docs/analysis/roadmap-tab-format.md), and decided in
[ADR-009](../../docs/adr/ADR-009-roadmap-list-from-the-first-tab.md) and
[ADR-011](../../docs/adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md).

**Never put data from the live spreadsheet in this repository.** Unit tests, E2E fakes and
screenshots use only these files or inline fakes.

| File           | Tab name   | What it shows                                                                                                                                                                                                                            |
| -------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Roadmaps.csv` | `Roadmaps` | The roadmap index (the first tab): the `Enabled` column, categories (one blank, so "Other roadmaps" on the public site), families, both date formats, colours, blank optional cells, a `Product Lead` on two rows, Welsh for one roadmap |
| `ProductA.csv` | `ProductA` | A roadmap tab with every `Horizon` value, phases, labels, nested details, organisations and Welsh `(cy)` columns, some blank                                                                                                             |
| `ProductB.csv` | `ProductB` | A smaller roadmap tab with empty horizons and cards without organisations                                                                                                                                                                |
| `ProductC.csv` | `ProductC` | The tab of a roadmap whose `Enabled` is `No`, so it is not published                                                                                                                                                                     |
| `Template.csv` | `Template` | A stand-in for the live `Template` tab: `ProductA`'s header over two example rows, which the editor copies to start a roadmap (STY-040); the public site never reads it                                                                  |

The live spreadsheet's second tab, `Template`, has the same columns as `ProductA.csv`;
the editor reads its header row alone, to check it, and copies it to start a roadmap
(ADR-011). `Template.csv` is not the live tab's content, which is never put here.

## Who reads them

- The editor's Vitest tests import a file's text with `?raw`, and its E2E Sheets fake
  (`apps/editor/tests/e2e/fixtures/fake-sheets.ts`) reads all five from disk as the
  example spreadsheet: `Roadmaps` first, the roadmap tabs, then `Template`. Both parse
  them with the editor's test CSV reader (`parse-csv.ts`) and apply its writes with its
  `batchUpdate` fake (`apply-batch-update.ts`), both in `apps/editor/tests/fixtures/sheets/`.
- The public site's parser test (`apps/public-site/scripts/parse-roadmap.test.ts`) parses
  `Roadmaps` and the tabs of the roadmaps it publishes, and checks that its E2E data,
  `apps/public-site/e2e/fixtures/roadmaps.json`, matches what they parse to. That JSON is
  rebuilt by hand when they change.

Neither app's build reads them: the editor reads the spreadsheet it is connected to, and
the public site is built from the live spreadsheet (`pnpm site:sync`).

## Changing them

A change to the format updates these files, the root README's _Spreadsheet format_, the
analyses, ADR-009 or ADR-011, and both apps' parsers and tests in the same change. Edge
cases the examples do not cover (missing columns, bad dates, duplicate ids, unknown
categories) belong in inline test data, not in these files, so they stay importable as a
realistic test spreadsheet.

## Trying an app against them

1. Create a spreadsheet you own (never the live one).
2. **File → Import → Upload** `Roadmaps.csv` with **Replace current sheet**, rename the tab
   `Roadmaps` and keep it first.
3. Import each `Product*.csv` with **Insert new sheet(s)**, naming each tab exactly as the
   `Sheet` column of `Roadmaps` does, and `Template.csv` as `Template`, which the editor
   needs to add a roadmap.
4. Optionally add dropdowns (**Data → Data validation**) for the `Horizon` column, the
   `Category` column on `Roadmaps`, and the `Organisations` column (**Dropdown**, with
   **Allow multiple selections**).

Then point an app at it by the id in its URL:

- **The editor**: put the id in `apps/editor/.env.local` (`VITE_GOOGLE_SPREADSHEET_ID`),
  run `pnpm editor:dev` and connect a Google account that can open the spreadsheet.
- **The public site**: share the spreadsheet (**Share → Anyone with the link → Viewer**),
  then run `SHEET_ID=<id> pnpm site:sync && pnpm site:dev`. The sync overwrites
  `apps/public-site/.data/roadmaps.json`, which is ignored.
