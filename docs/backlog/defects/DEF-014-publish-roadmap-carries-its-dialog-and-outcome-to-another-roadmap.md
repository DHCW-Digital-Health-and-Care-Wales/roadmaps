# DEF-014: "Publish roadmap" carries its dialog and outcome onto another roadmap's page

- **Status**: Proposed — owner, 2026-11-15 (D1); after DEF-013, before DEF-015
- **Severity**: Low — needs two unpublished roadmaps, a slow write and browser history;
  the notice is wrong, nothing is written to the wrong roadmap
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — key the page's view by its roadmap
- **Delivered**: _(add on delivery)_

## Summary

`RoadmapView` (`features/roadmaps/pages/roadmap-detail-page.tsx`) is not keyed by
roadmap, so `usePublishedState` and its outcome notice survive a move between roadmap
pages. Confirm "Publish roadmap" on unpublished roadmap A, and while its write is
pending go to unpublished roadmap B by browser history: the dialog now reads "Publish B?",
and when A's write succeeds, B's page says it is published while B is not.

## Reproduce

At commit `c4ee9a5`, as a page case with held `setRoadmapPublished` (as DEF-010's
`A confirmed dialog belongs to its roadmap` holds a publish):

1. Cache two unpublished roadmaps, A and B. On A, choose "Publish roadmap", then confirm.
2. Before the write ends, go to B with the browser's Back and Forward.
3. Let A's write go.

**Expected**: B's page shows nothing of A's publish.
**Actual**: the dialog is titled for B while A's write runs, and B's page then confirms a
publish that did not happen to it.

## Cause

Suspected, from DEF-010's review reproduction. The page's `RoadmapView` retains
`usePublishedState`'s `open`, `confirmed` and `notice` across a change of roadmap, and
supplies B's title to A's state. DEF-010 keyed `RoadmapPublishing` by roadmap but left
this hook alone.

## Acceptance criteria

### S1: A publish's dialog and notice belong to its roadmap

**Given** a "Publish roadmap" or "Unpublish roadmap" confirmed on one roadmap
**When** the Product Lead reaches another roadmap's page before it ends
**Then** that page shows neither its dialog nor its outcome

## Decisions

- **D1** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, Q3): fix.
- **D2** (owner, 2026-11-15, Q4): the page's whole view (`RoadmapView`) is reset when
  its roadmap changes, not `usePublishedState` alone, so no dialog, notice or other state
  of one roadmap's page reaches another's.
- **D3** (owner, 2026-11-15, Q5): back on roadmap A once its write has ended, the page
  shows no outcome notice for it; the roadmap's published state says what happened.

## Delivery _(add on delivery; as in `story.md`)_
