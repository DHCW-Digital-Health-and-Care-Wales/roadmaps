# STY-025: A Product Lead edits a roadmap and publishes it

- **Status**: Proposed — owner decisions settled in the Editing epic's grilling
  (2026-11-11); waits for STY-023 and STY-024
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-005-editing
- **Depends on**: STY-023 (hard), STY-024 (hard)
- **Binding ADRs**: ADR-012, ADR-002, ADR-003, ADR-005, ADR-008, ADR-010
- **Suggested model**: Opus — new long-lived state that must survive the session paths,
  plus the first destructive action a Product Lead takes

## Summary

The Product Lead can at last change their roadmap here. On its page, Edit turns an item
card, or the "About this roadmap" block, into a form; their changes stay pending, tagged
"Changed", across pages and an expired session, until they choose "Publish changes" (or
"Save changes" on an unpublished roadmap), check the list of what will change and
confirm. Every pending change is then written at once. They can undo one item's changes
or discard them all. Until STY-026, a co-lead's conflicting change stops the publish
with a plain message.

## Scope

`features/` (the pending-edit store, forms, tags, the publish flow and its notices, the
leave warning and Disconnect's question), `routes/` only if a page needs it, `i18n/` (all new
copy, through the `copywriter` skill). It calls STY-023's call and nothing else new.
The README's "How it works" (Disconnect "clears all loaded data") gains the kept
changes.

## Acceptance criteria

### S1: An item is edited in place

**Given** Product A's page, connected
**When** the Product Lead chooses Edit on an item
**Then** the card becomes a form with its title, description, expected outcome and phase,
prefilled with the English, and focus moves to the title
**And** its other fields (tags, organisations, details, placement) stay visible,
read-only

### S2: Confirming the form keeps the change pending (Q31)

**Given** an item's form with a changed title
**When** they confirm the form (its button is not labelled "Save", which names the
write on an unpublished roadmap; the copywriter chooses it, such as "Done")
**Then** the card shows the new title with a "Changed" tag, and nothing is written
**And** the page shows how many changes are unpublished, beside "Publish changes"

### S3: Cancel leaves the item as it was

**Given** an item's form with unconfirmed changes
**When** they choose Cancel or press Escape
**Then** the card returns, showing its previous text (pending or not), and focus returns to
its Edit button

### S4: A title is required

**Given** an item's or the roadmap's form
**When** they confirm with a title that is blank after trimming
**Then** the form stays open with an error message linked to the field, and nothing is
kept
**And** other fields may be cleared; there is no length limit
**And** every value is kept trimmed at its ends

### S5: The roadmap's own text is edited the same way

**Given** the "About this roadmap" block
**When** they choose its Edit
**Then** a form offers the title, status label, product lead, vision and service
description, and confirming keeps the changes pending, the block and title tagged
"Changed"

### S6: Undo and Discard all

**Given** pending changes on two items and the roadmap's text
**When** they choose "Undo changes" on one item
**Then** that item shows its loaded text, untagged, and the count drops
**And** "Discard all" (after a confirmation) clears every pending change of this roadmap

### S7: Pending changes follow the Product Lead

**Given** pending changes to Product A
**When** they go to the list, then another roadmap, then back
**Then** Product A's card on the list shows "Unpublished changes", and its page still
shows every change
**And** Refresh on either page re-reads and keeps the changes on top of the new text

### S8: Leaving the tab asks first

**Given** any pending change
**When** they reload or close the tab
**Then** the browser asks whether to leave
**And** with no pending change it does not ask

### S9: Publishing asks for a check first

**Given** pending changes to a published roadmap
**When** they choose "Publish changes"
**Then** a dialog lists each changed item (by title) and field, and says the public site
shows the changes after its next nightly update
**And** Cancel closes it with nothing written

### S10: A publish writes everything and confirms

**Given** the dialog from S9
**When** they confirm
**Then** the controls are busy until the write ends, then a page notice confirms the
publish, the roadmap's pending changes and tags are gone, and the page shows the
re-read text
**And** reloading the page shows the new text (the fake recorded one write)

### S11: An unpublished roadmap is saved

**Given** a roadmap marked "Not published" with pending changes
**When** the Product Lead looks for the step
**Then** it is "Save changes", its dialog says nothing will be public, and its notice says
saved
**And** it writes exactly as S10 does

### S12: An expired session keeps the changes

**Given** pending changes, and the session expires (or the write answers 401)
**When** they look at the page
**Then** every change is still there, publishing is unavailable until Reconnect, and after
Reconnect they can publish them
**And** a renewal ("Stay connected") changes nothing

### S13: A refused or failed publish keeps the changes

**Given** pending changes
**When** the write is refused (403), or fails (network or 5xx; a publish is never
retried automatically)
**Then** a failure message stays on screen saying why (for 403, that this account may not
change this roadmap), every change is kept, and they can try again

### S14: Disconnect asks whether to keep the changes (Q29)

**Given** pending changes to any roadmap
**When** they choose Disconnect in the header or in the session warning
**Then** a dialog says they have unpublished changes and offers to keep them for when
they connect again, to discard them, or to cancel
**And** keep disconnects and keeps every change (the start page says changes are waiting
for them to connect, and the leave warning still applies); discard disconnects and
discards them; cancel stays connected with every change kept
**And** after keeping, connecting again re-reads the roadmap and shows each kept change
over it, tagged "Changed", ready to publish
**And** with no pending change, Disconnect does not ask

### S15: An interim stop for a conflict

**Given** a co-lead changed a field being published, or an edited item is gone
**When** they confirm the publish
**Then** nothing is written, a message says someone else has changed this roadmap and to
review it, and every change is kept (STY-026 replaces this message)

### S16: Welsh interface, English content

**Given** the Cymraeg interface
**When** they edit an item that has Welsh text
**Then** the form's labels are Welsh and say the fields are the English text, prefilled
with the English
**And** after confirming, the card still shows the Welsh, tagged "Changed" (publishing
never writes Welsh)

### S17: Every item and every width

**Given** an unplaced item, and a 375px phone
**When** they edit it
**Then** it is edited the same way, and every form and dialog fits without horizontal
scrolling
**And** axe passes and the focus tour reaches each new control, light and dark

### S18: A publish whose result is unknown (STY-023 S12)

**Given** pending changes, and the publish outcome is "unconfirmed"
**When** the page shows it
**Then** a message stays on screen saying the changes may have been published and to
refresh the roadmap before anything else; every change is kept
**And** after Refresh, a change the roadmap already holds is no longer pending, so
"Discard all" never hides a change that was published

## Tests

The store and the session paths (S2, S6, S7, S12, S14) are unit and component tests with
the fake auth client and the in-memory repository; S18 uses a repository double that
answers "unconfirmed". S10, S11, S13, S14 and S8 (the
`beforeunload` listener) also run in Playwright against the fake GIS and Sheets, with
`sheets.writes` asserted; S17 extends the accessibility, focus and structure specs.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q1, Q2, Q11): the editable fields → S1, S5.
- **D2** (owner, 2026-11-11, grilling Q4, Q17, Q18, Q20): pending until one roadmap-wide
  publish; tags, the list marker, Undo and Discard all → S2, S6, S7.
- **D3** (owner, 2026-11-11, grilling Q6, Q26): in place, the same on phones, unplaced
  items included → S1, S17.
- **D4** (owner, 2026-11-11, grilling Q7, Q19, Q21): published roadmaps are editable with
  the nightly note; a confirmation lists the changes; "Publish" or "Save" → S9, S11.
- **D5** (owner, 2026-11-11, grilling Q9, Q10): Edit for everyone, a 403 keeps the
  changes; the leave warning; changes survive expiry, in memory only → S8, S12, S13.
- **D6** (owner, 2026-11-11, grilling Q3): English only; the Welsh shown is unchanged
  → S16.
- **D7** (owner, 2026-11-11, grilling Q29): Disconnect with pending changes offers
  keep, discard or cancel; kept changes wait for the next connection → S14.
- **D8** (owner, 2026-11-11, grilling Q31): the item form's confirm button is not
  "Save" (which names the step on an unpublished roadmap); the copywriter picks the
  label → S2.
- **D9** (owner, 2026-11-11, grilling Q33, Q34): an unconfirmed publish keeps every
  change and asks for a refresh, which drops what the roadmap already holds; values are
  trimmed at their ends on confirm (ADR-012 Options 16, 17) → S4, S18.

## Starting point

Audited at `8479405`:

- Disconnect clears auth-scoped queries through `onDisconnect`
  (`app/composition.ts`) and `renderWithProviders` wires the same; the pending store must
  be outside the query cache, or Disconnect would drop it, kept changes included.
- The session warning's Disconnect is in `SessionWarning` (`AppProviders`), outside the
  routes: S14's confirmation must reach both.
- `groupRoadmapItems` keys items by position; a form open on an item must survive a
  Refresh that reorders items (key by ID where there is one).
- The STY-017 page notice and its dwell are the pattern for S10's confirmation.

## Out of scope

- Resolving conflicts side by side, and a roadmap removed meanwhile: STY-026.
- Adding, deleting or moving items; tags, organisations, details; Welsh: later records.
- Keeping pending changes across a reload (browser storage, drafts): later.
