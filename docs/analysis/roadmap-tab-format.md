# The roadmap tab format the public site uses

- **Date**: 2026-11-10
- **Question**: what is a roadmap item, according to the shared data source, and how
  should the editor read a roadmap's items so that the roadmap detail can show them?
  Today the detail page shows only the roadmap's title.
- **Source**: DHCW's public site,
  [product-roadmaps](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps),
  at commit `50e67f9`, the same commit as
  [the roadmap index analysis](roadmaps-tab-format.md). Files read: README "Sheet format",
  `sheets/README.md`, `sheets/Product*.csv`, `scripts/parse-roadmap.ts`,
  `src/lib/types.ts`, `src/lib/content.ts`. The owner described the connected
  spreadsheet's second tab, `Template` (2026-11-10, below).

## Findings

### Where a roadmap's items are

Each row of the roadmap index names, in its `Sheet` cell, the tab that holds that
roadmap's items (ADR-009). The public site reads that tab by name, and only for
published roadmaps; it never reads a tab the index does not name.

The owner reports that the connected spreadsheet's **second tab is `Template`**: it holds
every permitted item column with example rows, and Product Leads copy it to start a new
roadmap. Its header is the public site's item columns, below (owner, Q1). The index does
not name it, so neither app reads it as a roadmap. Every roadmap tab _should_ have the
Template's columns in the Template's order, but nothing enforces that, so a column is
found by its row-1 header, never by its position (owner).

### Header matching

As on the roadmap index: row 1 is the header; headers match ignoring case, accents,
spaces and punctuation; unknown columns (such as `Notes`) are ignored; when two headers
match one column, the first wins. A Welsh column is the English header plus a Welsh
suffix (`Title (cy)`, `Title (Welsh)`, `Title - Cymraeg`). Every cell is trimmed, and
rows whose cells are all blank are skipped.

### Columns

| Column              | Meaning                                           | Rules in the public site                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Title` (+cy)       | The item's heading                                | **Required column**: missing fails the sync. A row with a blank title is skipped with a warning.                                                                                                                                                                                                                                                                           |
| `Horizon`           | Where the item appears                            | **Required column**. One of six values (below), matched like headers. Blank or unknown: the row is skipped with a warning. No Welsh column.                                                                                                                                                                                                                                |
| `Description` (+cy) | What the work is                                  | Optional. Lines become paragraphs; lines starting `- ` form a bullet list.                                                                                                                                                                                                                                                                                                 |
| `Outcome` (+cy)     | What changes when it is done                      | Optional; blank hides it. Same line rules as `Description`. This is the glossary's _expected outcome_.                                                                                                                                                                                                                                                                     |
| `Phase` (+cy)       | A free-text tag above the title, e.g. `Discovery` | Optional.                                                                                                                                                                                                                                                                                                                                                                  |
| `Labels` (+cy)      | Tags                                              | Comma or line separated. Blank entries keep their place (only trailing ones are dropped) so the languages line up; Welsh is paired with English **by position**, a blank or `-` Welsh entry showing the English, and a count mismatch ignores all the Welsh in that cell (warning). Only then are blank and repeated English labels dropped. This is the glossary's _tag_. |
| `Organisations`     | Who the work is for                               | Optional. Comma or line separated codes from a fixed list of twelve, matched like headers; an unknown code is left out with a warning. Shown in the list's order, not the cell's. No Welsh column.                                                                                                                                                                         |
| `Details` (+cy)     | An expandable "What this covers" list             | One entry per line; each leading `-` nests the entry one level deeper. Welsh is paired by position, as for `Labels`, and takes its nesting from the English; a count mismatch ignores the Welsh (warning). Blank entries are dropped after pairing.                                                                                                                        |

`Title`, `Description`, `Outcome`, `Phase`, `Labels` and `Details` may have a Welsh
column; a Welsh header for `Horizon` or `Organisations` is ignored with a warning. A blank
Welsh cell shows the English; Welsh with no English is dropped with a warning.

### Horizon values

The public site calls these _placements_: three horizons and three sections around them.
On its roadmap page they appear in this order:

| Sheet value           | Id                    | Kind    | Public site heading (en / cy)                     |
| --------------------- | --------------------- | ------- | ------------------------------------------------- |
| `Recently delivered`  | `recently-delivered`  | section | Recently delivered / _(none)_                     |
| `Now`                 | `now`                 | horizon | Now / Nawr                                        |
| `Next`                | `next`                | horizon | Next / Nesaf                                      |
| `Later`               | `later`               | horizon | Later / Hwyrach                                   |
| `Delivered this year` | `delivered-this-year` | section | Other work we have delivered this year / _(none)_ |
| `Not doing`           | `not-doing`           | section | Not doing right now / _(none)_                    |

Items keep their row order within a placement.

### Organisations

Codes, in the public site's display order, with its full names (`content.ts`):

| Code       | Id         | English                                       | Welsh                                                      |
| ---------- | ---------- | --------------------------------------------- | ---------------------------------------------------------- |
| `National` | `national` | All Wales (national)                          | Cymru gyfan (cenedlaethol)                                 |
| `ABUHB`    | `abuhb`    | Aneurin Bevan University Health Board         | Bwrdd Iechyd Prifysgol Aneurin Bevan                       |
| `BCUHB`    | `bcuhb`    | Betsi Cadwaladr University Health Board       | Bwrdd Iechyd Prifysgol Betsi Cadwaladr                     |
| `CAVUHB`   | `cavuhb`   | Cardiff and Vale University Health Board      | Bwrdd Iechyd Prifysgol Caerdydd a’r Fro                    |
| `CTMUHB`   | `ctmuhb`   | Cwm Taf Morgannwg University Health Board     | Bwrdd Iechyd Prifysgol Cwm Taf Morgannwg                   |
| `HDUHB`    | `hduhb`    | Hywel Dda University Health Board             | Bwrdd Iechyd Prifysgol Hywel Dda                           |
| `PTHB`     | `pthb`     | Powys Teaching Health Board                   | Bwrdd Iechyd Addysgu Powys                                 |
| `SBUHB`    | `sbuhb`    | Swansea Bay University Health Board           | Bwrdd Iechyd Prifysgol Bae Abertawe                        |
| `VUNHST`   | `vunhst`   | Velindre University NHS Trust                 | Ymddiriedolaeth GIG Prifysgol Felindre                     |
| `WAST`     | `wast`     | Welsh Ambulance Services University NHS Trust | Ymddiriedolaeth GIG Prifysgol Gwasanaethau Ambiwlans Cymru |
| `PHW`      | `phw`      | Public Health Wales                           | Iechyd Cyhoeddus Cymru                                     |
| `HEIW`     | `heiw`     | Health Education and Improvement Wales        | Addysg a Gwella Iechyd Cymru                               |

### Failures

The public site's sync **fails as a whole** when a published roadmap's tab is missing or
lacks a `Title` or `Horizon` column. Every other mistake (blank title, unknown horizon,
unknown organisation, Welsh count mismatch, a Welsh header on a column without Welsh) is
a warning, and the row or value is left out.

### Items have no identity

A row has no id column. The public site needs none: it rebuilds the page from the sheet
on every sync. Editing will need one (to save a change to the right row while a co-lead
edits the same roadmap, persona A12), but showing items does not.

_Since EPC-005 ([ADR-012](../adr/ADR-012-publishing-a-roadmaps-changes.md)):_ the
editor reads an optional `Item ID` column, found by header like the others, and the
public site ignores it. Publishing a roadmap's changes (STY-023) is the editor's only
write, one all-or-nothing `spreadsheets.batchUpdate` holding only:

- the changed English fields (the index row's `Title`, `Status label`, `Product Lead`,
  `Vision`, `Service description`; an item's `Title`, `Description`, `Outcome`,
  `Phase`), as text exactly as typed and trimmed, a cleared field as an empty cell;
- a new ID (eight random lower-case letters and digits, such as `k7q2xwbn`) in every
  kept item row with none or with a repeated one;
- a missing column (`Item ID`, or an edited field's), appended after the last column in
  use with the public site's English header, the grid widened in the same request.

It never writes `(cy)` cells, other columns, unchanged cells, another roadmap's rows or
the `Template` tab. Since STY-036 it writes `Last updated` (a changed date, or today's
when "Mark as updated today" is ticked) as `YYYY-MM-DD` text, or empty; see the README's
_What the editor writes_ for every write since. The example data in `tests/fixtures/sheets/` stays
the public site's copy, without `Item ID` (STY-023 D8).

### Example data

`tests/fixtures/sheets/ProductA.csv`, `ProductB.csv` and `ProductC.csv` are roadmap tabs
in this layout (fake data, MIT). `ProductA` uses every column, every horizon value,
nested details and Welsh columns; `ProductB` has no Welsh columns and no `Recently delivered` or `Not doing` items;
`ProductC`'s header has no `Organisations` column. No fixture is a copy of the
`Template` tab; the owner confirmed its header matches these.

## Options

1. **Which placements the roadmap page shows**: (a) all six, in the public site's order;
   (b) only Now, Next and Later; (c) one list in row order with the horizon as a label.
2. **Items the public site skips** (blank or unknown horizon): (a) show them, flagged as
   not on the public roadmap; (b) skip them and record a problem, as the public site
   does. Rows with no title are skipped either way: there is nothing to show.
3. **How much of an item this slice shows**: (a) model every column, show title, phase,
   description and outcome; (b) model every column and show every field as plain text;
   (c) title only.
4. **The Template tab**: (a) a reference only; the editor's columns are the public
   site's, and the editor never reads the Template; (b) read the Template at run time to
   learn the permitted columns.
5. **Fatal mistakes in a roadmap tab** (missing tab, no `Title` column): (a) the roadmap
   detail shows an `invalid-data` problem for that roadmap only, and the roadmap list is
   unaffected; (b) fail as the public site does. A missing `Horizon` column leaves every
   item unplaced (follows from 2a).
6. **Reading a roadmap's items**: (a) a new repository call that re-reads the tab list
   and the roadmap index to find the roadmap's tab, then reads that tab (three requests);
   (b) the adapter remembers each id's tab from the last list read (two requests, but
   stale after a rename and wrong after a reload deep link); (c) put items in the list
   read (one batch read of every tab on every list load).
7. **Item identity**: (a) none in this epic, items keyed by position, decided by the first
   editing record; (b) derive one now from the row.

## Recommendation

1(a), 2(a), 3(a), 4(a), 5(a), 6(a), 7(a): show the Product Lead everything the public
site shows plus what it silently drops, since the editor is where mistakes get fixed
(as ADR-009 decided for the index), and leave identity to the work that needs it.

## Decisions needed

| #   | Decision                              | Recommended | Owner answer (2026-11-10)                                                              |
| --- | ------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| 1   | Placements shown                      | (a)         | (a) all six, in order                                                                  |
| 2   | Items with a blank or unknown horizon | (a)         | (a) show, flagged                                                                      |
| 3   | Fields shown in this slice            | (a)         | **(b)**: model every column; show labels, organisations and details as basic text too  |
| 4   | The Template tab                      | (a)         | (a) its header is the public site's columns; a column is found by header, not position |
| 5   | Fatal tab mistakes                    | (a)         | (a), grilling round 1                                                                  |
| 6   | Reading items                         | (a)         | (a), grilling round 1                                                                  |
| 7   | Item identity                         | (a)         | (a), grilling round 1                                                                  |

## Outcome

All seven are the owner's (2026-11-10), decided in
[ADR-011](../adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md), Accepted. Grilling
also settled what the analysis did not ask: an unplaced item shows its horizon as
written; organisations show as their standard codes, unknown ones dropped (ADR-011
Options 5 and 6); and the roadmap page's Refresh, "Not published" badge, flagged-group
position, empty state and headings (EPC-004 STY-021 Decisions).
Delivered by [EPC-004](../backlog/_archive/EPC-004-roadmap-items/README.md).

Decision 4 was later refined (owner, 2026-11-14, EPC-011 STY-040 D1): the editor
copies the `Template` tab to start a roadmap and reads its header row to check it. It
still finds a roadmap's columns by that roadmap's own header, and never changes the
`Template` (ADR-011, _STY-040 amendment_).
