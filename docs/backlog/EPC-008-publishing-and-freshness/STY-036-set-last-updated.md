# STY-036: A Product Lead sets when a roadmap was last updated

- **Status**: Proposed — grilled in EPC-008 rounds 1–4 (2026-11-13)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-008-publishing-and-freshness
- **Depends on**: STY-035 (preferred order)
- **Binding ADRs**: ADR-012 §Option 9, ADR-008, ADR-002
- **Suggested model**: Opus — a date field through the pending-change model, publish
  plan and conflict review, and an amendment to ADR-012's Option 9

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
says the editor never writes `Last updated`.

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

**Given** the form, on 13 November 2026 in Europe/London
**When** Sam chooses "Today"
**Then** the field holds 13 November 2026

### S4: No date after today (round 1 Q7)

**Given** the form on 13 November 2026 in Europe/London
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

S3 and S4's "today" is Europe/London's (D9), so test it with a fixed clock in British
Summer Time just before midnight UTC (2026-07-01T23:30Z is already 2 July in London),
where a UTC date would differ. S8 needs an MSW test of the written cell; S2 and S6 need a Playwright
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

## Out of scope

- Staleness (A7): a later record.
- Setting the date when unpublishing a roadmap: not asked for.
