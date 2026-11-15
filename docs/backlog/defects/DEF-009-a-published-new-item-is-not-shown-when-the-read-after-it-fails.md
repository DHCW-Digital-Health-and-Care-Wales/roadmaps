# DEF-009: A new item that was published is not shown when the read after the publish fails

- **Status**: Proposed — triaged by the owner, 2026-11-15 (D1, D2)
- **Severity**: Medium — the item is public but missing from the page until a Refresh
  succeeds, so a Product Lead may add it again and publish it twice
- **Area**: Features (pending-edit rules)
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Opus — what a publish settles while the page can't read what it
  wrote
- **Delivered**: _(add on delivery)_

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

## Open questions

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

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): Q1 (a). A new item the publish confirmed stays pending, tagged "New" and counted, until a read holds it. The delivery decides what Remove does to such a card, since its item is public.
- **D2** (owner, 2026-11-15, the owner's triage of the live chores and defects): Q2 yes. A confirmed edit stays pending, with its text, until a read holds it.

## Delivery _(add on delivery; as in `story.md`)_
