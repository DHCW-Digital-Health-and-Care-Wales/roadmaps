# STY-028: A Product Lead chooses a roadmap's family and category

- **Status**: Proposed — grilled in EPC-006 rounds 1–4 (2026-11-12)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy)
- **Epic**: EPC-006-product-families-and-colours
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
