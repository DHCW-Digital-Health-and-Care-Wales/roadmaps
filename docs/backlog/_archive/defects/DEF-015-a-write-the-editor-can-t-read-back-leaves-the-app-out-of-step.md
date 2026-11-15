# DEF-015: A write the editor can't read back leaves the app out of step with the data source

- **Status**: Done
- **Severity**: Low — rare (a write must land and the read after it fail, or the write's
  answer be lost), but the page can then show text the public site does not
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + Docs
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: DEF-013, DEF-014 (D1: priority, not a code dependency)
- **Binding ADRs**: ADR-012 (Option 16 and the DEF-015 amendments)
- **Suggested model**: Opus — one hold across every write, and a clean removal of
  DEF-009's keep-pending rules
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/115

## Summary

When the editor writes to the data source and then can't read back what it wrote, or
the write's answer is lost, the page carries on from the copy it read before. DEF-009
kept the published changes pending on top of that copy, which reopened two ways to go
wrong: an edit back to the old text is silently dropped, so the page shows text the
public site no longer holds (DEF-011), and a second edit of an item without an ID is
refused as changed by someone else (DEF-012), both since DEF-009. A write whose answer
is lost already asks for a Refresh, but still lets the Product Lead edit and publish
meanwhile. A Refresh that succeeds puts it right.

## Reproduce

At commit `dc492a5` on the default branch:

1. DEF-011's sequence, as a `pending-changes.test.ts` case: `editRoadmap` a roadmap's
   title to "Sent", `keepUnread(sent, sent)`, then `editRoadmap` the title back to the
   roadmap's title as read.

**Expected**: the title stays pending, `{ base: "Sent", value: <title as read> }`.
**Actual**: the title is dropped (run 2026-11-15; the case was removed after).

DEF-012's sequence (an item without an ID, edited and published while reads fail, then
edited again and published) is worked out from the code, not re-run:
[DEF-012](DEF-012-an-item-without-an-id-edited-again-before-a-read-is-reported-changed.md).

## Cause

Verified for DEF-011, suspected for DEF-012. After a write, the editor keeps working on
data it knows may be out of date: `settleReadBack` and `keepUnread`
(`editing/use-publish.ts`, `editing/pending-changes.ts`) re-base the published changes
on what was sent, which the pending-edit rules can't tell from an ordinary edit; a lost
answer (`unconfirmed`) holds only Undo, Discard and a new item's controls
(`awaitingRefresh`, `discardable`, `editing/pending-changes-store.ts`).

Every write the editor makes, each with a read after it or a lost-answer path, which D3
puts under the one rule:

- `rg -n 'onSettled' src/features/roadmaps/hooks --glob '!*.test.*'` — 6 sites in 5
  files: `use-publish-roadmap-changes.ts:77` ("Publish changes"),
  `use-set-roadmap-published.ts:68` ("Publish/Unpublish roadmap", "Save and publish"),
  `use-add-roadmap.ts:51` ("Add a roadmap"), `use-family-changes.ts:35,46` (add and
  change a family), `use-match-roadmap.ts:33` (match a roadmap to the lists).
- `rg -n 'unconfirmed' src --glob '!*.test.*' -l` — the lost-answer outcomes and their
  notices, `add-roadmap-failed.tsx` among them. A family write and a match have none:
  their lost answer is settled by a re-read (`whenHeld`,
  `google-sheets-roadmap-repository.ts`, and the in-memory fake alike), and a failed
  re-read rejects as `network` (STY-029), so the page can't tell "may have been written"
  from "not written". `FamilyOutcome` and `MatchOutcome` gain `unconfirmed`, with the
  adapter, the fake and the repository's contract tests.
- `rg -n 'keepUnread|settleReadBack|publishedNewItems|keepPublished|awaitingRead|awaitingRefresh' src`
  — DEF-009's rules and the lost answer's hold, which D4 replaces.

## Acceptance criteria

### S1: A write that can't be read back holds the app until a Refresh

**Given** a write that landed, and a read after it that failed
**When** the page shows what the write came to
**Then** a dialog over the whole app says what was written and asks for a Refresh; it
can't be dismissed (Escape and a click outside do nothing), focus starts on Refresh and
stays in the dialog, and nothing behind it can be reached, the header included

### S2: A write whose answer is lost holds the app the same way

**Given** a write whose answer is lost ("may have been published", "may have been
added"), on any of the writes in Cause
**When** the page shows what the write came to
**Then** the same dialog holds the app until a Refresh succeeds, in place of today's
notices, "Add a roadmap"'s among them

### S3: The dialog closes only once every read succeeds

**Given** the dialog of S1 or S2
**When** the Product Lead chooses Refresh and any of its reads fails
**Then** the dialog stays and says the Refresh failed; it closes once a Refresh reads
all the write can have changed: for a roadmap's page, what its Refresh reads (the
roadmaps, the roadmap's items, the organisations); for adding a roadmap, the roadmaps;
for a family write, the families and the roadmaps; for a match, the roadmaps

### S4: An ended session offers Connect

**Given** the dialog of S1 or S2, and a session that has ended
**When** the Product Lead looks at the dialog
**Then** it offers Connect in place of Refresh, and reads again once connected

### S5: Once read, the page shows what the data source holds

**Given** the dialog closes after a Refresh
**Then** a publish that landed shows its usual "Changes published"; a lost answer shows
nothing more, the page showing what the read found (what it holds is no longer pending;
what is still pending was not written)

### S6: The published changes stay in view behind the dialog

**Given** the dialog of S1
**Then** the page behind it shows the changes sent as still pending, new items included,
until the read holds them

### S7: DEF-011 and DEF-012's sequences can't be reached

**Given** a publish that landed and a read after it that failed
**When** the Product Lead tries to edit, add, move, remove, undo, discard or publish
before a Refresh succeeds
**Then** none of it can be done, and DEF-009's re-basing (`keepUnread`) and its record of
published new items are gone from the code

## Decisions

- **D1** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, Q6–Q8): fix, after DEF-013
  and DEF-014. Supersedes DEF-011 and DEF-012, which it closes by holding the app,
  rather than fixing the pending-edit rules a future API would remove.
- **D2** (owner, 2026-11-15, grilling round 3 Q1–Q2, Q4; round 4 Q1–Q3): a write the
  editor can't read back locks the whole app in a dialog until a Refresh succeeds, as
  the state is then unknown and a Refresh is cheap; a Refresh that keeps failing means
  an outage, so the hold stays. The dialog offers Connect when the session has ended.
  The published changes stay shown as pending behind it (S6).
- **D3** (owner, 2026-11-15, grilling round 3 Q3; Q7): one rule across the app. A lost
  answer gets the same hold as a failed read, on every write in Cause, "Add a roadmap"
  included, whose dialog notice goes, and a family write and a match, which gain an
  unconfirmed outcome. A write whose answer already put its result on the page (a
  roadmap added or published, a match made) still holds when the read after it fails.
  This replaces the lost-answer notices and holds of STY-025 (S18), STY-035 (S10),
  STY-041 (S7) and STY-046, and the rule of STY-029 and STY-030 that a failed re-read
  shows the network error; each carries a Decisions entry saying so. STY-040's and
  STY-045's repository outcomes are unchanged.
- **D4** (owner, 2026-11-15, grilling Q7): refactor to one clean mechanism, so the
  hold can be deleted whole when a database API replaces Google Sheets (ADR-012's
  DEF-015 amendments). Remove DEF-009's keep-pending rules (D1–D3 there) and the lost
  answer's partial hold; keep DEF-009's evidence that a published item is never added
  twice. The delivery updates the epic's `delivery-notes.md` entry on when a new item's
  Edit, Move and Remove wait.
- **D5** (owner, 2026-11-15, grilling round 4 Q4–Q6): after the dialog closes, a publish
  that landed shows "Changes published", a lost answer nothing more. A browser reload
  ends the hold, as it reads everything again. The dialog's copy is written at delivery
  with the `copywriter` skill.
- **D6** (owner, 2026-11-15, grilling round 3 Q6, round 4): a database API's write
  returns what it wrote, so no read follows it, and is made conditional on a version
  (`ETag` and `If-Match`); recorded in ADR-012's DEF-015 amendments.

## Delivery

The cause was as stated. One hold now covers every write in Cause, in
`features/roadmaps/write-hold/`: a store with one held write at a time, a provider that
draws the dialog over the app (mounted beside the session warning) and the reads it
makes. A write that answered reads back what its page shows (`readBackAfterWrite`), and
holds the app when that read fails or a page that opened meanwhile has read nothing
newer; a lost answer holds at once. The hold's Refresh (`readNow`) reads all the write
can have changed, whether a page shows it or not, and closes the dialog only once every
read answered since it began, reading again if a write joined the hold meanwhile: a
read the session's end cancelled leaves it open, and the button becomes Reconnect.
`FamilyOutcome` and `MatchOutcome` gain `unconfirmed`, settled as `PublishOutcome`'s
is, in the adapter, the fake and the contract tests.

DEF-009's keep-pending rules are gone: `settleReadBack`, `keepUnread`, the record of
published new items, `awaitingRefresh` and the lost answer's notices ("may have been
published", "Add a roadmap"'s "may have been applied"). DEF-009's evidence that a
published new item is never added twice stays: the page drops a new item once a read
holds it (`dropPublishedNewItems`), and the hold's Refresh is that read.

### Departures

- **S4's Connect is "Reconnect"** (agent): the hold reuses the session warning's
  `auth.reconnect` label, as the session that ended was connected before, over a new
  "Connect" string for one button.
- **A lost answer closes the form that wrote it** (agent): "Add a roadmap" and the
  family forms close behind the hold, so what was typed goes, where STY-041 S7 kept it.
  A form left open would be a second dialog under the hold, and after a write that did
  land a resubmit would only be refused as taken; the Refresh shows whether it landed.
- **Focus stays on the hold when the page moves it** (agent): a form a lost family
  write closes gives focus back to its opener behind the dialog; the hold takes it
  back to its button, leaving any dialog opened over it (the session warning) alone.
- **The session warning returns focus to the page's `main`** (agent) when the control
  it opened from has gone, as the hold does; both share `useReturnFocus`
  (`components/layout/use-return-focus.ts`).
- **A read a page starts as the write answers counts** (agent): a page that opened
  meanwhile, as "Add a roadmap" opens the new roadmap's, can start the list's read
  after the invalidation found no page showing it; the read-back waits for that read
  rather than hold the app over a read that succeeded.

### Contract for dependents

- A new write holds through `write-hold/hold-after-write.ts`, the one place that
  decides when: its mutation's `onSettled` calls `useReadBackOrHold()` with
  `{ write, reads }` and `writeAnswer(outcome?.status, "<its landed status>")`, `write`
  naming the copy (`roadmaps.hold.<landed | lost>.<write>`) and `reads` what a Refresh
  must read. A write that reads back on its own, as a publish does, passes what it read
  to `holdAfterWrite`. A page that reads data a write changes adds its read to
  `HoldRead` and `keyOf` (`write-hold/read-back.ts`).
- `useHeldWrite()` is the held write, or `null`; nothing else needs to check it, as
  the dialog is modal over the whole app.
- Tests: `expectWriteHold(title)` and `refreshHold(user, hold)`
  (`features/roadmaps/testing/write-hold.ts`); in Playwright, the hold is the
  `alertdialog` named by its title, and `sheets.failReadsAfterNextWrite` opens it.
- When a database API replaces Google Sheets (ADR-012's DEF-015 amendments), the
  `write-hold/` and the `unconfirmed` outcomes are deleted whole.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, S3   | `roadmap-detail-page-editing.test.tsx` (`holds the app once a publish of %s can't be read back, its changes pending behind, until a Refresh reads them (DEF-015 S1, S3, S5, S6)`), red before the hold; `roadmaps-page-adding.test.tsx` (`holds the app once a roadmap added isn't read back, until a Refresh reads the list (DEF-015 S1, S3)`), `families-page.test.tsx` and `roadmap-detail-page-matching.test.tsx` (`holds the app once … isn't read back, until a Refresh reads it (DEF-015 S1, S3)`); `tests/e2e/adding-an-item.spec.ts` (`a publish the roadmap can't be read back after holds the app until a Refresh reads it (DEF-015 S1, S3)`: Escape, a click outside and Tab, the header and page unreachable); `tests/e2e/accessibility.spec.ts` (`the hold after a publish that couldn't be read back, then a failed Refresh (DEF-015)`)                                                                                                                                    |
| S2       | `roadmap-detail-page-editing.test.tsx` (`holds the app when the answer is lost; Refresh drops what was written, leaving the rest pending (DEF-015 S2, S5)`), `roadmap-detail-page-publishing-roadmap.test.tsx` (`holds the app when the answer is lost, until a Refresh reads the roadmap (S10, DEF-015 S2, S3)`), `roadmaps-page-adding.test.tsx` (`closes, holding the app, when the answer is lost and a check can't settle it (DEF-015 S2)`), `families-page.test.tsx` (`closes the form, holding the app, when the answer is lost (DEF-015 S2)`), `roadmap-detail-page-matching.test.tsx` (`holds the app, saying nothing more, when the answer is lost (DEF-015 S2)`); the `unconfirmed` outcomes in `roadmap-repository-contract.ts` (`is unconfirmed when %s's answer is lost and the re-read fails (DEF-015)`) and `google-sheets-roadmap-repository.test.ts` (`settles a lost answer by a re-read: matched once it finds the row in step, unconfirmed once it fails (DEF-015)`) |
| S3       | `roadmap-detail-page-editing.test.tsx` (`keeps holding when the session ends during Refresh (DEF-015 S3)`); `write-hold/read-back.test.ts`; `write-hold/write-hold-provider.test.tsx` (`reads again before it ends when a write is held during a Refresh (DEF-015 S3)`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| S4       | `roadmap-detail-page-editing.test.tsx` (`offers Reconnect once the session ends, then reads again once connected (DEF-015 S4)`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S5       | the S1 test's "Changes published." once released; the S2 test above, the written edit no longer pending and the other still pending                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S6       | `roadmap-detail-page-adding.test.tsx` (`A published new item the roadmap can't be read back with (DEF-015 S6)`), the page behind the dialog read with `{ hidden: true }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S7       | `pending-changes.test.ts` (`after a publish is read back (DEF-011)`); `roadmap-detail-page-editing.test.tsx` (`publishes an edit made again once the hold has read the last publish, as no conflict with it (DEF-012)`); `rg -n 'keepUnread\|settleReadBack\|publishedNewItems\|keepPublished\|awaitingRead\|awaitingRefresh' src` finds nothing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
