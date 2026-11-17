# STY-035: A Product Lead publishes or unpublishes a roadmap

- **Status**: Done — merged in #57
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-008-publishing-and-freshness](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-009, ADR-002, ADR-008
- **Suggested model**: Opus — a new repository write with fresh-read refusal checks,
  and a combined write with pending edits under ADR-012's conflict rules
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/57

## Summary

A Product Lead makes a roadmap public, or takes it down, from its page, without
opening the spreadsheet. After a confirmation, the editor writes the roadmap's
`Enabled` cell as `Yes` or `No` straight away, apart from pending edits. Publishing is
refused, naming what to fix, when the row would fail the public site's nightly sync.
A roadmap with unsaved edits is published together with them, all or nothing.
Unpublishing is never checked. Publishing from the list, and swapping a draft for the
live roadmap, are not in it.

## Scope

A repository write of one roadmap's published state that re-reads before it writes
(`domain/` port, the Sheets adapter and the in-memory double); the action, its dialogs
and notices on the roadmap's page (`features/`); copy in both catalogues; README
_What the editor writes_; an ADR-012 amendment; the glossary's _Publish_, _Save_ and
_Published roadmap_ entries ("Save and publish" makes _Save_'s "nothing becomes public"
untrue).

## Acceptance criteria

### S1: The page offers the action that fits (round 2 Q1)

**Given** Sam is connected and opens Product A, which is not published
**When** the page shows
**Then** beside the title and its "Not published" badge there is a "Publish roadmap"
action; on a published roadmap the same place offers "Unpublish roadmap"
**And** the roadmap list keeps its badge and offers no such action
**And** while not connected, or while the session has expired, the action is
unavailable, as "Publish changes" is

### S2: Publishing asks, then writes `Yes` (round 1 Q1)

**Given** Product A is not published and has no pending edits
**When** Sam chooses "Publish roadmap"
**Then** a dialog says Product A will show on the public site after its next nightly
update, with Publish and Cancel
**And** Cancel writes nothing; Publish writes the row's `Enabled` cell as exactly
`Yes`, after which the page and the list show it published, the badge gone and the
list's count of unpublished roadmaps one fewer, and a notice confirms it

### S3: Unpublishing asks, then writes `No`, unchecked (round 1 Q2)

**Given** Product A is published, even as the only published roadmap
**When** Sam chooses "Unpublish roadmap" and confirms
**Then** the row's `Enabled` cell is written as exactly `No`, and the page and list show
it "Not published"
**And** the dialog says it leaves the public site after its next nightly update; the
editor makes no check of how many roadmaps stay published

### S4: Publishing is refused when the row would fail the sync (round 1 Q3)

**Given** Product A's row, as re-read when Sam confirms and as it would read after the
write (with any pending edits of S5 applied), has any of: a `Sheet` that names no tab;
a colour written `#rgb`; a roadmap tab without a `Title` or `Horizon` column; or
another published row with the same slug, such as one a co-lead published after Sam
loaded the page (round 1 Q4)
**When** Sam confirms "Publish roadmap" or "Save and publish"
**Then** nothing is written, and the page says publishing was refused and names each
problem in Product Lead terms, with what to fix in the spreadsheet
**And** Product A stays not published, and any pending edits stay pending

### S5: Unsaved edits are offered with the publish (round 2 Q2, round 3 Q1)

**Given** Product A is not published and has two pending edits ("Save changes")
**When** Sam chooses "Publish roadmap"
**Then** the dialog says the two unsaved changes will go public with it and offers
"Save and publish" or Cancel
**And** "Save and publish" writes the pending edits and `Enabled` `Yes` in one
all-or-nothing write, after which the edits are no longer pending

### S6: A conflict publishes nothing (round 3 Q1)

**Given** the dialog of S5, and a co-lead has since changed a field Sam edited
**When** Sam chooses "Save and publish"
**Then** nothing is written: Product A stays not published, the edits stay pending, and
the conflict review opens as it does for "Save changes" (ADR-012)
**And** once Sam settles the conflicts, publishing the roadmap can be chosen again

### S7: Unpublishing leaves pending edits pending (round 3 Q2)

**Given** Product A is published and has a pending edit ("Publish changes")
**When** Sam unpublishes it
**Then** only `Enabled` is written; the edit stays pending and the step now reads
"Save changes"

### S8: A refused write changes nothing

**Given** Sam confirms publishing, unpublishing or "Save and publish"
**When** the write is refused for permission, the session expires, or the data source
can't be reached before the write is sent
**Then** the page says so, as a refused publish of changes does; the roadmap's published
state is shown as it was and any pending edits stay pending

### S9: Welsh

**Given** the interface is in Welsh
**When** Sam uses the action, its dialogs, refusals and notices
**Then** every string is Welsh

### S10: A write whose answer is lost is settled by a re-read

**Given** Sam confirms publishing, unpublishing or "Save and publish"
**When** the write is sent but its answer never arrives
**Then** the editor re-reads once, as ADR-012 settles a lost publish: all of it written
shows as done, none of it as S8, and anything else, or a re-read that fails, says the
roadmap may have changed and asks Sam to refresh before doing more

## Tests

S4's refusals (the co-lead race included), a loaded row a co-lead moved, S5–S6's single write and S10 need repository contract tests on both
implementations (`describeRoadmapRepositoryContract`) and MSW tests of the Sheets
adapter; S2, S4 and S5 need a Playwright journey against the Sheets fake, since the
list's badge and count must change after the write.

## Decisions

- **D1** (owner, 2026-11-13, grilling round 1 Q1): how the published state is written →
  its own action with a confirmation, written at once, not a pending edit. S1–S3.
- **D2** (owner, 2026-11-13, round 1 Q2): unpublishing the last published roadmap, which
  fails the public site's sync → not the editor's concern; no check or warning. S3.
- **D3** (owner, 2026-11-13, round 1 Q3): publishing a row that would fail the sync →
  refuse and name the problem; the editor fixes nothing itself (a `#rgb` colour
  included). S4.
- **D4** (owner, 2026-11-13, round 1 Q4): publishing a row whose slug another published
  row shares → refuse; swapping a draft for the live roadmap is a later feature. S4.
- **D5** (owner, 2026-11-13, round 2 Q1): where → the roadmap's page only; the list
  stays read-only. S1.
- **D6** (owner, 2026-11-13, round 2 Q2): pending edits when publishing → the dialog
  offers "Save and publish" or Cancel. S5.
- **D7** (owner, 2026-11-13, round 3 Q1): a conflict during "Save and publish" → all or
  nothing; the usual conflict review. S6.
- **D8** (owner, 2026-11-13, round 3 Q2): pending edits when unpublishing → they stay
  pending. S7.
- **D9** (agent, 2026-11-13): the write re-reads the row first; it counts as done
  without writing only when every cell asked for (with STY-036 D10, a date too)
  already holds its value, and any other value (`yes`, `TRUE`, blank)
  is overwritten with exactly `Yes` or `No`, over refusing as a conflict, because the
  state is binary and the confirmation names it.
- **D10** (agent, 2026-11-13): a roadmap index with no `Enabled` column gains one,
  appended with its header, as ADR-012 adds a missing column, over refusing.
- **D11** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, recorded by
  [DEF-015](../defects/DEF-015-a-write-the-editor-can-t-read-back-leaves-the-app-out-of-step.md)
  D3): a write whose answer is lost (S10), with edits sent or without, and one whose
  read after it fails, hold the whole app in a dialog until a Refresh (or Connect)
  succeeds, in place of the page's notices. DEF-015 delivered it.
- **D12** (owner, 2026-11-17, EPC-012 grilling round 3, recorded by
  [STY-057](../EPC-012-app-shell-and-navigation/STY-057-reconnect-from-the-action-that-needs-it.md)
  D1): Publish roadmap and Unpublish roadmap, and the dialog's own button, stay
  available while the session has expired; pressed, each asks to reconnect first, then
  carries on. Changes: S1 ("while not connected, or while the session has expired, the
  action is unavailable").

## Starting point

Audited at `220972a`.

- The parser keeps one row per slug, the published one first (ADR-009), and skips the
  others as `duplicate-id`, so the editor never shows a draft that shares the live
  roadmap's slug. S4's clash is reached when a co-lead publishes a same-slug row after
  Sam loaded the page. The re-read then keeps the co-lead's row for that slug, so a
  write that finds its row by slug, as the adapter's `#readRoadmap` does, binds to the
  wrong row and D9 would report it done. Find the row by the spreadsheet row the page
  loaded (`RoadmapIndexEntry.row`), as a hint only: the row must still hold the `Sheet`
  value and the other cells the page loaded, else the write is refused as changed since
  Sam opened it, nothing written and edits kept, so two same-`Sheet` rows a co-lead
  swaps are never confused. Count the clash over the raw index rows, the parser's
  skipped ones included.
- Reading the roadmap's items to check its tab does not work as is: `#readRoadmap`
  throws `invalid-data` when `Sheet` names no tab, and `parseRoadmapTab` throws without
  a `Title` column, which would surface as S8's failure, not S4's named refusal. The
  check must catch both first.

## Out of scope

- Publishing from the list, or several roadmaps at once (D5).
- Swapping a draft row for the live one (D4).
- Setting `Last updated` on publish: STY-036.

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_). "Publish roadmap" and "Unpublish
roadmap" write one roadmap index row's `Enabled` cell, as exactly `Yes` or `No`, in one
`batchUpdate`; an index with no `Enabled` column gains one, appended with its header
(D10). "Save and publish" writes the roadmap's pending edits, as a publish of them
does, and `Enabled` in the same request. Nothing is written while publishing would
fail the public site's sync, while the row no longer holds what the page showed, or
when `Enabled` already holds the value asked.

### Departures

- **The row is found by what it holds, not by its row number** (agent): the page holds
  a `Roadmap`, never a row (ADR-002), so the Starting point's row hint is not carried.
  `Roadmap` gains `itemsLocation`, where its items are kept (the `Sheet` value, never
  shown), so the row must still hold the `Sheet` value the page loaded. The write takes
  the index row with the roadmap's id, listed or skipped, that holds every field the
  page showed (its own cells: `Sheet`, text with Welsh, product lead, `Last updated`,
  family and category IDs and the copied family, colour and category), apart from its
  published state and the fields with pending edits sent, which are left out whole.
  Of several alike, it takes the one the list kept (ADR-009): for a published roadmap
  the first published, so a disabled copy of the live row is never unpublished in its
  place; else the first. A row moved or swapped is still found. None holding it settles as `changed`, writing
  nothing, with the roadmap the list now keeps (`findPublishedStateRow`,
  `findLoadedRow`).
- **"Save and publish" is refused as changed when a co-lead changed a field Sam did not
  edit** (agent): the row must still hold what the page showed, a stricter rule than a
  publish of pending edits alone, which writes over such a change (ADR-012 Option 12).
  A conflict on an edited field still opens the review (S6). The page says "This
  roadmap changed while you were looking. Nothing was changed.", STY-030's words, and
  shows the roadmap as now read; the edits stay pending.
- **"As it would read after the write"** (S4) counts two fixes the same write makes: a
  family chosen in the pending edits replaces a `#rgb` colour, and a placement written
  adds a missing `Horizon` column. A roadmap a co-lead already published (its `Enabled`
  exactly `Yes`) is not checked: there is nothing to publish (D9).
- **A row whose `Sheet` names the `Template`, `Families` or `Categories` tab, or the
  index itself,** fails publishing with `invalid-data`, as reading its items does,
  rather than a named refusal. Unpublishing reads no tab, so it is never stopped by one.
- **The refusals are domain data** (`PublishProblem`: `items-missing`,
  `items-field-missing` with `title` or `placement`, `short-colour`, `id-taken` with the
  other roadmap's title); the page words them, naming the tab, the column or the colour
  and its six-digit form, and says to fix the spreadsheet and publish again.
- **Where the outcomes show** (agent): a conflict during "Save and publish" opens the
  pending-edit store's review, and a lost answer with edits sent is the store's
  "may have been saved" warning, which holds Discard all until a Refresh, both as for
  "Save changes". Every other outcome is a notice under the roadmap's family line, kept
  by the page as "Make it match" keeps its own, so it goes on leaving the page. A plain
  publish's lost answer reads "Product A roadmap may have been published" with the
  Refresh line.
- **The action sits in the title row's actions, before Refresh** (agent), a secondary
  button with a globe or eye-off icon; on a phone it wraps under the title with Refresh.
  The unpublish dialog also says pending edits stay ("Your unpublished change stays, to
  save later."). The dialog keeps what it asked while it closes, though the roadmap's
  state flips under it.
- **The in-memory double holds index rows**, several of which may share an id, and
  lists one per id as ADR-009 keeps it; it gains `syncFaults`, and the contract gains
  `twins` and `syncFaults` (`ContractOptions`). `#readRoadmap` now shares
  `#readItemTab` and `roadmapReadOf`; the three copies of the `Template` index check are
  one `writableIndex`; `indexCell` reads an index cell for both the family writer and
  the new checks.
- **Review round 1 fixes** (Sol, Opus): the `Sheet` value is held (`itemsLocation`); an
  edited field is left out of the match whole, so a lost answer that filled or cleared
  an optional field settles as done; the row whose state the page showed is preferred;
  the roadmap's items are read again after any change of state, as another row with
  the id may then be listed. Their tests were written after the fixes and shown to fail
  against the round-1 planner (6 of 6).
- **Review round 2 fix** (Opus, P3, after the cap): of rows alike, the row is now the
  one the list kept, not one whose state is the one shown, which took an untouched
  draft copy when settling a lost publish, and refused a roadmap a co-lead had just
  published as `id-taken` (D9). Two contract tests and a planner test hold it.
- **Tests.** The repository contract (`published-state-contract.ts`) was written first
  and ran red on the in-memory double (24 failing: no `setRoadmapPublished`), then the
  double and the Sheets adapter made it pass. The domain planner (`published-state.ts`)
  was written before its unit tests, and the page tests after the components, so neither
  is TDD evidence; the Sheets adapter's own tests (exact `Yes`/`No`, D9, D10, a
  three-digit colour as written, the `Template` index), the parser tests
  (`everyEntry`, `roadmapTabColumns`) and the Playwright specs followed working code.

### Contract for dependents

- **Domain** (`@/domain/roadmap/roadmap`): `Roadmap.itemsLocation` is where its items
  are kept (the Sheets adapter's `Sheet` value; `createTestRoadmap` defaults it to the
  id), compared to find a roadmap's row again, never shown.
- **Domain** (`@/domain/roadmap/published-state`): `PublishedStateChange` is
  `{ published: true, changes? } | { published: false }`; STY-036's "Mark as updated
  today" adds its date to the publishing branch, and must leave `lastUpdated` out of
  `holdsLoaded`'s comparison when it sends one, and count it in
  `heldPublishedState`. `RoadmapRepository.setRoadmapPublished(loaded, change)` returns
  `PublishedStateOutcome` (`set`, `unconfirmed`, `roadmap-not-found`, `changed`,
  `unpublishable`, `refused`).
- **Sheets adapter**: `setRoadmapPublished` writes `Enabled` first in the batch, then
  `batchRequests(read, writes, index)` for any pending edits through the same index
  `TabWriter`; STY-036's `Last updated` cell goes through that writer too.
- **Features**: `usePublishedState(roadmap)` (`editing/use-published-state.ts`) owns
  the question (`asked`, `open`), the write and its notice; `PublishedStateAction`
  renders the button and dialog, where STY-036's tick box goes; `PublishedStateNotice`
  words the outcome.
- **E2E hooks**: buttons "Publish roadmap", "Unpublish roadmap", "Save and publish";
  `detail.aria.yml` holds "Unpublish roadmap" beside Refresh.
- **Welsh to review** (machine-assisted): every `roadmaps.publishRoadmap.*` string in
  `cy.ts` ("Cyhoeddi'r map trywydd", "Dad-gyhoeddi'r map trywydd", "Cadw a chyhoeddi",
  the notes, the plural `withChanges_*` and `keepsChanges_*`, the notices and the five
  problem lines).

### Scenario evidence

| Scenario     | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1           | page tests "offers Publish roadmap beside a roadmap not published", "offers Unpublish roadmap beside a published roadmap", "leaves the list with its badge and no such action", "is unavailable while the session has expired"; `detail.aria.yml`                                                                                                                                                                                                                                                                                                                                                                                     |
| S2           | page test "asks first, writes nothing on Cancel, then publishes and says so"; contract "publishes a roadmap, writing its published state alone"; Sheets "writes the row's Enabled cell as exactly Yes, alone, in one batchUpdate"; e2e "publishes a roadmap by its Enabled cell alone, then the page and list show it" (badge gone, "3 roadmaps" with no "not published")                                                                                                                                                                                                                                                             |
| S3           | page test "unpublishes the only published roadmap after asking, unchecked"; contract "unpublishes the only published roadmap, unchecked, even one the sync would fail on"; Sheets "unpublishes by writing exactly No, reading no roadmap's tab"; e2e "unpublishes a roadmap after asking"                                                                                                                                                                                                                                                                                                                                             |
| S4           | contract "refuses to publish when its items' tab is missing / have no Title column / have no Horizon column / its colour has three digits", "refuses … when another published row has its id, such as a co-lead's", "names every problem at once", "writes nothing when publishing would fail the sync" (with edits), "publishes a three-digit colour that a chosen family replaces"; `published-state.test.ts`; page test "refuses to publish a roadmap the public site's update would fail on, naming each problem"; e2e "refuses to publish a roadmap whose colour the public site rejects, writing nothing"; axe (light and dark) |
| S5           | contract "writes the edits and the published state together"; page test "offers Save and publish for a roadmap with unsaved edits, writing both"; e2e "saves and publishes a roadmap's unsaved edits in one write" (one `batchUpdate`)                                                                                                                                                                                                                                                                                                                                                                                                |
| S6           | contract "writes nothing on a co-lead's conflicting change"; page test "publishes nothing on a co-lead's conflicting change, opening the review" (Publish roadmap available again once decided)                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S7           | page test "leaves pending edits pending on unpublishing, the step then reading Save changes"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S8           | contract "rejects with a forbidden / unauthenticated AppError when the write is refused, writing nothing"; page test "says a refused write changed nothing, keeping pending edits"                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S9           | page test "speaks Welsh throughout"; `pnpm typecheck` catalogue parity; Welsh capture `s1-roadmap-unpublished-desktop-light-cy-after.png`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S10          | contract "settles a publish / an unpublish as set when a re-read finds it", "rejects with a network AppError when a re-read finds none of it", "is unconfirmed when a re-read finds only some of it / when the re-read fails"; `published-state.test.ts` (`heldPublishedState`); page test "asks for a refresh when the answer is lost and a re-read can't settle it"                                                                                                                                                                                                                                                                 |
| Row identity | contract "writes the row the page loaded when another row now shares its id", "says the roadmap changed when its row now names another place for its items", "unpublishes the live row, not a disabled copy of it above", "settles as set an edit that fills or clears an optional field", "settles as set a publish with a draft copy below it", "counts a roadmap a co-lead published as published, though a draft copy of it remains"; "says the roadmap changed when no row holds what was loaded", "counts a roadmap a co-lead already published as published, writing nothing"; Sheets D9 and D10 tests                         |
