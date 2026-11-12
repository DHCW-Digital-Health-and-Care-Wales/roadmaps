# STY-026: A co-lead's change is shown, not overwritten

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-005-editing
- **Depends on**: STY-025 (hard)
- **Binding ADRs**: ADR-012 §"Finding what to write", ADR-008, ADR-010
- **Suggested model**: Opus — the decision screen that stands between two people's work
  on a public roadmap

## Summary

Two Product Leads can lead one product. When a co-lead has changed a field that this
Product Lead also changed, publishing stops and shows each such field with their text
beside the co-lead's; they keep theirs or take the co-lead's, field by field, and
publish again. An item the co-lead deleted, or a roadmap removed from the list, is
reported and its changes discarded. Nothing is ever overwritten unseen. This replaces
STY-025's interim "someone else has changed this roadmap" message.

## Scope

`features/` (the conflict review, its effect on the pending store, the removed-roadmap
handling) and `i18n/`. It uses STY-023's outcome as is.

## Acceptance criteria

### S1: Conflicts are shown side by side

**Given** a pending title "B" edited from "A", and a co-lead has since set it to "C"
**When** the Product Lead confirms the publish
**Then** nothing is written, and a review lists every conflicting field by item and field,
"Your change" ("B") beside "Current text" ("C")
**And** each has "Keep mine" and "Use theirs"

### S2: Choosing resolves the conflict

**Given** the review from S1
**When** they choose "Keep mine"
**Then** the pending change stays "B" with its base now "C", so the next publish writes it
**And** "Use theirs" drops that pending change; the page shows "C"

### S3: Publishing again after review

**Given** every conflict resolved
**When** they publish again
**Then** the confirmation lists the remaining changes, and the write proceeds as STY-025
S10
**And** a further co-lead change meanwhile is a new conflict, shown again

### S4: Unrelated co-lead changes are kept

**Given** a co-lead changed a field the Product Lead did not edit
**When** they publish
**Then** there is no conflict, the co-lead's change is not overwritten, and the page shows
it after the publish

### S5: A removed item is reported

**Given** pending changes to an item a co-lead has deleted (its ID is gone), or to an item
without an ID whose position holds neither its loaded text nor that text with the
pending changes applied (Q30, STY-023 S12)
**When** they publish
**Then** nothing is written, a message names the item by its loaded title, its pending
changes are discarded
**And** the remaining changes stay pending, ready to publish again

### S6: A removed roadmap is reported

**Given** pending changes to a roadmap whose row has gone from the roadmap list, at publish
or on a Refresh or items read (STY-021 D11)
**When** that is found
**Then** its pending changes are discarded, and the not-found page says the roadmap was
removed and its unpublished changes could not be kept
**And** the list's "Unpublished changes" marker disappears with it

### S7: Welsh, keyboard and phones

**Given** the review, in Cymraeg, at 375px, light and dark
**When** they work through it by keyboard
**Then** every label is Welsh, the two values are distinguishable without colour, focus
moves into the review and back to the publish control, and axe passes

## Tests

S1–S6 are component tests against the in-memory repository seeded to change between read
and publish; S1, S2, S5 and S6 also run in Playwright with the fake changed mid-test;
S7 extends the accessibility, focus and structure specs.

## Decisions

- **D1** (owner, 2026-11-11, grilling Q15, Q16): field-level conflicts; nothing published
  until each is resolved by "Keep mine" or "Use theirs" side by side → S1–S3.
- **D2** (owner, 2026-11-11, grilling Q16, Q30, Q32): a deleted item, an unmatched item
  without an ID, or a copied ID whose first row no longer holds what was loaded, is
  reported and its changes discarded → S5.
- **D3** (agent, 2026-11-11): "Keep mine" rebases the pending change onto the current
  value, so the next publish's conflict check passes for that field and still catches a
  later co-lead change (S3).

## Out of scope

- Merging two texts within one field: never planned.
- Showing who made the co-lead change: the spreadsheet does not say, through this API.

## Delivery

### What changed

- **The review** (`features/roadmaps/editing/conflict-review.tsx`, `ConflictReview`)
  replaces STY-025's refused notice. It is a warning `DismissibleNotice` with
  `role="alert"` that takes focus when the publish dialog closes on a refusal. Its title is "Someone else has
  changed text you edited", or "Some changes couldn't be kept" when only removed items
  are left. Then come "Nothing was published." ("saved" on an unpublished roadmap) and
  "Choose which text to keep for each, then publish again." Each open conflict is a list
  item:
  - its target, "About this roadmap: Vision" or "<item title>: Title";
  - a description list of "Your change" and "Current text", with "No text" in italics
    for an empty value;
  - "Keep mine" and "Use theirs", each with the target in a `sr-only` span.

  Each removed item has a sentence naming its loaded title, then "Your other changes are
  kept in this tab." The roadmap's conflicts come first, then items by position, each in
  editing order. Dismiss is offered only once no conflict is open. A decision moves focus
  to the next conflict's "Keep mine", then to Publish (`useDecisionFocus`). Once every conflict is decided and
  no item was removed, the review goes away. Publish is disabled while a conflict is open.

- **The rules** (`editing/conflicts.ts`, pure): `openConflicts(conflicts, changes)`
  lists each conflict whose field is still pending with a base other than the co-lead's
  text. The open conflicts are derived and not stored, so Undo, Discard all, an edit
  from the co-lead's text, or a read that finds the field already holding the change
  each close one. `keepMine` re-bases the pending change onto the co-lead's text (D3).
  `takeTheirs` drops it. `discardItems` drops the entries of a refusal's `missingItems`,
  matched as sent, or by ID once a read has moved them.
- **The store** (`pending-changes-store.ts`): a `refused` notice carries `conflicts`
  and `removed` (the loaded titles). Every change to the store drops the conflicts no
  longer open, and then the notice if nothing is left, so a later edit of a decided
  field cannot reopen its conflict against text a co-lead has since replaced. `finishPublish(id, notice | null)` gains the
  `null` case. The new `removeRoadmap(id)` drops the roadmap's changes and notice and
  records it in the snapshot's `removed` set. The new `restoreRoadmaps(ids)` takes a
  listed roadmap back out of `removed`.
- **Publishing** (`use-publish.ts`): before the re-read, a refusal writes the
  co-lead's text it found into the loaded roadmap and items (`withCurrentRoadmapText`,
  `withCurrentItemText`, through `usePublishRoadmapChanges`'s `onRefused`), keeping
  their age, so "Use theirs" shows their text even if that read fails. `refused` then
  discards the removed items' changes and sets the review's notice. `roadmap-not-found` calls `removeRoadmap` and shows no notice,
  because the page says so instead.
- **Reads** (`pending-changes-provider.tsx`): each successful list read restores the
  roadmaps it lists, reconciles them, and calls `removeRoadmap` for any pending roadmap
  it no longer lists (S6, including STY-021 D11's re-read after an items `not-found`).
- **The page** (`roadmap-detail-page.tsx`): the not-found panel says "This roadmap was
  removed from the list, so your changes to it couldn't be kept." for a removed roadmap,
  even while the list still holds it because the read after the publish failed.
  Refresh clears only an `unconfirmed` notice; a review stays until it is decided.
  `PublishOutcomeNotice` lost its `refused` case.
- **Tests**: `createInMemoryRoadmapRepository` returns `InMemoryRoadmapRepository`,
  whose `coLead(edit)` changes the seeded data as a co-lead would. The E2E fake has
  `sheets.coLead(tab, key, header, value | null)` (`tests/e2e/AGENTS.md`).

### Departures

- An item without an ID cannot conflict: STY-023 finds it only by position and exactly
  its loaded content, so a co-lead's change to any of its fields makes it a removed
  item (S5's second case). Only items with IDs, which every item has after its first
  publish, get side-by-side fields.
- Removed items take no decision: their changes are discarded when the refusal arrives,
  and the review names them until it is dismissed.
- S6 discards without a notice on a read: the roadmap's page says what happened, and
  the list's card has gone with its marker. A roadmap restored to the list keeps no changes.

### Scenario evidence

Component tests are in `features/roadmaps/pages/roadmap-detail-page-editing.test.tsx`
(the "A co-lead's changes (STY-026)" block); the rules are in `editing/conflicts.test.ts`
and `editing/pending-changes-store.test.ts`; Playwright tests are in
`tests/e2e/editing.spec.ts` ("a co-lead's change (STY-026)").

- **S1**: "writes nothing and shows each field a co-lead changed, theirs beside yours";
  E2E "is shown beside yours, nothing written, until each field is decided (S1, S2)",
  where `sheets.writes` is unchanged by the refusal; the structure is in
  `edit-conflict-review.aria.yml`.
- **S2**: "keeps mine or uses theirs, field by field, moving focus on to the next and
  then to Publish (S2, S3)"; "shows their text after Use theirs, even if the roadmap
  couldn't be read again"; "does not reopen a decided conflict when the field is edited
  again". The same E2E test publishes after the decisions and reads the spreadsheet.
- **S3**: the S2 test, plus "stops again for a co-lead's change made after Keep mine".
- **S4**: "publishes over a co-lead's change to a field not edited, and shows it after".
- **S5**: "discards the changes to items a co-lead removed, naming each, and keeps the
  rest" covers a deleted item with an ID and an unmatched item without one. The E2E test
  "removing an item discards only the changes to it, naming it (S5)" deletes the row.
- **S6**: "discards the changes to a roadmap removed from the list, found by a publish /
  a Refresh"; "says a roadmap a publish found removed is gone, even if the list couldn't
  be read again"; E2E "removing the roadmap from the list discards its changes and says so",
  including the list's marker.
- **S7**: `accessibility.spec.ts`, "a co-lead's change to review, in Cymraeg on a phone,
  by keyboard", light and dark, at 375px. It checks the Welsh labels and values by role
  (`term`, `definition`), that nothing overflows, axe on `main` (DEF-002), that focus
  goes into the review and then to "Cadw fy un i", and that Enter moves focus back to
  "Cyhoeddi'r newidiadau". `focus-indicator.spec.ts` tours the page with the review
  open, light and dark.

### Welsh for review

Every new `cy` string is machine-assisted and needs a fluent review:
`roadmaps.detail.removedDescription` ("Cafodd y map trywydd hwn ei dynnu o'r rhestr,
felly doedd dim modd cadw eich newidiadau iddo.") and `roadmaps.publish.notice.refused.*`:
"Mae rhywun arall wedi newid testun a olygoch chi", "Doedd dim modd cadw rhai
newidiadau", "Chafodd dim byd ei gyhoeddi." / "…ei gadw.", "Dewiswch pa destun i'w gadw
ar gyfer pob un, yna cyhoeddwch eto." / "…cadwch eto.", "Eich newid", "Testun
presennol", "Dim testun", "Cadw fy un i", "Defnyddio'u testun nhw", "Mae rhywun arall
wedi tynnu neu newid “{{title}}”, felly doedd dim modd cadw eich newidiadau iddo." and
"Mae eich newidiadau eraill wedi'u cadw yn y tab hwn."
