# STY-039: A Product Lead edits an item's details

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-010-item-details](README.md)
- **Depends on**: STY-037 (hard, must be on the default branch; merged as `0d494ef`)
- **Binding ADRs**: ADR-012 (this story amends _What is editable_), ADR-014, ADR-011
  (amended: an item says whether its Welsh details cell holds anything), ADR-010,
  ADR-008
- **Suggested model**: Opus — an ordered, nested field through the pending-change
  model, publish plan and conflict review, and a new form control with its own keys

## Summary

A Product Lead writes, nests, reorders and removes an item's details in its edit form.
The public site shows them as a list under “What this covers”, nested up to three
levels; today they are typed into the spreadsheet with a hyphen for each level. The
change is a pending edit, published with the rest. The editor is design A of three
prototyped, an outline written like a document: Enter starts the next detail, and
buttons under the list nest, move and remove the one being written. Not in it: an item
that has Welsh details keeps them read-only until Welsh content can be edited.

## Scope

The Details field of the item's edit form (`features/`), details as a pending item
field (`domain/`), and the write of the item's details (`infrastructure/`), with copy
in English and Welsh. The field reads only the item, so it has no loading or failure
state of its own.

S1–S20 hold for any editor with a control per detail; S21–S25 are design A's own,
which the owner chose (D10). This story changes what the editor writes to the shared
data source, a contract with the public site: the item's `Details` cell (S14).
`Details (cy)` is never written (S18).

## Acceptance criteria

### S1: The form shows the item's details

**Given** an item whose details are “Follow-up appointments in three specialties”, with
“Dermatology” and “Rheumatology” nested under it, then “First appointments stay in
person”
**When** Sam opens its edit form and opens the Details field
**Then** the field shows the four in the order written, each at its level, each with a
way to change its text, nest it, move it and remove it
**And** on the Welsh interface the field's label and controls are Welsh, and the
details are the English ones

### S2: An added detail is pending

**Given** the form above
**When** Sam adds “A test call before the first video appointment” at the end and
confirms the form
**Then** the card's Details list ends with it, the card is tagged “Changed”, and the
publish dialog lists the item with details among its changed fields
**And** nothing is written until Sam publishes

### S3: A detail nests under the one above it, to three levels (owner, D1)

**Given** the form above
**When** Sam adds “Adult clinics first” after “Dermatology” and nests it under it
**Then** the card shows it under “Dermatology”, at the third level
**And** a detail is never more than one level deeper than the detail above it, the
first detail is at the top level, and none goes deeper than the third: where a detail
can't nest, the form says why

### S4: A nested detail moves back out

**Given** “Rheumatology” nested under “Follow-up appointments in three specialties”
**When** Sam moves it out a level and confirms the form
**Then** the card shows it at the top level, after “Dermatology”

### S5: Changing a detail's text keeps its place

**Given** the form above
**When** Sam changes “Rheumatology” to “Rheumatology and pain clinics” and confirms the
form
**Then** the card shows the new text at the same place and level
**And** a detail whose text is cleared is removed, and the details nested under it
move up a level, as when it is removed (S6, D20)

### S6: Removing a detail removes it alone

**Given** the form above
**When** Sam removes “First appointments stay in person” and confirms the form
**Then** the card's Details list is the other three, tagged “Changed”
**And** removing a detail never removes another with it: the details nested under it
stay, one level up (D15)
**And** an item with every detail removed has no Details on its card

### S7: The order is Sam's to change

**Given** the form above
**When** Sam moves “First appointments stay in person” above “Follow-up appointments in
three specialties” and confirms the form
**Then** the card shows it first, and the other three after it as they were

### S8: A line break ends a detail

**Given** the form
**When** Sam pastes three lines, the second and third each starting with a hyphen
**Then** three details are added, the second and third nested under the first, each
trimmed at its ends
**And** a blank line adds nothing, and no detail ever holds a line break

### S9: Hyphens at the start of a detail nest it

**Given** the form
**When** Sam starts a detail with a hyphen
**Then** the detail is nested a level deeper, as S3 allows, and its text does not hold
the hyphen
**And** no detail's text ever starts with a hyphen, however it was typed or pasted
**And** hyphens and spaces before a detail's text are never kept: `- -5 degrees`,
typed or pasted, is “5 degrees”, nested a level for each hyphen as S3 allows (D21)

### S10: Text typed but not yet kept counts

**Given** Sam has typed “Evening clinics” as a new detail, or is part way through
changing a detail's text
**When** Sam confirms the form
**Then** the item's details hold the text as typed

### S11: Cancel and Undo leave the details as they were

**Given** Sam has added, nested, moved and removed details in the open form
**When** Sam cancels the form
**Then** the card shows the details as they were, with no pending change
**And** “Undo changes” on a card with a pending change of details shows them as read

### S12: An item with no details

**Given** an item with no details
**When** Sam opens its edit form and opens the Details field
**Then** the field holds none, and Sam can write the first, which is at the top level

### S13: By keyboard and screen reader

**Given** the form, used with a keyboard alone
**When** Sam adds a detail, nests it, moves it out, moves it up, changes its text and
removes it
**Then** each is done without a pointer, and the Tab key always moves to the next
control: it never nests a detail
**And** each control's name says its detail, and each detail's level is said, not only
shown by its indent
**And** each addition, move, removal and refusal is announced, and focus stays in the
field: after a removal it is on a control of the next detail, or on the control for
adding when none is left
**And** in the editor chosen (D10), that is the text of the next detail, of the one
before when the last was removed, or of the empty detail the list keeps when none is
left (D19)
**And** axe finds no WCAG 2.2 AA violation in the field's states, light and dark

### S14: Publishing writes the details

**Given** a pending change of an item's details to “Follow-up appointments in three
specialties”, “Dermatology” nested under it, “Adult clinics first” nested under that,
and “First appointments stay in person”
**When** Sam publishes
**Then** the item's `Details` cell holds four lines, as text:
`Follow-up appointments in three specialties`, `- Dermatology`,
`-- Adult clinics first` and `First appointments stay in person`: a line for each
detail, in order, starting with a hyphen for each level it is nested and then a space;
no details writes an empty cell
**And** for an item with no Welsh details the change writes no other cell of its row
(an `Item ID` the row lacks is still written, as on any publish), and a roadmap whose
tab has no `Details` column gains one as ADR-012 adds a column

### S15: A co-lead's different details are a conflict

**Given** Sam's pending details, and a co-lead has since changed the item's details
**When** Sam publishes
**Then** nothing is written, and the conflict review shows Sam's list beside the
co-lead's, each nested as it will read, to keep or use
**And** a co-lead's details that show as the same list are no conflict, and Refresh
drops a pending change the data source already holds

### S16: On a phone and in the narrowest card

**Given** a screen 375px wide, or the narrowest item card (two across, about 294px)
**When** Sam edits the details of an item, one of them at the third level and eighty
characters long
**Then** nothing scrolls sideways, the long detail wraps, and every control can be
reached

### S17: The field starts shut, and opens on request

**Given** the item of S1
**When** Sam opens its edit form
**Then** the Details field shows the four details as the card lists them, with a button
named “Change details” and no editor; an item with no details reads “No details” beside
“Add details”
**And** choosing the button shows the editor in place, with focus in it; the button,
now “Close details”, shuts it, keeping text typed but not yet kept, as confirming the
form does (S10), and the list shows the details as changed
**And** confirming the form keeps the details whether the field is open or shut
**And** the card's own Details list does not show while the form is open

### S18: An item with Welsh details keeps its details read-only

**Given** an item whose `Details (cy)` cell holds anything, whether or not its lines
pair with the English
**When** Sam opens its edit form
**Then** the Details field shows the item's details with no button to change them, and
says they have Welsh versions and can't be changed here yet
**And** the item's other fields are edited and published as before, with `Details` and
`Details (cy)` left as they are

### S19: Welsh details written since the item was read stop the publish

**Given** Sam's pending change to the details of an item that had no Welsh details,
and a co-lead has since written some in its `Details (cy)` cell
**When** Sam publishes
**Then** nothing is written, and the conflict review says the item's details now have
Welsh versions and can't be changed here: Sam's change can be dropped, not kept

### S20: Details written another way show as the public site shows them

**Given** an item whose `Details` cell starts every line with a hyphen (`- One`,
`-- Two`, `- Three`), or skips a level (`One`, `-- Two`)
**When** Sam opens its edit form and opens the Details field
**Then** the field shows the details at the levels the card and the public site show
them: “Two” one level under “One”
**And** confirming the form without a change is no pending edit, and writes nothing
**And** once Sam changes them, the cell is written as S14 says, at the levels shown
**And** a detail read deeper than the third level shows at the third in the field
**And** a detail read with a hyphen after its nesting (`- -5 degrees` reads as
“-5 degrees”, one level in) is no pending edit either; once Sam changes the details,
it is written without that hyphen (D21)

### S21: Enter starts the next detail (owner, D10; agent, D16, D17)

**Given** the Details editor, with the caret at the end of “Rheumatology”
**When** Sam presses Enter and types “Adult clinics first”
**Then** the new detail follows “Rheumatology” at its level, and the caret is in it
**And** Enter part way through a detail's text makes two details of it, split at the
caret
**And** Enter at the end of a detail that has others nested under it starts a detail
first among those nested (D16)
**And** Enter in a nested detail with no text moves it out a level; in a top-level
detail with no text it does nothing (D17)

### S22: Backspace at the start of a detail moves it out, or joins it to the one above (owner, D10)

**Given** the Details editor, with the caret at the start of “Rheumatology”, nested
under “Follow-up appointments in three specialties”
**When** Sam presses Backspace
**Then** “Rheumatology” moves out a level, with its text as it was
**And** at the start of a top-level detail, Backspace joins its text to the detail
above, with the caret where the two meet, and the details nested under it keep their
level; a detail with no text is removed that way
**And** at the start of the first detail, at the top level, it does nothing

### S23: The buttons under the list act on the detail being written (owner, D10)

**Given** the Details editor, with the caret in “Rheumatology”
**When** Sam looks under the list
**Then** “Move out”, “Move in”, “Move up”, “Move down” and “Remove” act on
“Rheumatology”, each name says so (“Move in Rheumatology”), and the list marks it
**And** a move takes the details nested under it with it; “Move up” and “Move down”
pass the detail before or after it at its level, under the same detail
**And** a button that can't act can still be reached and chosen, and then says why
(“It is already at the top level.”)
**And** chosen with a pointer, a move puts the caret back in the detail's text where
it was; chosen with the keyboard, focus stays on the button

### S24: The list is one stop for the Tab key (owner, D10)

**Given** the Details editor, holding seven details
**When** Sam moves through the form with the Tab key
**Then** the list takes one stop, in the detail last written in or else the first, and
the next stops are the buttons under it
**And** the Up arrow at the start of a detail's text moves to the detail above, and the
Down arrow at its end to the detail below
**And** each detail's name says its place and level: “Detail 3 of 7, nested under
“Follow-up appointments in three specialties””

### S25: A removal can be undone (owner, D10)

**Given** Sam has removed “Follow-up appointments in three specialties”, which had two
details nested under it
**When** Sam chooses “Undo” beside “Removed “Follow-up appointments in three
specialties”. The 2 details under it moved up a level.”
**Then** it is back in its place, with the two nested under it as they were

## Decisions

- **D1** (owner, 2026-11-14, the request for this story): an item's details are edited
  in the editor as a list with nesting, three levels → S3. The limit is confirmed in
  D12.
- **D2** (owner, 2026-11-14, the request): UX designs to choose from →
  `docs/analysis/item-details-ux-analysis.md` and D10.
- **D3** (agent, 2026-11-14): details are edited in the item's edit form, kept pending
  on Done, in a field that opens on request, over editing them on the card: as tags
  are (STY-037 D3, D13) → S2, S11, S17.
- **D4** (agent, 2026-11-14): details are one field for conflicts, compared as the
  list they show as (text, order and level shown), over the cell's text: a co-lead who
  only rewrites the hyphens changes nothing a reader sees → S15, S20.
- **D5** (agent, 2026-11-14): a detail is one line whose text never starts with a
  hyphen, and hyphens typed or pasted there nest it, over keeping them as text: the
  format reads every leading hyphen as nesting, so such text could not be read back
  → S8, S9.
- **D6** (agent, 2026-11-14): the Tab key is never taken to nest a detail, over the
  habit of document editors: a field that keeps Tab is a keyboard trap (WCAG 2.1.2),
  and every detail would be a stop that moves when passed → S13.
- **D7** (agent, 2026-11-14): no limit on the number or length of details: ADR-012
  sets none and the card budget is deferred (persona A11).
- **D8** (agent, 2026-11-14): S18 applies whenever the Welsh cell holds anything, and
  S19 guards it at publish, over only when Welsh shows: as STY-037 D16 and D17, for
  the same pairing by position. Both stand with D11.
- **D9** (agent, 2026-11-14): one line of the list is “a detail” in copy and records,
  over “bullet” or “point”: the card and the code already say “Details”. The delivery
  adds **Detail** to `docs/GLOSSARY.md`.
- **D10** (owner, 2026-11-14, asked in the session once the prototypes were shown; analysis _Decisions needed_): which editor is built → A, outline, as prototyped. Adds S21–S25. B
  and C are not built.
- **D11** (owner, 2026-11-14, asked in the session once the prototypes were shown; analysis _Decisions needed_): an item's Welsh details when its details are edited → such an item's
  details are read-only in the form for now; nothing new is written. Rejected: each
  detail keeping its Welsh as it moves; clearing the Welsh with a warning → S18, S19.
- **D12** (owner, 2026-11-14, asked in the session once the prototypes were shown; analysis _Decisions needed_): a list has three levels: the editor offers no fourth, and a detail
  read deeper shows at the third once the field is opened → S3, S20. Rejected: as many
  as are written.
- **D13** (owner, 2026-11-14, asked in the session once the prototypes were shown; analysis _Decisions needed_): the shut Details field shows the details as the card lists them →
  S17. Rejected: how many there are, on one line.
- **D14** (owner, 2026-11-14, asked in the session once the prototypes were shown; analysis _Decisions needed_): a top-level line is written with no hyphen, as the public site's
  guide says → S14. The request described a hyphen on every line; the public site
  shows both as the same list, and a cell written that way loses a hyphen from each
  line the first time its details are changed here.
- **D15** (owner, 2026-11-14, asked in the session once the prototypes were shown; analysis _Decisions needed_): the details nested under one that is removed stay, one level up →
  S6, S25. Rejected: removing them with it.
- **D16** (agent, 2026-11-14): Enter at the end of a detail that has others nested
  under it starts the first of those nested, over a detail after them at its own
  level: as prototyped in the editor the owner chose (D10), and as a document does →
  S21.
- **D17** (agent, 2026-11-14): Enter in a nested detail with no text moves it out a
  level, over doing nothing: as prototyped in the editor the owner chose (D10), and as
  a document does → S21.
- **D18** (agent, 2026-11-14, round 1 review): details are compared at the levels the field shows, three at most,
  over the levels the card shows: opening the field of a list read deeper and
  confirming it unchanged is no pending edit, and its cell stays as written until the
  Product Lead changes the details → S15, S20.
- **D19** (agent, 2026-11-14, round 1 review): in editor A, after a removal focus is in the text of the detail now
  in its place (the next, or the one before when it was the last), or in the empty
  detail the list keeps when none is left, which is A's control for adding; by
  keyboard and pointer alike, over leaving it on “Remove”, where a second press would
  remove the next detail → S13. A move keeps focus as S23 says.
- **D20** (agent, 2026-11-14, round 1 review): a detail whose text is cleared is removed as “Remove” removes it,
  so the details nested under it move up a level (D15), over leaving them to nest
  under whichever detail is then above → S5, S6.
- **D21** (agent, 2026-11-14, round 1 review): hyphens and spaces before a detail's text are never kept. Typed or
  pasted, each hyphen nests it a level (`- -5 degrees` is “5 degrees”, two levels in
  where S3 allows). In a detail read with one (`- -5 degrees` reads as “-5 degrees”,
  one level in) it is no change until the details are next changed, then dropped.
  Over keeping it as text: moved to the top level, such a line would be read back
  nested and without its hyphen → S9, S20.
- **D22** (agent, 2026-11-14): lines pasted into a detail that holds text follow it and
  the details nested under it, nested by their hyphens from its level; pasted into a
  detail with no text, they take its place: as prototyped in editor A → S8.

## Starting point

Epic F1–F6 hold what the format, the parser and the form give, and when they were
audited. This story's own:

- `RoadmapItemDetail.level` is the number of hyphens as written (epic F2, F3). The
  field and the comparison of S15 need the levels shown, not the levels written (S20,
  D4, D18).
- When the Welsh and English line counts differ the parser drops the Welsh, so
  `RoadmapItem.details` alone cannot say the Welsh cell holds anything (S18);
  `RoadmapItem.hasWelshTags` is there for the same reason.
- STY-037 brought what this field builds on (its _Contract for dependents_): `EditForm`
  leaves Escape to a field that has used it, `OpeningField` takes `onShut`, a list
  field's value is held as one string (`tagsValue`, `tagsOf`), and
  `FieldConflict.welshTags` is the conflict that can only be dropped.

## Out of scope

- What the epic leaves out (EPC-010 _Out of scope_): editing Welsh details, lists in a
  description or an expected outcome, formatting in a detail, and a limit on how much
  an item says.
- Adding or deleting items: later editing records.

## Delivery

### Departures

- **Details are one pending field, `details`** (agent), last in `EDITABLE_ITEM_FIELDS`,
  the form's order. Its value is the English details as the list they show as, a line
  each (`detailsValue`, read back by `detailsOf`, `domain/roadmap/item-details.ts`):
  what the cell is written as (S14), what is compared (D4, D18) and what the conflict
  review draws as two nested lists.
- **White space inside a detail is collapsed to one space** (agent), beyond trimming its
  ends, as prototyped and as for tags (STY-037): a pasted tab or doubled space would
  otherwise be a change no reader sees.
- **S18: `RoadmapItem.hasWelshDetails`** (agent) is how the repository says an item's
  Welsh details cell holds anything, as `hasWelshTags` does for tags. The form reads
  the latest read of the item, so a Refresh that brings Welsh details makes an open
  form's field read-only, and confirming the form then keeps no change of details made
  before it.
- **S18: the read-only field shows the details as the card does** (agent): in Welsh on
  the Welsh interface, under the card's label ("Details", "Manylion"), as it stands in
  for the card's list, which hides while the form is open (S17). An item whose Welsh
  cell holds something beside no English detail reads "No details" with the same
  notice.
- **S19 is `FieldConflict.gainedWelsh`** (agent): STY-037's `welshTags`, renamed as it
  now says the same of tags or details; the field says which. The review says "These
  details now have Welsh versions, so they can't be changed here yet." with "Discard my
  change" alone. Until the next read the page shows the item as having Welsh details.
- **A pending change of details to an item that gains Welsh details on Refresh stays
  pending** (agent), shown on the card, until it is undone or a publish refuses it
  (S19), as for tags.
- **Where the prototype and a scenario differ: the buttons under the list are a group,
  not a toolbar** (agent). S24 makes each button a stop for the Tab key; a `toolbar`
  promises one stop and arrow keys between its buttons. The group is named "The detail
  selected", as prototyped.
- **S23: a button that can't act has its icon and word faded** (agent), not the button,
  so its focus indicator stays whole, and says so with `aria-disabled`. Chosen, it says
  why in the status line, which shows.
- **S13: what is announced, and what also shows** (agent): a refusal and a removal show
  under the buttons; a new detail, a move, a join, pasted lines and an undone removal
  reach assistive technology only, as prototyped. Typing in a detail clears the line,
  and with it a removal's Undo, which puts back the whole list as it was.
- **S6, S25: "Remove" on a detail with no text** (agent) says "Removed the empty
  detail." and offers no Undo; on the one empty detail a list always keeps (D19) it
  says "There is no detail to remove."
- **S9: a hyphen that can't nest the detail is dropped, and the form says why** (agent):
  `- -5 degrees` typed under a top-level detail is "5 degrees" one level in, with "It is
  already nested under the detail above."
- **S21: Enter never confirms the form from a detail** (agent), in a top-level detail
  with no text included, where D17 has it do nothing. Text selected when Enter is
  pressed is dropped, as a line break typed over it would.
- **S22: joined text meets with no space added** (agent), as prototyped and as a
  document does.
- **S17: the hint shows shut and open** (agent): "The public site lists these under
  “What this covers”.", under the field's label, as prototyped.
- **S15: the conflict review draws each list with the card's own list** (agent,
  `DetailList`); no details reads "No text", as any emptied field does.
- **S20: the card still shows a list as it was read** (agent), a fourth level included,
  until its details are changed; the field and what is then written have three (D12).
- **Tests.** Written first and run red: the domain value (`item-details.test.ts`, the
  missing module), then the publish plan, the contract on both repositories, the
  parser, the Sheets cells, the pending-change and conflict rules (60 failing, the
  rest of the contract with them until `hasWelshDetails` was read). The outline's rules
  (`editing/details-outline.test.ts`, 18) were written with their module, and the page
  tests (`roadmap-detail-page-details.test.tsx`, 38) after the component: a departure
  from test-first. Of the page tests 30 passed at once; the other 8 were wrong
  expectations or helpers of the tests, not faults of the field. The Playwright specs
  followed working code. The focus tour then found a fault the component tests could
  not: a faded button lost the bar of its focus indicator, fixed as S23 above says.
- **Review round 1 fixes** (agent). An item with no ID yet whose details a co-lead
  rewrote as the same list is still found at publish, where it was reported as removed
  and its pending edits dropped: `findEditedItem` compares details as the list they
  show as, with their Welsh (Sol P2). A carriage return alone ends a pasted detail, as
  any line break does (Sol P2). Until the field is first opened it shows the details
  as the card lists them, a fourth level and a hyphen read after the nesting included
  (S17, D12; Opus P3). A detail nested under one with no text is named "nested under
  “the empty detail”". For the quality lane: this section moved to the record's end,
  `localiseDetails` to its own module, the status line's messages to
  `details-messages.ts`, the outline's rules to `details-outline.ts`, and the value's
  details as an item holds them to one `englishDetails`.
- **Epic close**: this closes EPC-010. It had no delivery notes.

### Contract for dependents

- **What the editor writes** (README, ADR-012 _STY-039 amendments_): an item's `Details`
  cell alone, a line per detail, `-` for each level and a space, or empty; never
  `Details (cy)`; neither cell of an item whose `Details (cy)` holds anything. The
  public site reads the same format it did; a cell with a hyphen on every line loses
  one from each the first time its details are changed here (D14).
- **Domain**: `details` in `EDITABLE_ITEM_FIELDS`; `domain/roadmap/item-details.ts`
  (`DetailLine`, `detailsValue`, `detailsOf`, `englishDetails`, `settleDetails`,
  `keptDetails`, `withoutDetail`, `parseDetailLines`, `MAX_DETAIL_LEVEL`); `RoadmapItem.hasWelshDetails`,
  which every `RoadmapRepository` must supply (the contract's "says an item has Welsh
  details even when none pairs with the English";
  `docs/operations/replacing-google-sheets.md`); `FieldConflict.gainedWelsh`, in place
  of `welshTags`.
- **Rules** (`features/roadmaps/editing/details-outline.ts`): `whyNotIn`, `whyNotOut`,
  `whyNotUp`, `whyNotDown`, `movedUp`, `movedDown`, `typedInto`, `splitAt`,
  `joinedToAbove`, `pastedInto`.
- **Components**: `DetailsField` (`editing/details-field.tsx`), drawn by `EditForm` for
  a field with `details`; `DetailList` (`components/detail-list.tsx`), the nested list
  the card, the shut field and the conflict review share, given an item's details by
  `localiseDetails` (`localise-details.ts`).
- **Copy**: `roadmaps.edit.itemFields.details`, `roadmaps.edit.details.*`,
  `roadmaps.publish.notice.refused.welshDetails`.
- **E2E hooks**: "Change details", "Add details", "Close details"; the group "Details";
  each detail a textbox named "Detail N of M, top level" or "…, nested under “…”"; the
  group "The detail selected" with "Move out …", "Move in …", "Move up …", "Move down
  …", "Remove …"; "Undo removing …". A button that can't act has `aria-disabled`, which
  Playwright waits out: choose it with `click({ force: true })`. A detail's text is its
  textbox's value, not its text content. Aria snapshot `edit-item-form-details.aria.yml`;
  the other three item-form snapshots now hold the Details field.
- **Welsh to review** (machine-assisted): every string of `roadmaps.edit.details` in
  `cy.ts`, "Manylion (Saesneg)", and the review's "Mae fersiynau Cymraeg o'r manylion
  hyn erbyn hyn, felly does dim modd eu newid yma eto." The hint quotes the public
  site's heading as “Beth mae hyn yn ei gynnwys”, which was not checked against the
  public site's own Welsh.

### Scenario evidence

`page` is `roadmap-detail-page-details.test.tsx`; `rules` is
`editing/details-outline.test.ts`; `value` is `domain/roadmap/item-details.test.ts`; `e2e`
is `tests/e2e/editing.spec.ts`, _editing an item's details (STY-039)_.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | page "opens the outline in place, focus in it, each detail in order at its level, named with its place"; "is Welsh on the Welsh interface, the details staying English"; e2e "is Welsh on the Welsh interface…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S2       | page "keeps an added detail pending, on the card and in the publish dialog, writing nothing until published"; `pending-changes.test.ts` (_a change of details_); e2e "starts shut, then writes, nests, moves and removes details…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S3       | rules (_why a detail can't move_); value (`settleDetails`); page "nests a detail under the one above it, to the third level, and says why where it can't"; "offers no fourth level…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| S4       | page "moves a nested detail back out"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S5       | page "keeps a detail's place and level when its text changes, and removes one whose text is cleared…"; value "removes a detail with no text as Remove does…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S6       | value (`withoutDetail`); page "removes a detail alone, and shows no Details for an item with every detail removed"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S7       | rules (_moving a detail up or down_); page "moves a detail up or down past the one at its level…"; e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S8       | value (`parseDetailLines`, "holds each detail trimmed…"); rules (_pasted lines_); page "makes a detail of each pasted line…"; "puts pasted lines after a detail that holds text…"; e2e "adds a Details column to a roadmap with none…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S9       | rules (_typing in a detail_); value "never keeps hyphens or spaces before a detail's text…"; page "nests a detail for each hyphen typed or pasted before its text…"; e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S10      | page "shuts keeping text typed…"; "reads No details beside Add details…" (typed, then Done); e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S11      | page "leaves the details as they were on Cancel…"; "shows the details as read on Undo changes"; "is no change when a detail is added and removed again"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S12      | page "reads No details beside Add details for an item with none, which holds one empty detail at the top level to write in"; e2e "adds a Details column…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S13      | page "does everything by keyboard alone, the Tab key always moving on, each change announced and focus staying in the field"; "removes a detail alone…" (focus on the empty detail); `accessibility.spec.ts` ("an item's details: shut, open, nested, a refusal, a removal with Undo, then the changed card"; "an item with no details, and one whose Welsh details can't be changed"), light and dark; `focus-indicator.spec.ts` (the editing tour opens the field)                                                                                                                                                                                                                                   |
| S14      | value "is a line for each detail…"; `publish-plan.test.ts` (_details, decided as the list they show as_); the contract's _details (STY-039)_ on both repositories; `google-sheets-roadmap-repository.test.ts` (_an item's details_: the cell alone as text, an empty cell, a `Details` column added); e2e first test and "adds a Details column to a roadmap with none, and an empty cell for no details"                                                                                                                                                                                                                                                                                              |
| S15      | `publish-plan.test.ts` ("is a conflict when a co-lead changed the list, and none for details that show as the same list"); the contract's "refuses a co-lead's other details" and "takes a co-lead's details that show as the same list as published…"; `pending-changes.test.ts` ("is dropped by a read that finds a co-lead wrote the same list…"); page "shows a co-lead's different details beside yours, each nested as it will read, to keep or use"; "…Refresh drops a change the data source holds"; `pending-changes.test.ts` (_an item without an ID whose details a co-lead wrote another way_); e2e "a co-lead's different details are shown beside yours, each nested, nothing written"   |
| S16      | e2e "on a phone / in the narrowest card, a long detail at the third level wraps, every control can be reached and nothing scrolls sideways" (375px, and 640px for a 294px card)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S17      | page "starts shut, the details as the card lists them beside Change details, with no editor and no Details list on the card"; "reads No details beside Add details…"; "shows Deep / Cold as the card lists them until the field is first opened…"; "shuts keeping text typed, the list showing the details as changed, and Done keeps them with the field shut"; e2e first test                                                                                                                                                                                                                                                                                                                        |
| S18      | `roadmap-tab-parser.test.ts` ("says whether an item has Welsh details, shown or not…", five cells, and a tab with no Welsh column); the contract's "says an item has Welsh details even when none pairs with the English" and "publishes the other fields of an item with Welsh details…"; page _An item with Welsh details_ ("shows the details of Paired / Unpaired with no button to change them, and says why"; "shows them in Welsh…"; "edits and publishes the item's other fields…"; "keeps no change of details made in a form whose item gains Welsh details while it is open"); e2e "an item with Welsh details shows them with no way to change them, and publishes its other fields alone" |
| S19      | `publish-plan.test.ts` ("refuses, as a conflict that can't be kept, when the item's details have gained Welsh…"; "writes the item's other fields beside Welsh details…"); the contract's "refuses details for an item that has gained Welsh ones…"; `google-sheets-roadmap-repository.test.ts` ("writes nothing over details whose Welsh cell holds anything…"); `conflicts.test.ts` (_Welsh details written since an item was read_); page "refuses a change of details to an item that has gained Welsh details: it can be discarded, not kept"; e2e "Welsh details written since the item was read stop the publish…"                                                                               |
| S20      | value "holds the levels the details show at…" (three cells); `pending-changes.test.ts` ("is no change for details written another way that show as the same list"); `google-sheets-roadmap-repository.test.ts` ("leaves a cell written another way as it is until the details change, then writes it at the levels shown"); page _Details written another way_ (four items, then "writes the details at the levels shown once they change…"); e2e "details written another way show as the public site shows them, and are written only once they change"                                                                                                                                              |
| S21      | rules (_Enter_); page "starts the next detail on Enter, at this one's level, splits one at the caret, and joins those nested at the end of a detail that has some"; "moves an empty nested detail out on Enter, and does nothing in an empty top-level one"; e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S22      | rules (_Backspace at the start of a top-level detail_); page "moves a nested detail out on Backspace at its start, joins a top-level one to the detail above, and does nothing in the first"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S23      | page "opens the outline in place…" (the buttons' names); "puts the caret back in the detail's text after a move chosen with a pointer, and marks the detail the buttons act on"; the keyboard test (focus stays on the button); "nests a detail…" (`aria-disabled`, then why); e2e first test and the S16 tests                                                                                                                                                                                                                                                                                                                                                                                        |
| S24      | page "is one stop for the Tab key, in the detail last written in, and the arrows move between details at a detail's start and end"; "opens the outline in place…" (each name); e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S25      | page "puts a removed detail back in its place on Undo, with those nested under it as they were"; e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
