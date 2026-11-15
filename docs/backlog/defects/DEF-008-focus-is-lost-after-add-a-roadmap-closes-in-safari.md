# DEF-008: Focus is lost when "Add a roadmap" closes, for a Product Lead who clicked it in Safari

- **Status**: Proposed — triaged by the owner, 2026-11-15 (D1)
- **Severity**: Low — after Cancel or Escape a keyboard or screen-reader user is put
  back at the top of the page; nothing is lost and nothing wrong is written
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-005
- **Suggested model**: Haiku — one ref passed to a prop the dialog already has, with a
  component test
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead on a Mac or an iPhone clicks "Add a roadmap" in Safari, then chooses
Cancel or presses Escape. Focus should return to the button; it goes to the top of
the page instead, so the next Tab starts from the header. Safari does not focus a
button when it is clicked, and the dialog returns focus to whatever held it as it
opened. Opening the dialog by keyboard is not affected, nor is any other browser.
Since STY-041. Not seen in Safari itself: the tests here run Chromium only, so this is
worked out from the code and shown by a component test that clicks without focusing.

## Reproduce

As a Vitest page case built on `roadmaps-page-adding.test.tsx`, run on STY-043's
branch, whose adding path is the default branch's at `4a3fb4e`:

1. Render the roadmap list and wait for it.
2. Send "Add a roadmap" a click without focusing it (`fireEvent.click`), as Safari
   does; the dialog opens.
3. Choose Cancel and wait for the dialog to go.

**Expected**: focus is on "Add a roadmap".
**Actual**: focus is on the page's `<body>`.

## Cause

Verified: `RoadmapsPage` opens the dialog from state, with no trigger for the dialog
to return focus to, and gives `FormDialog` no `opener`. Base UI then returns focus to
the element that held it as the dialog opened, which is `<body>` when the click left
the button unfocused. STY-043 gave `FormDialog` an `opener` for this and passes
About's Edit to it; the adding form passes none. The list has two "Add a roadmap"
buttons while it is empty, so the page has to note which one opened the dialog.

- `rg -n 'opener' src/features/roadmaps --glob '!*.test.*'` — the prop in
  `dialogs/form-dialog.tsx` and `dialogs/roadmap-dialog.tsx`, and its one user,
  `editing/editable-roadmap-about.tsx`; `pages/roadmaps-page.tsx` gives none.

For the fix (agent, 2026-11-15, retro of STY-043): the adding form is the only caller
without an `opener` (`rg -n '<(FormDialog|RoadmapDialog)\b' src` — `FormDialog` once, in
`RoadmapDialog`; `RoadmapDialog` in `roadmaps-page.tsx` and
`editable-roadmap-about.tsx`). Once it gives one, `opener` can be required in
`FormDialogProps`, and so in `RoadmapDialogProps`, and the type check then names a
later dialog that gives none. STY-041's reviews did not find the missing one, and no
test here runs Safari.

## Acceptance criteria

### S1: Focus returns to the button that opened the dialog, however it was pressed

**Given** the "Add a roadmap" dialog opened by a click that did not focus its button
**When** it closes by Cancel or Escape
**Then** focus is on the button that opened it, of the two an empty list shows

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): fix it as Cause sets out, and make `opener` required in `FormDialogProps` and `RoadmapDialogProps`, so the type check names a later dialog that gives none.

## Delivery _(add on delivery; as in `story.md`)_
