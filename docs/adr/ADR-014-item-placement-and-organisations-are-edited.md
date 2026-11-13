# ADR-014: An item's placement and organisations are edited, and the repository serves the organisations

- Status: Accepted — owner, 2026-11-13: EPC-007 grilling rounds 1–4 (Q1–Q25); Q19 left
  the shape of the organisation data to the agent, as "whichever needs less rework when
  the database replaces Sheets". Amends ADR-011 (organisations as a fixed vocabulary,
  shown as codes) and ADR-012 (what is editable).
- Date: 2026-11-13

## Context

ADR-012 kept an item's placement and organisations read-only. A Product Lead's first
recurring job after fixing text is moving an item between horizons as priorities change
(persona: _Move items between horizons_). Placement and organisations are each one cell
in an item's row (`Horizon`, `Organisations`), which the public site reads. The editor
and the public site each hold the twelve organisations in code today (ADR-011); the
database that replaces Sheets (ADR-002) will hold them as a table, linked to items.

## Decision

### Placement

- **A placement is a pending edit** (round 1 Q2, Q5), published with the roadmap's
  other edits (ADR-012). Any of the six placements may be chosen; an unplaced item can
  be placed, and a placed item cannot be made unplaced (Q6).
- **Moved from the card or the form** (Q4, round 2 Q17): a "Move to…" menu on every
  card lists the other placements by their headings; the item's edit form has a
  placement choice too. No drag and drop.
- **A move changes the `Horizon` cell only** (Q3, round 2 Q18): publishing writes the
  public site's English value (`Now`, `Recently delivered`…). No row moves, so the item
  appears in its new placement in row order, before and after publishing. Reordering
  within a placement is a later record.
- **One field for conflicts** (Q11): its base is the placement as loaded, none for an
  unplaced item, compared as ADR-012 compares text.

### Organisations

- **The repository serves the list** (round 2 Q13, round 3 Q19). `RoadmapRepository`
  gains `listOrganisations()`, returning each organisation's `id`, `code`, English
  `shortName` and `name` (English and Welsh), in display order: All Wales first, then
  alphabetical by English name (round 2 Q16, round 3 Q21, round 4 Q25). One order
  serves both languages (agent, EPC-007 STY-032 D5), so a Welsh page is not re-sorted. Items carry `organisationIds`. Features read the list through a
  query, never a constant, and never sort it.
- **In Sheets the list is built in** (Q13): the adapter returns the twelve, with today's
  ids (`cavuhb`) as keys, and maps an item's codes to ids as it reads. No
  `Organisations` tab: the owner chose to keep the list in code until the database.
- **The database holds them as rows** (Q19): an organisations table keyed by `id` and a
  join table to items. Swapping the adapter changes no feature code, and the public site
  can move to the same store separately.
- **Shown three ways**: on the card, short names, comma separated (round 3 Q20); in the
  item's edit form, one checkbox each, "Cardiff and Vale (CAVUHB)" (Q7); on the families
  page, read-only, full name and code, "Cardiff and Vale University Health Board
  (CAVUHB)", in Welsh on the Welsh interface (round 4 Q23, Q24). Short names have no
  Welsh (Q7); codes are the same in both languages.
- **An item's organisations are a pending edit**, any mix, All Wales included (Q8).
  Publishing writes the cell as codes separated by `, ` in list order, or empty for
  none (agent, STY-034 D7). It writes known codes only: a code the list doesn't hold is dropped, and the form
  says so first (Q9). A missing `Organisations` column is added as ADR-012 adds one
  (Q10).
- **One field for conflicts** (Q11): the set of ids, so a co-lead's reordering is no
  change and their different set is a conflict.

### Alternatives that lost

- An `Organisations` tab, as ADR-013 made for categories (Q13): the public site keeps
  its own list, so a tab would govern the editor only; the list rarely changes.
- A separate organisation repository port (Q19): ADR-013 put the families and
  categories lists on `RoadmapRepository`, and so does this.
- Moving a row to the top or bottom of its new placement (Q3): a row move is a harder
  write to make safe beside a co-lead, and no reorder exists yet to match.
- Keeping unknown codes in the cell (Q9): the public site drops them anyway.

## Consequences

- What the editor writes grows: the `Horizon` cell (STY-031), the `Organisations` cell
  and possibly its column (STY-034). README _What the editor writes_ changes with each,
  and each PR says so.
- `RoadmapItem.organisations` (a fixed union) becomes `organisationIds: string[]`;
  `docs/operations/replacing-google-sheets.md` gains `listOrganisations` (STY-032).
- The editor's list and the public site's can drift once the database holds the list,
  until the public site reads it.
- Amends ADR-011's "placements and organisations are domain vocabularies" (organisations
  are now data the repository serves) and its Option 6 (codes on the card become short
  names). Amends ADR-012's "Tags, organisations, details, placement and Welsh stay
  read-only": placement and organisations no longer do.
