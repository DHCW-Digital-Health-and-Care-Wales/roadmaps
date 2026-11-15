# DEF-010: The publish dialog changes what it shows while it closes after a publish

- **Status**: Needs triage — found by STY-047's delivery, which removed the guard
  that hid the empty list's heading
- **Severity**: Low — cosmetic, for the length of the dialog's closing; nothing is
  written wrongly or lost
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — one dialog keeps what it asked while it closes, as its
  neighbour does
- **Delivered**: _(add on delivery)_

## Summary

When "Publish changes" or "Save changes" succeeds, the changes are no longer pending
while the dialog that asked about them is still closing. For that moment the dialog
no longer shows what it asked: its list of what changes empties, and if a date was
pending, "Mark as updated today" appears as the dialog goes. A Product Lead who
watches sees the dialog change under them for about a tenth of a second. Since
STY-025 for the list and STY-036 for the tick box. "Publish roadmap" does not do
this: its dialog keeps what it asked until it has gone.

## Reproduce

At commit `4979012` on the default branch, in a browser against the built app, with a
probe that records what the dialog holds each time the page changes:

1. On a published roadmap's page, edit an item's description, or set the roadmap's
   "Last updated" date.
2. Choose "Publish changes", then "Publish changes" in the dialog.

**Expected**: the dialog closes showing what it showed when it opened.
**Actual**: before the dialog has gone, "What changes" and its one line go; and for
the pending date, "Mark as updated today", which was not offered, appears. From
STY-047 on, the heading stays, over a list with no lines, since a new item is listed
there and the guard that hid the heading went (STY-047 D3).

## Cause

Not yet verified by a test. `RoadmapPublishing`
(`features/roadmaps/editing/roadmap-publishing.tsx`) gives `PublishDialog` the
roadmap's pending changes as they are now, and `usePublish` settles them
(`settlePublished`) before the dialog is closed. `usePublishedState` instead keeps
`asked`, what its dialog asked, fixed from when it opens until it has closed.

- `rg -n 'changes \?\? NO_CHANGES' src/features/roadmaps/editing` — one site gives a
  dialog the changes as they are now: `roadmap-publishing.tsx`, at `<PublishDialog>`.

## Acceptance criteria

### S1: The publish dialog closes showing what it asked

**Given** a publish or save of pending changes that succeeds
**When** its dialog closes
**Then** it lists what it listed when it opened, and offers nothing it did not offer
then, until it has gone

## Open questions

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
