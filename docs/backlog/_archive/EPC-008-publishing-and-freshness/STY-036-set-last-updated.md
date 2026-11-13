# STY-036: A Product Lead sets when a roadmap was last updated

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-008-publishing-and-freshness](README.md)
- **Depends on**: STY-035 (preferred order)
- **Binding ADRs**: ADR-012 §Option 9, ADR-008, ADR-002
- **Suggested model**: Opus — a date field through the pending-change model, publish
  plan and conflict review, and an amendment to ADR-012's Option 9
- **Delivered**: (this PR)

## Summary

A Product Lead sets a roadmap's "Last updated" date in its About form, with the
browser's date picker or a "Today" button. They can also clear it. The date is a
pending edit, published with the rest. When publishing or saving changes, a "Mark as
updated today" tick box, unticked by default, sets it to today in the same write.
Dates after today are refused, and the editor writes `YYYY-MM-DD`. Publishing never
sets the date unless asked. Showing stale roadmaps (A7) is not in it.

## Scope

`lastUpdated` joins the roadmap's editable fields (`domain/`), written by the publish
plan (`infrastructure/`); STY-035's published-state write carries an optional
`Last updated` of today for D10 (the port, the Sheets adapter and the in-memory
double); the About block and form, the publish dialog and the
conflict review (`features/`); copy in both catalogues; README _What the editor
writes_; an ADR-012 amendment; the line in `docs/analysis/roadmap-tab-format.md` that
says the editor never writes `Last updated`. Where "today" is worked out, a code comment
names CHO-005: that date goes to the future database API in UTC (D11).

## Acceptance criteria

### S1: The page shows the date (round 1 Q5)

**Given** Product A's `Last updated` reads `2026-10-02`
**When** Sam opens its page
**Then** the "About this roadmap" block shows "Last updated" and the date as the list
card shows it; a roadmap with none shows that it has none

### S2: The form sets a date with the browser's picker (round 1 Q5, round 4 Q1)

**Given** Sam edits Product A's About form
**When** Sam picks 10 November 2026 in the "Last updated" field, the browser's own
date input
**Then** the field holds that date, and confirming makes it a pending edit, tagged
"Changed" and listed in the publish dialog
**And** nothing is written until Sam publishes or saves

### S3: "Today" fills today's date (round 1 Q5)

**Given** the form, on 13 November 2026 by the browser's clock
**When** Sam chooses "Today"
**Then** the field holds 13 November 2026

### S4: No date after today (round 1 Q7)

**Given** the form on 13 November 2026 by the browser's clock
**When** Sam enters 20 November 2026
**Then** the picker offers no later date than today, and a typed later date is refused
with a message; the form can't be confirmed until it is fixed

### S5: The date may be cleared (round 1 Q8)

**Given** Product A has a date
**When** Sam clears the field and publishes
**Then** the `Last updated` cell is written empty, and the page and card show no date

### S6: The publish dialog offers "Mark as updated today" (round 1 Q5, round 2 Q3, review round 1)

**Given** Product A has no pending date
**When** Sam opens the dialog for "Publish changes", "Save changes", or STY-035's
"Publish roadmap" (with or without unsaved edits, so "Save and publish" too)
**Then** it shows a "Mark as updated today" tick box, unticked
**And** publishing with it ticked writes today's date in the same all-or-nothing write;
unticked, `Last updated` is not written

### S7: A pending date hides the tick box (round 2 Q4)

**Given** Product A has a pending date from the form
**When** Sam opens the publish dialog
**Then** there is no tick box, and the pending date is published

### S8: The cell is written as `YYYY-MM-DD` (round 1 Q6)

**Given** any date set by S2, S3 or S6
**When** it is published
**Then** the `Last updated` cell holds the date as text `YYYY-MM-DD`, such as
`2026-11-13`, whatever format the cell held before

### S9: A co-lead's date is a conflict (round 3 Q3)

**Given** Sam's pending date was edited from `2026-10-02`, and a co-lead has since
written `2026-11-01`
**When** Sam publishes
**Then** nothing is written and the conflict review shows "Last updated" side by side
with "Keep mine" and "Use theirs", as other fields
**And** a date set only by the tick box never conflicts: today is written over any
co-lead's date

### S10: Welsh

**Given** the interface is in Welsh
**When** Sam uses the field, "Today", the tick box and their messages
**Then** every label and message is Welsh; the picker's own month names and date
format follow the browser's language (round 4 Q1)

## Tests

S3 and S4's "today" is the browser's local date (D11), so test it with a fixed clock
and a time zone other than UTC just after local midnight (in Europe/London,
2026-07-01T23:30Z is already 2 July), where a UTC date would differ. S8 needs an MSW test of the written cell; S2 and S6 need a Playwright
journey against the Sheets fake. D10 needs a contract test on both implementations, and
an MSW test, of "Publish roadmap" with the box ticked, including a row whose `Enabled`
already reads `Yes`, where the date is still written.

## Decisions

- **D1** (owner, 2026-11-13, grilling round 1 Q5): how the date is set → both a field
  in the About form with "Today", and a "Mark as updated today" tick box when
  publishing, unticked by default. Refines ADR-012 Option 9: publishing sets the date
  only when the Product Lead asks. Supersedes STY-024 D2, which kept the date off the
  page. S1–S3, S6.
- **D2** (owner, 2026-11-13, round 1 Q6): the format written → `YYYY-MM-DD`. S8.
- **D3** (owner, 2026-11-13, round 1 Q7): dates allowed → none after today. S4.
- **D4** (owner, 2026-11-13, round 1 Q8): clearing → allowed. S5.
- **D5** (owner, 2026-11-13, round 2 Q3): the tick box on "Save changes" too → yes. S6.
- **D6** (owner, 2026-11-13, round 2 Q4): tick box with a pending date → hidden. S7.
- **D7** (owner, 2026-11-13, round 3 Q3): a co-lead's date → a conflict field by field,
  as other fields; the tick box never conflicts. S9.
- **D8** (owner, 2026-11-13, round 4 Q1): the input → the browser's native date input
  (`<input type="date">`), not a calendar component; its month names and format follow
  the browser's language. S2, S4, S10.
- **D9** (agent, 2026-11-13): "today", for "Today", the tick box and D3's limit, is the
  date in Europe/London, over the browser's local date, because DHCW works in Wales and
  a browser set to another zone would otherwise date the roadmap wrongly. S3, S4, S6.
- **D10** (owner, 2026-11-13, asked after review round 1): the tick box on STY-035's
  "Publish roadmap" with no unsaved edits → yes, offered there too; ticked, `Enabled`
  and today's date go in one write. S6. Not on "Unpublish roadmap".
- **D11** (owner, 2026-11-13, asked after review): "today", for "Today", the tick box
  and D3's limit → the browser's local date, not Europe/London. Replaces D9. S3, S4,
  S6. The code that works out "today" carries a comment naming CHO-005, which sends
  the date to the future database API in UTC.

## Out of scope

- Staleness (A7): a later record.
- Setting the date when unpublishing a roadmap: not asked for.
- Sending the date to the future database API in UTC: CHO-005.

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_): the roadmap index row's `Last updated`
cell, as text `YYYY-MM-DD` (`2026-11-13`) whatever format the cell held, or an empty
cell when cleared. It is written when a pending date is published or saved, and, with
"Mark as updated today" ticked, as today's date in the same `batchUpdate` as the
changes or as `Enabled` ("Publish roadmap"), over whatever the cell holds, even when
`Enabled` already reads `Yes`. A missing `Last updated` column is appended with its
header, as any edited field's is. ADR-012 gains _STY-036 amendments_ and
`docs/analysis/roadmap-tab-format.md` no longer says the editor never writes it.

### Departures

- **The tick box is a pending change written over whatever the field holds** (agent):
  `FieldChange` gains `overwrite`, set only by `markedUpdated(changes, today)`, which
  adds `lastUpdated` with it unless a date is already pending (S7). `planRoadmapPublish`
  never counts such a change as a conflict and writes it even when its value equals its
  base; so the tick box goes through both repository calls as a pending date does, and
  `findLoadedRow` leaves `Last updated` out and `heldPublishedState` counts it, as the
  epic's delivery notes asked, with no new branch in either planner.
- **"Publish roadmap" ticked with no unsaved edits reads the roadmap's items and gives
  each item without an ID one** in the same write, as any write of pending edits does
  (ADR-012 Option 6), since the date travels as a pending change. A roadmap whose items
  can't be read then fails as "Save and publish" does.
- **A date left as the form opened it is not checked against today** (agent): a date
  already after today in the spreadsheet would otherwise hold up every other field of
  the About form. Found by the Playwright journey with a fixed clock before Product A's
  date; the page test "leaves a date already after today, unchanged, to publish other
  fields" followed the fix.
- **A date the browser can't read is refused** (agent), with "Enter a real date, or
  clear the field": a half-typed date reads as none, so confirming would otherwise clear
  it. `EditForm` errors are now per field (title, a date after today, an unreadable
  date), each linked to its field and focusing the first.
- **The About block always shows "Last updated"**, after the other fields, with "No
  date" (muted) for none; "There's nothing about this roadmap yet." still shows above it
  when the four text fields are empty. In the form the date comes last, after family and
  category, with "Today" beside it. Clearing uses the browser's own input; there is no
  Clear button (D8).
- **The conflict review shows dates as the page does** ("10 November 2026"); its copy
  still calls the values "text", as for a family or category.
- **"Today"** is `localToday()` in `src/lib/local-today.ts`, with the CHO-005 comment,
  read whenever it is needed: "Today", the form's check and the picker's limit as each
  is used or drawn, and the tick box when a dialog is confirmed, so a form left open past
  midnight takes the new day (review round 1, Sol P3).
- **A date already held in another format is not rewritten** (agent, review round 1
  Sol P2, declined): when the cell holds the same date as `DD/MM/YYYY` (`13/11/2026`),
  a picked or ticked `2026-11-13` is no change, so nothing is written, as for any field
  that already holds its value. The public site reads both formats; rewriting it would
  carry the cell's own spelling into the domain (ADR-002).
- **The Sheets fake** (`tests/fixtures/sheets/apply-batch-update.ts`) now accepts
  `Last updated` written as `YYYY-MM-DD` or blank, and still records any other value as
  a violation.
- **Tests.** The midnight page test was written after its fix and shown to fail
  against the round-1 form (1 of 1). The planner tests (`publish-plan.test.ts`, `published-state.test.ts`), the
  Sheets MSW tests, `localToday`'s test and the page tests
  (`roadmap-detail-page-last-updated.test.tsx`) ran red before the code that passes them.
  The contract cases (`roadmap-repository-contract.ts`, `published-state-contract.ts`)
  were added after the adapter and double changes, and the Playwright journeys
  (`tests/e2e/last-updated.spec.ts`) after working code.
- **Epic close**: this closes EPC-008. Its delivery notes held only for this epic's two
  stories and are now kept by code (`findLoadedRow`'s docblock, the published-state
  contract), so they are archived with it, not moved.

### Contract for dependents

- **Domain** (`@/domain/roadmap/roadmap-changes`): `lastUpdated` is the last of
  `EDITABLE_ROADMAP_FIELDS`, its value `YYYY-MM-DD` or `""`; `markedUpdated(changes,
today)` is how a caller asks for today's date. `planRoadmapPublish` throws
  `AppError('unknown')` for a `Last updated` that is no `YYYY-MM-DD` date
  (`isCalendarDate`, `@/domain/roadmap/calendar-date`).
- **Staleness (A7)** can read `Roadmap.lastUpdated` as a date set on purpose from now
  on.
- **CHO-005**: `rg -n "CHO-005" src` finds `localToday`; the API adapter converts there
  or at its boundary.
- **E2E hooks**: field "Last updated" (a date input), button "Today", checkbox "Mark as
  updated today"; `detail.aria.yml`, `edit-roadmap-form.aria.yml` and
  `edit-publish-dialog.aria.yml` hold them.
- **Welsh to review** (machine-assisted): `roadmaps.about.fields.lastUpdated` and
  `roadmaps.edit.roadmapFields.lastUpdated` ("Diweddarwyd ddiwethaf"),
  `roadmaps.about.noDate` ("Dim dyddiad"), `roadmaps.edit.today` ("Heddiw"),
  `roadmaps.edit.dateInFuture` ("Rhowch ddyddiad heddiw neu un cynharach"),
  `roadmaps.edit.dateInvalid` ("Rhowch ddyddiad go iawn, neu cliriwch y maes") and
  `roadmaps.publish.markUpdated` ("Nodi ei fod wedi'i ddiweddaru heddiw").

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-about.test.tsx` (the date last, "No date", Welsh "2 Hydref 2026"); page tests "shows the date in the About block as the list card does", "shows that a roadmap has no date"; e2e `roadmap-page.spec.ts` (Product A "1 October 2026"), `last-updated.spec.ts` (Product B's `15/09/2026` as "15 September 2026"); `detail.aria.yml`                                                                                                                                                                                                                                              |
| S2       | page test "keeps a picked date pending, tagged and listed, writing nothing"; contract "sets the date, keeping every other field"; e2e "publishes a date picked in the About form as YYYY-MM-DD text" (no write until Publish)                                                                                                                                                                                                                                                                                                                                                           |
| S3       | `local-today.test.ts` (Europe/London, 2026-07-01T23:30Z is 2 July; red under UTC); page test "fills today's date by the browser's clock with Today" (Asia/Tokyo, still the 12th in UTC); e2e "fills today with Today, and refuses a later date" (Europe/London, fixed clock)                                                                                                                                                                                                                                                                                                            |
| S4       | page tests "refuses a date after today with a message, until it is fixed" (`max`, error linked and focused), "leaves a date already after today, unchanged, to publish other fields", "refuses a date the browser can't read"; e2e "fills today with Today, and refuses a later date"                                                                                                                                                                                                                                                                                                   |
| S5       | page test "clears the date, publishing an empty date"; contract "clears the date, keeping every other field"; Sheets "clears Last updated as YYYY-MM-DD text" (an empty cell)                                                                                                                                                                                                                                                                                                                                                                                                           |
| S6       | page tests "offers it on Publish changes / Save changes, unticked, writing today's date only when ticked", "offers it on Publish roadmap with no unsaved edits / with unsaved edits", "isn't offered on Unpublish roadmap"; contract "writes today's date, ticked, over a co-lead's, beside the other edits", "publishes a roadmap with today's date, ticked", "saves and publishes pending edits with today's date, ticked"; e2e "writes today's date with the changes when ticked", "writes today's date with Enabled when ticked on Publish roadmap"; `edit-publish-dialog.aria.yml` |
| S7       | `roadmap-changes.test.ts` ("leaves a pending date to be published instead"); page test "isn't offered while a date is pending, which is published instead"; e2e "publishes a date picked in the About form" (no tick box)                                                                                                                                                                                                                                                                                                                                                               |
| S8       | Sheets "sets Last updated as YYYY-MM-DD text, whatever format the cell held" (`stringValue` over `01/10/2026`); `publish-plan.test.ts` (non-`YYYY-MM-DD` rejected); e2e cell reads `2026-11-10`; the Sheets fake records any other format as a violation (`sheets-writes.spec.ts`)                                                                                                                                                                                                                                                                                                      |
| S9       | `publish-plan.test.ts` ("refuses a date a co-lead changed", "writes a date set over whatever it holds as never a conflict"); contract "refuses a date a co-lead changed, writing nothing", "writes today's date, ticked, over a co-lead's"; page test "shows a co-lead's date beside yours in the review, as dates"                                                                                                                                                                                                                                                                     |
| S10      | page test "is in Welsh, the field, Today, the tick box and the messages"; `pnpm typecheck` catalogue parity; Welsh captures                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D10      | `published-state.test.ts` ("still writes a date set on publishing a roadmap a co-lead already published"); contract "still writes today's date, ticked, on a roadmap a co-lead already published"; Sheets "still writes today's date, ticked, when Enabled already reads Yes", "writes Enabled and today's date, ticked, in one batchUpdate"                                                                                                                                                                                                                                            |
| D11      | `local-today.test.ts`; page tests under `Asia/Tokyo`; e2e under `Europe/London` at 23:30 UTC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
