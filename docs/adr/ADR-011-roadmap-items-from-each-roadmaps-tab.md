# ADR-011: A roadmap's items come from the tab its index row names, read by header

- Status: Accepted — owner, 2026-11-10: analysis decisions 1–4, then grilling rounds 1
  and 2 (Options 1–6 below). Amends ADR-002 (a second repository call) and extends
  ADR-009.
- Date: 2026-11-10

## Context

The roadmap detail shows only a roadmap's title. Its items live in the tab its roadmap
index row names (ADR-009), in the format the public site reads, set out in
[the roadmap tab analysis](../analysis/roadmap-tab-format.md). The spreadsheet's
`Template` tab shows the permitted columns, but a roadmap tab's columns may be in any
order, so they are found by header (owner). The format is a contract with the public
site, so the editor reads it the same way, except where the editor must show what the
public site drops so it can be fixed.

## Decision

### What a roadmap item is

```ts
// domain/roadmap/roadmap-placement.ts — where an item appears, in the public site's page order
const ROADMAP_PLACEMENTS = [
  "recently-delivered",
  "now",
  "next",
  "later",
  "delivered-this-year",
  "not-doing",
] as const
type RoadmapPlacement = (typeof ROADMAP_PLACEMENTS)[number]
const ROADMAP_HORIZONS = ["now", "next", "later"] as const // the rest are sections

// domain/roadmap/organisation.ts — the public site's twelve, in its display order
const ORGANISATIONS = [
  "national",
  "abuhb",
  "bcuhb",
  "cavuhb",
  "ctmuhb",
  "hduhb",
  "pthb",
  "sbuhb",
  "vunhst",
  "wast",
  "phw",
  "heiw",
] as const
type Organisation = (typeof ORGANISATIONS)[number]

// domain/roadmap/roadmap-item.ts
interface RoadmapItemDetail {
  text: LocalisedText
  level: number // 0 top level; n nests under the previous shallower entry
}
interface RoadmapItem {
  title: LocalisedText // English never empty
  placement: RoadmapPlacement | null // null: blank or unrecognised; the public site skips it
  writtenHorizon: string | null // when unplaced, the horizon as written ("" if blank); else null
  description: LocalisedText | null
  expectedOutcome: LocalisedText | null // the `Outcome` column
  phase: LocalisedText | null
  tags: LocalisedText[] // the `Labels` column, in cell order, no repeated English
  organisations: Organisation[] // in ORGANISATIONS order, no repeats
  details: RoadmapItemDetail[]
}
```

- Fields take the glossary's names (`tags`, `expectedOutcome`); the sheet's `Labels` and
  `Outcome` headers stay inside the parser.
- Optional text is `null` when its English is blank, lists are `[]` when empty, as for
  `Roadmap` (ADR-009). Text keeps its line breaks; paragraphs and bullets are
  presentation.
- **Every column is modelled** (owner, decision 3), including those this epic shows only
  as plain text.
- **An item with no recognised horizon is kept**, with `placement: null` (owner,
  decision 2): the editor shows it, flagged as not on the public roadmap, with what was
  written in its horizon (Option 5), so the Product Lead knows what to fix. A row with no
  title is skipped: it has nothing to show and the public site skips it too.
- **Placements and organisations are domain vocabularies**, like categories (ADR-009):
  a future API serves the same ids. Placement headings are catalogue copy (ADR-008), worded
  as the values a Product Lead types (`Recently delivered`, `Delivered this year`,
  `Not doing`). An organisation is shown as its standard code (`CAVUHB`, `National`), the
  same in both languages, in `ORGANISATIONS` order whatever was typed (Option 6); an
  unknown code is left out, as the public site does, and recorded as a problem.
- **Items have no id yet** (Option 4). The slice keys them by position. The
  first editing record decides identity, since saving to the right row while a co-lead
  edits (persona A12) depends on it. No tab, row or column reaches the domain.

### Reading the items

- **Columns are found by their row-1 header, never by position** (owner, decision 4),
  matched as on the roadmap index (ADR-009): ignoring case, accents, spaces and
  punctuation, the first of two matching headers winning, and the same Welsh suffixes.
  The two parsers share one header reader.
- The columns and their rules are the public site's (the analysis's _Columns_ table),
  including Welsh labels and details paired with English by position. The `Template` tab
  is a reference, never read: its header is the public site's columns (owner,
  decision 4).
- **A new repository call** (Option 3):
  `listRoadmapItems(roadmapId, options?: { signal?: AbortSignal }): Promise<RoadmapItem[]>`,
  items in row order. The Google adapter makes three sequential reads: the tab list and
  the roadmap index, as `listRoadmaps` does, to find the roadmap's tab by its id, then
  that tab's values with the same parameters. It reads the tab whether or not the
  roadmap is published. Rejected: remembering each id's tab from the last list read
  (stale after a rename, empty after a reload) and reading every tab with the list (a
  cost every list load pays for one roadmap).
- A pure parser in `infrastructure/google-sheets/` returns the items plus **problems**
  (codes with row, column and value; no prose), kept for the later sheet-health view, as
  ADR-009 does for the index.

### Mistakes in a roadmap tab (Options 1 and 2)

| Mistake                                          | Public site             | Editor                                                    |
| ------------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| No roadmap has the id                            | —                       | `AppError('not-found')`                                   |
| The index row names no existing tab              | sync fails if published | `AppError('invalid-data')`; nothing requested for the tab |
| The tab is empty, or its header has no `Title`   | sync fails if published | `AppError('invalid-data')`                                |
| No `Horizon` column                              | sync fails if published | every item kept with `placement: null`; a problem         |
| Blank or unknown `Horizon`                       | row skipped, warning    | item kept with `placement: null`; a problem               |
| Blank `Title`                                    | row skipped, warning    | row skipped; a problem                                    |
| Unknown organisation code                        | code left out, warning  | code left out; a problem                                  |
| Welsh labels or details whose count differs      | Welsh ignored, warning  | Welsh ignored; a problem                                  |
| Welsh header on `Horizon` or `Organisations`     | column ignored, warning | column ignored; a problem                                 |
| A missing optional column, Welsh with no English | blank, warning          | blank or dropped; a problem                               |

A roadmap-tab failure affects that roadmap's detail only; the roadmap list is unchanged.

## Options (owner's choice marked ✅, 2026-11-10, grilling rounds 1–2)

1. **A missing tab, or a tab with no `Title` column**
   - ✅ (a) `invalid-data` for that roadmap. The page shows the title and an
     error where the items would be; the list is untouched. _A Product Lead opens
     Product D, whose tab was renamed, and sees "This roadmap's items can't be read"._
   - (b) The page shows the roadmap with no items and a warning. Lost: easier to miss than
     an error, and indistinguishable from an empty roadmap at a glance.
   - (c) Fail like the public site, also failing the list. Lost: breaks every roadmap for
     one roadmap's mistake.
2. **No `Horizon` column**
   - ✅ (a) every item kept and unplaced, one problem recorded. _The Product
     Lead sees all items in the flagged group and knows something is wrong with
     horizons._
   - (b) `invalid-data`, as for a missing `Title`. Lost: hides items the editor could
     show.
3. **How items are read**
   - ✅ (a) three sequential reads per roadmap (tab list, index, the
     roadmap's tab). Always current; slower to open a roadmap.
   - (b) Remember each id's tab from the last list read, falling back to (a) on a miss.
     Saves two reads. Lost: adapter state that can go stale after a rename.
   - (c) Read every roadmap's tab with the list. Instant roadmap pages. Lost: every list
     load pays for every roadmap.
4. **Item identity**
   - ✅ (a) none now; items keyed by position; the first editing record
     decides. Nothing in the data source changes.
   - (b) Decide now, e.g. a hidden id column. Lost: changes the format the public site
     reads, which needs agreement with its owners, for no benefit to a read-only slice.
5. **What an unplaced item carries**
   - ✅ (a) the text as written in its horizon cell (`"Soon"`, or nothing
     when blank), as item content. _The flagged item shows "Horizon: Soon", so the
     Product Lead knows what to fix._
   - (b) `placement: null` only; the value stays in the parser's problems, which no
     screen shows yet. Lost: the flagged group could only say "no recognised horizon".
6. **How an item's organisations are shown**
   - ✅ (a) The standard codes (`CAVUHB, SBUHB`, `National`) in the fixed order, the same in
     both languages; unknown codes left out and recorded. _A Product Lead sees the codes
     they type._
   - (b) Full names (`Cardiff and Vale University Health Board`). Lost: long, and not
     what the Product Lead types.
   - (c) Short names (`Cardiff and Vale`). Lost: as (b), and inconsistent (`HEIW`).
   - (d) Codes exactly as typed, unknown codes kept and flagged. Lost: the model would
     carry raw text; dropping unknown codes keeps the slice thin, as the public site does.

## Consequences

- Opening a roadmap costs three sequential requests for its items, besides the list's
  two, which the query cache usually already holds. A cache or a batch read can follow if
  it proves slow.
- ADR-002's "no `getRoadmap` until a real need exists" stands: the title still comes from
  the list; the repository gains only `listRoadmapItems`, which ADR-002 records as an
  amendment when STY-020 delivers it.
- The parser duplicates more of the public site's rules; a format change updates both
  analyses, ADR-009, this ADR, `tests/fixtures/sheets/` and the parsers together.
- Item identity, editing and publishing are left to later records.
- Delivered by [EPC-004](../backlog/EPC-004-roadmap-items/README.md).
