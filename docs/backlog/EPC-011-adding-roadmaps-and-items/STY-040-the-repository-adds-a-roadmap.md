# STY-040: The repository adds a roadmap

- **Status**: Proposed — grilled with the owner on 2026-11-14 (rounds 1–3); no screen
  uses it until STY-041
- **Type**: Feature
- **Area**: Domain + Infrastructure + Docs
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-009, ADR-011, ADR-012, ADR-013, ADR-002, ADR-006
- **Suggested model**: Opus — a new write that copies a tab and adds an index row in one
  all-or-nothing request, refused on a fresh read, with a lost answer settled

## Summary

The roadmap repository can add a roadmap: given a title, a short name and optionally a
family, a category and a product lead, it writes a new entry in the roadmap list and
an empty roadmap copied from the template, together or not at all, not published. It
re-reads first and writes nothing when the short name is in use, a chosen family or
category has gone, or the template is missing or unusable. No screen calls it yet:
the dialog is STY-041. This story also records the change to the data source's
contract with the public site: the editor now adds a roadmap's entry and its items'
place, copied from the template, which it never changes.

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
write, not for the name: the tab with the ID this write chose for its copy, and an
index row holding the values it sent. Both there is added, neither is `network`, and
anything else is an outcome saying the roadmap may have been added
**And** a roadmap a co-lead added with the same short name while the answer was lost
is not taken for this one: the outcome says the short name is in use (S4)

### S8: Both implementations keep the contract

**Given** the repository contract test
**When** it runs against the Sheets adapter and the in-memory double
**Then** S2 to S6 hold for both, and a roadmap added is returned by `listRoadmaps`
and has no items by `listRoadmapItems`

## Tests

S2 and S4–S7 need the adapter against MSW, asserting the requests sent, and the
Sheets fake applying them: a copied tab, its rows removed, and the appended row. S7
needs the case where a co-lead takes the name while the answer is lost.

## Decisions

- **D1** (owner, 2026-11-14, the request): a new roadmap is a row in the roadmap index
  and a copy of the `Template` tab, named for the roadmap, with every row but the
  header deleted. The `Template` is copied and never changed; this ends "never read"
  (ADR-011) for the copy alone.
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
- **D13** (agent): a lost answer is settled by the copy's own ID and the row's
  values, as a family's is by its ID (`familyHeld`), over the name alone, which a
  co-lead's roadmap would satisfy. S7.
- **D14** (agent): "a letter" is one whose address is not empty, so no roadmap is
  written that the list would then skip; over any letter a tab's name allows.

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
