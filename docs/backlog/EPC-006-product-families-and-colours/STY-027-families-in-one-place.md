# STY-027: Families and their colours are managed in one place

- **Status**: Proposed — grilled in EPC-006 rounds 1–4 (2026-11-12)
- **Type**: Feature + Docs
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + Docs
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: none (EPC-005's write path is on the default branch)
- **Binding ADRs**: ADR-013, ADR-009, ADR-002
- **Suggested model**: Opus — it adds two reads to the repository port and changes what
  a category is

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
**And** when the `Categories` tab is missing, a roadmap's category shows its row's
`Category` text in both languages, unchecked, with no out-of-step flags for categories
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
- **D5** (agent, 2026-11-12, review): with the `Categories` tab missing, the row's own
  `Category` text shows in both languages (S6), over keeping the catalogue's six as a
  fallback, because the owner asked for minimal handling and a second copy of the list
  is what this epic removes. A category not in the list is no category (S10), as today.
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
