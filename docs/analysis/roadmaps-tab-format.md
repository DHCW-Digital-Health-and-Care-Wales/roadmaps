# The roadmap index format the public site uses

- **Date**: 2026-11-10
- **Question**: which roadmaps exist, and what do we know about each one, according to the
  shared data source? Today the editor treats every visible worksheet as a roadmap.
- **Source**: DHCW's public site,
  [product-roadmaps](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps),
  at commit `50e67f9`. It publishes the same spreadsheet this editor is configured with
  (`VITE_GOOGLE_SPREADSHEET_ID`). Files read: README "Sheet format", `sheets/*.csv`,
  `scripts/parse-roadmap.ts`, `scripts/roadmap-schema.ts`, `scripts/sync-roadmaps.ts`,
  `src/lib/types.ts`, `src/lib/content.ts`, `src/lib/text.ts`.

## Findings

### The roadmap index is the first tab, not the set of worksheets

The public site reads the spreadsheet's **first tab** (named `Roadmaps` by convention; its
gviz CSV export with no `sheet` parameter returns the first tab). Row 1 is the header and
every other non-blank row is one roadmap. The row's `Sheet` cell names the tab that holds
that roadmap's items. Any other tab is never read. So the editor's current list, one
card per visible worksheet named after its tab, is wrong: it includes the index tab
itself and any scratch tab, names roadmaps by tab rather than title, and drops a roadmap
whose tab is hidden.

### Header matching

- Headers are matched ignoring case, accents, spaces and punctuation (`fold` = NFKD, strip
  combining marks, lower case; then drop non-alphanumerics). Unknown columns are ignored.
  When two headers match the same column, the first wins (a warning).
- A Welsh column is the English header plus a Welsh suffix:
  `/^(.+?)[\s([\-_]+(?:cy|cym|cymraeg|welsh)[\s)\]]*$/i` (`Title (cy)`, `Title (Welsh)`,
  `Title - Cymraeg`). Only `Title`, `Family`, `Status label`, `Vision` and
  `Service description` may have one; a Welsh header for any other column is ignored with
  a warning. A blank Welsh cell falls back to English; Welsh with no English is dropped
  with a warning.
- Every cell is trimmed. Rows with every cell blank are skipped.

### Columns

| Column                      | Meaning                                           | Rules in the public site                                                                                                                                   |
| --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Sheet`                     | The tab holding the roadmap's items               | **Required column**: missing fails the sync. A row with a blank `Sheet` is skipped. Its slug is the roadmap's URL.                                         |
| `Enabled`                   | Whether the public site publishes the roadmap     | Exactly `Yes` (case-sensitive) publishes. `No` or blank does not. Any other value does not, with a warning. A missing column publishes nothing.            |
| `Title` (+cy)               | The roadmap's name                                | Blank falls back to the `Sheet` value.                                                                                                                     |
| `Category`                  | The landing page group                            | One of six values, matched like headers. Blank or unknown (warning) means "Other roadmaps". No Welsh column.                                               |
| `Family` (+cy)              | Optional product family, e.g. `Single Record`     | Shown above the title with a swatch in the roadmap's colour; the roadmap page heading reads `Family: Title`.                                               |
| `Status label` (+cy)        | Badge text, e.g. `Beta`                           | Free text.                                                                                                                                                 |
| `Last updated`              | Date                                              | `YYYY-MM-DD` or `DD/MM/YYYY`, checked to be a real date; anything else is blanked with a warning.                                                          |
| `Colour`                    | Highlight colour                                  | `#rgb` or `#rrggbb` only, so sheet text can't inject CSS; anything else warns. Default `#325083`.                                                          |
| `Vision` (+cy)              | "Our vision" on the roadmap page                  | Optional. Blank shows a general intro sentence instead. Lines become paragraphs; lines starting `- ` form a bullet list.                                   |
| `Service description` (+cy) | "Our value" on the roadmap page; the card summary | Optional; blank hides it. Same line rules as `Vision`.                                                                                                     |
| `Product Lead`              | Who leads the product                             | Added in `50e67f9`. Free text, trimmed, shown as "Product lead" under the roadmap page title; blank hides it. No Welsh column: a name is the same in both. |

Categories, in the public site's display order, with Welsh names from its `content.ts`:

| Sheet value                  | Id                         | Welsh                                   |
| ---------------------------- | -------------------------- | --------------------------------------- |
| `Public Health & Apps`       | `public-health-apps`       | Iechyd y Cyhoedd ac Apiau               |
| `GP & Community Services`    | `gp-community-services`    | Meddygon Teulu a Gwasanaethau Cymunedol |
| `Tests, Scans & Results`     | `tests-scans-results`      | Profion, Sganiau a Chanlyniadau         |
| `Urgent & Emergency Care`    | `urgent-emergency-care`    | Gofal Brys ac Argyfwng                  |
| `Hospital & Specialist Care` | `hospital-specialist-care` | Gofal Ysbyty ac Arbenigol               |
| `National Systems & Data`    | `national-systems-data`    | Systemau a Data Cenedlaethol            |
| _(blank or unknown)_         | "Other roadmaps"           | Trywyddion eraill                       |

### Identity, ordering and failures

- A roadmap's URL slug is its `Sheet` value folded, non-alphanumerics collapsed to `-`,
  leading and trailing `-` trimmed (`ProductA` → `producta`).
- The landing page groups roadmaps by category in the order above, with "Other roadmaps"
  last, and sorts by title within each group.
- The sync **fails as a whole**, leaving the previous site live, when the index has no
  `Sheet` column, or no roadmap is enabled, or, **among enabled rows only** (disabled rows
  are dropped first): a slug has no letters or digits, two rows share a slug, or a `Sheet`
  names no tab, a colour is `#rgb` (it passes `safeColour`, then fails the snapshot
  schema, which wants six digits), or the named roadmap tab lacks a `Title` or `Horizon`
  column. A disabled row may therefore share a slug with an enabled one. Every other
  problem is a warning in the CI run summary.

### Roadmap tabs

Each roadmap tab holds its items (`Title`, `Description`, `Outcome`, `Horizon`, `Phase`,
`Labels`, `Organisations`, `Details`, with `(cy)` columns). They are out of scope for the
roadmap index; `tests/fixtures/sheets/Product*.csv` keeps examples for the roadmap detail
work.

### Example data

The public repository's `sheets/*.csv` are fake data in this exact layout, MIT licensed.
They are copied to [`tests/fixtures/sheets/`](../../tests/fixtures/sheets/README.md) as the
only data tests may use; nothing from the live spreadsheet is stored in this repository.

## Options

1. **Which roadmaps the editor lists**: (a) every row, badging those not enabled; (b) only
   enabled rows, as the public site does.
2. **Sheet mistakes the public site treats as fatal**: (a) skip or keep the bad row and
   record a problem, so the list still loads; (b) fail the whole list, as the public site
   does.
3. **Arrangement on the main page**: (a) grouped by category, as the public site does;
   (b) one list in row order; (c) one list sorted by title, with the category as a label;
   (d) grouped by product family, then roadmaps with no family (raised by the owner).
4. **`Product Lead`**: (a) one free-text value, as the public site shows it; (b) split
   into a list of names.
5. **Scope**: (a) main page only; (b) also show the roadmap's full information on its
   detail page.
6. **Reading the list**: (a) read the tab list, take the first tab by `index`, then read its
   values; (b) read `A:ZZ` with no tab name, which Google resolves to the first _visible_
   tab and can differ from the public site's first tab.

## Recommendation

1(a), 2(a), 3(a), 4(a), 5(a), 6(a): the editor is where mistakes get fixed, so it should
show everything and fail as little as possible, while speaking the same format as the
public site.

## Decisions needed

| #   | Decision                                     | Recommended | Owner answer (2026-11-10, grilling round 1)            |
| --- | -------------------------------------------- | ----------- | ------------------------------------------------------ |
| 1   | Which roadmaps are listed                    | (a)         | (a) show every row, badge unpublished                  |
| 2   | Fatal sheet mistakes                         | (a)         | (a) keep listing                                       |
| 3   | Main page arrangement                        | (a)         | **(d) grouped by family** (round 2; round 1 chose (c)) |
| 4   | `Product Lead`                               | (a)         | (a) show as written                                    |
| 5   | Scope                                        | (a)         | (a) main page only                                     |
| 6   | Reading the list and other technical choices | (a)         | Left to the agent                                      |

## Outcome

Decided in [ADR-009](../adr/ADR-009-roadmap-list-from-the-first-tab.md) and delivered by
[EPC-002](../backlog/EPC-002-roadmap-list-from-roadmaps-tab/README.md).
