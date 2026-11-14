# STY-037: A Product Lead edits an item's tags

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-009-item-tags](README.md)
- **Depends on**: STY-038 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012 (this story amends _What is editable_), ADR-014, ADR-011,
  ADR-010, ADR-008
- **Suggested model**: Opus — an ordered, open-ended field through the pending-change
  model, publish plan and conflict review, and a new form control
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/67

## Summary

A Product Lead adds, renames and removes an item's tags in its edit form. While adding,
the form offers the tags this roadmap's other items carry, most used first, so the same
idea gets the same tag. The change is a pending edit, published with the rest. Tags stay
free text: there is no shared list, and renaming a tag here changes this item only.
The editor is design B of four prototyped, shut in the form until asked for, and a
typed tag takes the spelling the roadmap already uses. Not in it: an item that has Welsh
tags keeps them read-only until Welsh content can be edited.

## Scope

The Tags field of the item's edit form (`features/`), tags as a pending item field
(`domain/`), and the write of the item's tags (`infrastructure/`), with copy in English
and Welsh. The tags offered come from the roadmap's items already on the page, so the
field has no loading or failure state of its own.

S1–S14 hold for any editor with a control per tag; S15–S18 are design B's own, which
the owner chose (D11); S19 is how the field opens in the form (D13); S20 and S21 are
the owner's answers on Welsh tags and spelling (D14, D15); S22 is the agent's guard on
the Welsh rule (D17). This story changes what the
editor writes to the shared data source, a contract with the public site: the item's
`Labels` cell (S12). `Labels (cy)` is never written (S20).

## Acceptance criteria

### S1: The form shows the item's tags

**Given** an item tagged "Patients" and "Video consultations"
**When** Sam opens its edit form and opens the Tags field
**Then** the field shows both, in the order written, each with a way to rename it and a
way to remove it, named for its tag ("Remove Patients")
**And** on the Welsh interface the field's label and controls are Welsh, and the tags
are the English ones

### S2: An added tag is pending

**Given** the form above
**When** Sam adds "Carers" and confirms the form
**Then** the card's Tags line reads "Patients, Video consultations, Carers", the card is
tagged "Changed", and the publish dialog lists the item with tags among its changed
fields
**And** nothing is written until Sam publishes

### S3: The roadmap's other tags are offered (owner, D1)

**Given** the roadmap's other items carry "Patients" (three items), "Appointments"
(two), "Clinic staff" (two) and "Waiting lists" (one)
**When** Sam starts to add a tag to the item above
**Then** "Appointments", "Clinic staff" and "Waiting lists" are offered in that order:
most used first, then alphabetical, without "Patients", which the item has
**And** typing "wai" leaves only "Waiting lists" offered, and choosing it adds it
**And** another item's pending tags are offered as the page shows them, and no other
roadmap's tags are

### S4: No tag twice on an item

**Given** the item has "Patients"
**When** Sam adds "Patients" or "patients"
**Then** no tag is added, and the form says the item already has "Patients"

### S5: Removing a tag

**Given** the form above
**When** Sam removes "Patients" and confirms the form
**Then** the card's Tags line reads "Video consultations", tagged "Changed"
**And** while the form is open "Patients" is offered again, as other items carry it
**And** an item with every tag removed has no Tags line on its card

### S6: Renaming a tag changes this item only

**Given** the form above
**When** Sam renames "Video consultations" to "Video appointments" and confirms the form
**Then** the card's Tags line reads "Patients, Video appointments": the tag keeps its
place
**And** no other item's tags change
**And** renaming it to "Patients", which the item has, leaves "Patients" once

### S7: A comma or a line break ends a tag

**Given** the form
**When** Sam types or pastes "Carers, Clinic staff"
**Then** two tags are added, "Carers" and "Clinic staff", each trimmed at its ends
**And** no tag ever holds a comma or a line break

### S8: Text typed but not yet added counts

**Given** Sam has typed "Carers" in the field without adding it
**When** Sam confirms the form
**Then** "Carers" is among the item's tags

### S9: Cancel and Undo leave the tags as they were

**Given** Sam has added and removed tags in the open form
**When** Sam cancels the form
**Then** the card shows the tags as they were, with no pending change
**And** "Undo changes" on a card with a pending tag change shows the tags as read

### S10: An item with no tags, and a roadmap with none to offer

**Given** an item with no tags, on a roadmap whose other items have none
**When** Sam opens its edit form and opens the Tags field
**Then** the field holds no tags and offers none, and Sam can still type a tag
**And** on a roadmap whose other items have tags, the same item is offered all of them

### S11: By keyboard and screen reader

**Given** the form, used with a keyboard alone
**When** Sam adds a tag, chooses an offered one, renames one and removes one
**Then** each is done without a pointer, each control's name says its tag, and each
addition, removal and refusal is announced
**And** focus stays in the field: after a removal it is on the next tag's control, or
on the control for adding when none is left
**And** axe finds no WCAG 2.2 AA violation in the field's states, light and dark

### S12: Publishing writes the tags

**Given** a pending change of an item's tags to "Patients", "Video appointments" and
"Carers"
**When** Sam publishes
**Then** the item's `Labels` cell reads `Patients, Video appointments, Carers`: the tags
in order, separated by a comma and a space, as text; no tags writes an empty cell
**And** for an item with no Welsh tags the change writes no other cell of its row (an
`Item ID` the row lacks is still written, as on any publish), and a roadmap whose tab has
no `Labels` column gains one as ADR-012 adds a column

### S13: A co-lead's different tags are a conflict

**Given** Sam's pending tags, and a co-lead has since changed the item's tags
**When** Sam publishes
**Then** nothing is written, and the conflict review shows Sam's tags beside the
co-lead's, to keep or use
**And** a co-lead's same tags in the same order are no conflict, and Refresh drops a
pending change the data source already holds

### S14: On a phone and in the narrowest card

**Given** a screen 375px wide, or the narrowest item card (two across, about 294px)
**When** Sam edits the tags of an item, one of them forty characters long
**Then** nothing scrolls sideways, a long tag wraps, and every control can be reached

### S15: Each tag is a row with its own controls (owner, D11)

**Given** the Tags editor showing "Patients" and "Video consultations"
**When** Sam chooses "Rename" on "Video consultations"
**Then** its row becomes a field holding the name, with "Update" and "Cancel": Enter or
"Update" keeps the new name, Escape or "Cancel" the old one, and the form stays open
**And** a name still being changed is kept when Sam confirms the form or uses another
control of the field

### S16: The row's buttons are icons where words would not fit (owner, D10)

**Given** a card too narrow for one of the item's tags beside "Rename" and "Remove" in
words
**When** the Tags editor shows
**Then** every row's buttons are icons, none drops under its tag, and each keeps its
name ("Rename Patients")
**And** where every tag fits beside the words, the buttons show words

### S17: A removal can be undone (owner, D11)

**Given** Sam has removed "Patients"
**When** Sam chooses "Undo" beside "Removed “Patients”."
**Then** "Patients" is back in its place

### S18: The roadmap's other tags are buttons under the field for adding (owner, D11)

**Given** the roadmap's other items carry tags the item lacks
**When** the Tags editor shows
**Then** they are listed under "Used elsewhere in this roadmap" as buttons; choosing
one adds its tag and takes it from the list
**And** typing in "Add a tag" narrows them, and the field says when none matches

### S19: The field starts shut, and opens on request (owner, D13)

**Given** an item tagged "Patients" and "Video consultations"
**When** Sam opens its edit form
**Then** the Tags field shows both tags on one line beside a button named "Change tags",
and no editor; an item with no tags reads "No tags" beside "Add tags"
**And** choosing the button shows the editor in place, with focus in "Add a tag"; the
button, now "Close tags", shuts it, keeping a name still being changed and adding text
typed but not yet added, as confirming the form does (S8), and the line shows the tags
as changed
**And** confirming the form keeps the tags whether the field is open or shut
**And** the card's own Tags line does not show while the form is open

### S20: An item with Welsh tags keeps its tags read-only (owner, D14)

**Given** an item whose `Labels (cy)` cell holds anything, whether or not its entries
pair with the English ("Patients, Carers" with "Cleifion, Gofalwyr", or with "Cleifion"
alone)
**When** Sam opens its edit form
**Then** the Tags field shows the item's tags with no button to change them, and says
they have Welsh versions and can't be changed here yet
**And** the item's other fields are edited and published as before, with `Labels` and
`Labels (cy)` left as they are

### S21: A typed tag takes the roadmap's spelling (owner, D15)

**Given** the roadmap's other items carry "Clinic staff"
**When** Sam adds "clinic staff"
**Then** "Clinic staff" is added, and the field says it was added as other items spell
it
**And** spellings that differ only in capitals are one tag when offered: counted
together, and shown and added in the most used spelling, the first in the roadmap's
order when two are used as often

### S22: Welsh tags written since the item was read stop the publish (agent, D17)

**Given** Sam's pending tag change to an item that had no Welsh tags, and a co-lead has
since written some in its `Labels (cy)` cell
**When** Sam publishes
**Then** nothing is written, and the conflict review says the item's tags now have
Welsh versions and can't be changed here: Sam's tag change can be dropped, not kept

## Decisions

- **D1** (owner, 2026-11-13, the request for this story): while adding a tag, the form
  suggests tags used elsewhere in the same roadmap → S3. Tags stay free text.
- **D2** (owner, 2026-11-13, the request): prototypes of the tag component alone, to
  try before choosing → D11 and `docs/analysis/item-tags-ux-analysis.md`.
- **D3** (agent, 2026-11-13): tags are edited in the item's edit form and kept pending
  on Done, over editing them on the card: as organisations are (STY-034 D1), with one
  pending model → S2, S9.
- **D4** (agent, 2026-11-13): tags are one field for conflicts, compared as the ordered
  list, over a set: tags show in the order written, and ADR-014 makes a multi-valued
  field one field → S13.
- **D5** (agent, 2026-11-13): the cell is written as the tags in order separated by
  `, `, the format the parser and the public site read, so a tag holds no comma or line
  break → S7, S12.
- **D6** (agent, 2026-11-13): the editor adds no tag that repeats one on the item
  ignoring capitals, over the parser's exact match: "Patients" beside "patients" on one
  card is never meant. Tags already repeated that way in the data show as read → S4.
- **D7** (agent, 2026-11-13): text typed but not added counts when the form is
  confirmed, over dropping it: a lost tag costs more than an unintended one, which the
  card shows at once → S8.
- **D8** (agent, 2026-11-13): tags are offered most used first, then alphabetical,
  counted over the items as the page shows them, pending edits included, over
  alphabetical alone: the common tag is the likeliest and the one to converge on → S3.
- **D9** (agent, 2026-11-13): no limit on the number or length of tags: ADR-012 sets
  none and the card budget is deferred (persona A11).
- **D10** (owner, 2026-11-13, on trying the prototypes): in design B, where a row is
  too narrow for Rename and Remove beside the tag, they show as lucide icons, so they
  never drop under it. Prototyped: every row switches together, and each button keeps
  its name → S16.
- **D11** (owner, 2026-11-13, on trying the prototypes): which editor is built → B, list
  and suggestions, as prototyped with D10's icons ("that looks good"). Settles which
  editor is built; adds S15–S18. A, C and D are not built.
- **D12** (agent, 2026-11-13): the card's read-only Tags line hides while its form is
  open, as the Organisations line does (STY-034), over showing the tags twice.
- **D13** (owner, 2026-11-13, on seeing the whole form prototyped): the Tags field is
  not shown at full size as the form opens; it opens on request, as Organisations will
  (STY-038). Changes: S1 and S10, which open the field first; adds S19. The
  opening field is one piece for both stories (epic _A field that opens on request_).
- **D14** (owner, 2026-11-13, asked in the session; analysis _Decisions needed_): what happens to an item's
  Welsh tags when its tags are edited → such an item's tags are read-only in the form
  for now; nothing new is written. Rejected: keeping each tag's Welsh, clearing the
  Welsh with a warning, leaving the Welsh cell alone. Adds S20.
- **D15** (owner, 2026-11-13, asked in the session; analysis _Decisions needed_): a typed tag takes the
  spelling the roadmap already uses, and the field says so → S21. "patient" beside
  "Patients" stays two tags.
- **D16** (agent, 2026-11-13): S20 applies whenever the Welsh cell holds anything, a
  count mismatch included, over only when Welsh shows: editing the English could bring
  the counts level and pair the wrong Welsh. The repository must say so of an item.
- **D17** (agent, 2026-11-14, round 3 review): a publish that finds Welsh tags written
  since the item was read is refused as a conflict, over writing the English: D14 and
  D16 would otherwise fail to a co-lead or translator working meanwhile → S22.

## Starting point

Audited at `52850bf`. Epic F3–F5 hold what the parser, the form and the component
library give.

- The card shows tags as one line of text, in Welsh where an item has it, and keeps
  showing it while the form is open; organisations hide theirs.
- `EditForm` cancels on every Escape, one a field has already handled included: its
  handler does not read `defaultPrevented`. A rename's Escape must not close the form
  (S15).
- When the Welsh and English counts differ the parser drops the Welsh, so
  `RoadmapItem.tags` alone cannot say the Welsh cell holds anything (S20, D16).

## Out of scope

- A shared tag list, tags from other roadmaps, and renaming or merging a tag across a
  roadmap's items: EPC-009 _Out of scope_.
- Reordering an item's tags: design B does not offer it; a new tag joins at the end.
- Editing a tag's Welsh: with Welsh content editing, a later record.
- Details, and adding or deleting items: later editing records.

## Delivery

### Departures

- **Tags are one pending field, `tags`** (agent), between the placement and the
  organisations in `EDITABLE_ITEM_FIELDS`, the form's order. Its value is the English
  tags in order, separated by a comma and a space (`tagsValue`, read back by `tagsOf`):
  what the cell is written as (D5), and what the conflict review shows.
- **S20, D16: `RoadmapItem.hasWelshTags`** (agent) is how the repository says an item's
  Welsh tags cell holds anything: a count that doesn't pair, entries of dashes alone and
  Welsh with no English included. The form reads the latest read of the item, so a
  Refresh that brings Welsh tags makes an open form's field read-only, and confirming
  the form then keeps no tag change made before it (review round 1, Opus P3).
- **S20: the read-only field shows the tags as the card does** (agent): in Welsh on the
  Welsh interface, under the card's label ("Tags", "Tagiau"), as it stands in for the
  card's line, which hides while the form is open (D12). An item whose Welsh cell holds
  something beside no English tag reads "No tags" with the same notice.
- **S22 is `FieldConflict.welshTags`** (agent): the plan refuses the item's tags
  whenever the fresh read has Welsh ones and the cell does not already hold the pending
  tags. The review shows the two values with "These tags now have Welsh versions, so
  they can't be changed here yet." and one button, "Discard my change"; "Choose which
  text to keep…" shows only while some other conflict is open. Until the next read the
  page shows the item as having Welsh tags, so its form no longer changes them. As for
  any co-lead change, only an item found by its ID can conflict: one with no ID, or a
  copied ID, whose row changed is reported as removed or changed (ADR-012).
- **A pending tag change to an item that gains Welsh tags on Refresh stays pending**
  (agent), shown on the card, until it is undone or a publish refuses it (S22). No read
  drops it, as no read drops any other pending change a co-lead's write overtakes.
- **S7: white space inside a tag is collapsed to one space** (agent), beyond trimming
  its ends, as prototyped: a pasted tab or doubled space would otherwise make a second
  spelling. A comma typed, pasted or dropped into "Add a tag" ends a tag at once; a
  pasted line break does too. In a rename, a comma or a line break reads as a space.
- **S6, S21: a rename takes the roadmap's spelling too** (agent), as prototyped, and says
  "Renamed to “Clinic staff”, as other items spell it."
- **S16: the icons are decided by measuring** (agent): each tag at its own width beside
  the two buttons in words, in a row no one sees, whenever the tags or the card's width
  change (`useRowIcons`, from `RowProbe`). As icons, each button's `title` holds its
  word. Where nothing can be measured, as in a component test, the buttons show words.
- **S17: Undo sits beside the status line, not in it** (agent), named "Undo removing
  Patients", and stays until the tags next change or a rename starts.
- **S18: each offered tag's name says how many items carry it** (agent), as prototyped:
  "Add Appointments, on 2 other items". The button beside "Add a tag" is named "Add
  tag".
- **S3: an item counts once for a tag** (agent), however often it repeats it in other
  capitals; alphabetical order ignores capitals.
- **`EditForm`** (agent): Escape is left to a field that has used it
  (`defaultPrevented`), a `fixed` field's text may be any node, and a `tags` field draws
  `TagsField`, whose value is always the tags confirming would keep, so the form does
  nothing special on Done (S8, S15). `OpeningField` is unchanged: Tags is the first
  field to pass `onShut`.
- **A field shown read-only when the form is confirmed is no edit** (agent, review
  round 1): `EditForm` leaves a `fixed` field out of what Done keeps. This holds for a
  family or category too (STY-028 S6): one chosen in a form whose list then can't be
  read, so that the field turns into its notice, is no longer kept pending by Done.
- **Review round 1 fixes** (agent). A list pasted into "Add a tag" goes where the
  browser would put it, over the selection or at the caret (Sol P2). Text typed but not
  added, and a name being changed, are kept in the roadmap's spelling as it is when the
  form is confirmed or the field shut, another item's tags confirmed meanwhile included
  (Sol P2). A list that adds some tags and repeats others says both: "Added Carers.
  “Patients” is already on this item." (Sol P3). A name opened for renaming and left as
  it was keeps its white space as read, so it is no change (Opus, handed off).
- **Final fresh pass fixes** (agent; Sol, 1 P2 and 2 P3). A Tags field drawn again,
  as when an item's Welsh tags come and go while its form is open, starts from what the
  form holds, so it shows what Done keeps. A line break pasted into a name being
  changed reads as a space, as a comma does, where the one-line field would have
  joined the words. Shutting the field says what it did not keep as typed ("“Patients”
  is already on this item.") under the field's label, until the tags next change: it
  describes the button, which takes focus as the field shuts, so it is announced (S4,
  S11, S19). `settleTags` gives those notes with the tags.
- **Tests.** Written first and run red: the domain tests (`roadmap-changes.test.ts`,
  `publish-plan.test.ts`, 6 failing), the parser, contract and Sheets tests (the new
  cases failing, with the rest of the contract until `hasWelshTags` was read), the
  rules (`item-tags.test.ts`, the missing module) and the pending-change and conflict
  tests (5 failing). The page tests (`roadmap-detail-page-tags.test.tsx`, 35) were
  written after the component and passed at once: a departure from test-first. One was
  then shown to discriminate, the Escape test failing with `EditForm`'s fix reverted.
  The review fixes had their tests first, run red (7 failing, then 6 for the final
  pass). The Playwright specs
  followed working code. Driving the built page found that the
  icons never showed (the measuring row's tags were held to no width), fixed before
  review and now held by the Playwright S16 tests.
- **Epic close**: this closes EPC-009. Of its delivery notes, the frame the open
  controls take to leave the page is now in `OpeningField`'s docblock, and the focus
  tour's rule in `tests/e2e/AGENTS.md`; the rest is the component's own documentation,
  so the file is archived with the epic.

### Contract for dependents

- **What the editor writes** (README, ADR-012 _STY-037 amendments_): an item's `Labels`
  cell alone, `Tag one, Tag two`, or empty; never `Labels (cy)`; neither cell of an item
  whose `Labels (cy)` holds anything. The public site reads the same format it did.
- **Domain**: `tags` in `EDITABLE_ITEM_FIELDS`; `tagsValue` and `tagsOf`
  (`roadmap-changes.ts`); `RoadmapItem.hasWelshTags`, which every `RoadmapRepository`
  must supply (the contract's "says an item has Welsh tags even when none pairs with the
  English"; `docs/operations/replacing-google-sheets.md`); `FieldConflict.welshTags`.
- **Rules** (`features/roadmaps/editing/item-tags.ts`): `tagsInUse`, `offeredTags`,
  `addTags`, `renameTag`, `settleTags`. A later shared list or roadmap-wide rename
  changes what `tagsInUse` is given, not the field.
- **Copy**: `roadmaps.edit.itemFields.tags`, `roadmaps.edit.tags.*`,
  `roadmaps.publish.notice.refused.{welshTags,discardMine}`.
- **E2E hooks**: "Change tags", "Add tags", "Close tags"; the group "Tags"; the lists
  "Tags on this item" and "Used elsewhere in this roadmap"; "Rename …", "Remove …",
  "Update …", "Cancel renaming …", "Undo removing …", "Add tag", "Add …, on N other
  items". Aria snapshot `edit-item-form-tags.aria.yml`; `edit-item-form-error.aria.yml`
  and `edit-item-form-organisations.aria.yml` now hold the read-only Tags field.
- **Welsh to review** (machine-assisted): every string of `roadmaps.edit.tags` in
  `cy.ts`, "Tagiau (Saesneg)", and the review's "Mae fersiynau Cymraeg o'r tagiau hyn
  erbyn hyn, felly does dim modd eu newid yma eto." and "Gwaredu fy newid".

### Scenario evidence

`page` is `roadmap-detail-page-tags.test.tsx`; `e2e` is `tests/e2e/editing.spec.ts`,
_editing an item's tags (STY-037)_.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | page "opens the editor in place, focus in Add a tag, each tag with a Rename and a Remove named for it"; "is Welsh on the Welsh interface, the tags staying English"; e2e "is Welsh on the Welsh interface…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S2       | page "keeps an added tag pending, on the card and in the publish dialog, writing nothing until published"; `pending-changes.test.ts` (_a change of tags_); e2e "starts shut, then adds, renames and removes tags, pending, and publishes the Labels cell alone"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S3       | `item-tags.test.ts` (`tagsInUse`, `offeredTags`); page "offers the roadmap's other tags, most used first then alphabetical, without the item's own"; "narrows the offered tags as Add a tag is typed in…"; "offers another item's pending tags as the page shows them"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S4       | `item-tags.test.ts` ("adds no tag the item has, whatever its capitals…"); page "adds no tag the item has, typed as Patients / patients, and says the item has it"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S5       | page "removes a tag, offering it again while other items carry it"; "shows no Tags line for an item with every tag removed"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S6       | `item-tags.test.ts` (`renameTag`); page "renames a tag in its place, on this item only"; "leaves a tag once when another is renamed to it"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S7       | `roadmap-changes.test.ts` (_an item's tags as one field value_); `item-tags.test.ts` ("ends a tag at each comma or line break…"); page "ends a tag at a comma as it is typed, and at a pasted line break, each trimmed"; "pastes a list over the text selected in Add a tag, and into text at the caret"; "takes a line break pasted into a name being changed as a space"                                                                                                                                                                                                                                                                                                                                                                                         |
| S8       | `item-tags.test.ts` (`settleTags`); page "counts text typed but not yet added when the form is confirmed"; e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S9       | page "leaves the tags as they were on Cancel, with nothing pending"; "shows the tags as read on Undo changes"; "is no change when a tag is added and removed again"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S10      | page "holds no tags and offers none on a roadmap whose items have none, and still takes a typed tag"; "offers an item with no tags every tag the roadmap's other items carry"; e2e "adds a Labels column to a roadmap with none…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S11      | page "adds, chooses, renames and removes by keyboard alone, focus staying in the field"; the status line in the S4, S5, S17 and S21 tests; "says what was added beside what was refused, when a list holds both"; "says, as the field is shut, that text typed but not added repeats a tag"; `accessibility.spec.ts` ("an item's tags: shut, open, a rename, a removal with Undo, a refusal, then the changed card"; "an item with no tags, and one whose Welsh tags can't be changed"), light and dark; `focus-indicator.spec.ts` (the editing tour opens the field and a rename)                                                                                                                                                                                 |
| S12      | `publish-plan.test.ts` (_tags, decided as the ordered list_); the contract's _tags (STY-037)_ on both repositories; `google-sheets-roadmap-repository.test.ts` (_an item's tags_: the cell alone, an empty cell, a `Labels` column added); e2e first test and "adds a Labels column to a roadmap with none, and an empty cell for no tags"                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S13      | `publish-plan.test.ts` ("is a conflict when a co-lead changed the tags or their order…"); the contract's "refuses a co-lead's other tags, or other order" and "takes a co-lead's same tags…"; `pending-changes.test.ts` ("is dropped by a read that finds a co-lead wrote the same tags in the same order…"); page "shows a co-lead's different tags beside yours, to keep or use"; "…Refresh drops a change the data source holds"; e2e "a co-lead's different tags are shown beside yours, nothing written"                                                                                                                                                                                                                                                      |
| S14      | e2e "on a phone / in the narrowest card, the rows' buttons are icons beside a long tag, which wraps, and nothing scrolls sideways" (375px, and 640px for a 294px card)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S15      | page "renames a tag in its place…"; "keeps the old name on Escape or Cancel, the form staying open, and the new one on Update"; "keeps a name still being changed when the form is confirmed"; "…when another control of the field is used"; e2e S14 tests (Escape leaves the form open)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S16      | e2e S14 tests (icons, each on its tag's row, named, with its word as `title`); "the rows' buttons show words where every tag fits beside them"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S17      | page "puts a removed tag back in its place on Undo"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S18      | page S3 tests ("Used elsewhere in this roadmap", "No other tag matches “zzz”."); `structure.spec.ts` (`edit-item-form-tags.aria.yml`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S19      | page "starts shut, both tags on one line beside Change tags, with no editor and no Tags line on the card"; "reads No tags beside Add tags for an item with none"; "shuts keeping a name still being changed and text typed but not added, the line showing the tags as changed"; e2e first test                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S20      | `roadmap-tab-parser.test.ts` ("says whether an item has Welsh tags, shown or not…", five cells, and a tab with no Welsh column); the contract's "says an item has Welsh tags even when none pairs with the English" and "publishes the other fields of an item with Welsh tags…"; page _An item with Welsh tags_ ("shows the tags of Paired / Unpaired with no button to change them, and says why"; "shows them in Welsh…"; "edits and publishes the item's other fields…"; "keeps no tag change made in a form whose item gains Welsh tags while it is open"; "shows the tags it keeps when an item's Welsh tags come and go while its form is open"); e2e "an item with Welsh tags shows them with no way to change them, and publishes its other fields alone" |
| S21      | `item-tags.test.ts` (S21 cases of `tagsInUse`, `addTags`, `renameTag`); page "adds a typed tag in the spelling the roadmap's other items use, and says so"; "keeps typed text in the spelling another item has taken since, the field shut / open when the form is confirmed"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S22      | `publish-plan.test.ts` ("refuses, as a conflict that can't be kept, when the item's tags have gained Welsh…"; "writes the item's other fields beside Welsh tags, and takes tags already held as published"); the contract's "refuses tags for an item that has gained Welsh ones…"; `google-sheets-roadmap-repository.test.ts` ("writes nothing over tags whose Welsh cell holds anything, a count that doesn't pair included"); `conflicts.test.ts` (_Welsh tags written since an item was read_); page "refuses a tag change to an item that has gained Welsh tags: it can be discarded, not kept"; e2e "Welsh tags written since the item was read stop the publish…"                                                                                           |
