# STY-066: A Product Lead reads cards of a like height, however long an item's text

- **Status**: Proposed — the owner asked for it, chose what is cut and answered both
  questions on 2026-11-18
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-016-a-roadmaps-items-at-a-glance](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-008, ADR-010, ADR-011
- **Suggested model**: Sonnet — one component gains a cut that depends on measured
  height, with its copy and tests

## Summary

A card shows every field whole, so one long description makes its card as tall as it
likes, and its row of cards with it. This story cuts any field of a card that runs
past three lines: a description or an expected outcome ends in "…", a list of details
stops after its third line, and "Show more" under it shows the rest in place, then
reads "Show less". A short field is as it is today. Not in it: a limit on what a
Product Lead may write. The public site still shows the whole text.

## Scope

`features/roadmaps` (the item card's fields) and `i18n/`. Nothing in `domain/` or
`infrastructure/`: no read, write or stored value changes. The fields are built so that
STY-067's opened row shows them with the same cut.

## Acceptance criteria

### S1: A long description is cut after three lines (owner, D1)

**Given** a roadmap's page in the Cards view, with an item whose description runs to
more than three lines of its card
**When** the page shows
**Then** the description shows its first three lines, the third ending in an ellipsis
**And** under it is "Show more"

### S2: A long expected outcome is cut the same way (owner, D2)

**Given** an item whose expected outcome runs to more than three lines of its card
**When** the page shows
**Then** the expected outcome is cut as S1 has the description, with its own "Show
more"
**And** each long field of a card opens without the others

### S3: A long list of details stops after its third line (owner, D2)

**Given** an item whose details run to more than three lines, a nested detail counting
as a line
**When** the page shows
**Then** its first three lines show, with their nesting, then "Show more"
**And** no ellipsis is added to a detail that is shown whole

### S4: "Show more" shows the rest in place (owner, D1)

**Given** a field cut as in S1, S2 or S3
**When** the Product Lead presses "Show more"
**Then** the field shows whole, where it is, and the control reads "Show less"
**And** focus stays on the control, which reads as expanded to a screen reader
**And** "Show less" cuts it again

### S5: A short field is as today

**Given** an item none of whose fields passes three lines of its card
**When** the page shows
**Then** each shows whole, with no ellipsis and no "Show more"
**And** a field's line breaks still show as line breaks

### S6: The control says what it shows more of

**Given** two cards with long descriptions, or one card with three long fields
**When** a screen reader lists the page's controls
**Then** each "Show more" is named for its field and its item, as in "Show more of the
description of" then the item's title
**And** no two controls share a name

### S7: The cut follows the card's width

**Given** a description that is three lines on a desktop's card and five on a phone's
**When** the page shows at each width, or the window is resized, or the navigation is
folded
**Then** it is cut where it passes three lines of the card as drawn, and not where it
does not

### S8: A pending change shows cut too

**Given** an item whose description has a pending edit that runs to more than three
lines
**When** the page shows
**Then** the pending text is cut as S1 has it, with the Changed tag as today

### S9: Welsh and the look

**Given** the interface in Cymraeg, in the light and the dark theme, at 375px and
1280px
**When** a card with a long field shows
**Then** "Show more" and "Show less" are in Welsh, nothing scrolls sideways, and axe
reports no WCAG 2.2 AA violation
**And** "Show more" is a button drawn as a text link, with a text link's focus style

## Tests

S7 needs a browser: jsdom lays nothing out, so whether a field passes three lines is
only true in Playwright, at 375px and 1280px and with the navigation folded. S1 to S6
and S8 hold as component tests once the measure is given to them.

## Decisions

- **D1** (owner, 2026-11-18, compact view UX analysis, _Outcome_, journey 3): the card
  view stops a long text field after three lines, with "…" and a "Show more" link, or
  similar, that expands the rest. Adds S1, S4. Changes STY-021 S2 and D3, by which
  every field shows whole.
- **D2** (owner, 2026-11-18, analysis decision 22): the cut applies to any text field
  that can be long, the description, the expected outcome and the details among them.
  Adds S2, S3.
- **D3** (owner, 2026-11-18, analysis decision 25): nothing more tells a Product Lead
  an item says too much; "Show more" is the sign. A hint in the item dialog, and a
  limit on what can be written, stay out.
- **D4** (owner, 2026-11-18, analysis decision 27): the control reads "Show more" and
  "Show less", beside "Show the rest of" on a compact row (STY-067), over one wording
  for both.
- **D5** (agent, 2026-11-18, from D2): the rule is by length, not by field: any field
  under a label that passes three lines is cut, so long tags or organisations are too,
  over a list of named fields. The title is never cut.
- **D6** (agent, 2026-11-18, from D2): a list of details stops after its third line
  with no ellipsis, since each detail shown is whole, over cutting a detail mid-line.
- **D7** (agent, 2026-11-18, analysis decision 24): a field shown whole stays so until
  "Show less" or until the page is left or its view changed, over keeping it on the
  device.
- **D8** (agent, 2026-11-18): the control's words change as it opens and it reads as
  expanded too, as the item form's opening fields do, over a fixed name: its words are
  on the page, and say what a press will do.

## Starting point

Audited at `2e073ee`. A card's fields are one `<dl>` whose values keep their line
breaks (`whitespace-pre-line`); a cut must keep them. Whether a field passes three
lines depends on the card's width, which follows the room the page has, not the
window (`CardGrid`), and changes as the navigation folds or is dragged.
`EditableItemCard` gives the card the item with its pending edits applied, so S8 needs
nothing of the pending state. Details are a nested list of up to three levels
(`DetailList`).

## Out of scope

- A limit on what a Product Lead may write: a later record (persona A11).
- The title, which stays whole.
- The compact view's rows: STY-067, whose opened row shows these fields.
- The public site, which shows the whole text.
