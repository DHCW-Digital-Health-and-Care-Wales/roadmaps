# STY-038: The Organisations field opens on request in an item's edit form

- **Status**: Proposed — the owner asked for it on seeing the whole form (D1); it
  follows the Tags field's pattern (STY-037 S19)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-009-item-tags](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-014 §Organisations, ADR-010, ADR-008
- **Suggested model**: Sonnet — a presentation change to one form field, with its tests
  and snapshots to move

## Summary

An item's edit form lists twelve organisations as checkboxes: about 620px of a form
some 1,400px tall, whatever the Product Lead came to change. The field now starts shut.
It names the chosen organisations on one line, as the card does, beside "Change";
choosing that shows the checkboxes in place. With Tags shut too (STY-037), the form is
about 860px. Nothing changes in which organisations can be chosen, how the choice is
kept pending, or what is written.

## Scope

The Organisations field of the item's edit form (`features/`) and its copy (`i18n/`).
Nothing in `domain/` or `infrastructure/`: the field's value, the pending change and
the write are STY-034's. The field that opens on request is shared with STY-037's Tags
field (epic _A field that opens on request_).

## Acceptance criteria

### S1: The field starts shut, naming what is chosen

**Given** an item for Cardiff and Vale and Swansea Bay
**When** Sam opens its edit form
**Then** the Organisations field reads "Cardiff and Vale, Swansea Bay", by short name,
All Wales first then alphabetical, beside a button named "Change organisations", and
shows no checkboxes
**And** an item with none chosen reads "No organisations" beside "Add organisations"

### S2: Opening shows the checkboxes in place

**Given** the form above
**When** Sam chooses "Change organisations"
**Then** the checkboxes of STY-034 S1 show under the field's label, the item's ticked,
with focus on the first
**And** the button reads "Close organisations" and says the field is open

### S3: Shutting keeps the ticks

**Given** the field open, and Sam has ticked Powys
**When** Sam chooses "Close organisations"
**Then** the field reads "Cardiff and Vale, Powys, Swansea Bay", focus stays on the
button, and nothing is pending yet

### S4: Done keeps the choice, open or shut

**Given** Sam has ticked Powys, with the field open or shut again
**When** Sam confirms the form
**Then** the card reads "Cardiff and Vale, Powys, Swansea Bay", tagged "Changed", as
STY-034 S2

### S5: An unknown code is named while the field is shut

**Given** an item whose cell reads `CAVUHB, CAVHB`
**When** Sam opens its edit form
**Then** the field, still shut, says CAVHB isn't recognised and will be removed if the
organisations are changed, as STY-034 S4
**And** it says so when open too

### S6: Cancel leaves the choice, and the form opens shut again

**Given** Sam has opened the field and ticked Powys
**When** Sam cancels the form and opens it again
**Then** Powys is not ticked, and the field is shut

### S7: By keyboard and screen reader, in Welsh too

**Given** the form, used with a keyboard alone
**When** Sam opens the field, ticks an organisation and shuts it
**Then** each is done without a pointer; the button says whether the field is open; the
open checkboxes are a group named "Organisations"
**And** on the Welsh interface the label, the button and "No organisations" are Welsh,
and the short names stay English
**And** axe finds no WCAG 2.2 AA violation with the field shut or open, light and dark

## Decisions

- **D1** (owner, 2026-11-13, on seeing the whole form in STY-037's prototypes):
  organisations editing opens on request, as the Tags field does, in a second story.
- **D2** (agent, 2026-11-13): shut, the field names organisations by short name, comma
  separated, as the card does (ADR-014), over their codes: one way of naming them.
- **D3** (agent, 2026-11-13): the unknown-code notice shows while the field is shut,
  over only when open: it warns before a change, and a Product Lead who never opens the
  field would not learn the item names a code the public site drops → S5.
- **D4** (agent, 2026-11-13): the field starts shut every time the form opens, with
  none chosen too, over opening itself when empty: one rule, and "Add organisations"
  says what to do → S1, S6.
- **D5** (agent, 2026-11-13): the button shows "Change", "Add" or "Close" and is named
  with "organisations" for assistive technology, over the full words on screen, which
  wrap under the label in the narrowest card.
- **D6** (agent, 2026-11-13): no amendment to ADR-014: its "one checkbox each" still
  describes the open field.

## Starting point

Audited at `52850bf`. `EditForm` draws a `many` field as an always-open `fieldset`.
Tests and snapshots that expect the checkboxes as the form opens need the extra press:
`rg -n 'name: "Organisations"' tests/e2e src` finds the E2E helper
(`toggleOrganisations`), the axe spec and the page tests; the aria snapshot
`edit-item-form-error.aria.yml` holds the group. The working model is the last figure
of `docs/analysis/item-tags-ux-analysis/prototypes.html`.

## Out of scope

- The Tags field: STY-037.
- Remembering that a field was open from one form to the next: no record; add one if
  Product Leads ask.
- Shortening the form's other fields.
