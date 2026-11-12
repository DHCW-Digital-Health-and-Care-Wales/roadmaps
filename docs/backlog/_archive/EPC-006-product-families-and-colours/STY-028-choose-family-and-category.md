# STY-028: A Product Lead chooses a roadmap's family and category

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy)
- **Epic**: [EPC-006-product-families-and-colours](../../EPC-006-product-families-and-colours/README.md)
- **Depends on**: STY-027 (hard)
- **Binding ADRs**: ADR-013, ADR-012
- **Suggested model**: Opus — it extends the publish write with cells copied from another
  tab

## Summary

In "About this roadmap", a Product Lead picks the roadmap's family and its category
from the lists, instead of typing them. The choice is a pending edit, published with the
roadmap's other edits, and the publish writes the family's name, Welsh name and colour,
and the category's name, into the roadmap's row for the public site. Any publish also
records which family and category a row is linked to, so a later rename can't lose it.

## Acceptance criteria

### S1: Choosing a family is a pending edit (round 1 Q5)

**Given** a roadmap in Single Record
**When** the Product Lead chooses "Medicines & Diagnostics" in "About this roadmap"
**Then** it shows as a pending change with the family's colour, and nothing is written
**And** "No family" is offered too

### S2: Publishing copies the family into the row (round 1 Q1)

**Given** that pending family choice
**When** the roadmap is published
**Then** its row's `Family ID`, `Family`, `Family (cy)` and `Colour` are written from the
`Families` tab as re-read at publish, in the same write as the roadmap's other edits
**And** "No family" blanks `Family ID`, `Family` and `Family (cy)` and leaves `Colour`

### S3: Choosing a category

**Given** a roadmap with any category
**When** the Product Lead chooses another from the six, in the tab's order, and publishes
**Then** its row's `Category ID` and `Category` (the category's `Name`) are written
**And** no category can be typed or added
**And** "No category" is offered, and blanks `Category ID` and `Category`, so the public
site lists the roadmap under "Other roadmaps"

### S4: Any publish links an unlinked row (round 3 Q2)

**Given** a roadmap whose row has no `Family ID` (or `Category ID`) and whose name links
it to a listed family (or category)
**When** any edit of the roadmap is published
**Then** the same write adds the ID, appending the column first when the index has none
(ADR-012)
**And** no other family or category cell changes

### S5: The base is the ID, so a rename is not a conflict

**Given** a pending choice of Medicines & Diagnostics on a roadmap in Single Record
**When** someone renames Single Record before the publish
**Then** the publish writes Medicines & Diagnostics with no conflict
**But** if a co-lead moved the roadmap to another family in the meantime, it is a
conflict, shown and resolved as ADR-012's conflicts are

### S6: No list, no choice (round 3 Q4)

**Given** the `Families` (or `Categories`) tab is missing
**When** the Product Lead opens "About this roadmap"
**Then** the family (or category) shows read-only, with a short notice that it can't be
changed right now

## Decisions

- **D1** (owner, 2026-11-12, EPC-006 grilling round 1 Q5): a roadmap's family is
  chosen in "About this roadmap" and published with its other edits → S1, S2.
- **D2** (owner, 2026-11-12, round 2 Q1): category is chosen from the fixed six → S3.
- **D3** (owner, 2026-11-12, round 3 Q2): unlinked rows gain their IDs at their next
  publish → S4.
- **D4** (owner, 2026-11-12, round 4 Q4): "No category" is offered → S3.

## Out of scope

- Fixing a row that is out of step without another edit: STY-030.
- Writing `Colour` for a roadmap with no family: never (STY-027 D4).

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_). A publish now also writes, in the same
`batchUpdate` as the roadmap's other edits:

- for a chosen family, the index row's `Family ID`, `Family`, `Family (cy)` and
  `Colour`, copied from the `Families` tab as re-read at publish (`Colour` lower case);
  "No family" blanks `Family ID`, `Family` and `Family (cy)` and leaves `Colour`;
- for a chosen category, `Category ID` and `Category` (the English `Name`); "No
  category" blanks both;
- on any publish that writes, a missing `Family ID` or `Category ID` for a row its name
  links to a listed family or category (S4);
- the `Family ID` and `Category ID` columns, appended with those headers the first time
  one is written.

`Family (cy)` is the one Welsh cell written, copied from the list, never typed
(ADR-013 amends ADR-012). Nothing is written to the `Families` or `Categories` tab.

### Departures

- **A native select.** Each choice is the shadcn `native-select` (`src/components/ui/`),
  restyled to ADR-010's tokens, rather than a custom listbox: a short list, and a
  phone's own picker. The family's select has the chosen family's swatch beside it.
- **The lists are read only once needed**: while "About this roadmap" is open, while a
  family or category choice is pending, or while a conflict over one is shown. A
  roadmap's page otherwise spends no reads on them (ADR-011's budget), and Refresh
  reads them again for whichever of these needs them. While a list is first read, its
  select is held, disabled, at its value.
- **A list that can't be read is treated as missing (S6).** A list tab missing, or a
  failed read, shows the field read-only: its name and "The family (category) can't be
  changed right now."
- **A choice no longer listed refuses the publish.** A chosen ID the re-read list
  doesn't have (a family deleted meanwhile) rejects as `invalid-data`, writing nothing.
  So does any choice, "No family" or "No category" included, while its list tab is
  missing at publish: without the list the row's value can't be told from none, so a
  pending "No family" would otherwise be dropped unwritten. For the same reason a read that
  names a family or category it can't link (its list missing) doesn't settle a pending
  "No family" or "No category"; only a read with no name does.
- **S4 never overwrites an ID.** An ID cell already holding any ID, even one the list
  doesn't have, is left alone; a field chosen in the same publish writes its own ID.
  An ID column is never appended only to stay blank.
- **An unlisted family is offered as it stands.** A row whose family the list doesn't
  have (STY-027 S8) offers "Single Recrod (not listed)" after "No family"; keeping it
  changes nothing. An unlisted category reads as none (STY-027 S10), so its select shows
  "No category", and keeping that changes nothing.
- **S5 holds for a row linked by ID; owner to accept.** A row linked to its family or
  category only by name (no `Family ID` or `Category ID` yet, as every row is until its
  first publish under this story, S4) is refused if that family or category is renamed
  in its list between the choice and the publish: the re-read row's name no longer
  links it, and a pending change keeps only the ID, not the name it was linked by. The
  review shows "Family isn't listed" (or "No category") as current, and "Keep mine"
  publishes the choice. Telling a rename from a co-lead's move for such a row would
  need the name the row was linked by carried with every pending choice; the window
  closes for good once a publish links the row's IDs (S4).
- **Conflicts name the choice (S5).** The base is the ID, so a rename is no conflict,
  and the review shows each side by its list name, "No family" or "No category" for
  none. When a refusal shows a co-lead's current values before the roadmap is read
  again, a family or category is shown as the cached list names it, or as none, so "Use
  theirs" shows theirs even if that read fails; one the cached list doesn't have keeps
  the roadmap's own read.
- **Known gap: a pending choice deleted from its list.** If a pending family or category
  is deleted from its list before publishing, the page still shows the name it was
  chosen with, and the publish is refused as `invalid-data`, writing nothing. Showing it
  as not listed is left for a later change.
- **Tests.** The publish plan, adapter, contract and fake's tests were written with each
  slice and run red where the code was new; the page tests and Playwright specs
  followed working code.

### Contract for dependents

- **Domain** (`@/domain/roadmap/roadmap-changes`): `ROADMAP_TEXT_FIELDS` and
  `ROADMAP_CHOICE_FIELDS` (`familyId`, `categoryId`) make up `EditableRoadmapField`;
  `isChoiceField`; `roadmapValue` (was `roadmapText`) gives a field's value, a choice as
  its ID (`""` for none, `UNLISTED_FAMILY` for a family the list doesn't have).
- **Sheets adapter**: `IndexRowWriter` (`google-sheets-roadmap-repository.ts`) writes a
  row's family (`writeFamily`), category (`writeCategory`) and missing IDs (`linkIds`);
  STY-030 can reuse `writeFamily` inside the adapter. `FAMILY_WELSH` is the index's `Family (cy)` write
  column.
- **Hooks**: `useRoadmapLists(needed)` (`features/roadmaps/hooks/use-roadmap-lists.ts`)
  and `roadmapKeys.families()` / `.categories()`; `useRoadmapChoices(needed)`
  (`features/roadmaps/editing/use-roadmap-choices.ts`) gives the form's fields and a
  choice's name. `applyRoadmapChanges(roadmap, changes, lists?)` shows a pending choice
  with the list's name and colour.
- **UI**: `EditFormField` takes `options` (a select), `disabled` and `fixed` (read-only
  with a notice).
- **Test fakes**: `EXAMPLE_LISTS` (`tests/e2e/fixtures/fake-sheets.ts`) adds both list
  tabs; `applyBatchUpdate` allows `Family (cy)`.
- **Welsh to review** (machine-assisted): `roadmaps.edit.roadmapFields.familyId`
  ("Teulu"), `.categoryId` ("Categori"), `roadmaps.edit.noFamily` ("Dim teulu"),
  `.noCategory` ("Dim categori"), `.familyNotListed` ("{{name}} (heb ei restru)"),
  `.choiceUnavailable.familyId` ("Does dim modd newid y teulu ar hyn o bryd.") and
  `.categoryId` ("Does dim modd newid y categori ar hyn o bryd.").

### Scenario evidence

- **S1**: `pending-changes.test.ts` "shows a chosen family and category as the lists
  name them, with the family's colour"; `roadmap-detail-page-choices.test.tsx` "offers
  the families and No family, and keeps a choice pending in its colour, writing
  nothing"; e2e `editing.spec.ts` "is chosen from the lists, pending in its colour, then
  published with its IDs" (swatch `#006747`, no write before Publish); axe in
  `accessibility.spec.ts` "choosing a family, then its pending colour".
- **S2**: adapter "writes the chosen family's ID, names and colour, appending the ID
  columns" and "blanks the family's ID and names for no family, leaving its colour";
  contract "copies a chosen family's names and colour from its list, …" and "leaves the
  colour for no family"; page "publishes the chosen family, and shows it as read
  again"; e2e (one `batchUpdate`, Product A's cells) and "No family blanks its names,
  keeping the colour". Publish-plan "rejects a %s chosen while its list is missing,
  even No family or category" and contract "rejects with invalid-data, writing nothing,
  for no %s while its list is missing"; adapter "writes no blank over a trailing cell
  Google leaves out of the row".
- **S3**: adapter "writes the chosen category's ID and English name, and blanks both
  for none"; page "offers the categories in the list's order after No category;
  nothing can be typed"; e2e (options in tab order, `Category` and `Category ID`).
- **S4**: adapter "adds only a missing ID to a row linked by name, on any publish that
  writes" and the S4 link in the first adapter case; e2e "any publish links a family
  and category named, not yet by ID" (a Vision edit adds both IDs, `Family`, `Category`
  and `Colour` unchanged, Product B untouched).
- **S5**: `publish-plan.test.ts` "writes the chosen IDs over a family renamed since"
  and "refuses over a family a co-lead chose since"; contract "refuses a family a
  co-lead moved, by its ID, writing nothing"; page "shows a co-lead's move to another
  family by name" and "shows their family and category after Use theirs, even if the
  roadmap couldn't be read again"; e2e "a co-lead's move to another family is shown by
  name, nothing written". The departure above: a row linked by name only is refused
  over a rename.
- **S6**: page "shows the Family (Category) read-only, saying why, when there's no
  families (categories) list" (`it.each`) and "holds the family at its value while the
  list is read"; e2e "is shown read-only, saying why, when its list is missing"; the
  structure snapshot `edit-roadmap-form.aria.yml` (no lists in the example spreadsheet).
  Page "reads the lists again on Refresh while About is open". `pending-changes.test.ts` "keeps No family or category pending
  while a read names one it can't link".
