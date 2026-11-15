# DEF-010: A dialog that publishes changes what it shows once its changes are no longer pending

- **Status**: Done
- **Severity**: Low — cosmetic, mostly for the length of the dialog's closing; nothing
  is written wrongly or lost
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — a dialog keeps what it asked from when it is confirmed
  until it has gone
- **Delivered**: _(PR URL, added once the PR is open)_

## Summary

When "Publish changes", "Save changes" or "Save and publish" succeeds, the changes are
no longer pending while the dialog that asked about them is still on screen. For that
moment the dialog no longer shows what it asked. The publish dialog's list of what
changes empties, under its heading. In it and in "Publish roadmap", if a date was
pending, "Mark as updated today" appears as the dialog goes. A Product Lead who
watches sees the dialog change under them for about a tenth of a second, or longer
when the read that follows the write is slow. Since STY-025 for the list, STY-036 for
the tick box. "Publish roadmap" keeps its own list and wording until it has gone.

The same list empties before the dialog is confirmed when a Refresh, begun before
the dialog opened, finds that the roadmap already holds every pending change: as
after a save whose answer was lost. The publish dialog then stays open, asking to
publish changes it no longer lists, until the Product Lead cancels or confirms it.

## Reproduce

At commit `4979012` on the default branch, in a browser against the built app, with a
probe that records what the dialog holds each time the page changes:

1. On a published roadmap's page, edit an item's description, or set the roadmap's
   "Last updated" date. Choose "Publish changes", then "Publish changes" in the dialog.
2. On a roadmap that isn't published, set its "Last updated" date. Choose "Publish
   roadmap", then "Save and publish".

3. As a Vitest page case, also run at `4979012`: edit an item's phase; have a co-lead
   write the same phase; hold a Refresh (`holdRefresh`); choose "Publish changes";
   let the read go.

**Expected**: each dialog closes showing what it showed when it was confirmed; in 3,
a dialog with nothing left to publish does not go on asking to publish it.
**Actual**: in 1, before the dialog has gone, "What changes" and its one line go; and
for the pending date, "Mark as updated today", which was not offered, appears. In 2,
the tick box appears the same way. From STY-047 on, the publish dialog's heading
stays, over a list with no lines, since a new item is listed there and the guard that
hid the heading went (STY-047 D3). In 3, the dialog stays open with its button
available and no line listed: without "What changes" at `4979012`, under it from
STY-047 on.

## Cause

Not yet verified by a test. `RoadmapPublishing`
(`features/roadmaps/editing/roadmap-publishing.tsx`) gives `PublishDialog` the
roadmap's pending changes as they are now. They are dropped while the dialog is still
open: by any read that holds them (`reconcileOnRead`), the one that follows the write
or one begun before the dialog opened, and by `usePublish`, which settles them
(`settlePublished`) before the dialog is closed. Nothing closes the dialog when no
change is left.
`usePublishedState` keeps `asked`, what its dialog asked, from when it is confirmed
until it has closed, but takes `offersMarkUpdated` from the changes as they are now.

- `rg -n 'changes \?\? NO_CHANGES' src/features/roadmaps/editing/roadmap-publishing.tsx`
  — one site gives a dialog the changes as they are now, at `<PublishDialog>`.
- `rg -n 'offersMarkUpdated' src/features/roadmaps/editing/use-published-state.ts` —
  where it is set, from `changes`, not from `asked`.

## Acceptance criteria

### S1: A dialog that publishes closes showing what it asked

**Given** a publish or save of pending changes that succeeds, from "Publish changes",
"Save changes" or "Save and publish"
**When** its dialog closes
**Then** it lists what it listed when it was confirmed, and offers nothing it did not
offer then, until it has gone

### S2: The publish dialog never asks to publish nothing

**Given** the publish dialog is open and a read finds the roadmap already holds every
pending change
**When** the read lands
**Then** the dialog does not stand over an empty list: what it does instead is Q1, answered by D1

## Open questions _(answered: see Decisions)_

- **Q1**: What should the publish dialog do when a read leaves nothing to publish
  while it is open? _Sam's save lost its answer; Sam refreshes and opens "Save
  changes" before the read is back, and the read shows everything was saved._
  - (a) Close the dialog (recommended): the page then shows nothing pending, which is
    what happened. "Publish roadmap" already drops its list and reads "Publish
    roadmap" again in the same case.
  - (b) Keep it open and say there is nothing left to publish, with Cancel alone.

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): Q1 (a). The publish dialog closes when a read leaves nothing to publish; until then, and as it closes, it shows what it listed and offered when it was confirmed (S1).

## Delivery

The cause was as stated. `RoadmapPublishing` now keeps what its dialog listed when it was
confirmed (`confirmed`, set in `confirm`, dropped when the dialog is next asked) and gives
`PublishDialog` that until it has gone, so neither the list nor the tick box changes as the
write settles. `usePublishedState` takes `offersMarkUpdated` from `asked.changes`, which it
already fixes at confirmation, not from the changes as they are now. Under D1, a read that
leaves nothing pending closes a publish dialog not yet confirmed: `RoadmapPublishing` sets
`confirming` false while no change is left and nothing is confirmed. Its page keys it by
roadmap, so a kept confirmation never meets another roadmap's page (a review finding, with
a test red before it: `A confirmed dialog belongs to its roadmap`).

### Departures

- **No screenshots** (agent): what changes is the dialog's content for about a tenth of a
  second as it closes, or its staying open with an empty list; no settled state differs
  from before. The page tests record the dialog on every change to the page, which a still
  capture cannot.

### Contract for dependents

None; no data-source write changes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-publish-dialog.test.tsx` (`A dialog that publishes closes showing what it asked`: the list, the pending date's tick box on "Publish changes", and on "Save and publish"), red before the fix |
| S2, D1   | the same file (`closes when a read finds every pending change already written`), red before the fix                                                                                                               |
