# DEF-009: A new item that was published is not shown when the read after the publish fails

- **Status**: Done
- **Severity**: Medium — the item is public but missing from the page until a Refresh
  succeeds, so a Product Lead may add it again and publish it twice
- **Area**: Features (pending-edit rules)
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Opus — what a publish settles while the page can't read what it
  wrote
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/97

## Summary

A Product Lead adds an item and publishes. The write lands and is confirmed, but the
read of the roadmap that follows it fails, as when the connection drops between the
two. The page says the changes were published and that the items couldn't be
refreshed, and the new item's card is gone: it is no longer pending, and the items as
last read don't hold it. It shows again after a Refresh that succeeds. Until then the
Product Lead sees a roadmap without the item they just published, and may add it
again. An edit behaves alike: the page shows the item's old text, no longer tagged,
until the next read. Since STY-045 for a new item, whose card STY-046 made visible;
since STY-025 for an edit. Worked out from the code, not seen in a browser.

## Reproduce

As a Vitest page case built on `roadmap-detail-page-adding.test.tsx`:

1. Render a roadmap's page and add an item (`addItem`).
2. Make the next read of the roadmap's items fail (`listRoadmapItems` rejecting once
   with a `network` error) while `publishRoadmapChanges` succeeds.
3. Choose "Publish changes" and confirm.

**Expected**: the page still shows the item, in some way that says it was published.
**Actual**: "Changes published" shows, with the alert that the items couldn't be
refreshed, and no card for the item.

## Cause

Not yet verified by a test. `usePublish` (`features/roadmaps/editing/use-publish.ts`)
applies `settlePublished` once the publish answers `published`, which drops each new
item that was sent. The item's card is then drawn only from the items read, and the
read that `usePublishRoadmapChanges` makes after the write settles the mutation
whether it succeeds or fails, leaving the items as cached before the publish.

- `rg -n 'settlePublished' src --glob '!*.test.*'` — its two callers, `use-publish.ts`
  and `use-published-state.ts`.

## Acceptance criteria

### S1: A published new item stays on the page while the roadmap can't be read again

**Given** a publish of a new item that is confirmed, and a read after it that fails
**When** the page shows what the publish came to
**Then** the item is still shown, and nothing invites the Product Lead to add it again

### S2: A published edit keeps its new text while the roadmap can't be read again

**Given** a publish of an edit to an item that is confirmed, and a read after it that fails
**When** the page shows what the publish came to
**Then** the item shows the edited text, still pending, until a read holds it (D2)

### S3: A published new item can't be removed until a read holds it

**Given** a new item S1 keeps pending after a confirmed publish
**When** the Product Lead looks at its card
**Then** the card offers no Remove until a read holds the item (D3)

## Open questions _(answered: see Decisions)_

- **Q1**: What should the page show for a new item it knows was published but can't
  read back? _Sam publishes "Choose a clinic closer to home"; the write lands and the
  connection drops before the roadmap is read again._
  - (a) Keep the new item pending until a read holds it (recommended): its card stays,
    tagged "New" and counted, with the alert that the items couldn't be refreshed. A
    publish never writes an item twice (STY-045 D8), so publishing again is safe, but
    Remove would then drop a card whose item is public.
  - (b) Show it as published from what was sent, without a read: the card loses "New"
    at once. The page then shows an item the last read does not hold.
  - (c) Leave it, and say in the alert that what was published shows after Refresh.
- **Q2**: Should an edit follow the same answer? Its old text shows, untagged, until
  the next read.
- **Q3**: What does Remove do on a card D1 keeps pending, whose item is already public?
  Removing a published item is undecided (STY-049). Recommended: no Remove on that card
  until a read holds the item.

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): Q1 (a). A new item the publish confirmed stays pending, tagged "New" and counted, until a read holds it.
- **D2** (owner, 2026-11-15, the owner's triage of the live chores and defects): Q2 yes. A confirmed edit stays pending, with its text, until a read holds it.
- **D3** (owner, 2026-11-15, Q3): (a). A card D1 keeps pending offers no Remove until a read holds its item; removing a published item stays STY-049's.
- **D4** (owner, 2026-11-15, grilling of DEF-011 to DEF-014): D1–D3 are replaced by
  [DEF-015](DEF-015-a-write-the-editor-can-t-read-back-leaves-the-app-out-of-step.md):
  a write the editor can't read back holds the whole app in a dialog until a Refresh
  succeeds, the changes sent still shown pending behind it, so nothing can be added
  twice, edited or removed meanwhile. DEF-015 removes the keep-pending rules built here.

## Delivery

The cause was as stated, and it reached an edit and the roadmap's own text too: both
`usePublish` and "Save and publish" (`usePublishedState`) settled every change sent once
the write was confirmed, whatever the reads after it came to. They now settle, by
`settleReadBack` (`editing/use-publish.ts`), only what a read after the write
read back (the `readBack` that `usePublishRoadmapChanges` and `useSetRoadmapPublished`
return, `hooks/use-publish-roadmap-changes.ts`): the items' changes
and new items while the items were read, the roadmap's own text while the list was. A
read counts only if it answered since the write did, so one cancelled as the session
ends, which puts back what was cached before, is no read back, even when a read landed
during the write.
What a failed read would show stays pending, as any pending change does, until a read
holds it, which the pending-edit store's reconcile on read already drops.

### Departures

- **S3 holds Edit and Move as well as Remove, and "Discard all"** (agent): a new item
  kept by D1 is in the data source with its ID, so a change to it would be lost as
  the item read takes its place, and "Discard all" would drop it as Remove would. Both
  follow the rule a publish whose answer was lost already has (STY-046 S7). A new item
  added after the publish keeps its controls.
- **The roadmap's own text follows D2** (agent): a confirmed edit of it stays pending
  while the roadmap list can't be read back, as an item's does while the items can't.
- **An edit kept by D2 keeps "Undo changes"**: undoing it shows the text as last read
  until the next read, which holds the published text; nothing is published twice.
- **An item without an ID keeps the content it was loaded with** (agent), so its card
  finds it in the items last read and S2 shows its edit; edited again before a read,
  it is reported changed: [DEF-012](DEF-012-an-item-without-an-id-edited-again-before-a-read-is-reported-changed.md).
- **An edit back to the text last read is dropped** while a kept edit waits for a read:
  [DEF-011](DEF-011-an-edit-back-to-the-text-last-read-is-dropped-before-a-read-holds-a-publish.md).
- **Before screenshots were captured after the tests were written**, from a build of
  the base commit (`4ff0fb0`), not from the checkout before the first edit.

### Contract for dependents

- `PendingChangesSnapshot.publishedNewItems`: each roadmap's new items, by ID, that a
  confirmed publish wrote and no read has held since; pruned to those still pending.
  The store's `keepPublished(roadmapId, ids)` records them.
- `discardable(snapshot, roadmapId, newItemId?)`: with an ID, whether that new item can
  change or go; without, whether all changes can. DEF-010 touches the same
  `settleReadBack` callers.
- E2E: `FakeSheets.failReadsAfterNextWrite(status)` fails every read after the next
  `batchUpdate` until the function it returns is called.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, S3   | `roadmap-detail-page-adding.test.tsx` (`A published new item the roadmap can't be read back with (DEF-009)`, four tests, red before the fix); `tests/e2e/adding-an-item.spec.ts` (`a published new item stays, pending and held…`) |
| S1       | `roadmap-detail-page-adding.test.tsx` (`stays on the page when the session ends while the read after the publish is under way`), a review fix, red before it                                                                       |
| S1       | `roadmap-detail-page-adding.test.tsx` (`… while the read after “Save and publish” is under way`), written after the fix, red when a cancelled read counted as read back                                                            |
| S1       | `use-publish-roadmap-changes.test.tsx` (`tells the read after the write was not read back when the session ends during it, …`), a review fix, red before it                                                                        |
| S2       | `roadmap-detail-page-editing.test.tsx` (`publishes an edit made again before a read holds the last publish, …`) and `pending-changes.test.ts` (`keepUnread (DEF-009 D2)`), a review fix, red before it                             |
| S2       | `roadmap-detail-page-editing.test.tsx` (`keeps a published edit's text, pending, … (DEF-009 S2)`, and the roadmap's own text alike), red before the fix                                                                            |

The Playwright test followed the working fix, so it was not seen red; the Vitest tests
carry the red-first evidence.
