# STY-025: A Product Lead edits a roadmap and publishes it

- **Status**: Done — delivered in its PR, which awaits the owner's merge
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

## Delivery

### Departures

- S14's "the start page says changes are waiting" is on the start page only, as written;
  the roadmap pages, which a disconnected Product Lead reaches by link, show the usual
  connect prompt.
- S15 and a roadmap removed meanwhile (`roadmap-not-found`) both keep every change: the
  first says someone else has changed the roadmap, the second gives the "no longer listed"
  failure. STY-026 replaces both.
- An item without an ID is found again, as ADR-012 says, by its position and exactly its
  loaded content. If a co-lead changes another field of such an item while an edit is
  pending, the edit no longer matches a card: it stays pending, shows nowhere, and a
  publish reports the item as removed (STY-026 shows it). The item's open form closes
  when a read puts different content at its position.

### Contract for STY-026

- **Store** (`features/roadmaps/editing/`): `createPendingChangesStore()`
  (`pending-changes-store.ts`), one per app, made by `PendingChangesProvider`, which
  `AppProviders` mounts inside `AuthProvider` and outside the routes, so Disconnect's
  query clearing never touches it. Its snapshot is `{ changes, publishing, notices }`:
  `changes` maps a roadmap id to STY-023's `RoadmapChanges` (only roadmaps with a pending
  field), `publishing` holds roadmaps whose publish is under way, and `notices` holds
  each roadmap's last `PublishNotice` (`published`, `unconfirmed`, `refused`, or `failed`
  with an `AppErrorKind`, each with `action: "publish" | "save"`). Read it with
  `usePendingChanges()` or `useRoadmapChanges(roadmapId)`; write through `update(id,
edit)` with the pure functions of `pending-changes.ts`.
- **Rules** (`pending-changes.ts`): each `FieldChange` keeps `base`, the text the form
  opened on (not the text read when Done is pressed), which a later Refresh never moves;
  a form's Done sends only the fields its Product Lead changed, so a co-lead's change to
  another field, read while the form was open, is never written back. An edit equal to
  its base or to the current text is no edit. `matchItemChanges(items, changes)` finds each entry's item
  with STY-023's `findEditedItem`; an entry that matches nothing stays pending and shows
  nowhere (STY-026 shows it). `reconcileRoadmap`/`reconcileItems` run after every
  successful list or items read and drop each field the data source already holds; an
  entry keeps the item content first loaded (only its ID may be filled in), so a copied
  row's ID never moves the check to the copy. `settlePublished(changes, sent)` drops what
  a publish sent, keeping edits made meanwhile, each re-based on the text sent.
  `changedParts(changes)` lists what changes, roadmap first, then items by position.
- **Publishing**: `usePublish(roadmap)` sends the roadmap's changes once
  (`startPublish` refuses a second while one is under way; the mutation never retries)
  and records the outcome as the roadmap's notice; `publishAction(roadmap)` (in the
  store module) says whether that is "publish" or "save". `RoadmapPublishing({ roadmap })`
  shows the bar, `PublishDialog`, `DiscardDialog` and `PublishOutcomeNotice`; a
  `refused` notice is where STY-026's side-by-side review starts. Publishing, the
  dialog's confirm included, waits while the session is not connected. Refresh clears
  an `unconfirmed` or `refused` notice only once both reads succeed.
- **Disconnect**: `useRequestDisconnect()` (`features/auth/disconnect-request.ts`) is
  what `AuthButton` and `SessionWarning` call; the editing provider supplies it and asks
  keep / discard / cancel while any roadmap has a change; without a provider it
  disconnects at once.
- **Leave warning**: a `beforeunload` listener, registered only while any change is
  pending.
- **Copy**: `common.cancel`, `common.dismiss` (was `auth.notice.dismiss`, now shared by
  every dismissible notice through `DismissibleNotice`), `roadmaps.edit.*`, `roadmaps.publish.*` (the list card's
  marker is `roadmaps.publish.marker.*`), `roadmaps.disconnect.*` and
  `roadmaps.waiting.*`.

### Scenario evidence

Component tests are in `features/roadmaps/pages/roadmap-detail-page-editing.test.tsx`
(32), with the rules in `editing/pending-changes.test.ts` and
`editing/pending-changes-store.test.ts`; Playwright tests are in
`tests/e2e/editing.spec.ts`.

- **S1–S4**: "turns an item's card into a form…", "keeps a confirmed change pending…",
  "requires a title…"; the form's structure is in `edit-item-form-error.aria.yml`.
- **S5**: "edits the roadmap's five fields…" and "tags only the block…";
  `edit-roadmap-form.aria.yml`.
- **S6**: "undoes one item's changes, and discards all only after asking".
- **S7**: "keeps them across pages and Refresh, marking the roadmap's card", "leaves
  alone a co-lead's change, read while a form was open…", "closes the form of an item
  without an ID…"; the reconcile tests, including a copied ID that became the first row.
- **S8**: "asks only while changes are pending" (component and E2E, through
  `page.close({ runBeforeUnload: true })`).
- **S9–S11**: component tests for the dialog, the busy controls and Save; E2E S10 and S11
  assert one `sheets.writes` entry and the spreadsheet's new cell.
- **S12**: "keeps them, and holds Publish, while the session has expired", "cannot
  publish from an open dialog once the session has expired", "expires the
  session on a 401…", "keeps them when a renewal…".
- **S13**: E2E with a 403 (the alert is focused, nothing written, the change kept), plus
  component tests for each failure.
- **S14**: four component tests and the E2E keep-then-connect path;
  `edit-disconnect-question.aria.yml`, `edit-start-waiting.aria.yml`.
- **S15**: "says someone else has changed the roadmap when the write is refused".
- **S16**: "labels the fields as the English in Welsh, and shows the Welsh tagged".
- **S17**: "edits an unplaced item like any other"; E2E at 375px (no horizontal
  overflow), plus `accessibility.spec.ts` and `focus-indicator.spec.ts`, light and dark.
- **S18**: "says an unconfirmed write may have landed; Refresh clears the notice and
  drops what was written", "keeps saying a write may have landed while Refresh cannot
  read the roadmap".

### Welsh for review

Every new `cy` string is machine-assisted and needs a fluent review: `common.cancel`
("Canslo"), `common.dismiss` ("Cau'r neges"), `roadmaps.edit.*` (for example "Golygu", "Gorffen", "Dadwneud y
newidiadau", "Wedi newid", and field labels ending "(Saesneg)"), `roadmaps.publish.*`
("Cyhoeddi'r newidiadau", "Cadw'r newidiadau", "Gwaredu'r cyfan" and the notices),
`roadmaps.disconnect.*` ("Cadw eich newidiadau?") and `roadmaps.waiting.*`.
