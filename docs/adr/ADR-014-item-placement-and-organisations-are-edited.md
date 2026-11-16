# ADR-014: An item's placement and organisations are edited, and the repository serves the organisations

- Status: Accepted — owner, 2026-11-13: EPC-007 grilling rounds 1–4 (Q1–Q25); Q19 left
  the shape of the organisation data to the agent, as "whichever needs less rework when
  the database replaces Sheets"; a follow-up to Q25 chose, on the agent's advice, that the
  screen sorts the organisations. Amends ADR-011 (organisations as a fixed vocabulary,
  shown as codes) and ADR-012 (what is editable). STY-051 amendments: owner,
  2026-11-16, on the wayfinder map "Reordering a placement's items".
- Date: 2026-11-13 (amended in STY-051: a moved item goes last in its new placement, and
  publishing moves its row)

## Context

ADR-012 kept an item's placement and organisations read-only. A Product Lead's first
recurring job after fixing text is moving an item between horizons as priorities change
(persona: _Move items between horizons_). Placement and organisations are each one cell
in an item's row (`Horizon`, `Organisations`), which the public site reads. The editor
and the public site each hold the organisations in code today (ADR-011); the
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
  within a placement is a later record. _STY-051 amendments_ replace this bullet.
- **One field for conflicts** (Q11): its base is the placement as loaded, none for an
  unplaced item, compared as ADR-012 compares text.

### Organisations

- **The repository serves the list** (round 2 Q13, round 3 Q19). `RoadmapRepository`
  gains `listOrganisations()`, returning each organisation's `id`, `code`, English
  `shortName`, `name` (English and Welsh) and `national` (true for All Wales), in no
  promised order. Items carry `organisationIds`. Features read the list through a
  query, never a constant.
- **The screen sets the order** (round 4, after Q25): national organisations first, then
  alphabetical by the label it shows, compared in the interface's language (round 2
  Q16, round 3 Q21, round 4 Q24, Q25). The card and form sort English short names; the
  families page sorts full names, Welsh on the Welsh interface. The order is
  presentation, so the database and API need only the `national` column.
- **In Sheets the list is built in** (Q13): the adapter returns them, with today's
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
  Publishing writes the cell as codes separated by `, `, national first and then by
  code, or empty for none (agent, STY-034 D7). It writes known codes only: a code the list doesn't hold is dropped, and the form
  says so first (Q9). A missing `Organisations` column is added as ADR-012 adds one
  (Q10).
- **One field for conflicts** (Q11): the set of ids, so a co-lead's reordering is no
  change and their different set is a conflict.

### Alternatives that lost

- An `Organisations` tab, as ADR-013 made for categories (Q13): the public site keeps
  its own list, so a tab would govern the editor only; the list rarely changes.
- A separate organisation repository port (Q19): ADR-013 put the families and
  categories lists on `RoadmapRepository`, and so does this.
- The repository serving the display order (round 4, after Q25): alphabetical depends on
  the label and language a screen shows, and Welsh sorts its digraphs (`ch`, `dd`, `ll`)
  as letters, which only a locale-aware comparison in the interface gets right.
- Moving a row to the top or bottom of its new placement (Q3): a row move is a harder
  write to make safe beside a co-lead, and no reorder exists yet to match. Taken for
  the bottom since: _STY-051 amendments_.
- Keeping unknown codes in the cell (Q9): the public site drops them anyway.

### STY-051 amendments

Decided with the owner on 2026-11-16, on the wayfinder map
[Reordering a placement's items](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/102).

- **A moved item goes last in its new placement** (map ticket
  [Where does a moved item land, and where does a new item go?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/106)
  Q1, Q3, Q7): in all six placements, shown there as soon as it is moved, and written
  so. Publishing writes the `Horizon` cell and moves the item's row to just after the
  row of the placement's last item in the re-read, a co-lead's items included, which is
  no conflict (Q6). This replaces "A move changes the `Horizon` cell only … No row
  moves". Several items moved into one placement go last in the order they were moved
  (agent, STY-051 D3, reading the rule move by move).
- **Why the row now moves**: the rejected option's reason has gone. Reordering exists
  (STY-050, ADR-012 _STY-050 amendments_), and a check on a scratch copy of a roadmap
  tab ([What do row moves do to a real roadmap tab?](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/issues/109))
  showed a moved row keeps its formatting, dropdown and the references to it. Lost
  (Q1): first in the placement (wrong for a demotion), the kept row (it can land
  mid-list, unpredictably) and a place chosen at move time (reordering covers it).
- **Undo and moving back** (Q5): undoing a move, or moving the item back to where it
  was loaded, is no change, and it keeps its loaded position; rows move only at
  publish.
- **How the row moves** is ADR-012's (_STY-051 amendments_). A moved item whose row
  already sits where the placement's new order puts it, after every row of the
  placement's items and of the items moved in before it, has its `Horizon` cell written
  alone (#107 point 1: rows already in order stay).
- The rest of _Placement_ stands: a placement is a pending edit, one field for
  conflicts, chosen from the card's Move menu or the form, never unplaced.

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
- Since STY-051 a published move also moves the item's row (README _What the editor
  writes_ changes with it): a row the account may not edit refuses the whole publish,
  and a co-lead's edit in progress in a moved row is lost with an error in their
  spreadsheet.
