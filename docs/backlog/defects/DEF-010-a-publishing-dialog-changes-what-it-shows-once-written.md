# DEF-010: A dialog that publishes changes what it shows once its changes are written

- **Status**: Needs triage — found by STY-047's delivery, which removed the guard
  that hid the empty list's heading
- **Severity**: Low — cosmetic, for the length of the dialog's closing; nothing is
  written wrongly or lost
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — a dialog keeps what it asked from when it is confirmed
  until it has gone
- **Delivered**: _(add on delivery)_

## Summary

When "Publish changes", "Save changes" or "Save and publish" succeeds, the changes are
no longer pending while the dialog that asked about them is still on screen. For that
moment the dialog no longer shows what it asked. The publish dialog's list of what
changes empties, under its heading. In it and in "Publish roadmap", if a date was
pending, "Mark as updated today" appears as the dialog goes. A Product Lead who
watches sees the dialog change under them for about a tenth of a second, or longer
when the read that follows the write is slow. Since STY-025 for the list, STY-036 for
the tick box. "Publish roadmap" keeps its own list and wording until it has gone.

## Reproduce

At commit `4979012` on the default branch, in a browser against the built app, with a
probe that records what the dialog holds each time the page changes:

1. On a published roadmap's page, edit an item's description, or set the roadmap's
   "Last updated" date. Choose "Publish changes", then "Publish changes" in the dialog.
2. On a roadmap that isn't published, set its "Last updated" date. Choose "Publish
   roadmap", then "Save and publish".

**Expected**: each dialog closes showing what it showed when it was confirmed.
**Actual**: in 1, before the dialog has gone, "What changes" and its one line go; and
for the pending date, "Mark as updated today", which was not offered, appears. In 2,
the tick box appears the same way. From STY-047 on, the publish dialog's heading
stays, over a list with no lines, since a new item is listed there and the guard that
hid the heading went (STY-047 D3).

## Cause

Not yet verified by a test. `RoadmapPublishing`
(`features/roadmaps/editing/roadmap-publishing.tsx`) gives `PublishDialog` the
roadmap's pending changes as they are now. They are dropped while the dialog is still
open: by the read that follows the write, when it holds them (`reconcileOnRead`), and
by `usePublish`, which settles them (`settlePublished`) before the dialog is closed.
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

## Open questions

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
