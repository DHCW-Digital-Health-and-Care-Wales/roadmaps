# STY-081: A quick add title opens in the item dialog for its other details

- **Status**: Proposed — grilled with the owner on 2026-11-20; waits for STY-080
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-011-adding-roadmaps-and-items
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

**Given** a quick add field is open, in either view, on any screen
**When** Sam looks at it, or hovers its end
**Then** an icon button inside the field's end is named "Add more details", with the
same words as its tooltip, and is in the tab order between the field and Add

### S2: It opens the item dialog with the title and placement

**Given** Sam has typed `␣Book␣a␣␣hearing test␣` (␣ a space) in Next's field
**When** Sam chooses "Add more details"
**Then** the item dialog opens in its adding form with "Book a hearing test" as its
title, Next chosen, every other field empty, and focus at the end of the title
**And** with nothing typed, it opens with an empty title and Next chosen

### S3: Adding there ends the run (quick add round 2 Q3)

**Given** that dialog
**When** Sam writes a description and chooses "Add item"
**Then** the item is added with everything written, last in the placement chosen in the
dialog, tagged "New", the dialog closes, and focus is on the new card's Edit, as STY-046
S3 has it; the quick add field is closed
**And** "Add and start another" keeps the dialog open as STY-046 S4 does

### S4: Cancelling brings the field back

**Given** that dialog, opened from Next's field with a title typed
**When** Sam chooses Cancel, presses Escape or closes it from its corner, having added
nothing in it
**Then** nothing is added, the dialog closes, and Next's field is open again with the
title as typed, focused, with the cursor at its end
**And** a click outside the dialog does nothing, as for every dialog (the epic's _The
dialogs_)

### S7: Closing after "Add and start another" ends the run (D4)

**Given** the dialog opened from Next's field with "Book a hearing test", and Sam has
chosen "Add and start another", so that item is added and the form is empty
**When** Sam chooses Cancel, presses Escape or closes it from its corner
**Then** the dialog closes, the quick add field stays closed, and focus is on the last
added card's Edit, as closing after "Add and start another" does today

### S5: Available as quick add is

**Given** the session has expired, or a publish is under way
**When** Sam chooses "Add more details"
**Then** it opens the dialog without asking to reconnect, as quick add does (STY-080 D7)
**And** while the items can't be read there is no field to expand

### S6: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader
**When** Sam reaches the button and opens the dialog
**Then** its name and tooltip are in Welsh, and axe finds nothing in the field or the
dialog

## Decisions

- **D1** (owner, 2026-11-20, prototype review): an expand button at the end of the
  quick add field opens the full item dialog, with any partly typed title filled in.
- **D2** (owner, 2026-11-20, quick add round 2 Q2): named "Add more details", over "Open the full form"
  and "Open in the item dialog".
- **D3** (owner, 2026-11-20, quick add round 2 Q3): adding in the dialog leaves focus on
  the new card's Edit, over reopening a fresh quick add field.
- **D4** (agent, 2026-11-20, from review): once the dialog has added an item, closing it
  ends the run as D3 does, over bringing the field back with a title already added,
  which Enter would add twice. The owner may prefer the field back, empty.

## Starting point

Audited at `cc32b48`: the dialog's add target holds only what opened it and which card
was added (`use-item-dialog.ts`), and the adding form always starts from a blank item
with no placement, or the one kept after "Add and start another" (`item-dialog.tsx`), so
there is no way yet to hand it a title and a placement. The dialog is given its opener
(EPC-011 delivery notes); here the field it returns to is gone while the dialog is open.

## Out of scope

- The quick add field itself: STY-080.
