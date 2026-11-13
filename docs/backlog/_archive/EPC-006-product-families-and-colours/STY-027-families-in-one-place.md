# STY-027: Families and their colours are managed in one place

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Docs
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + Docs
- **Epic**: [EPC-006-product-families-and-colours](README.md)
- **Depends on**: none (EPC-005's write path is on the default branch)
- **Binding ADRs**: ADR-013, ADR-009, ADR-002
- **Suggested model**: Opus — it adds two reads to the repository port and changes what
  a category is
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/38

## Summary

The roadmap list takes each family's name and colour, and each category's name, from
the new `Families` and `Categories` tabs instead of every roadmap's own cells, so one
family shows one way. A roadmap whose cells disagree with its family or category is
flagged as out of step. This story only reads: choosing a family (STY-028), managing
families (STY-029) and fixing a flagged roadmap (STY-030) build on it.

## Scope

Domain types for a family and a category, with their IDs; repository reads for both
lists; the tab parsers; linking each roadmap to its family and category by ID, or by
folded name when the row has none; the list and cards drawn from the lists; the
out-of-step flag; the missing-tab fallback; the owner's runbook and the replacement
guide.

## Acceptance criteria

### S1: A family has one name and one colour

**Given** two roadmaps the Product Lead puts in the same family
**When** the list and the public site show them
**Then** both show the same family name and the same colour
**And** nobody had to type the colour twice

### S2: The list shows the family from the Families tab (round 1 Q2)

**Given** Single Record is `#12a3c9` in the `Families` tab, and one of its roadmaps has
`Single record ` and `#325083` in its own cells
**When** the Product Lead opens the roadmap list
**Then** the roadmap is grouped under "Single Record" with a `#12a3c9` swatch, beside
the family's other roadmaps

### S3: A row is linked by ID, or by name until it has one (round 3 Q2)

**Given** one row with a `Family ID` naming Single Record but `Family` reading
`Medicines & Diagnostics`, and another with no `Family ID` and `Family` reading
`single-record`
**When** the list loads
**Then** both are in Single Record: the ID wins over the name, and a name is matched
ignoring case, accents, spaces and punctuation
**And** the same holds for `Category ID` and `Category`

### S4: A roadmap out of step is flagged (round 2 Q4)

**Given** a roadmap linked to Single Record whose `Family`, `Family (cy)` or `Colour`
differs from the family's `Name`, `Name (cy)` or `Colour`, or whose `Category` differs
from its category's `Name`
**When** the list or the roadmap's page shows it
**Then** it shows the family's and category's values, with a notice that its row is out
of step with the family list, in English and Welsh
**And** a roadmap whose cells match shows no notice

### S5: Category names come from the Categories tab (round 2 Q1)

**Given** the `Categories` tab names a category in English and Welsh
**When** a roadmap in it is shown in English, then in Welsh
**Then** its category reads the tab's `Name`, then `Name (cy)` (English where blank)

### S6: A missing tab falls back (round 3 Q4)

**Given** the `Families` tab is missing, or lacks an `ID`, `Name` or `Colour` column
**When** the list loads
**Then** it groups and colours roadmaps from their own cells, as before this story, with
no out-of-step flags for families
**And** when the `Categories` tab is missing, a row's `Category` is matched against the
public site's six spellings as before this story, shown in English in both languages (an
unknown value is no category, S10), with no out-of-step flags for categories
**And** the list still loads; the problem is recorded as other sheet mistakes are
(ADR-009)

### S7: A bad row in a list is skipped, not fatal

**Given** a `Families` row with a blank `ID` or `Name`, an ID or a folded name already
on an earlier row, or a colour that is not `#rrggbb`
**When** the list loads
**Then** that row is not a family (the earlier row keeps the ID or name), a problem is
recorded, and every other family loads

### S8: A family the list doesn't have keeps its own name, flagged (round 4 Q2)

**Given** a row whose `Family` reads `Single Recrod`, with no `Family ID`, and no listed
family of that folded name
**When** the list loads
**Then** the roadmap is grouped under `Single Recrod` in its own colour, as before this
story, with a notice that its family is not in the family list

### S9: A roadmap with no family keeps its own colour (round 4 Q3)

**Given** a roadmap with no family and `#7b2d8e` in its `Colour` cell
**When** it is shown
**Then** its swatch is `#7b2d8e`, it is not flagged, and the editor offers no way to
change the colour

### S10: A category the list doesn't have is no category

**Given** a row whose `Category` matches no listed category by ID or folded name
**When** the list loads
**Then** the roadmap shows no category and the problem is recorded, as an unknown category
is today and as the public site lists it under "Other roadmaps"

## Decisions

- **D1** (owner, 2026-11-11, EPC-005 grilling Q11): family is not editable in EPC-005,
  because family and colour belong together and the sheet sets each per roadmap → this
  record.
- **D2** (owner, 2026-11-12, EPC-006 grilling rounds 1–3): families and categories live in
  their own tabs with IDs in the `Item ID` format; the public site is unchanged and
  reads the copied cells; the owner builds the tabs by hand → ADR-013, adds S2–S7; the
  write paths moved to STY-028, STY-029 and STY-030.
- **D3** (owner, 2026-11-12, round 4 Q2): a family not in the list is shown as its row
  names it, flagged → adds S8.
- **D4** (owner, 2026-11-12, round 4 Q3): a roadmap with no family keeps its own colour,
  read-only → adds S9.
- **D5** (agent, 2026-11-12, review): with the `Categories` tab missing, the parser's
  six public-site spellings stay as the fallback, in English only (S6), so the list
  behaves as before as ADR-013 says, while the catalogue's Welsh names go; showing the
  raw cell text was rejected, as it labels a value the public site files under "Other
  roadmaps". A category not in the list is no category (S10), as today.
- **D6** (agent, 2026-11-12, review): S1's "and the public site" holds only once the
  rows are written, so this story holds S1 for the editor's list; the public site's half
  is held by STY-028 S2, STY-029 S4 and STY-030 S1, which write the copied cells.

## Starting point

Audited at `8891af0`. `Roadmap.category` is the public site's slug
(`public-health-apps`) with its names in the i18n catalogue
(`roadmaps.categories.*`); S5 replaces that with the category from the tab, so the
catalogue entries go. `groupRoadmaps` already folds family names; S3's name matching
reuses that fold rather than a second one.

## Out of scope

- Choosing a roadmap's family or category: STY-028.
- Adding, renaming or recolouring a family: STY-029.
- Rewriting an out-of-step row: STY-030.
- The public site reading the tabs: a change in its own repository, not planned.

## Delivery

### Departures

- **One badge for both lists (S4).** A roadmap out of step with its family, its
  category or both carries one warning badge, "Doesn't match its family or category",
  on its card and beside its page's title; one whose family isn't listed (S8) carries
  "Family isn't listed". Both are badges, like Not published, rather than a sentence,
  to fit the card. The roadmap's page also shows the family, with its colour, and the
  category, as "Family: …" and "Category: …" under the title; the card shows the
  category and the colour, its group heading the family.
- **What counts as out of step (S4).** Only the copied cells: a trimmed `Family`,
  `Family (cy)` or `Category` that differs from the list's name exactly (case
  included), or a `Colour` that differs in lower case, a `#rgb` colour included. A
  blank `Family ID` or `Category ID` is not out of step, since the next publish adds
  it (ADR-013). A `Family ID` or `Category ID` the list doesn't have is recorded
  (`unknown-family-id`, `unknown-category-id`) and the row is then linked by name.
- **Recorded problems (S6, S7, S8, S10)** are recorded as ADR-009's are, not shown:
  `missing-tab` and `missing-column` for a list tab, `blank-id`, `blank-name`,
  `invalid-colour`, `duplicate-id` and `duplicate-name` for its rows, `unknown-family`
  for S8, and `unknown-category` as before. A list tab without `Name (cy)` still loads,
  English only, recording the column.
- **A list tab placed first** is the roadmap index, never a list (ADR-013).
- **Red first.** The parsers', index linking's and repository contract's tests were
  written and run red before their code; the card and page tests were written first
  but run only once the badges existed, and the Playwright specs followed working code.

### Contract for dependents

- **Domain**: `Family { id, name: LocalisedText, colour }` (`@/domain/roadmap/family`,
  colour `#rrggbb` lower case) and `Category { id, name: LocalisedText }`
  (`@/domain/roadmap/category`). `Roadmap.category` is now `LocalisedText | null` (the
  `RoadmapCategory` slug and the catalogue's `roadmaps.categories.*` are gone).
  `Roadmap` gains `familyId` and `categoryId` (`string | null`, the linked list
  entry's ID), `outOfStep` and `familyNotListed` (booleans). A linked roadmap's
  `family` and `colour` are the family's, its `category` the category's.
- **Port**: `RoadmapRepository.listFamilies({ signal }?)` and
  `listCategories({ signal }?)` resolve the list in tab order, or `null` when the tab
  is missing, first, or lacks a required column; they reject as `listRoadmaps` does.
  Each call returns new arrays. The contract's `withRoadmaps(…, { families,
categories })` seeds them (default: those the roadmaps link to; `null` for none), and
  `familiesOf` / `categoriesOf` (`@/domain/roadmap/testing/linked-lists`) derive them.
- **Sheets adapter**: `FAMILIES_TAB` and `CATEGORIES_TAB` (`list-tab-parser.ts`) name
  the tabs; `parseFamilies` / `parseCategories` read them. A list load reads the tab
  list, then the index and both list tabs together. The index's `Family ID` and
  `Category ID` columns are read when present and never recorded missing. Nothing is
  written yet: STY-028 to STY-030 add the writes.
- **Matching**: `nameKey(name)` (`@/lib/text`) is the one fold for family and category
  names, shared with `groupRoadmaps`.
- **UI**: `ListMismatchBadges` (`features/roadmaps/components/list-mismatch-badges.tsx`)
  shows the two flags; STY-030's fix can sit beside it. Copy is `roadmaps.lists.*`.
- **UI**: `RoadmapFamilyLine` (`features/roadmaps/components/roadmap-family-line.tsx`)
  shows a roadmap's family, with its colour, and its category under its page's title.
- **Item tabs**: a roadmap whose index row names the `Families` or `Categories` tab is
  refused as `invalid-data`, as one naming `Template` or the index is, so neither list
  is ever read or written as items.
- **Welsh to review**: `roadmaps.lists.outOfStep` ("Yn wahanol i'w deulu neu
  gategori"), `roadmaps.lists.familyNotListed` ("Teulu heb ei restru"),
  `roadmaps.lists.family` ("Teulu: {{name}}") and `roadmaps.lists.category`
  ("Categori: {{name}}") are machine-assisted.

### Scenario evidence

- **S1**: held for the editor's list by S2 and S3 (D6); the public site's half is
  STY-028's, STY-029's and STY-030's.
- **S2**: `roadmap-index-parser.test.ts` "shows the family's name and colour over the
  row's own, flagged"; adapter "reads both list tabs alongside the index, and links
  each roadmap to them"; e2e `roadmaps.spec.ts` "families and categories come from their
  lists, …" (Product A's swatch is the family's `#12a3c9`).
- **S3**: index parser "links by ID over the name, and by folded name when there is no
  ID", "links by name when the ID is not in the list, recording the ID"; `text.test.ts`
  `nameKey` cases.
- **S4**: index parser "shows a row whose cells match …, not flagged" and the
  `it.each` of each differing cell; `roadmap-card.test.tsx` "flags a roadmap out of
  step …" and "flags in Welsh"; `roadmap-detail-page-items.test.tsx` "badges a roadmap
  out of step with its lists beside its title, and shows the lists' values, in English
  and Welsh" and "shows no family line …"; the e2e spec (badge, family and category on
  Product A's page).
- **S5**: contract "lists the families and categories as plain data in data-source
  order"; card test "is Welsh in Cymraeg" (category from `Name (cy)`); e2e "a family and
  category read their Welsh names from the lists".
- **S6**: `list-tab-parser.test.ts` "is no list when the tab is missing", the missing
  column cases; index parser "with no lists, reads the row's own cells, with no flags"
  and the public-site spellings `it.each`; contract "lists no families or categories
  when the data source has no lists"; adapter "reads no list from a missing tab, or from
  the first tab".
- **S7**: list parser "skips a bad row, keeping the earlier row's ID or name, and loads
  the rest", "skips a row whose ID or folded name repeats an earlier one".
- **S8**: index parser "keeps a family the list doesn't have as the row names it,
  flagged and recorded"; card and page tests; e2e (Product D, "Single Recrod").
- **S9**: index parser "keeps the own colour of a roadmap with no family, not flagged".
- **S10**: index parser "reads a category the list doesn't have as none, recording it".
