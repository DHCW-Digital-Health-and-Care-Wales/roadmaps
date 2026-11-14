# STY-037: A Product Lead edits an item's tags

- **Status**: Proposed — the owner chose editor B and answered every question (D10–D15)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-009-item-tags](README.md)
- **Depends on**: STY-038 (hard: it builds the field that opens on request)
- **Binding ADRs**: ADR-012 (this story amends _What is editable_), ADR-014, ADR-011,
  ADR-010, ADR-008
- **Suggested model**: Opus — an ordered, open-ended field through the pending-change
  model, publish plan and conflict review, and a new form control

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
the owner's answers on Welsh tags and spelling (D14, D15). This story changes what the
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
button, now "Close tags", shuts it, keeping a name still being changed and text typed
but not yet added, and the line shows the tags as changed
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
- **D17** (agent, 2026-11-13, round 3 review): a publish that finds Welsh tags written
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
