# ADR-013: Product families and categories are defined once, in their own tabs, and copied to each roadmap's row

- Status: Accepted — owner, 2026-11-12: EPC-006 grilling rounds 1–3, accepted in round
  4 Q1; amends ADR-012 (what is editable, Welsh cells)
- Date: 2026-11-12

## Context

The roadmap index sets `Family`, `Family (cy)`, `Colour` and `Category` on every row
(ADR-009), so one family can be spelt or coloured two ways and nothing stops it. The
public site reads those cells per row and knows six categories by name, in its code. It
will not change for now (owner, round 1 Q1). Google Sheets is temporary: a database
behind an HTTP API replaces it (ADR-002), where a family and a category are rows of
their own and a roadmap points at them by key.

## Decision

- **Two tabs hold the lists** (round 1 Q2, round 2 Q2): `Families` (`ID`, `Name`,
  `Name (cy)`, `Colour`) and `Categories` (`ID`, `Name`, `Name (cy)`), one row each,
  headers matched as ADR-009 matches them. They are the editor's source of truth. The
  owner creates them by hand (round 2 Q3) from
  `docs/operations/families-and-categories-tabs.md`; the editor never creates a tab, and
  neither may be the first tab.
- **IDs stand in for database keys** (round 3 Q3): the `ID` of a family or a category
  has the `Item ID` format (ADR-012, `createItemId`), is unique within its tab and never
  changes, rename included.
- **Each roadmap's index row points at them** (round 2 Q2): `Family ID` and
  `Category ID` columns, which the public site ignores. A row without an ID is linked by
  name, folded as `groupRoadmaps` folds a family, and gains the ID at its roadmap's next
  publish (round 3 Q2).
- **The editor copies, the public site reads the copy** (round 1 Q1): every write that
  sets a roadmap's family writes its `Family`, `Family (cy)` and `Colour` cells from the
  family; every write that sets its category writes `Category` from the category's
  `Name`. A family's `Name (cy)` is the owner's to fill in the tab; the editor copies it
  and never edits it, and a rename leaves it as it is (round 2 Q7, round 3 Q1, round 4
  Q6). Editing Welsh names comes later.
- **A row out of step is shown from the list, flagged and fixable** (round 2 Q4): a
  linked row whose copied cells differ from its family or category shows the list's
  values and offers to rewrite the row.
- **Anyone connected may add, rename and recolour a family** (round 1 Q3); none may be
  deleted yet (round 2 Q8). Names are unique, folded (round 3 Q5). A colour is
  `#rrggbb`, typed (round 2 Q6).
- **Categories are fixed** (round 2 Q1): the tab holds the public site's six, and the
  editor offers them to choose from but cannot add, rename or remove one until the
  public site reads the tab.
- **A family change publishes at once** (round 2 Q9): after a confirmation naming every
  roadmap it rewrites and which are published, one `spreadsheets.batchUpdate` writes the
  `Families` row and every member's index row, re-reading first and refusing on a
  conflict as ADR-012 does. It is not a pending edit.
- **A roadmap's family and category are pending edits** (round 1 Q5), chosen in "About
  this roadmap" and published with its other edits (ADR-012).
- **A missing tab degrades, minimally** (round 3 Q4): the list behaves as before this
  ADR, and managing or choosing that list is unavailable with a short notice. The tabs
  are expected to exist; this covers a tab renamed or deleted by mistake.

## Consequences

- `RoadmapRepository` gains reads for families and categories and one family write;
  `Roadmap` gains the family's and category's IDs. The API that replaces Sheets serves
  these lists as tables (`docs/operations/replacing-google-sheets.md` gains them).
- `Category` stops being the public site's fixed slug with copy in the catalogue: its
  names come from the tab (EPC-006 STY-027).
- Two copies exist until the public site reads the tabs: the tabs and every row's
  cells. A hand edit puts a row out of step, which is flagged, not prevented.
- What the editor writes to the shared spreadsheet grows: the new columns, the copied
  cells on a family change, and the `Families` tab (README, _What the editor writes_).
- Amends ADR-012's "Family, category, colour … stay read-only" and its "Welsh cells are
  never written" for `Family (cy)`, which is copied, never typed.
