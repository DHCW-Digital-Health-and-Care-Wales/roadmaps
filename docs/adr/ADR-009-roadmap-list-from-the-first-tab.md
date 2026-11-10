# ADR-009: The roadmap list comes from the first tab of the connected spreadsheet

- Status: Accepted — owner, 2026-11-10, grilling round 1 (analysis decisions 1–5;
  decision 3 revised in round 2); the
  technical choices (decision 6) were left to the agent by the owner in the same round
- Date: 2026-11-10
- Amends: ADR-002 (the `Roadmap` shape, and what the Google adapter reads)

## Context

The editor lists every visible worksheet as a roadmap (STY-002). The public site, which
reads the same spreadsheet, does not: its first tab lists the roadmaps, one row each, and
each row's `Sheet` cell names the tab holding that roadmap's items. The format is set out
in [the roadmap list analysis](../analysis/roadmaps-tab-format.md). The data source's
format is a contract with the public site, so the editor must read it the same way.

## Decision

### What a roadmap is

```ts
// domain/roadmap/localised-text.ts
type ContentLanguage = "en" | "cy"
interface LocalisedText {
  en: string
  cy: string
} // cy "" means: show the English
function localise(text: LocalisedText, language: ContentLanguage): string

// domain/roadmap/roadmap-category.ts — the public site's six categories, in its order
const ROADMAP_CATEGORIES = [
  "public-health-apps",
  "gp-community-services",
  "tests-scans-results",
  "urgent-emergency-care",
  "hospital-specialist-care",
  "national-systems-data",
] as const
type RoadmapCategory = (typeof ROADMAP_CATEGORIES)[number]

// domain/roadmap/roadmap.ts
interface Roadmap {
  id: string // URL-safe slug, stable for a data source
  title: LocalisedText // English never empty
  published: boolean // the public site shows it
  category: RoadmapCategory | null // null: no category, or one not in the list
  family: LocalisedText | null
  statusLabel: LocalisedText | null
  productLead: string | null // free text as written, e.g. "Alex Jones, Sam Evans"
  lastUpdated: string | null // calendar date, YYYY-MM-DD
  colour: string | null // lower-case #rrggbb; null: the UI's default
  vision: LocalisedText | null
  serviceDescription: LocalisedText | null
}
```

- Optional text is `null` when its English is blank, so no screen renders an empty part.
  Text keeps its line breaks; turning lines into paragraphs or bullets is presentation.
- **No tab, row, cell or column reaches the domain.** The adapter keeps the id → tab
  mapping to itself; the roadmap detail work looks it up again.
- **Product lead is free text** (owner, decision 4): one value, shown as written, never
  split into names. It has no Welsh version.
- **The category vocabulary is domain**, since a future API serves the same ids. Its names
  are catalogue copy (`ADR-008`).
- **The sheet colour is decorative only**: a swatch or border, never text or the
  background behind text, with a theme token when `null`. Sheet colours therefore cannot
  break contrast in either theme.
- **The id is the public site's slug** of the `Sheet` value (`producta`), so a roadmap's
  editor address (`#/roadmaps/producta`) matches its public page. It replaces the numeric
  worksheet id; no address using that was ever published.

### Which roadmaps, in what order

- **Every listed row is a roadmap, published or not** (owner, decision 1). `published` is
  `true` only for an `Enabled` of exactly `Yes`; the UI badges the others.
- **The repository returns the rows in order**; the main page **groups roadmaps by
  product family**, families in localised name order and roadmaps by localised title
  within each, then the roadmaps with no family, by title (owner, decision 3, round 2).
  The category is a label on each card; the public site's grouping by category is not
  used. Families match ignoring case, accents, spaces and punctuation (agent).

### Reading the list (agent, decision 6)

- Two reads through the existing `SheetsClient`: the worksheet metadata it reads today
  (`fields=sheets(properties(sheetId,title,index,hidden))`), then the values of the tab
  with the lowest `index`
  (`/values/{quoted title}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&fields=values`).
  The tab's title is not assumed to be `Roadmaps`. Rejected: reading `A:ZZ` with no tab
  name, which resolves to the first _visible_ tab and can differ from the public site's.
- `FORMATTED_VALUE` returns cells as displayed, matching the public site's CSV export.
- A pure parser in `infrastructure/google-sheets/` applies the analysis's header and
  column rules and returns the roadmaps plus a list of **problems** (codes with row,
  column and value; no prose). Problems are kept for a later sheet-health view; nothing
  shows them yet.

### Mistakes in the list (owner, decision 2)

The editor keeps the list usable where the public site fails its whole sync:

| Mistake                          | Public site       | Editor                                |
| -------------------------------- | ----------------- | ------------------------------------- |
| Two rows with the same slug      | sync fails        | first row kept, later ones skipped    |
| A slug with no letters or digits | sync fails        | row skipped                           |
| `Sheet` names no existing tab    | sync fails        | roadmap kept                          |
| No `Enabled` column              | nothing published | every roadmap listed as not published |
| No roadmap enabled               | sync fails        | listed as not published               |

Each is recorded as a problem. The list fails only when it cannot be read at all: the
spreadsheet has no tabs, the first tab is empty, or its header has no `Sheet` column.
That raises a new `AppError` kind, **`invalid-data`** (not retryable): the data source
answered as expected, but its content is not in the agreed format, so the remedy is to
fix the list, not to retry. `invalid-response` stays for answers that don't match the
API's own schema.

## Consequences

- Two sequential reads per list load instead of one; both are small, and the first gives
  the missing-tab check.
- The parser duplicates the public site's rules. A change to the format updates the
  analysis, this ADR, `tests/fixtures/sheets/` and the parser together.
- The glossary's **Roadmap** and **Roadmap list** entries change when EPC-002 is
  delivered; ADR-002's "each visible worksheet is a roadmap" is amended by this ADR.
- Problems are collected but not shown; a sheet-health view is a later record.
- Delivered by [EPC-002](../backlog/EPC-002-roadmap-list-from-roadmaps-tab/README.md).
