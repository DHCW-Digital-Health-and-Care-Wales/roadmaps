# STY-023: The repository publishes a roadmap's changes

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features + E2E
- **Epic**: [EPC-005-editing](../../EPC-005-editing/README.md)
- **Depends on**: STY-022 (hard)
- **Binding ADRs**: ADR-012 §"Finding what to write" and §"The repository call",
  ADR-002, ADR-009, ADR-011, ADR-003
- **Suggested model**: Opus — the app's first write to a shared, public data source:
  atomicity, conflict detection and column placement must all be right

## Summary

The repository learns to write. Given a roadmap's pending changes, each with the value it
was edited from, it re-reads the roadmap, refuses if a co-lead changed the same field or
removed an item or the roadmap, and otherwise writes every change, any missing item IDs
and any missing columns in one all-or-nothing request. Nothing visible changes: no
screen calls it until STY-025. The E2E fake learns to accept the write, so later stories
can prove a publish end to end.

## Scope

`domain/roadmap/` (the call and its change and outcome types, ADR-012 outline),
`infrastructure/google-sheets/` (a write method on the client, the adapter's publish, the
tab list read gains each tab's grid size), the in-memory double and the repository
contract, a `features/roadmaps/` mutation hook (not yet used), and the E2E fake. The
README's spreadsheet format section and `docs/analysis/roadmap-tab-format.md` (its "A
row has no id column") gain `Item ID` and what the editor writes; ADR-011's other
format-change duties are met by ADR-012 and STY-022's parser, and `tests/fixtures/sheets/`
stays the public site's copy, without `Item ID` (D8).

## Acceptance criteria

### S1: Changes are written to the right cells

**Given** Product A's index row and tab, and changes to its status label and to two items'
titles and phases, every base equal to the current value
**When** the changes are published
**Then** the outcome is "published", and re-reading shows exactly those values
**And** no other cell changed apart from the `Item ID` column and IDs S6 and S7 add:
Welsh cells, `Last updated`, tags, organisations, details,
other roadmaps' rows and the `Template` tab are byte-for-byte the same

### S2: One request, all or nothing

**Given** changes to the roadmap's text and to items
**When** they are published
**Then** the Google adapter sends one `spreadsheets.batchUpdate`, after its three reads
**And** a failing write (any HTTP error) leaves the spreadsheet unchanged and rejects with
the matching `AppError`, as reads map statuses

### S3: Text is stored as typed

**Given** a change whose value is `=SUM(A1)`, `42`, `1/2` or `TRUE`
**When** it is published
**Then** the cell holds that exact string, not a formula, number, date or boolean
**And** clearing an optional field writes an empty cell
**And** a value with spaces or a line break at its ends is written trimmed

### S4: Items are found by ID wherever their row moved

**Given** an item edited while on row 4, and a co-lead has since inserted a row above it
**When** the change is published
**Then** the item's new row is written, found by its `Item ID`
**And** if a co-lead has copied the row, so its ID is on two rows, the change is written
to the first of them while it holds the loaded content, and the same write gives the
copy a new ID; if the first no longer holds it, the item is reported as not found and
nothing is written (ADR-012 Option 13)

### S5: An item without an ID is found only if unchanged

**Given** an item loaded without an ID at position 3 among the kept items
**When** the change is published and position 3 still holds exactly the loaded content
**Then** that row is written
**And** if position 3 holds anything other than the loaded content, or that content with
the pending edits applied (S12), the item is reported as not found and nothing is
written (ADR-012 Option 13)

### S6: IDs are assigned on every publish

**Given** a tab where some kept rows have no ID and one repeats an earlier ID
**When** any change to that roadmap is published
**Then** each of those rows gains a new ID unique in the tab; the first of the duplicates
keeps its own
**And** an ID is short, random, and cannot read as a number, a date, a boolean or a
formula

### S7: A missing column is added last

**Given** a tab with no `Item ID` (or no `Phase`) column, whose widest row ends at its
grid's last column
**When** a change needing it is published
**Then** the grid grows and the column is added after the last column any row uses,
headed `Item ID` (or the public site's English header), in the same request
**And** no existing column moves; the same holds for a missing column of the roadmap
index

### S8: A co-lead's change to the same field stops everything

**Given** a pending title whose base is "A" and whose value is "B", and the current
title is "C"
**When** the changes are published
**Then** nothing is written and the outcome lists that field with its base, pending and
current values
**And** a current value equal to the pending value ("B") is not a conflict, and a
co-lead's change to a field not edited is not a conflict and is not overwritten

### S9: Missing items and a missing roadmap are outcomes

**Given** an edited item whose ID is no longer in the tab, or a roadmap whose index row is
gone
**When** the changes are published
**Then** nothing is written and the outcome names what could not be found
**And** a tab that can no longer be read (`invalid-data`) rejects as `listRoadmapItems`
does

### S10: Refusals and an expired session reject

**Given** the data source answers the write with 403, or the token has expired
**When** the changes are published
**Then** the call rejects with `forbidden` or `unauthenticated`, nothing is retried
automatically, and nothing is written
**And** a call aborted before the write is sent rejects with the signal's reason; once
the write is sent, abort no longer applies and the call waits for the answer

### S11: The E2E fake accepts the write

**Given** an E2E test that publishes through the repository
**When** the fake receives the `batchUpdate`
**Then** it applies it to its spreadsheet, so later reads return the new values, and
records it (`sheets.writes`)
**And** it records a violation for a request outside the agreed shape (another method or
path, a `Template` write, a formula value, a write to a Welsh column)

### S12: A write whose result never arrives is checked

**Given** the `batchUpdate` fails with no HTTP answer (a network failure)
**When** the adapter re-reads the roadmap once
**Then** the outcome is "published" if every written cell holds its new value, and the
call rejects with `network` if none does
**And** the outcome is "unconfirmed" if only some do (a co-lead changed one meanwhile),
or if that re-read fails as well
**And** an item without an ID whose position holds its loaded content with the pending
edits applied is still found, so a publish repeated after an unconfirmed write is not
reported as a missing item

## Tests

S1–S10 and S12 run in the repository contract (in-memory double and Google adapter against MSW),
plus adapter tests for the exact request (S2, S3, S7) and the network failures (S12). S11 is proved by an E2E test that
publishes from the page in STY-025; this story adds a fake unit test or a minimal
fixture-level spec.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q4, Q17): a roadmap's edits are written together,
  all or nothing → S2.
- **D2** (owner, 2026-11-11, grilling Q15, Q16): conflicts are field-level and any
  conflict publishes nothing → S8.
- **D3** (owner, 2026-11-11, grilling Q13, Q23, Q30): IDs are assigned to every kept row
  on any publish; an item without an ID is matched by position plus exact content, and
  is treated as not found otherwise → S5, S6, S9.
- **D4** (owner, 2026-11-11, grilling Q28): a missing column is appended with the public
  site's English header → S7.
- **D5** (owner, 2026-11-11, grilling Q8, Q14): `Last updated` and the `Template` tab are
  never written → S1.
- **D6** (agent, 2026-11-11): `updateCells` with `userEnteredValue.stringValue` over
  `values.batchUpdate` with `RAW`, because only `spreadsheets.batchUpdate` also carries
  `appendDimension` and is atomic across both tabs (S2, S3, S7).
- **D7** (agent, 2026-11-11): a conflict, a not-found and an unconfirmed write are
  outcomes, not `AppError`s, so the page can show each without a catch (ADR-012).
- **D8** (agent, 2026-11-11, from Opus review): the example data stays a copy of the
  public site's files, so it has no `Item ID`; the first publish in a test adds it, which
  exercises S6 and S7. ADR-011 asks a format change to update the fixtures; this is the
  stated exception.
- **D9** (owner, 2026-11-11, grilling Q32, Q33, Q34, raised in review): the first row
  with a copied ID is the item while it holds what was loaded, and the copy gets a new
  ID; a write whose answer is lost is re-read once and is published, `network` or
  unconfirmed; values are trimmed on confirm so a written value reads back equal
  (ADR-012 Options 16, 17) → S3, S4, S12.

## Starting point

Audited at `8479405`:

- `createSheetsClient` sends only `GET` with `fields` (`getJson`); a write needs `POST`
  with a JSON body and the same token, abort and status mapping.
- The metadata mask is `sheets(properties(sheetId,title,index,hidden))`; publishing also
  needs `gridProperties(rowCount,columnCount)`. Reads do not, but sharing one mask keeps
  one fake path.
- Values are read with the default `FORMATTED_VALUE`; a base value is compared with that,
  so compare formatted to formatted.
- `tests/e2e/fixtures/fake-sheets.ts` answers non-`GET` with 404 (`#readOf`).
- `README.md` §"Spreadsheet format" and its note on "planned editing features" describe
  the format the editor reads; both change here.

## Out of scope

- Any screen: STY-025 and STY-026.
- Writing Welsh, tags, organisations, details or placement: later records.

## Delivery

### Departures

- **No change, no write.** D3's "IDs on any publish" applies to a publish that writes:
  when every pending value already equals the current one (an item's no-op changes are
  skipped), the outcome is `published` and no request is sent, so an unchanged roadmap
  never gains IDs from a Save that changed nothing.
- **S11** is met by a fake unit test (`tests/fixtures/sheets/apply-batch-update.test.ts`)
  and a fixture-level spec (`tests/e2e/sheets-writes.spec.ts`) that sends the write from
  the page; the publish from a screen is STY-025's.

### Contract for dependents

- **Domain** (`@/domain/roadmap/roadmap-changes`): `RoadmapChanges = { roadmap, items }`;
  `roadmap` maps `EDITABLE_ROADMAP_FIELDS` (`title`, `statusLabel`, `productLead`,
  `vision`, `serviceDescription`) and each `ItemChanges = { item, position, fields }`
  maps `EDITABLE_ITEM_FIELDS` (`title`, `description`, `expectedOutcome`, `phase`) to a
  `FieldChange = { base, value }`, both strings, `""` for none. `item` is the item as
  loaded and `position` its 0-based place among the loaded items. `base` is the value
  when the field was first edited (STY-025's store keeps it); a blank `title` value
  throws `AppError('unknown')`, so the screen must not send one.
- **Port**: `RoadmapRepository.publishRoadmapChanges(roadmapId, changes, { signal }?)`
  resolves a `PublishOutcome`:
  - `{ status: "published" }`, also when nothing differed;
  - `{ status: "refused", conflicts: FieldConflict[], missingItems: ItemChanges[] }`
    (nothing written); a `FieldConflict` is `{ subject: "roadmap", field }` or
    `{ subject: "item", item: ItemChanges, field }` plus `base`, `pending` (trimmed) and
    `current`; `missingItems` are the very `ItemChanges` objects passed in;
  - `{ status: "roadmap-not-found" }` (nothing written);
  - `{ status: "unconfirmed" }` (the answer was lost and one re-read could not settle
    it; the changes may be written).

  It rejects with `AppError`s as reads do (`invalid-data` for an unreadable tab, or a
  roadmap whose `Sheet` names `Template` or the roadmap index itself,
  `forbidden`, `unauthenticated`, `network` when a lost write is found not applied) and
  with the signal's reason when aborted before the write is sent.

- **Rules** (`planRoadmapPublish`, `@/domain/roadmap/publish-plan`, shared by both
  repositories): values are trimmed; a field is written when its trimmed value differs
  from the current one; it conflicts when the current value differs from both its base
  and the value; an item is found by `item.id` (the first row holding it; when the ID
  is repeated, only while that row holds the loaded content) or, with no ID, at
  `position` while it holds the loaded content, Welsh included, either check also
  accepting that content with the pending English applied (S12) (`findEditedItem`,
  `find-edited-item.ts`); a change whose trimmed value equals its base is
  ignored, and an item with no other change is skipped; every kept
  item without an ID (or with a repeated one) gets a new `createItemId()` (8 characters,
  a consonant first, no vowels, `0` or `1`), unique among every ID in the tab. A lost
  write's re-read (`heldWrites`) finds each written item by the ID it holds once
  written, never by its place, as rows may have moved.
- **Hook**: `usePublishRoadmapChanges(roadmapId)` (`features/roadmaps/hooks/`) is a
  `useMutation` with `retry: false` whose `onSettled` re-reads the list and the
  roadmap's items, so they are fresh when `mutateAsync` settles. `createQueryClient`'s
  `onUnauthenticated` now hears mutations too (a `MutationCache`).
- **Google adapter**: three reads as `listRoadmapItems` (the metadata mask now asks for
  `gridProperties(rowCount,columnCount)`), then one `POST
…/spreadsheets/{id}:batchUpdate` through the client's new `postJson`: an
  `appendDimension` (`COLUMNS`) per tab short of columns, then one `updateCells` per cell
  with `userEnteredValue.stringValue` (empty object to clear) and
  `fields: "userEnteredValue"`. Columns are found by header (`columnIndexes`); a missing
  one goes after the last column any row uses, its English header written in row 1, in
  the order first needed. The write takes no abort signal.
- **E2E fake**: `sheets.writes` holds each `batchUpdate` body, applied through
  `tests/fixtures/sheets/apply-batch-update.ts`, which records a violation for a write
  to `Template`, a Welsh column, `Last updated`, an unchanged cell, a non-string value,
  other `fields` or added rows; any other method or path is a violation too.
- **Data-source format**: the editor writes the cells above and nothing else (README
  §"Spreadsheet format", `docs/analysis/roadmap-tab-format.md`).

### Scenario evidence

The repository contract (`src/domain/roadmap/testing/roadmap-repository-contract.ts`,
"publishing a roadmap's changes") runs every case below against the in-memory double and
the Google adapter (MSW, stateful fake applying writes with `applyBatchUpdate`).

- **S1**: "writes the changed English only, keeping Welsh and every other field"; the
  adapter's "writes only the changed cell, an Item ID column and every item's ID,
  leaving all else as it was" compares every tab cell for cell.
- **S2**: adapter "sends one batchUpdate after the three reads, as JSON with the token";
  contract "rejects with a forbidden/unauthenticated AppError when the write is refused,
  writing nothing"; `sheets-client.test.ts` `postJson` status mapping.
- **S3**: contract "writes values exactly as typed, trimmed, and clears a field set to
  blank" (`=SUM(A1)`, `42`, `1/2`, `TRUE`); adapter "sends every value as text and a
  cleared field as an empty cell".
- **S4**: contract "finds an item by its ID after its row has moved", "writes to the
  first row of a copied ID and gives the copy its own", "refuses an item whose copied
  ID's first row no longer holds what was loaded"; `publish-plan.test.ts` (a Welsh
  difference refuses both an ID-less and a copied-ID item).
- **S5**: contract "finds an item without an ID at its position while it holds what was
  loaded", "refuses an item at its position whose Welsh differs, though its English is
  the pending edit", "treats an item already holding the pending values as published".
- **S6**: contract "gives every item without an ID a new one, all different";
  `item-id.test.ts` (alphabet, length, uniform sampling); adapter "gives no new ID that a
  skipped row already holds".
- **S7**: adapter "a missing column (S7)": after the last used column inside a wide
  grid, and growing a grid that ends there, in the same request.
- **S8**: contract "refuses a field a co-lead changed, writing nothing", "publishes a
  field a co-lead set to the same value, and keeps fields not edited";
  `publish-plan.test.ts`.
- **S9**: contract "refuses an edited item that is no longer there", "says a roadmap
  that is no longer listed is not found", "rejects with invalid-data when the roadmap's
  items cannot be read".
- **S10**: contract 403/401 rejections and "rejects with the abort reason when the
  signal is already aborted, writing nothing"; adapter "failures and cancellation
  (S10)": session ended before the write, cancelled during the reads, published
  regardless once sent, no retry; `use-publish-roadmap-changes.test.tsx` (no retry, a
  401 expires the session); `query-client.test.ts` (mutations report
  `unauthenticated`).
- **S11**: `apply-batch-update.test.ts` (applies in order, rejects a bad body whole,
  each violation) and `tests/e2e/sheets-writes.spec.ts` (a write is applied, recorded
  and shown after Refresh; violations recorded).
- **S12**: contract "when the write's answer is lost": published, `network`,
  unconfirmed on some, unconfirmed when the re-read fails; `publish-plan.test.ts`
  `heldWrites` (an item found by its ID after rows moved; an item gone holds nothing,
  even when another item now has its place).
- **D5** (never `Template`): adapter "which tabs it writes (S1)": a roadmap whose tab is
  `Template` or the index fails with `invalid-data` and sends no write.
