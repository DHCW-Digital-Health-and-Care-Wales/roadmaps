# STY-038: The Organisations field opens on request in an item's edit form

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-009-item-tags](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-014 §Organisations, ADR-010, ADR-008
- **Suggested model**: Sonnet — a presentation change to one form field, with its tests
  and snapshots to move
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/65

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
the write are STY-034's. This story builds the field that opens on request, which
STY-037's Tags field then uses (epic _A field that opens on request_ and _Sequencing_).

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
Tests and snapshots that expect the checkboxes as the form opens need the extra press.
The working model is the last figure of
`docs/analysis/item-tags-ux-analysis/prototypes.html`.

## Out of scope

- The Tags field: STY-037.
- Remembering that a field was open from one form to the next: no record; add one if
  Product Leads ask.
- Shortening the form's other fields.

## Delivery

### Departures

- **The field that opens on request is `OpeningField`** (agent), in
  `features/roadmaps/editing/`, on shadcn's Collapsible (Base UI), added with the CLI
  as the first disclosure in the app, over a button and a conditional of our own
  (root `AGENTS.md`, _Conventions_). `EditForm` draws a `many` field with it.
- **S5: the notice sits under the field's label, above the line or the checkboxes**
  (agent), in the same place shut and open, so opening the field moves nothing above
  the checkboxes. It describes the button, and the group when open. STY-034 delivered
  it inside the group.
- **S2: the open group is named by the field's label** (agent, `aria-labelledby`), over
  a legend of its own: "Organisations" shows once, beside the button.
- **S1: an item whose chosen organisations the list holds none of reads "No
  organisations"** (agent), as its card shows no Organisations line then.
- **`OpeningField` takes `onShut`, which no field passes yet** (agent): an exception,
  made on purpose, to root `AGENTS.md`'s "prefer deleting code to adding abstraction".
  The epic has the piece serve both fields, and STY-037's Tags field shuts "adding text
  typed but not yet added" (its S19), which the piece cannot do for it. Held by
  `opening-field.test.tsx`, on a field that is not Organisations. STY-037 may reshape
  it against its real caller.
- **S3 and S4 tick Hywel Dda in the page tests** (agent), as STY-034's do: the test
  list has no Powys. The E2E specs tick Powys.
- **Tests.** The page tests and `opening-field.test.tsx` were written first and run red
  (24 failing, and the missing module), then STY-034's own tests moved to the extra
  press. The `onShut` test was written with its code and not seen red. The review fix
  for S3 (focus put on the button, for a browser that does not focus a button it is
  pressed with) had its two tests first, run red. Three STY-034 page tests now look for
  the notice in the form, not in the group. The Playwright specs followed working code.

### Contract for dependents

- **`OpeningField`** (`features/roadmaps/editing/opening-field.tsx`): `label`;
  `subject`, the field's name after the button's verb ("organisations"); `summary`,
  the line shown while shut, any node, `null` for nothing; `none`, said in its place;
  `hint`, shown shut and open; `children(focusOnOpen)`, the controls, drawn only while
  open, where `focusOnOpen` is the `ref` of the control that takes focus; `onShut`.
  It holds only whether it is open: the values are the caller's, so shutting keeps
  them, and a form's new mount starts shut.
- **Copy**: `roadmaps.edit.openingField.{change,add,close}` are the button's words for
  every such field; a field adds its own `subject` and `none`, as
  `roadmaps.edit.organisations` does.
- **`EditFormField.many`** gains `summary`, `none` and `subject`.
- **E2E hooks**: the buttons "Change organisations", "Add organisations" and "Close
  organisations" (`aria-expanded`), then the group "Organisations". Aria snapshots:
  `edit-item-form-error.aria.yml` holds the field shut,
  `edit-item-form-organisations.aria.yml` open.
- **Unchanged**: Escape anywhere in the form still cancels it (STY-037 _Starting
  point_).
- **Welsh to review** (machine-assisted): "Newid", "Ychwanegu", "Cau"
  (`roadmaps.edit.openingField`), "sefydliadau" and "Dim sefydliadau"
  (`roadmaps.edit.organisations`); so the buttons read "Newid sefydliadau",
  "Ychwanegu sefydliadau" and "Cau sefydliadau".

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-choosing-organisations.test.tsx` ("starts shut, naming the chosen by short name beside Change organisations, with no checkboxes"; "names All Wales first, then the others alphabetically"; "reads No organisations beside Add organisations for an item with none"); `opening-field.test.tsx` ("starts shut…"; "says it holds nothing, beside a button to add"); e2e `editing.spec.ts` ("starts shut naming what is chosen, opens in place, and shuts keeping the ticks"; "an item with none reads No organisations beside Add…"); `structure.spec.ts` (`edit-item-form-error.aria.yml`)                                     |
| S2       | page test "opens the checkboxes in place, the item's ticked, focus on the first"; `opening-field.test.tsx` ("opens in place: its controls in a group named by its label, focus on the one it names"); e2e as S1; `structure.spec.ts` (`edit-item-form-organisations.aria.yml`)                                                                                                                                                                                                                                                                                                                                                                    |
| S3       | page tests "shuts keeping the ticks, focus on the button, nothing pending yet", "moves focus to the button on shutting, where pressing a button does not focus it" and "shows the ticks again when the field is opened a second time"; `opening-field.test.tsx` ("shuts keeping what was changed, focus staying on its button"; "moves focus to its button on shutting, where pressing a button does not focus it"); e2e as S1 (no write, no publish bar)                                                                                                                                                                                         |
| S4       | page tests "keeps the choice on Done with the field open" and "…shut", "adds the first organisation of an item with none"; e2e "Done keeps a choice made in a field shut again, and publishes it" (`CAVUHB, PTHB, SBUHB` written)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S5       | page test "names an unknown code while the field is shut, and open too" (the button and the group are described by it); `opening-field.test.tsx` ("says its hint shut and open, of its button and of its group"); e2e "…an unknown code is named while shut"                                                                                                                                                                                                                                                                                                                                                                                      |
| S6       | page tests "leaves the choice on Cancel, and opens shut again" and "opens shut again after Done, too"; e2e "Cancel leaves the choice, and the form opens shut again"                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S7       | page tests "opens, ticks and shuts by keyboard alone" and "is Welsh on the Welsh interface, the short names staying English"; `opening-field.test.tsx` ("opens and shuts by keyboard alone"; "names its button in Welsh"); e2e "opens, ticks and shuts by keyboard on a phone, nothing scrolling sideways" and "is Welsh on the Welsh interface…"; axe in `accessibility.spec.ts` ("an item's organisations, shut then open with an unknown code named, then the changed card" and "an item with no organisations, its field shut then open", light and dark); `focus-indicator.spec.ts` (the editing tour stops on the button and each checkbox) |
