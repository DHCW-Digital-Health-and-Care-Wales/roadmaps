# STY-035: A Product Lead publishes or unpublishes a roadmap

- **Status**: Proposed — grilled in EPC-008 rounds 1–4 (2026-11-13)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-008-publishing-and-freshness
- **Depends on**: none
- **Binding ADRs**: ADR-012, ADR-009, ADR-002, ADR-008
- **Suggested model**: Opus — a new repository write with fresh-read refusal checks,
  and a combined write with pending edits under ADR-012's conflict rules

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
