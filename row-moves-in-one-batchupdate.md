# How do row moves behave in one Sheets `batchUpdate`?

- **Date**: 2026-11-15
- **Ticket**: [#103](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/103), on the map [#102](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/102); feeds the decision on what publishing writes, [#107](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/107)
- **Sources**: primary only: the Google Sheets API v4 reference and guides, Google's help centres, the Google Visualization API docs, this repository at `HEAD` of the research branch's checkout, and the public site's source ([product-roadmaps](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps) at commit `4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3`, `main` on 2026-11-15). Where a primary source is silent the point is marked **unverified**.

## Question

How do Google Sheets row moves behave when the editor reorders a placement's items in
one all-or-nothing `spreadsheets.batchUpdate`, and should it move rows
(`moveDimension`) or rewrite rows' values in the new order?

1. `moveDimension` index semantics, and how several moves compose with `updateCells`
   and `appendCells` in the same request; is the whole `batchUpdate` atomic?
2. What a moved row carries with it, and what happens to formulas, filters, hidden or
   filtered rows and protected ranges.
3. Whether moving rows of one tab can disturb anything else a Product Lead or the public
   site relies on.
4. The alternative of rewriting each affected row's values in the new order.
5. That the public site orders a placement's items by row order alone.

## Short answer

**Move rows, with one `moveDimension` per out-of-place item, placed after the cell writes
and before the appended rows; do not rewrite rows.**

- The public site orders a placement's items by row order alone, confirmed in its source
  (Finding 5), so changing the order means changing which row comes first: there is no
  order column to write instead.
- A move takes the row's values with it (the reference's worked example), so the edits
  and `Item ID`s written earlier in the same batch, at the re-read's row numbers, travel
  with their rows. The batch is applied in order and atomically (Finding 1).
- A rewrite would have to write every cell of every affected row: `(cy)` cells, unknown
  columns and `Item ID`, which the editor promises never to write
  (`docs/analysis/roadmap-tab-format.md:116`, README _What the editor writes_). It would
  turn formulas, numbers and dates into the text the editor read
  (`google-sheets-roadmap-repository.ts:105-109`). It would leave formatting, notes and
  validation at the old position unless the editor also read and rewrote full cell data.
  It would widen the existing race from "changed cells" to "every cell of every moved
  row". And it would point any formula that references a cell at a different item, as a
  sort does (Google's help centre, Finding 2).
- What a move carries beyond values (formatting, validation, notes, merges, conditional
  formatting, protected and filter ranges, formulas referencing the row) is **not
  documented** by Google. Check it against a scratch spreadsheet before #107's write ships,
  as CHO-015 did for `appendCells`.

## Findings

### 1. Index semantics, composition and atomicity

**`destinationIndex` is measured before the moved rows are removed.** The
`MoveDimensionRequest` reference: _"The zero-based start index of where to move the source
data to, based on the coordinates before the source data is removed from the grid.
Existing data will be shifted down or right … The source dimensions are removed from the
grid, so the data may end up in a different index than specified."_ Its worked example:
`A1..A5` holding `0, 1, 2, 3, 4`, source `ROWS [1..3)`, `destinationIndex` `4`, gives
`0, 3, 1, 2, 4`
([request#MoveDimensionRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#MoveDimensionRequest)).
So, for one row at zero-based index `s`:

- moving **up** to final index `f < s`: `destinationIndex = f`;
- moving **down** to final index `f > s`: `destinationIndex = f + 1` (the example's rows
  1–2 land at 2–3 with destination 4);
- `destinationIndex` `s` or `s + 1` leaves the row where it is. Whether Google accepts or
  rejects such a no-op move is **unverified**: the reference is silent. (Google ignores the
  equivalent no-op for a _sheet_ index, [sheets#SheetProperties](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetProperties),
  but says nothing for rows.) The editor should not send one.

The source is a `DimensionRange`: _"All indexes are zero-based. Indexes are half open:
the start index is inclusive and the end index is exclusive"_, with a `sheetId` and a
`dimension`
([DimensionRange](https://developers.google.com/workspace/sheets/api/reference/rest/v4/DimensionRange)).
One request moves one contiguous block, so a non-contiguous reorder takes several
requests.

Google's "Row & column operations" sample says its request moves _"rows 5–10 to the row
20 position"_ with `startIndex` 4, `endIndex` 10, `destinationIndex` 19
([samples/rowcolumn#move-row-column](https://developers.google.com/workspace/sheets/api/samples/rowcolumn#move-row-column)).
By the reference's before-removal rule those six rows land at zero-based 13–18 (rows
14–19), not at row 20. The sample's prose is loose. Rely on the reference and its worked
example.

**Requests apply in order, and a later request sees the grid as earlier ones left it.**
The `batchUpdate` reference: _"Requests will be applied in the order they are specified.
If any request is not valid, no requests will be applied."_
([batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate#body.request_body.FIELDS)).
The guide: _"Changes are grouped in a batch so that if one request is unsuccessful, none
of the other (potentially dependent) changes are written."_
([guides/batchupdate](https://developers.google.com/workspace/sheets/api/guides/batchupdate)).
Neither page says in so many words that a later request's indices are read against the
grid as left by earlier requests. The editor already depends on that, in production:

- `TabWriter.requests()` sends `appendDimension` (grow the grid) before the cell writes
  that land in the new columns (`src/infrastructure/google-sheets/tab-writer.ts:130-151`);
- ADR-012 records that writing beyond the grid fails without it
  (`docs/adr/ADR-012-publishing-a-roadmaps-changes.md:27-30`);
- `duplicateSheet` is followed by requests that change the copy by its new ID
  (`tab-writer.ts:47-54`, STY-040).

So treat "later requests see earlier moves" as established by the reference's ordering
statement plus the editor's own working writes. The exact index a later request names is
the editor's arithmetic to get right.

**The whole batch is atomic, with one caveat about collaborators.** The `batchUpdate`
reference: _"Each request is validated before being applied. If any request is not valid
then the entire request will fail and nothing will be applied. … it is not guaranteed
that the spreadsheet will reflect exactly your changes after this completes, however it
is guaranteed that the updates in the request will be applied together atomically. Your
changes may be altered with respect to collaborator changes. If there are no
collaborators, the spreadsheet should reflect your changes."_
([batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate)).
How Google alters a batch against a collaborator's concurrent edit, for example a
co-lead typing into a row as it moves, is **unverified**: the reference doesn't say.

**`appendCells`** _"Adds new cells after the last row with data in a sheet, inserting new
rows into the sheet if necessary"_
([request#AppendCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest)).
Neither it nor `moveDimension` has a reply: the `Response` union lists no
`appendCells` or `moveDimension` response
([response](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/response)).
So a later request in the same batch can't learn which row Google appended. It could
only be guessed from the re-read.

**`updateCells`** with `start` writes at a `GridCoordinate`, and `fields` limits what is
changed; the editor sends `fields: "userEnteredValue"`
([request#UpdateCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#UpdateCellsRequest);
`tab-writer.ts:22-28`). A cell write and a later move compose as "write at the old
position, then the row (with its new value) moves", per the worked example's values
moving with their rows.

### 2. What a moved row carries, and what happens around it

| What | Primary source says | Status |
| --- | --- | --- |
| Values | The worked example's values move with their rows ([MoveDimensionRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#MoveDimensionRequest)) | Verified |
| Formatting, data validation, notes | The reference says only "Moves one or more rows or columns" and "the source data". For contrast, `CutPasteRequest` spells out what each `PasteType` takes ("values, formulas, formats, and merges"; validation and conditional formatting separately) ([CutPasteRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#CutPasteRequest)); `moveDimension` has no such list | **Unverified** |
| Row properties (height, hidden) | Rows carry `DimensionProperties`: `hiddenByUser` ("explicitly hidden") and the read-only `hiddenByFilter` ([sheets#DimensionProperties](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#DimensionProperties)). Whether a move keeps them with the row is not stated (`insertDimension` documents inheritance for new rows only, [InsertDimensionRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest)) | **Unverified** |
| Merged cells | Merges are sheet-level `GridRange`s (`Sheet.merges[]`, [sheets#Sheet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#Sheet)). Whether a move adjusts a merge, or rejects moving part of one, is not stated | **Unverified** |
| Conditional formatting | Rules are sheet-level (`Sheet.conditionalFormats[]`, same page) and apply to ranges. Whether a rule's range follows a moved row is not stated, nor on the help page ([support 78413](https://support.google.com/docs/answer/78413)) | **Unverified** |
| Formulas elsewhere that reference the row | No Google page found says what a row move does to references. The help centre's move instructions are silent ([support 54813](https://support.google.com/docs/answer/54813), [Learning Center 9300022](https://support.google.com/a/users/answer/9300022)). The nearest statement is about _sorting_: "sorting the filtered range won't change the formula. For example "=B2" will continue to be "=B2"" ([support 3540681](https://support.google.com/docs/answer/3540681)) | **Unverified** for moves |
| Basic filter, filter views | Both are sheet-level objects with ranges (`Sheet.basicFilter`, `Sheet.filterViews[]`, [sheets#BasicFilter](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#BasicFilter), [#FilterView](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#FilterView)). How a move inside a filtered range behaves, or moving a row hidden by a filter, is not stated | **Unverified** |
| Protected ranges | `ProtectedRange` has `warningOnly` ("every user can edit … except editing will prompt a warning") and read-only `requestingUserCanEdit` ([sheets#ProtectedRange](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#ProtectedRange)); the help centre's "Restrict who can edit" ([support 1218656](https://support.google.com/docs/answer/1218656)). Whether a move of, into or out of a protected range the user can't edit is refused, and whether the range follows the row, is not stated | **Unverified**. Any refusal fails the whole batch (Finding 1), so it publishes nothing rather than half |

The editor writes only plain text into item rows (`tab-writer.ts:9-12, 162-176`), and a tab
copied from the `Template` gets row 1 frozen (`tab-writer.ts:61-66`, STY-040). A reorder only ever moves item rows (index ≥ 1) among item rows, so the header
and the frozen boundary are never a source or a destination.

### 3. Can moving one tab's rows disturb anything else?

- **The public site** reads the first tab, then each published roadmap's tab by name,
  through the Visualization API's CSV export (`gviz/tq?tqx=out:csv&headers=1&sheet=…`)
  ([sync-roadmaps.ts L31-L50, L84-L99](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/sync-roadmaps.ts#L31-L99)).
  It finds columns by row-1 header, keeps the remaining rows in order and drops blank ones
  ([parse-roadmap.ts L244-L261](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/parse-roadmap.ts#L244-L261)).
  A move within one item tab changes no other tab and no header. It changes the row
  order the site shows (intended), and the row numbers its warnings name (harmless). Rows
  of _other_ placements between the moved rows shift by one but keep their relative
  order, which is all the site reads (Finding 5). Whether the CSV export includes rows
  that are hidden or hidden by a filter is not stated by the Visualization API's
  spreadsheet docs
  ([chart/interactive/docs/spreadsheets](https://developers.google.com/chart/interactive/docs/spreadsheets)):
  **unverified**. Moves and rewrites leave that question the same.
- **The editor itself** finds an item with an ID by its ID, and one without an ID "at
  its position among the kept items, and only if that item still holds exactly the content
  that was loaded" (`docs/adr/ADR-012-publishing-a-roadmaps-changes.md:101-108`). STY-045
  chose `appendCells` so that "no row in use moves, so an item without an ID is still
  found by its position" (ADR-012:303-305). A move breaks that invariant, but safely:
  - the same publish gives every kept row without an ID one (Option 6; ADR-012:83-85;
    `batchRequests`, `google-sheets-roadmap-repository.ts:1086-1088`), so after it every
    item it could move has an ID;
  - a co-lead's session that loaded ID-less items before the move finds a different item
    at the old position, fails the content check and publishes nothing for it ("not
    found", Option 13, ADR-012:118-123) rather than writing to the wrong row.
- **Anything else in the spreadsheet** that refers to an item tab's rows by address
  (a summary tab's formula, a named range, a chart, a protected range, a filter view): how
  a move affects it is **unverified** (Finding 2). The editor's model has no such
  dependents. The public site reads none. Whether DHCW's live spreadsheet has any is a
  question for the owner, not the documentation.

### 4. The alternative: rewrite each affected row's values in the new order

What it loses or risks, against moves:

- **It writes cells the editor promises never to write.** To put item B's content in
  item A's row, every column must be rewritten: `Title (cy)` and the other Welsh cells,
  unknown columns such as `Notes`, `Item ID`. The data-source contract says the editor
  "never writes `(cy)` cells, other columns, unchanged cells"
  (`docs/analysis/roadmap-tab-format.md:116-117`; README _What the editor writes_, which
  lists every cell a publish writes). A rewrite is a contract change for the public site
  to sign off.
- **It flattens what it doesn't understand.** The editor reads every cell as displayed
  (`valueRenderOption: "FORMATTED_VALUE"`,
  `src/infrastructure/google-sheets/google-sheets-roadmap-repository.ts:105-109`;
  `sheets-schemas.ts:52-55`). Writing those strings back turns a formula, number, date or
  checkbox into text. Only cell values would move, unless the editor sent
  `fields: "*"`, which first needs a full cell-data read. Formatting, data validation and
  notes would then stay at the old position, attached to a different item. `fields`
  limits what an `updateCells` changes, and a value-only write leaves the rest
  ([UpdateCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#UpdateCellsRequest)).
- **A wider race against a co-lead.** ADR-012 accepts that "a co-lead's change landing
  between the re-read and the write is overwritten", because only changed cells are
  written (ADR-012:428-430). A rewrite writes _every_ cell of every reordered row, so any
  co-lead edit to any of those rows in that window is lost, including Welsh text and
  columns the editor never shows. A move writes no cell, so an edit that landed first
  travels with its row.
- **A co-lead's edit landing on the wrong item.** After a rewrite, the row a co-lead had
  open holds a different item, so a cell they then edit by position lands on that other
  item. Moves keep content and row together. How Google rebases an edit _in flight_
  against a move is **unverified** (Finding 1, the reference's "may be altered with
  respect to collaborator changes").
- **Formula references point at a different item.** By Google's own sorting note, a
  reference to `B2` stays `B2` when the content under it is reordered
  ([support 3540681](https://support.google.com/docs/answer/3540681)), and a rewrite is a
  reorder of content under fixed addresses. With a move, whether references follow is
  **unverified**.
- What it would gain: no unverified `moveDimension` behaviour, and requests the editor
  already sends (`updateCells`). That doesn't outweigh writing every column.

### 5. The public site orders a placement's items by row order alone

**Confirmed from the source.** The analysis says "Items keep their row order within a
placement" (`docs/analysis/roadmap-tab-format.md:69`). The public site's
`parseRoadmap` walks `readTable`'s rows in order and `push`es each kept row onto its
placement's list
([parse-roadmap.ts L503-L540](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/parse-roadmap.ts#L503-L540)).
`readTable` keeps the CSV's row order
([L244-L261](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/parse-roadmap.ts#L244-L261)),
and the page's organisation filter keeps it too: "The items that match the filter, in
order"
([roadmap-helpers.ts L137-L144](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/src/lib/roadmap-helpers.ts#L137-L144)).
The only `.sort(` in its `src/` and `scripts/` sorts _roadmaps_ by title within a
category, not items
([roadmap-helpers.ts L292-L310](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/src/lib/roadmap-helpers.ts#L292-L310)).
Row order is the CSV export's, so it rests on the export returning rows in sheet order,
which the Visualization docs don't state explicitly
([spreadsheets](https://developers.google.com/chart/interactive/docs/spreadsheets)).
The site and the analysis both depend on it.

## How it fits the editor's existing publish batch

Today `batchRequests` builds, for the item tab, `appendDimension` (columns) → header
writes → cell writes (edits, then IDs) → `appendCells` for new items, all at the
re-read's row numbers, after the index tab's requests
(`google-sheets-roadmap-repository.ts:1057-1105`; `tab-writer.ts:130-151`).
Recommended order with moves:

1. Index tab requests (unchanged; another `sheetId`, so moves never shift them).
2. Item tab `appendDimension`, header writes, cell writes and ID writes, **at the
   re-read's row numbers, unchanged**.
3. **Moves**, computed against a local copy of the re-read's row order that each move
   updates as Google will. They come after the writes, so the writes keep the indices
   the editor already computes, and the values written travel with their rows. Putting
   moves first would make every later `updateCells` index a post-move index: two index
   spaces in one batch.
4. `appendCells` for new items, last. Moves only permute rows that are at or above the
   last row with data, so the row Google appends after is the same before and after
   them.

**Index arithmetic.** Reordering a placement's items needs only their relative order to
change; other placements' rows may shift but keep theirs (Finding 5). One simple rule,
on a local array that each move updates: walk the target order; for each item after the
first, if its row is above its predecessor's, move it to just below the predecessor
(`destinationIndex = predecessorIndex + 1`, before removal). Place the first item above the
placement's current first item when it isn't already first (`destinationIndex =
thatIndex`). Skip any move whose destination is `s` or `s + 1`. Worked example, rows
0 header, 1 A (Now), 2 X (Next), 3 B (Now), 4 C (Now), target Now order B, C, A:

| Step | Request | Rows after (0…4) |
| --- | --- | --- |
| B first: B at 3, first Now item A at 1, moving up | `source [3,4)`, `destinationIndex 1` | H, B, A, X, C |
| C after B: C at 4 is below B at 1 | none | unchanged |
| A after C: A at 2 is above C at 4, moving down | `source [2,3)`, `destinationIndex 5` | H, B, X, C, A |

X keeps its place among the Next items. The fake that stands in for Google,
`tests/fixtures/sheets/apply-batch-update.ts`, has no `moveDimension` (its request kinds,
lines 233-246). It would need one, with the before-removal rule, and a contract test
using the reference's own example (`0,1,2,3,4` → `0,3,1,2,4`).

**New items placed mid-placement.** `appendCells` has no reply (Finding 1), so a move of
an appended row would have to guess its index from the re-read's row count. That
reintroduces the guess STY-045 removed: if a co-lead added a row meanwhile, the move
would move their row. Choices for #107:

- (a) a new item goes last in its placement, as now;
- (b) `insertDimension` at its slot plus `updateCells`, after the moves, at an index
  computed like any other write;
- (c) append then move, which this research recommends against.

**ID assignment.** Unchanged and essential: IDs for ID-less kept rows are written in
step 2 and travel with their rows. After the publish every moved item is found by ID,
including when a lost answer is settled by a re-read (Option 16,
`google-sheets-roadmap-repository.ts:626-652`). `heldWrites`
(`src/domain/roadmap/publish-plan.ts:216`) would need to judge an order as held when the
placement's items read in the planned relative order.

**Races.** The moves' indices come from the re-read, like every `updateCells` index, so
they share ADR-012's accepted one-request window (ADR-012:428-430). If a co-lead inserts
or deletes a row in it, both the writes and the moves hit the wrong rows. A move hitting
the wrong row reorders the wrong item, without destroying content, which is milder than
a rewrite overwriting one. Detecting a co-lead's reorder _before_ the write (base order ≠
current order ≠ pending order, as Option 12 treats a field) is #107's decision.

## Risks and unverified points

Each could be settled by a check against a scratch spreadsheet (never the live one),
run like [CHO-015](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/blob/main/docs/backlog/_archive/chores/CHO-015-check-adding-an-item-against-a-real-spreadsheet.md):

1. **What a moved row carries**: formatting, data validation, notes, row height,
   hidden state (Finding 2). Check: format, validate, annotate and hide a row, move it by
   API, read it back with `includeGridData`.
2. **Sheet-level ranges**: merges, conditional-format ranges, basic filter and filter
   views, protected ranges (warning-only and restricted), named ranges. Do they follow,
   stretch or block a move? Does a restricted range the user can't edit fail the batch?
3. **Formulas elsewhere** that reference a moved row: do `=Tab!B3`, `=Tab!$B$3` and a
   range `B2:B10` follow the row? (Google documents only sorting.)
4. **A no-op move** (`destinationIndex` `s` or `s + 1`): accepted, ignored or rejected?
   The editor should not send one either way.
5. **Concurrency**: how Google rebases a co-lead's in-flight edit against a move ("may be
   altered with respect to collaborator changes"). This is hard to test deterministically.
   Treat it as unknown and keep the content checks that make a wrong row fail safe.
6. **The public site's CSV export**: whether it includes hidden or filter-hidden rows, and
   that it returns rows in sheet order. Moves and rewrites leave both the same.
7. **Sample prose**: Google's row/column sample describes its move as "to the row 20
   position", which the reference's rule puts at rows 14–19. Trust the reference.

## Sources

Google, primary:

- Sheets API `Request` reference: [MoveDimensionRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#MoveDimensionRequest), [UpdateCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#UpdateCellsRequest), [AppendCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest), [InsertDimensionRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest), [CutPasteRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#CutPasteRequest)
- [DimensionRange](https://developers.google.com/workspace/sheets/api/reference/rest/v4/DimensionRange)
- [spreadsheets.batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate) and its [Response](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/response) union
- [Sheets resource](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets): `Sheet`, `SheetProperties`, `DimensionProperties`, `ProtectedRange`, `BasicFilter`, `FilterView`
- Guides: [Update spreadsheets (batchUpdate)](https://developers.google.com/workspace/sheets/api/guides/batchupdate), [Row & column operations](https://developers.google.com/workspace/sheets/api/samples/rowcolumn#move-row-column)
- Help centre: [Add or move columns & cells (54813)](https://support.google.com/docs/answer/54813), [Sort & filter your data (3540681)](https://support.google.com/docs/answer/3540681), [Protect, hide & edit sheets (1218656)](https://support.google.com/docs/answer/1218656), [Conditional formatting (78413)](https://support.google.com/docs/answer/78413), [Sheets cheat sheet (9300022)](https://support.google.com/a/users/answer/9300022)
- Visualization API: [Google Spreadsheets data source](https://developers.google.com/chart/interactive/docs/spreadsheets)

DHCW, primary:

- Public site at `4b3354d`: [scripts/sync-roadmaps.ts](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/sync-roadmaps.ts), [scripts/parse-roadmap.ts](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/scripts/parse-roadmap.ts), [src/lib/roadmap-helpers.ts](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/blob/4b3354dce2a9670cddf50f0652ef5e7ea9ab0ba3/src/lib/roadmap-helpers.ts)
- This repository: `src/infrastructure/google-sheets/tab-writer.ts`, `src/infrastructure/google-sheets/google-sheets-roadmap-repository.ts`, `src/infrastructure/google-sheets/sheets-schemas.ts`, `src/domain/roadmap/publish-plan.ts`, `tests/fixtures/sheets/apply-batch-update.ts`, `docs/adr/ADR-012-publishing-a-roadmaps-changes.md`, `docs/analysis/roadmap-tab-format.md`, README _What the editor writes_, `docs/backlog/_archive/chores/CHO-015-check-adding-an-item-against-a-real-spreadsheet.md`
