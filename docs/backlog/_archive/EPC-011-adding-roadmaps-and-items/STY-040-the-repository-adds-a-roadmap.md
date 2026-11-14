# STY-040: The repository adds a roadmap

- **Status**: Done — delivered in its PR, which awaits the owner's merge; no screen
  uses it until STY-041
- **Type**: Feature
- **Area**: Domain + Infrastructure + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-009, ADR-011, ADR-012, ADR-013, ADR-002, ADR-006
- **Suggested model**: Opus — a new write that copies a tab and adds an index row in one
  all-or-nothing request, refused on a fresh read, with a lost answer settled
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/73

## Summary

The roadmap repository can add a roadmap: given a title, a short name and optionally a
family, a category and a product lead, it writes a new entry in the roadmap list and
an empty roadmap copied from the template, together or not at all, not published. It
re-reads first and writes nothing when the short name is in use, a chosen family or
category has gone, or the template is unusable. No screen calls it yet: the dialog is
STY-041. This story also records the change to the format the public site reads: the
editor now adds a roadmap's row and tab, copied from the template, which it never
changes.

## Scope

The rules for a short name and the call that adds a roadmap (`domain/` port, with the
contract test), the Sheets adapter and the in-memory double, and the Sheets fake's
support for copying a tab (`infrastructure/`, `tests/`). README _What the editor
writes_, and the ADR amendments, glossary entries and persona note the epic lists for
this story, in the same PR as the write. No `features/` code and no copy.

## Acceptance criteria

### S1: A short name is checked by one rule (round 2 Q4)

**Given** a short name as typed
**When** the domain checks it
**Then** it is trimmed, and refused when blank, when it holds a character other than
a letter, a number, a space or a hyphen, when its address would be empty, or when it
is longer than 100 characters; a letter with an accent ("Môn") is allowed
**And** its address is the public site's slug of it ("Community Nursing" gives
`community-nursing`), which keeps only `a` to `z` and digits once accents are
folded, so a name of letters with no such form ("ß") has an empty address; two short
names with the same address are the same

### S2: Adding writes the row and the tab together, not published (request; round 1 Q3, Q4, Q8)

**Given** a title "Community Nursing roadmap", the short name "Community Nursing",
the category "GP & Community Services", the product lead "Sam Evans" and no family
**When** the repository adds the roadmap
**Then** one all-or-nothing write adds a row after the roadmap index's last row in
use, with `Sheet` "Community Nursing", `Enabled` exactly `No`, the `Title`, the
`Product Lead`, and the category's `Category ID` and `Category` as a publish writes
a chosen category; a column the row needs and the index lacks is added as a publish
adds one
**And** the same write adds a tab named "Community Nursing", a copy of the `Template`
tab holding its header row alone, after the last tab, and shown even when the
`Template` is hidden
**And** a chosen family is written as a publish writes one (`Family ID`, `Family`,
`Family (cy)`, `Colour`); `Last updated`, the status, the vision, the service
description and every other Welsh cell are left empty; every value is written as
text, trimmed
**And** the call answers with the roadmap as `listRoadmaps` then returns it, with no
items; the `Template` tab is unchanged, and a row a co-lead added meanwhile is kept

### S3: The same title as another roadmap is allowed (round 1 Q9)

**Given** "Outpatient Booking roadmap" is listed
**When** a roadmap with that title and the short name "Outpatient Booking new" is
added
**Then** it is added, and the list holds both

### S4: A short name in use writes nothing (round 2 Q3, round 3 Q3)

**Given** the re-read finds an index row with the same address, published or not,
listed by the editor or not, or a tab with the same name in any letter case, whether
a roadmap's, one no roadmap lists, or `Template`, `Families`, `Categories` or the
roadmap index itself
**When** the repository adds the roadmap
**Then** nothing is written and the outcome says the short name is in use
**And** the repository never lists as a roadmap a tab it did not copy from the
template

### S5: A family or category that has gone writes nothing (round 3 Q3)

**Given** the input names a family, or a category, the re-read list no longer has
**When** the repository adds the roadmap
**Then** nothing is written and the outcome says which is no longer listed

### S6: No usable template writes nothing (round 1 Q7)

**Given** the spreadsheet has no `Template` tab, its header has no `Title` or no
`Horizon` column, or the roadmap index is itself named `Template`
**When** the repository adds the roadmap
**Then** nothing is written and the call rejects with `AppError('invalid-data')`

### S7: Failures, and a write whose answer is lost

**Given** the write is refused, can't be sent or is rate limited, or the session has
expired
**When** the repository adds the roadmap
**Then** it rejects with the `AppError` a family's write gives for the same failure,
and never retries; `signal` cancels only the reads
**And** a write with no HTTP answer is settled by one re-read that looks for this
write, not for the name. The tab with the ID this write chose for its copy is there:
added, since the row and the tab are one write. Otherwise the short name is now in
use, even by a co-lead's roadmap with the same title and values: in use (S4).
Otherwise: `network`
**And** when that re-read fails too, the outcome says the roadmap may have been added

### S8: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S2 to S6 hold for both, and a roadmap added is returned by `listRoadmaps`
and has no items by `listRoadmapItems`

## Tests

S2 and S4–S7 need the adapter against MSW, asserting the requests sent, and the
Sheets fake applying them: a copied tab, its rows removed, and the appended row. S7
needs the case where a co-lead adds a roadmap with the same title and short name
while the answer is lost.

## Decisions

- **D1** (owner, 2026-11-14, the request): a new roadmap is a row in the roadmap index
  and a copy of the `Template` tab, named for the roadmap, with every row but the
  header deleted. The `Template` is copied, and its header is read to check it (S6);
  its rows are never read and it is never changed. This ends "never read" (ADR-011)
  for that alone.
- **D2** (owner, round 1 Q3): written at once, as a family is, over a pending roadmap
  saved later.
- **D3** (owner, round 1 Q4): it always starts not published (`Enabled` `No`), over a
  choice on the form or starting published.
- **D4** (owner, round 1 Q7): no usable `Template` refuses the add, over building a
  plain tab from the columns the editor knows. S6.
- **D5** (owner, round 1 Q8): the example rows are deleted, over emptying them to keep
  their drop-downs and formatting.
- **D6** (owner, round 1 Q9): another roadmap's title may be reused; only the short
  name is unique, so a replacement can be prepared beside the published roadmap. S3.
- **D7** (owner, round 2 Q3): a tab that already has the name is refused, listed by a
  roadmap or not, over listing the existing tab. S4.
- **D8** (owner, round 2 Q4): a short name holds letters, numbers, spaces and hyphens
  only, over anything a tab's name allows. S1.
- **D9** (owner, round 3 Q3, confirming the agent's choices): English only;
  `Last updated` starts blank; the tab goes after the last tab and is shown; row and
  tab are one write; a short name, family or category taken or gone meanwhile writes
  nothing.
- **D10** (agent): the new tab gets no `Item ID` column of its own; a roadmap's first
  publish adds one, as for any tab (ADR-012). The 100-character limit is the one
  Google gives a tab's name; confirm it with the checks in Starting point.
- **D11** (agent): a missing or unusable template is `AppError('invalid-data')`, as
  an unreadable list is, so the domain names no template; over a new outcome.
- **D12** (owner, 2026-11-14, a later request for stories that fit one agent's
  context): the write is this story and its screen STY-041, as STY-032 and STY-034
  split organisations. This replaces "one story for adding a roadmap", which round 3
  Q3 had confirmed.
- **D13** (agent): a lost answer is settled by the copy's own ID, as a family's is by
  its ID (`familyHeld`), over the name or the row's values, which a co-lead's roadmap
  could match. S7.
- **D14** (agent): a short name whose address would be empty is refused, so no
  roadmap is written that the list would then skip; over allowing any name made of
  letters.

## Starting point

Audited at `400c90c`.

- The Sheets fake applies only `appendDimension`, `updateCells` and `appendCells`
  (`tests/fixtures/sheets/apply-batch-update.ts`), and `tests/fixtures/sheets/` has
  no `Template` file, since nothing read it: the story adds both.
- The fake records as violations any request on the `Template` tab and a row appended
  to any tab but `Families` (STY-023 S11). Both guards narrow, and stay: the
  `Template` may be the source of a copy and nothing else, and the roadmap index may
  be appended to.
- `spreadsheets.batchUpdate`'s `duplicateSheet` request takes the source tab, a
  position, a name and a client-chosen ID for the copy, so later requests in the same
  atomic call can clear the copy and append the index row. Not yet checked against a
  real spreadsheet (use a test one, never the live one): whether every row under a
  frozen header can be deleted or the last must be emptied instead, whether a copy of
  a hidden or protected tab is itself hidden or protected, and the length limit on a
  tab's name.

## Out of scope

- The dialog, the suggestion of a short name and every message: STY-041.
- Removing a roadmap: STY-048. Changing a short name: the epic's _Out of scope_.

## Delivery

### Departures

- **The checks against a real spreadsheet were not run** (agent; _Starting point_, D10):
  the delivery had no Google account to write a test spreadsheet with. Each of the
  three unknowns was built in the form that holds whichever way Google answers, and
  [CHO-010](../../chores/CHO-010-check-adding-a-roadmap-against-a-real-spreadsheet.md)
  records the checks still owed, a protected `Template` among them, which nothing here
  handles.
- **S2, D5: one row is kept under the header, emptied; every row after it is deleted**
  (agent). Google refuses to delete every row of a tab that is not frozen, so a copy
  whose header is frozen can't lose all its other rows. The copy keeps the first row
  under its header, cleared of its values, formatting and data validation (`updateCells`
  over the row with `fields: "*"`), so it holds nothing an example row held, and loses
  the rest (`deleteDimension`). The same is sent whether or not the header is frozen. A
  `Template` of a header alone is only copied; one with a single row under it has that
  row cleared.
- **S2: a copy of a `Template` with more rows frozen than its header has its header
  alone frozen** (agent; review, Sol and Opus): otherwise the row kept would be frozen
  too and the delete refused, failing every add. The tab list read now asks for each
  tab's frozen rows (`gridProperties.frozenRowCount`) to tell.
- **S2: the copy is unhidden only when the `Template` is hidden** (agent), by
  `updateSheetProperties`, as a copy of a tab that is shown needs nothing.
- **S1: an accent typed as a mark of its own is joined to its letter** (agent): the
  short name is normalised (NFC) as it is trimmed, so "Môn" is allowed, and written the
  same, however it was typed. Its length is counted in UTF-16 units, so no way of
  counting characters makes a name the rule passed longer than Google's limit.
- **S4: `Template`, `Families` and `Categories` are in use whether or not the tab
  exists** (agent), in any letter case: the editor finds its lists and the template by
  those titles, so a roadmap's tab with one would be read as that.
- **S4: "listed by the editor or not" needs no rows but the listed ones** (agent): a row
  the list skips for sharing an address shares it with one the list keeps, and a row
  with no address can't match a short name, which always has one (D14).
- **S5: a family or category chosen while its list is missing is "no longer listed"**
  (agent), the same outcome as one removed from its list.
- **S6: the template is checked before the short name** (agent), so a spreadsheet that
  can't start a roadmap says so whatever was typed; a `Template` with no grid (a chart
  sheet) is unusable too, and is asked for nothing. One read more than a refusal
  needs: the `Template`'s header.
- **S7: the outcome that says the roadmap may have been added is `unconfirmed`**
  (agent), as a publish's is. The settling re-read is the index's (the tab list, the
  index and the two lists), since "in use" needs the rows as well as the tabs.
- **A tab a co-lead names the same between the re-read and the write** (agent) makes
  Google refuse the copy: the add rejects with `unknown`, nothing written, as any
  refused write does, not with `short-name-taken`. The window is one request.
- **One way to send a write** (agent; review, Sonnet): every write of the adapter, the
  four older ones included, now goes through `#sendBatch`, which owns the single post
  and what counts as a lost answer; each passes how it settles one.
- **Input the check refuses throws** (agent): `planNewRoadmap` runs
  `checkNewRoadmapInput` itself and throws `AppError('unknown')` for a blank title or a
  short name S1 refuses, so neither repository can write one. A screen checks first.
- **Tests.** Written first and run red: the short name and the plan
  (`short-name.test.ts`, `new-roadmap.test.ts`, the missing modules). The contract
  (`new-roadmap-contract.ts`) was written before the Sheets adapter's call and failed
  to compile against it, not run red. The adapter's own tests and the fake's followed
  working code; each rule they hold was then broken in turn to see its test fail (the
  kept names, settling by ID, the row kept under a frozen header, the header check, the
  index named `Template`), which shows they discriminate, not that they came first.
- **No Playwright spec** (agent): no screen calls the write until STY-041. The E2E
  Sheets fake was changed in step (below) and the suite still passes over it.

### Contract for dependents

- **What the editor writes** (README, _What the editor writes_; ADR-009, ADR-011,
  ADR-012, ADR-013 _STY-040 amendments_): a new tab, a copy of `Template`, and a new
  row of the roadmap index, in one `batchUpdate`. The public site reads neither until
  the roadmap is published.
- **The call** (`domain/roadmap/roadmap-repository.ts`):
  `addRoadmap(input: NewRoadmapInput, { signal }?): Promise<NewRoadmapOutcome>`.
  `NewRoadmapInput` is `title`, `shortName`, `familyId` and `categoryId` (`null` for
  none, never `""`) and `productLead` (`""` for none). Outcomes: `added` with the
  `Roadmap` as the list then gives it (`id` is its address); `short-name-taken`;
  `choice-not-listed` with `fields` (`familyId`, `categoryId`, or both);
  `unconfirmed`. It rejects with `invalid-data` (no usable template), `forbidden`,
  `unauthenticated`, `rate-limited`, `network` (nothing written) or `unknown`, and with
  the abort reason while reading.
- **The rules** (`domain/roadmap/short-name.ts`, `new-roadmap.ts`):
  `checkNewRoadmapInput(input)` gives the trimmed input and `problems`
  (`title: "blank"`; `shortName: "blank" | "invalid-character" | "too-long" |
"no-address"`), `checkShortName` the short name's alone, `shortNameAddress` its
  address, `SHORT_NAME_MAX_LENGTH` the limit, and `shortNameInUse(shortName, { roadmaps,
names })` whether a list of roadmaps has its address (STY-041 D7 passes the cached
  list and no names).
- **The in-memory double** takes `noStartingPoint: true` to reject with
  `invalid-data`, `otherNames` for names that are in use by something other than a
  roadmap, and `write` (`ContractWrite`) to fail or lose the answer, as for a family. It
  keeps no name for itself: `Template`, `Families` and `Categories` are in use in the
  Sheets adapter alone.
- **Not exported for a screen yet**: `shortNameInUse` and `SHORT_NAME_MAX_LENGTH` have
  no caller outside the domain until STY-041's dialog; if it uses neither, it stops
  exporting them.
- **The E2E Sheets fake**: the example spreadsheet ends with a `Template` tab
  (`tests/fixtures/sheets/Template.csv`, its header frozen); an add reads `metadata`,
  the index and the lists, then `header:Template`, and writes one `batchUpdate`. A
  spec that replaces `sheets.spreadsheet` keeps a `Template` tab to add a roadmap. A
  copied tab keeps the ID the app chose (`FakeTab.sheetId`).

### Scenario evidence

`rule` is `domain/roadmap/short-name.test.ts`; `plan` is `domain/roadmap/new-roadmap.test.ts`;
`contract` is `domain/roadmap/testing/new-roadmap-contract.ts`, run by both
repositories' tests; `adapter` is `google-sheets-roadmap-repository.test.ts`, _adding a
roadmap (STY-040)_; `template` is `template-tab.test.ts`; `fake` is
`tests/fixtures/sheets/apply-batch-update.test.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | rule (`checkShortName`, `shortNameAddress`); plan "refuses a blank title, and a short name the rule refuses"; `roadmap-index-parser.test.ts`, which reads each row's id by the same rule                                                                                                                                                                                                                                                                                                                                                       |
| S2       | adapter "copies the Template and appends the index row in one batchUpdate, after five reads", "writes a chosen family as a publish does, adding the column its ID needs", "keeps a row a co-lead added after the read, appending after it"; "leaves the copy's header alone frozen when the Template freezes a row under it too"; template (`copyTemplateRequests`); contract "adds it to the end of the list…", "copies a chosen family, and trims what was typed"; fake "copies the Template after the last tab, shown, down to its header…" |
| S3       | contract "allows another roadmap's title"; plan "allows another roadmap's title"                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| S4       | adapter "writes nothing for the short name …" (seven names), "writes nothing for a short name a row the list skips has", "keeps the name … for its list while the spreadsheet has no such tab"; contract "writes nothing for a short name in use", "writes nothing for a name the data source keeps something else under, in any letter case"; plan (`shortNameInUse`); fake "records a roadmap's row appended without its tab as a violation"                                                                                                 |
| S5       | contract "writes nothing for a family or category no longer listed"; plan "settles a family or category the list no longer has", "…whose list has gone"                                                                                                                                                                                                                                                                                                                                                                                        |
| S6       | contract "rejects with invalid-data, writing nothing, with nothing usable to start a roadmap from"; adapter "fails with invalid-data, writing nothing, when the index is the Template tab", "…when the Template's header has no Title column / no Horizon column", "asks for nothing of a Template that is not there", "…with no cells to read, a chart's tab"; template (`usableTemplate`)                                                                                                                                                    |
| S7       | adapter "rejects with the write's failure, HTTP … sent once" (401, 403, 429), "rejects with the abort reason, writing nothing, when cancelled during the reads", "adds regardless once the write is sent…", "says the short name is in use when a co-lead added a roadmap with the same title and short name while the answer was lost", "says the roadmap may have been added when the re-read finds an index it can't read"; contract (forbidden, abort, lost and found, lost and not written, re-read fails); plan (`settleLostNewRoadmap`) |
| S8       | contract, run by `google-sheets-roadmap-repository.test.ts` and `in-memory-roadmap-repository.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
