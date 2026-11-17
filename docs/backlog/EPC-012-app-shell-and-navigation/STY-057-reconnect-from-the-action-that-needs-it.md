# STY-057: A Product Lead reconnects from the action that needs it, and carries on

- **Status**: Proposed — the owner asked for it on 2026-11-17 (STY-052 D4) and chose
  every write and Refresh, each carrying on after reconnecting (D1–D3)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: none; STY-052 (preferred order: Publish is its first caller, drawn in
  its prototypes)
- **Binding ADRs**: ADR-003, ADR-012, ADR-008, ADR-010
- **Suggested model**: Opus — a reusable gate over every write and read that needs a
  session, with ADR-003's synchronous connect and focus return

## Summary

When a session expires, every action that needs Google is unavailable (though
focusable) until the Product Lead finds Reconnect, in the header or the alert at the top
of the page, often far from where they are working. The owner asked that such actions
stay available instead: pressing one asks the Product Lead to reconnect first, in one
reusable dialog, then carries on with what they pressed. Nothing pending is lost
either way. Controls unavailable for other reasons (a write under way, items still
being read) stay as they are. Every write, and Refresh, adopt it; editing pending
changes needs no session and stays as it is.

## Acceptance criteria

### S1: The action stays available

**Given** a session that has expired, with pending changes on a roadmap
**When** the Product Lead looks at Publish changes
**Then** it is available, not marked unavailable

### S2: Pressing it asks to reconnect first

**Given** that state
**When** the Product Lead presses Publish changes
**Then** a dialog says the session has ended, that their changes are kept, and offers
Reconnect and Cancel

### S3: Reconnecting carries on

**Given** that dialog
**When** the Product Lead chooses Reconnect and Google grants access
**Then** the dialog closes and the action carries on: here, the publish confirmation
opens, listing the changes
**And** Google's popup opened from the Reconnect click itself (ADR-003)

### S4: Cancelling or refusing loses nothing

**Given** that dialog
**When** the Product Lead chooses Cancel, or Google's access is refused or its popup
closed
**Then** nothing is written, every pending change is kept, the dialog says what
happened (for a refusal) or closes (for Cancel), and focus returns to the pressed
control

### S5: Other reasons stay unavailable

**Given** a publish under way, or a roadmap's items still being read
**When** the Product Lead looks at a control that waits on them
**Then** it is unavailable as today; only the session's state opens the dialog

### S6: Welsh and keyboard

**Given** Cymraeg chosen, keyboard only
**When** the Product Lead opens and answers the dialog
**Then** it is in Welsh, traps focus while open and returns it as S4 says

## Decisions

- **D1** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q1 with (a)): every write and Refresh
  adopt it: Publish changes (or Save), Publish roadmap and Unpublish roadmap, Add a
  roadmap, Add an item, Refresh, "Make it match" and the families page's writes.
  Changes, for those actions: STY-021 S14, STY-025 S12, STY-035 S1, STY-041 S1 and
  STY-046 S1 (archived), whose "unavailable while expired" this story replaces.
- **D2** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q2 with (a)): the action carries on by
  itself after reconnecting, as S3 says; a write still asks for confirmation wherever
  it does today.
- **D3** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q3 with (a)): Edit and Move, which
  change only pending edits, never ask to reconnect.

## Out of scope

- The session warning before expiry (STY-017): unchanged.
- Where Publish pins: STY-052.
