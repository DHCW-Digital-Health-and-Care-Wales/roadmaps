# DHCW Roadmaps

[![CI/CD](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/workflows/ci.yml)

Digital Health and Care Wales (DHCW) publishes the Now / Next / Later roadmaps of its
products. Product Leads, DHCW staff, manage them in the Roadmap Editor; a separate app,
the public site, reads the same Google Spreadsheet and shows the published roadmaps. The
[Product Lead persona](docs/backlog/personas/product-lead.md) describes who the editor is
for.

This repository is one pnpm workspace
([ADR-016](docs/adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md)):

- [`apps/editor/`](apps/editor/README.md): the Roadmap Editor, a static React app on
  GitHub Pages at **<https://dhcw-digital-health-and-care-wales.github.io/roadmaps/>**.
  Its README covers its setup, architecture, testing and operations.

Licensed under the [MIT License](LICENSE).

## Contents

- [Getting started](#getting-started)
- [Spreadsheet format](#spreadsheet-format)
- [Project documentation](#project-documentation)

## Getting started

You need Node.js 26 (see `.nvmrc`; 22.22+ and 24.15+ also work) and pnpm, e.g.
`npm install --global pnpm` (see <https://pnpm.io/installation>); any recent pnpm switches
itself to the version pinned in `packageManager` (Node 25+ no longer ships Corepack).
Then:

```sh
git clone https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps.git
cd roadmaps
pnpm install --frozen-lockfile
```

The install also installs the Git hooks (`lefthook.yml`): a commit formats its staged
files with Prettier and runs the touched package's ESLint on them, and a push runs
`pnpm typecheck`. `LEFTHOOK=0 git …` skips them for one command; CI runs the same
checks in full.

Each app's README says how to run it, starting with
[the editor's](apps/editor/README.md#getting-started). Root scripts that run one app carry
its prefix (`pnpm editor:dev`, `editor:test`, `editor:build`, …), and those for the root
package's own checks the prefix `repo:`; the checks below run across every package:

```sh
pnpm typecheck      # TypeScript, every package
pnpm lint           # ESLint, zero warnings allowed
pnpm format:check   # Prettier over the whole repository (pnpm format to fix)
pnpm test           # Vitest, every package
pnpm test:docs      # the Markdown tests alone (links, agent guides)
pnpm build          # every app's production build
```

Pull requests into `main` merge as a signed squash, once the _CI result_ check passes
and the owner approves (`.github/rulesets/main.json`,
[protecting main](docs/operations/protecting-main.md)).

## Spreadsheet format

The spreadsheet is shared with the public site, so its format is a contract with it
([ADR-009](docs/adr/ADR-009-roadmap-list-from-the-first-tab.md)). The **first tab**,
whatever it is called and even when hidden, is the roadmap index: row 1 is the header and
each other row is one roadmap. Its `Sheet` column (required) names the tab holding that
roadmap's items; `Enabled` (exactly `Yes`), `Title`, `Category`, `Family`, `Status label`,
`Last updated`, `Colour`, `Vision`, `Service description` and `Product Lead` are read
when present, with `(cy)` columns for Welsh. The tab a row's `Sheet` names holds that
roadmap's items, one per row, its columns found by their row-1 header in any order
([ADR-011](docs/adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md)). The `Template` tab
is copied to start a roadmap, after its header row is read to check it; its other rows
are never read and it is never changed. An optional `Item ID` column holds each item's identity
([ADR-012](docs/adr/ADR-012-publishing-a-roadmaps-changes.md)); the public site ignores it.

**Families and categories** are defined once, in a `Families` tab (`ID`, `Name`,
`Name (cy)`, `Colour`) and a `Categories` tab (`ID`, `Name`, `Name (cy)`), neither of
them first, which the owner sets up by hand
([the runbook](docs/operations/families-and-categories-tabs.md),
[ADR-013](docs/adr/ADR-013-families-and-categories-defined-once.md)); the public site
ignores both. A roadmap is linked to its family and category by the index's optional
`Family ID` and `Category ID` columns, or by its `Family` and `Category` cells, folded,
when it has no ID. A linked roadmap shows the list's name and colour; one whose own
cells differ is flagged as out of step, and one whose family is not in the list keeps
its own cells, flagged. Without the `Families` tab, roadmaps are grouped and coloured
from their own cells; without the `Categories` tab, a `Category` is one of the public
site's six spellings, shown in English. The editor never writes the `Categories` tab;
it writes the `Families` tab only as below.

**What the editor writes.** Publishing a roadmap writes, in one all-or-nothing
`spreadsheets.batchUpdate`, only:

- each changed English field: the index row's `Title`, `Status label`, `Product Lead`,
  `Vision` and `Service description`, and each item's `Title`, `Description`, `Outcome`
  and `Phase`, as plain text exactly as typed (trimmed; a formula, number, date or
  `TRUE` stays text), a cleared field as an empty cell;
- a moved item: its row's `Horizon` cell, as the public site's English value for the
  placement chosen (`Recently delivered`, `Now`, `Next`, `Later`, `Delivered this year`
  or `Not doing`), never a blank; and its row, moved (`moveDimension`) to just after
  the row of its new placement's last item, as the tab reads at publish, so the item
  shows last there. That counts an item a co-lead added to the placement meanwhile,
  and a row hidden by hand, which holds a position though the public site leaves it
  out. A row already below every item row of its new placement, and below the row of
  each item moved there before it, is left where it is, as is the one item moved into
  a placement with no items. Several items moved into one placement end in the order
  they were moved: only their rows move, never a row of an item the placement already
  held, and as few of them as put them so. A row is moved whole and none of its cells
  is rewritten: it keeps its formatting, its `Horizon` dropdown, its Welsh and unknown
  columns, and a formula elsewhere that refers to it follows it. The rows it passes
  shift by one and keep their order, as do the rows of every other placement. Rows are
  moved after every cell is written and before a new item's row is appended. A co-lead
  part-way through editing a cell of a row as it moves loses that edit, with an error
  in their spreadsheet (STY-051). A placement the Product Lead has reordered takes the
  item where that order has it instead (below);
- a reordered placement (a horizon or section whose items the Product Lead put in
  another order): row moves alone (`moveDimension`), which write no cell content and no
  column, as the public site already orders a placement by row. The fewest rows move
  that put the placement's rows in the new order, as the tab reads at publish: the
  longest run of them already in that order stays, and each other row goes to just
  after the row of the item it then follows, or, for the first, to just before the
  placement's first row that stays. An order a re-read already holds moves nothing.
  Every row of the placement may move, and each moves whole, as a moved item's does;
  the rows of every other placement keep their order. An item a co-lead added or moved
  into the placement since the Product Lead read it goes last, and one they removed or
  moved out is left out, but only once the Product Lead has seen their change and kept
  their own order: until then a publish that finds the placement's items changed
  writes nothing (STY-050);
- a changed `Last updated`: the index row's `Last updated` cell, as text `YYYY-MM-DD`
  (`2026-11-13`) whatever format the cell held, or an empty cell when cleared; and,
  when "Mark as updated today" is ticked (and no date is pending), today's date by the
  Product Lead's browser, written over whatever the cell holds (STY-036);
- an item whose organisations changed: its row's `Organisations` cell alone, as the
  codes chosen, `National` first and then by code, separated by a comma and a space
  (`National, SBUHB`), or an empty cell for none; only codes in the editor's list are
  written, so a code it doesn't recognise goes from the cell then, and only then;
- an item whose tags changed: its row's `Labels` cell alone, as the tags in order,
  separated by a comma and a space (`Patients, Video appointments, Carers`), as text, or
  an empty cell for none; no tag holds a comma or a line break. `Labels (cy)` is never
  written, and an item whose `Labels (cy)` cell holds anything, even Welsh that pairs
  with no tag, has neither cell written: its tags can't be changed in the editor, and a
  publish that finds Welsh written there since the item was read writes nothing
  (STY-037);
- an item whose details changed: its row's `Details` cell alone, as text, a line for
  each detail in order, starting with a hyphen for each level it is nested and then a
  space, a top-level line with neither (`Follow-up appointments`, `- Dermatology`,
  `-- Adult clinics first`), or an empty cell for none. A list has three levels, the
  first line is at the top level and a line is at most one level deeper than the line
  above; no detail holds a line break or starts with a hyphen or a space. A cell
  written another way that shows as the same list (a hyphen on every line, a skipped
  level) is left as it is until its details are changed here, and is then written this
  way. `Details (cy)` is never written, and an item whose `Details (cy)` cell holds
  anything, even Welsh that pairs with no detail, has neither cell written: its details
  can't be changed in the editor, and a publish that finds Welsh written there since
  the item was read writes nothing (STY-039);
- a new item: one row after the tab's last row in use, appended by Google as it applies
  the write, so a row a co-lead added meanwhile is kept, no row moves for it, and it
  shows after any item moved into its placement in the same publish. A new item the
  Product Lead has put before another item of a reordered placement is inserted
  instead of appended: a row is put in (`insertDimension`) just before the row of the
  item that follows it there, after the row moves, and its cells are written in it.
  The request asks Google to format the new row as that row, never as the row above,
  which may be the header (`inheritFromBefore: false`); what Google then gives it has
  not been checked against a real spreadsheet (CHO-020). A new item that is last in
  its placement is appended as ever (STY-050). The row holds the item's `Item ID`,
  made when the item was added, its `Title`, its `Horizon` as the
  public site's English value, and each of `Description`, `Outcome`, `Phase`, `Labels`,
  `Organisations` and `Details` the item has, each written as a change to that field
  is written above. Every other cell of the row is left empty, each Welsh cell among
  them. Several new items are appended in the order they were added, those of a
  reordered placement in its order. A new item is
  written with the roadmap's other changes or not at all, and is not written again
  once a row of the tab holds its `Item ID` (STY-045);
- a removed item: its row deleted (`deleteDimension`), with every cell it holds, its
  Welsh and unknown columns included, its formatting and the references to it. Rows are
  deleted after every cell write, row move, insert and append, the bottom row first,
  each where those requests leave it, so no other row's cells are rewritten. An item
  without an `Item ID` is found by its position, as an edited one is, and is deleted
  without being given one. When the removed rows are every row of the tab's grid below
  its frozen header, as removing every item of a roadmap the editor created is (its
  grid is its header and a row per item), the top removed row is cleared instead, of
  every cell, its format and dropdown too, as a copied `Template`'s first row is, since
  Google keeps one row that is not frozen in every tab; a row without a title is no
  item, so the roadmap reads with none. A row appended or inserted in the same write is
  such a row, and then every removed row is deleted. A removal writes nothing when a
  co-lead has changed any of the item's fields since it was loaded, its Welsh included, and counts as done
  when no row of the tab holds its `Item ID` (STY-070);
- an `Item ID` for every item row it reads (one with a title) that has none, or repeats
  another row's, but a row it deletes: eight random
  lower-case letters and digits starting with a letter, such as `k7q2xwbn`;
- a chosen family: the index row's `Family ID`, `Family`, `Family (cy)` and `Colour`,
  copied from the `Families` tab as read at publish (`Colour` lower case, as
  `#006747`); "No family" blanks `Family ID`, `Family` and `Family (cy)` and leaves
  `Colour`;
- a chosen category: the row's `Category ID` and `Category` (the `Categories` tab's
  English `Name`); "No category" blanks both;
- on any publish, the `Family ID` or `Category ID` of a row with none whose name links
  it to a listed family or category, never changing an ID already there;
- a column the roadmap needs but lacks (the `Item ID` column the first time, the
  `Family ID` or `Category ID` column, or the column of a field edited or of a field a
  new item has: `Horizon` for a move, `Labels` for tags, `Organisations` for a choice
  of organisations and `Details` for details), appended after the last column in use
  with the public site's English header, the grid widened in the same request.

Adding, renaming or recolouring a family on the "Families, categories and organisations" page writes
at once, after a re-read, in one all-or-nothing `spreadsheets.batchUpdate`, only:

- to add a family: a new `Families` row after the last row in use, with an `ID` in the
  `Item ID` format, the `Name` as typed (trimmed) and the `Colour` in lower case, its
  `Name (cy)` left blank, appended by Google so a family a co-lead added meanwhile is
  kept;
- to rename or recolour one: its `Families` row's `Name` or `Colour`, whichever changed,
  and on the index row of each roadmap in the family (linked by ID, or by name if it
  has no ID) its `Family ID`, `Family`, `Family (cy)` (copied from `Name (cy)`, which is
  never written) and `Colour`, as a publish writes a chosen family; the `Family ID`
  column is appended if missing. Nothing is written while the roadmap index is named
  `Template`, and a co-lead's change to the family's name or colour, or to which
  roadmaps are in it, since the page read it refuses the whole write. An index row the
  editor doesn't list (its `Sheet` is not a valid roadmap ID, or repeats an earlier
  row's) is not rewritten, and keeps the old family name and colour.

"Make it match" on a roadmap flagged as out of step with its family or category writes
at once, after a re-read, in one all-or-nothing `spreadsheets.batchUpdate`, only that
roadmap's index row's `Family ID`, `Family`, `Family (cy)`, `Colour`, `Category ID` and
`Category`, copied from the `Families` and `Categories` tabs as read, each only where it
differs, and the `Family ID` or `Category ID` column if it is missing. It is offered
only for a family in the list, writes nothing while the roadmap index is named
`Template`, and a change since the page loaded to the roadmap's family or category, to its
row's own copied cells, or to its being out of step or published, refuses the write; its pending edits stay
pending.

"Publish roadmap" and "Unpublish roadmap" on a roadmap's page write at once, after a
confirmation and a re-read, in one all-or-nothing `spreadsheets.batchUpdate`, only that
roadmap's index row's `Enabled` cell, as exactly `Yes` or `No` (any other value, such as
`yes`, `TRUE` or blank, is overwritten), and the `Enabled` column, appended with its
header, if the index has none (STY-035). The row written is one with the roadmap's ID,
listed or not, that still holds what the page showed, its `Sheet` value included (of
several, the one the list kept: for a published roadmap the first enabled, else the
first); nothing is written when
none does, or when the cell already holds the value. Publishing a roadmap with
pending edits ("Save and publish") writes them with `Enabled` in the same request, as a
publish of them writes them, all or nothing; with "Mark as updated today" ticked, the
row's `Last updated` cell is set to today in that request too, as a publish of edits
sets it, even when `Enabled` already reads `Yes`. Publishing writes nothing while the row
would fail the public site's nightly sync once enabled: its `Sheet` names no tab, the
tab has no `Title` or `Horizon` column (unless the same write adds `Horizon`), its
`Colour` is `#rgb` (unless a family chosen in the same write replaces it), or another
row with the same ID is enabled. Unpublishing is never checked, and leaves pending
edits pending.

Adding a roadmap writes at once, after a re-read, in one all-or-nothing
`spreadsheets.batchUpdate`, only (STY-040):

- a new tab named for the roadmap's short name, placed after the last tab: a copy of
  the `Template` tab (`duplicateSheet`, with an ID the editor chooses), shown even when
  the `Template` is hidden, with every row after the first under its header deleted and
  that one row cleared of its values, formatting and data validation, so the tab holds
  the `Template`'s header row over one empty row (Google keeps one row that is not
  frozen in every tab). A `Template` that is a header row alone is only copied, so its
  copy has that one row. Where the `Template` freezes more rows than its header, the
  copy has its header alone frozen. It has the `Template`'s columns, and gains an
  `Item ID` column at its first publish, as any roadmap's tab does;
- a new row of the roadmap index after the last row in use, appended by Google so a
  row a co-lead added meanwhile is kept: `Sheet` (the short name), `Enabled` as exactly
  `No`, `Title`, and, where given, `Product Lead`, a chosen family's `Family ID`,
  `Family`, `Family (cy)` and `Colour` and a chosen category's `Category ID` and
  `Category`, as a publish writes them. Every value is text, trimmed, and every other
  cell is left empty: `Last updated`, the status, the vision, the service description
  and every other Welsh cell;
- a column that row needs and the index lacks (`Enabled`, `Title`, `Product Lead`, or a
  family or category column), appended with its header as a publish appends one.

A short name holds letters (accented ones included), numbers, spaces and hyphens only,
is at most 100 characters and has an address: the public site's slug of it, so
`Community Nursing` is `community-nursing`. Nothing is written when a row of the index
has the same address, published or not; when a tab has the same name in any letter
case, whatever it holds; for the names `Template`, `Families` and `Categories`, whether
or not those tabs exist; when a chosen family or category is no longer in its list;
when there is no `Template` tab, or its header has no `Title` or no `Horizon` column; or
while the roadmap index is itself named `Template`. A roadmap is never added published,
and a tab the editor did not copy from the `Template` is never listed as a roadmap by
this write.

It never writes any other cell: no Welsh `(cy)` cell other than `Family (cy)`, no
`Last updated` but as above, no `Sheet` cell but a new roadmap's, no `Enabled` cell but
those above, no `Horizon`, `Labels`, `Organisations` or `Details` cell but those above,
no `Family`, `Category` or `Colour` cell but those above and "Make it match"'s, no
roadmap's row or tab but those above, nothing in the `Template` tab, which is only
copied, nothing in the `Categories` tab, nothing in the `Families`
tab but the family changes above, and no cell whose value has not changed. A roadmap
whose `Sheet` names the `Template` tab or the roadmap index itself can't be read or
published, and nothing is published while the
roadmap index is itself named `Template`. A field a co-lead has changed since it was
loaded (a family or category by its ID, so a rename is no change), or an item or
roadmap since removed, refuses the whole publish. A family or category ID the list
doesn't have refuses it too, as does any family or category choice, "No family" or "No
category" included, while its list tab is missing. So does a cell or a row protected
from the connected account: Google refuses a write that changes one or moves one, and
with it the whole request, so nothing is written; the editor says a protected part of
the spreadsheet stopped it and keeps the pending changes (STY-051). Nothing checks for
protection beforehand.

- The rules, and how the editor differs from the public site on mistakes, are in
  [the roadmap index analysis](docs/analysis/roadmaps-tab-format.md) and
  [the roadmap tab analysis](docs/analysis/roadmap-tab-format.md).
- An example spreadsheet, with steps to import it into a test spreadsheet of your own, is in
  [`apps/editor/tests/fixtures/sheets/`](apps/editor/tests/fixtures/sheets/README.md).
- A list that can't be read (no tabs, an empty first tab, or no `Sheet` column) shows a
  problem asking the spreadsheet owner to check it. A mistake in one row never hides the
  rest. A roadmap whose tab is missing, empty or has no `Title` column is still listed, but
  its own items can't be read.

## Project documentation

- [`AGENTS.md`](AGENTS.md): the rules for every change, and a table of each area's own
  guide, such as [`apps/editor/AGENTS.md`](apps/editor/AGENTS.md) for the editor; read
  them before changing code. Nested `AGENTS.md` files (for example
  [`apps/editor/tests/e2e/AGENTS.md`](apps/editor/tests/e2e/AGENTS.md)) cover their
  folders.
- [`docs/adr/`](docs/adr/README.md): architecture decision records.
- [`docs/backlog/`](docs/backlog/README.md): epics, stories, defects and chores; finished
  epics are in `docs/backlog/_archive/`.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md): the shared domain vocabulary.
- [`docs/operations/`](docs/operations/): runbooks.
