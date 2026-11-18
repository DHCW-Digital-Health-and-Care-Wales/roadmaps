# STY-066: A Product Lead reads cards of a like height, however long an item's text

- **Status**: Done — the owner asked for it, chose what is cut and answered both
  questions on 2026-11-18
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-016-a-roadmaps-items-at-a-glance](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-008, ADR-010, ADR-011
- **Suggested model**: Sonnet — one component gains a cut that depends on measured
  height, with its copy and tests
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/168

## Summary

A card shows every field whole, so one long description makes its card as tall as it
likes, and its row of cards with it. This story cuts any field of a card that runs
past three lines: a description or an expected outcome ends in "…", a list of details
stops at its third line, and "Show more" under it shows the rest in place, then
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

### S3: A long list of details is cut at its third line (owner, D2)

**Given** an item whose details take more than three lines of its card as drawn,
counting every line a detail wraps onto and every nested detail
**When** the page shows
**Then** three lines of the list show, with their nesting, then "Show more"
**And** a detail the cut falls within ends in an ellipsis on the third line; where the
cut falls between two details, the last one shown is whole and gains none
**And** one detail long enough to wrap past three lines is cut the same way

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

S3 and S7 need a browser: jsdom lays nothing out, so whether a field passes three
lines, and where a wrapped detail is cut, is only true in Playwright, at 375px and
1280px and with the navigation folded. S1 to S6
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
- **D6** (agent, 2026-11-18, from D2; correctness review): a list of details is cut
  by the lines it takes as drawn, as running text is, so a long detail that wraps is
  cut within itself, over counting each detail as one line, which would let one long
  detail fill the card.
- **D7** (agent, 2026-11-18, analysis decision 24): a field shown whole stays so until
  "Show less" or until the page is left or its view changed, over keeping it on the
  device.
- **D8** (agent, 2026-11-18): the control's words change as it opens and it reads as
  expanded too, as the item form's opening fields do, over a fixed name: its words are
  on the page, and say what a press will do.
- **D9** (agent, 2026-11-18; correctness review): an open field keeps its "Show less"
  while it is open, though a resize or an edit has made it fit in three lines, over
  dropping the button, which would throw focus to the page when it is on the button
  (S4). S5 holds for a field that has not been opened; one the Product Lead opened
  shows whole with "Show less" until they press it (D7).

## Starting point

Audited at `2e073ee`. A card's fields are one `<dl>` whose values keep their line
breaks (`whitespace-pre-line`); a cut must keep them. Whether a field passes three
lines depends on the card's width, which follows the room the page has, not the
window (`CardGrid`), and changes as the navigation folds or is dragged.
`EditableItemCard` gives the card the item with its pending edits applied, so S8 needs
nothing of the pending state. Details are a nested list of up to three levels
(`DetailList`), so their cut is a height across list items, not one element's.

## Out of scope

- A limit on what a Product Lead may write: a later record (persona A11).
- The title, which stays whole.
- The compact view's rows: STY-067, whose opened row shows these fields.
- The public site, which shows the whole text.

## Delivery

### Departures

- **S3, S4, S7**: a text field is cut by the browser's `line-clamp`; a list of details
  is not, since Chrome ends the third line in an ellipsis even where a detail ends
  there. The list is held to three lines by its height (`3lh`) and only the detail the
  cut falls within is clamped, to the lines it has left, measured from each detail's
  `scrollHeight` (agent: the way S3's second "And" is met).
- **S3**: `DetailList` drops the 2px its nested lists had above them (`[&_ul]:mt-0.5`)
  and draws each detail's text in a block of its own, `div[data-detail]`, wherever the
  list is shown: three lines are three line heights only with no margin between them,
  and a detail's lines are measured from its own block (agent; a 2px change to the
  dialog's and the conflict review's lists).
- **S6**: the control's name is its words, a space, then the field and item as visually
  hidden text, "Show more of the description of First item"; two items with the same
  title have controls of the same name (agent; the title is the item's only name).

- **S5**: a field opened and then made to fit (a resize, a pending edit) keeps its
  "Show less" until pressed (D9).

### Contract for dependents

- **STY-067's opened row** shows a card's fields through `RoadmapItemCard`'s own cut, or
  composes them from `CutField` (a text) and `CutDetails` (a list of details) in
  `features/roadmaps/components/cut-field.tsx`: each takes the `subject` its control is
  named for (`roadmaps.items.cut.of.<field>`, with `{{item}}`) and holds its own open
  state, which ends with the component (D7).
- **Catalogue keys**: `roadmaps.items.cut.more`, `.less` and `.of.<field>` (phase,
  description, expectedOutcome, tags, organisations, details).
- **Measure**: a field is cut when its content is more than three of its element's lines
  tall (`scrollHeight`, so open or cut gives the same answer), read as the layout is
  made and again when the element's width changes or the fonts are ready. The element's
  own box is held at three lines, so its size never feeds back into the answer.
- **Test hooks**: the control's accessible name, "Show more of the description of
  <title>". Unit: jsdom lays nothing out, so `roadmap-item-card.test.tsx` gives the
  lines (`drawLines`). E2E: `fixtures/long-fields.ts` (`withItems`, `openWithItems`,
  `cardOf`, `fieldOf`, `linesOf`, `words`, `THREE_LINES_WIDE`).
- **Data source**: nothing read or written changes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `components/roadmap-item-card.test.tsx` (`cuts a description past three lines…`); `tests/e2e/roadmap-items-cut.spec.ts` (`a long description shows three lines…`, at 1280px and 375px)                                                                                                                                                                   |
| S2       | `roadmap-item-card.test.tsx` (`cuts each long field apart from the others`); `roadmap-items-cut.spec.ts` (`a long expected outcome is cut on its own`)                                                                                                                                                                                                   |
| S3       | `roadmap-items-cut.spec.ts` (`a list of details is cut at its third line, between details…`, `a detail the cut falls within ends in an ellipsis…`, `one detail that wraps past three lines…`); `roadmap-item-card.test.tsx` (`a card's long list of details`)                                                                                            |
| S4       | `roadmap-item-card.test.tsx` (`shows the rest in place and cuts it again, focus staying on the control`); `roadmap-items-cut.spec.ts` (`a long description shows three lines, then opens in place and shuts`, `a list opens whole and cuts again`, `keeps focus on Show less when a resize lets the field fit`, red against the control dropped at once) |
| S5       | `roadmap-item-card.test.tsx` (`shows a short field whole…`); `roadmap-items-cut.spec.ts` (`a short field shows whole, with its line breaks`)                                                                                                                                                                                                             |
| S6       | `roadmap-item-card.test.tsx` (`names two items' controls apart`); `roadmap-items-cut.spec.ts` (`names each control for its field and item`)                                                                                                                                                                                                              |
| S7       | `roadmap-items-cut.spec.ts` (`the cut follows the card's width: the window and the navigation's fold`, `a field stays open until it is shut, however the page is resized`)                                                                                                                                                                               |
| S8       | `roadmap-items-cut.spec.ts` (`a pending change to a description is cut as it is, with its Changed tag`)                                                                                                                                                                                                                                                  |
| S9       | `roadmap-item-card.test.tsx` (`says Show more and Show less in Welsh…`); `roadmap-items-cut.spec.ts` (`in Welsh at 375px`, `has no axe violation in the … theme at …px`); the button is a text link: `textLinkClasses`, `focus-visible:focus-link`                                                                                                       |

Each unit test was shown red by breaking the finished code (the control's hidden
subject removed, the control always drawn, no clamp on a text, the detail clamp ignoring
where the cut falls) and green with the code restored; a Playwright test may follow the
code. The S7 E2E test was shown red by never observing the element's width. The existing test of a card's
details (`roadmap-detail-page-items.test.tsx`) reads each detail's text from its block.

The example roadmap's first card has a list of details of more than three lines, so
its aria snapshots in `structure.spec.ts-snapshots/` (`detail`, `edit-item-changed`) gain
its "Show more of the details of …" button.
