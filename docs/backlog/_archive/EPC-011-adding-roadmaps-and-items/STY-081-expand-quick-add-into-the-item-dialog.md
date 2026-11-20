# STY-081: A quick add title opens in the item dialog for its other details

- **Status**: Done — delivered in its PR; grilled with the owner on 2026-11-20
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](../../EPC-011-adding-roadmaps-and-items/README.md)
- **Depends on**: STY-080 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-014, ADR-008, ADR-010
- **Suggested model**: Opus — the item dialog has never taken initial values, and its
  focus and closing rules must hold with a field to come back to

## Summary

A quick add field gains a button at its end, "Add more details", for an item that needs
more than a title. It opens the item dialog, adding, with the title typed so far and the
placement already chosen. Adding there works as it does today and ends the run of quick
adds; cancelling brings the field back with the title still in it. Nothing about what a
new item is, or what is written, changes.

## Scope

The quick add field's expand button, and the item dialog's adding form taking a title
and a placement to start from (`features/`); copy in both catalogues; E2E.

## Acceptance criteria

### S1: The field has "Add more details" at its end (quick add round 2 Q2)

**Given** a quick add field is open, in either view, on any screen **When** Sam looks at
it, or hovers its end **Then** an icon button inside the field's end is named "Add more
details", with the same words as its tooltip, and is in the tab order between the field
and Add

### S2: It opens the item dialog with the title and placement

**Given** Sam has typed `␣Book␣a␣␣hearing test␣` (␣ a space) in Next's field **When**
Sam chooses "Add more details" **Then** the item dialog opens in its adding form with
"Book a hearing test" as its title, Next chosen, every other field empty, and focus at
the end of the title **And** with nothing typed, it opens with an empty title and Next
chosen

### S3: Adding there ends the run (quick add round 2 Q3)

**Given** that dialog **When** Sam writes a description and chooses "Add item" **Then**
the item is added with everything written, last in the placement chosen in the dialog,
tagged "New", the dialog closes, and focus is on the new card's Edit, as STY-046 S3 has
it; the quick add field is closed **And** "Add and start another" keeps the dialog open
as STY-046 S4 does

### S4: Cancelling brings the field back

**Given** that dialog, opened from Next's field with a title typed **When** Sam chooses
Cancel, presses Escape or closes it from its corner, having added nothing in it **Then**
nothing is added, the dialog closes, and Next's field is open again with the title as
typed, focused, with the cursor at its end **And** a click outside the dialog does
nothing, as for every dialog (the epic's _The dialogs_)

### S5: Available as quick add is

**Given** the session has expired, or a publish is under way **When** Sam chooses "Add
more details" **Then** it opens the dialog without asking to reconnect, as quick add
does (STY-080 D7) **And** before the items are first read, or when that read fails,
there is no field to expand (STY-080 S8)

### S6: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader **When** Sam reaches
the button and opens the dialog **Then** its name and tooltip are in Welsh, and axe
finds nothing in the field or the dialog

### S7: Closing after "Add and start another" ends the run (D4)

**Given** the dialog opened from Next's field with "Book a hearing test", and Sam has
chosen "Add and start another", so that item is added and the form is empty **When** Sam
chooses Cancel, presses Escape or closes it from its corner **Then** the dialog closes,
the quick add field stays closed, and focus is on Next's "Add an item", the control the
run started from, as closing after "Add and start another" returns focus today to the
"Add an item" that opened the dialog

## Decisions

- **D1** (owner, 2026-11-20, prototype review): an expand button at the end of the quick
  add field opens the full item dialog, with any partly typed title filled in.
- **D2** (owner, 2026-11-20, quick add round 2 Q2): named "Add more details", over "Open
  the full form" and "Open in the item dialog".
- **D3** (owner, 2026-11-20, quick add round 2 Q3): adding in the dialog leaves focus on
  the new card's Edit, over reopening a fresh quick add field.
- **D4** (agent, 2026-11-20, from review): once the dialog has added an item, closing it
  ends the run, with focus on the placement's "Add an item", over bringing the field
  back with a title already added, which Enter would add twice. The owner may prefer the
  field back, empty.

## Starting point

Audited at `cc32b48`: the dialog's add target holds only what opened it and which card
was added (`use-item-dialog.ts`), and the adding form always starts from a blank item
with no placement, or the one kept after "Add and start another" (`item-dialog.tsx`), so
there is no way yet to hand it a title and a placement. The dialog is given its opener
(EPC-011 delivery notes); here the field it returns to is gone while the dialog is open.

## Out of scope

- The quick add field itself: STY-080.

## Delivery

### Departures

- **The field stays open behind the dialog** (agent): the Starting point's "the field
  it returns to is gone while the dialog is open" describes the prototype, which puts
  "Add an item" in the field's place while its dialog is open. Here the field stays,
  out of reach behind the modal dialog, with its title as typed, so the dialog's
  opener is the field itself and closing it with nothing added needs no reopening
  (S4). Focus moving into the dialog is no leave (STY-080 S5): the press that opened it
  was on the field's own button. An item added in the dialog closes the field, and the
  opener is then its "Add an item" (S7).
- **The form's title is tidied as quick add tidies it** (agent): S2's "Book a hearing
  test" from `␣Book␣a␣␣hearing test␣` runs spaces together as quick add does (STY-080
  S6); a title typed in the dialog is still only trimmed, as STY-046 has it.
- **S5's publish under way is reached as STY-080 S9's was** (agent): the publish dialog
  is modal while it writes, so the page is left and come back to during the publish.
- **S6's axe checks are in `quick-add.spec.ts`**, beside STY-080's for the open field,
  not in `accessibility.spec.ts`, in both themes; the Welsh tooltip shares the name's
  key, so the Welsh name's test holds it.
- **`blankItem` takes the values a new item starts with** (agent), in place of a
  placement alone, so the adding form starts from a title too.

### Contract for dependents

- **`useItemDialog().add(from, expanded)`** opens the adding form from `from`, with an
  `ExpandedQuickAdd` (`editing/use-item-dialog.ts`) when a quick add field opens it: its
  `start`, the tidied title and the placement, fills the first form only, and its
  `onAdded` runs on each item the dialog adds ("Add item" or "Add and start another").
  `QuickAdd` takes it as `onExpand`.
- **The item dialog's adding opener is `firstMounted(from, addItemButton)`**
  (`lib/first-mounted.ts`): what opened it while it is on the page, else the page's own
  "Add an item". It replaced the rule that an empty roadmap's panel's button counts only
  while the page has no items.
- **`ItemDialog`'s adding props take `start`** (`AddingStart`): a title and a placement
  the first form starts on, kept in the item's values unless changed.

### Scenario evidence

Page tests are in `src/features/roadmaps/pages/roadmap-detail-page-quick-add.test.tsx`;
Playwright's in `tests/e2e/quick-add.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `is at the field's end, between the title and Add in the tab order`; `opens in its place… with “Add more details”, Add and Cancel…`; `stays open as Tab goes to its own buttons…`; Playwright `the field's layout (S2)` in Welsh at 375, 640, 768, 1024 and 1280px, both views: the button inside the field's end; the journey's hover shows the tooltip; `structure.spec.ts` (`quick-add-open`) |
| S2       | `opens the item dialog's adding form with the title tidied, Next chosen, every other field empty and focus at the title's end`; `opens with an empty title and Next chosen when nothing is typed`; Playwright `“Add more details” opens the item dialog…` (title, placement, focus, cursor)                                                                                                      |
| S3       | `adds the item with everything written, last in the placement chosen…`; `keeps the title as typed when it is added unchanged…`; `keeps the dialog open, empty, on Next, after “Add and start another”`; the Playwright journey (no write)                                                                                                                                                        |
| S4       | `%s adds nothing and brings Next's field back…` for Cancel, Escape and the corner's Close; `does nothing on a click outside the dialog`; `brings the field back, with its title, over a read that lands while the dialog is open`; `can be expanded again, and Enter in the field back adds the title…`; the Playwright journey's click outside and Cancel                                       |
| S5       | `opens the dialog without asking to reconnect, and adds there` (expired); `adds pending items while a publish of the roadmap is under way… by title and in the dialog…` (Departures); STY-080 S8's `is not there before the items are read…` (no field to expand)                                                                                                                                |
| S6       | `names the button, and the dialog it opens is the Welsh adding form`; Playwright `has no axe violation in the dialog “Add more details” opens` in both themes, and STY-080's axe check of the open field, which now holds the button                                                                                                                                                             |
| S7       | `ends the run on %s after “Add and start another”…` for Cancel, Escape and the corner's Close; the Playwright journey's Escape                                                                                                                                                                                                                                                                   |
| Red      | The page tests were written first and failed before the button existed (17 of 17). The cursor's return to the title's end was shown red by removing it: the three S4 closings failed.                                                                                                                                                                                                            |
