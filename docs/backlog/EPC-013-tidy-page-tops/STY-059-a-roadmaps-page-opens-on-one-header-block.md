# STY-059: A Product Lead opens a roadmap on one header block

- **Status**: Proposed — the owner accepted the page headers UX analysis's decisions
  1, 3, 5, 6, 10 and 11 on 2026-11-18
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-013-tidy-page-tops](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Suggested model**: Opus — it restructures the top of a roadmap's page around the
  sticky title row, About's editing and pending marks, and Publish roadmap

## Summary

A roadmap's page opens on a back link, the title, its controls, then a boxed About
holding the status, product lead and last update, with Show more and Edit on its edge.
This story makes the top one block on one left edge: the title, its facts, the Not
published tag with Publish roadmap beside it when it is not published, then an About
this roadmap disclosure with Edit beside it, then the row of controls (Add an item,
More, the jump control) in that order. The back link goes. The stuck strip and the
jump control's form per width are STY-060's; they keep working here.

## Acceptance criteria

### S1: One header block on one left edge

**Given** Demographics and Identity (MPI, WDS, WAMS), published, status label Live, led
by Sam Evans & Rhian Morgan, updated 4 November 2026
**When** the Product Lead opens it on a phone, an iPad or a desktop
**Then** they see, top to bottom on one left edge: the title; "Status: [Live]",
"Product lead: Sam Evans & Rhian Morgan" and "Updated 4 November 2026"; the About this
roadmap disclosure, closed, with Edit beside it; then Add an item, More and the jump
control
**And** there is no "Back to roadmaps" link

### S2: The facts

**Given** a roadmap's page
**When** it opens
**Then** its facts are a list named "Roadmap details", each fact only when the roadmap
has it: on a phone one fact to a row, from 640px on one line, wrapping between facts
**And** the status label reads "Status:" then its tag, so it is not mistaken for the
service's Beta banner

### S3: The title

**Given** a roadmap whose title wraps
**When** it opens
**Then** on a phone the title is in the large heading size (`text-heading-l`), and from
640px in today's size, running to the content's width

### S4: About this roadmap opens in place

**Given** the About this roadmap disclosure, closed
**When** the Product Lead presses it
**Then** it expands in place to show the vision, the service description, the family
(with its colour) and the category, and reads as expanded to a screen reader
**And** it is a text control at least 44px tall with a chevron, underlined on hover,
and its Edit is a 40px button that opens About's editing as today

### S5: A pending change to About still shows

**Given** About with a pending change
**When** the page opens
**Then** About's Changed tag shows beside the disclosure, closed or open, and "Undo
changes" shows once it is open, as today

### S6: A roadmap not yet published

**Given** Community Nursing, not published, status label Beta
**When** the Product Lead opens it
**Then** under its facts a row holds the Not published tag and a visible Publish
roadmap button, 40px tall, before the About disclosure
**And** Publish roadmap no longer sits among the title row's controls; once the strip
sticks, More holds it, at every width
**And** pressing it publishes the roadmap as today, its outcome at the foot (STY-052)

### S7: One row of controls in one order

**Given** a roadmap's page, at the top
**When** the Product Lead reaches its controls
**Then** they are Add an item, More, then the jump control, in that order, and Tab
reaches them in that order after Edit
**And** none is wider than its label, and once the strip sticks it holds them in the
same order

### S8: Welsh, keyboard and the first screen

**Given** the page in Cymraeg at 375px, 820px and 1280px, or a keyboard alone
**When** the Product Lead uses the header block
**Then** nothing scrolls sideways or passes the right edge, every control is reached
and named, and the first placement still starts on the first screen at 1280×800
(STY-053 S6)

## Decisions

- **D1** (owner, 2026-11-18, page headers UX analysis decision 1 (a)): design G, as
  drawn in the analysis's prototype.
- **D2** (owner, 2026-11-18, analysis decision 3 (a)): status, product lead and last
  update sit under the title; About this roadmap (vision, service description, family
  and category) is a disclosure beside its Edit. Changes STY-053 D2 and D6, and S6's
  one-line summary.
- **D3** (owner, 2026-11-18, analysis decision 5 (a)): no back link on any width.
- **D4** (owner, 2026-11-18, analysis decision 6 (a)): Publish roadmap sits beside the
  Not published tag, under the facts. Changes STY-052 D15 and D19.
- **D5** (owner, 2026-11-18, analysis decisions 10 (a) and 11 (a)): a phone title in
  `text-heading-l`; the status label reads "Status: [Live]" (Cymraeg "Statws").
- **D6** (owner, 2026-11-18, accepting the analysis's _Not yet drawn_): Edit and
  Publish roadmap are 40px; the title runs to the content's width; the disclosure is
  underlined on hover; the facts list is named "Roadmap details", not the disclosure's
  name.
- **D7** (agent, 2026-11-18): once the strip sticks, More holds Publish roadmap at every
  width, as STY-052 D19 had it on a phone, so the strip keeps one set of controls
  (epic _Design_ 4); left visible on a desktop, it would add a control G does not draw.

## Starting point

Audited at `0f7b22c`. `RoadmapTitleRow` holds the title and the controls in one element
that sticks and slims (STY-052 D5), with the jump control in a slot (STY-053's
_Contract for dependents_); `EditableRoadmapAbout` holds the folded About with the
facts on its line. The facts are shared with the list's card as `roadmaps.facts.*`.

## Out of scope

- The stuck strip's rows per width, the jump control's form per width, and the foot
  bar: STY-060. Until it lands the strip keeps today's form, with the controls in S7's
  order.
- The roadmap list and the families page: STY-058.
