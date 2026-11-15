# DEF-014: "Publish roadmap" carries its dialog and outcome onto another roadmap's page

- **Status**: Done
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

### S2: "Publish roadmap" stays unavailable while its roadmap's write runs

**Given** a "Publish roadmap" or "Unpublish roadmap" confirmed on roadmap A, with no
pending edits sent
**When** the Product Lead leaves A's page by any route and comes back before the write
ends
**Then** A's "Publish roadmap" is unavailable until the write ends, as STY-035 has it
while a write of the roadmap is under way (D4)

## Decisions

- **D1** (owner, 2026-11-15, grilling of DEF-011 to DEF-014, Q3): fix.
- **D2** (owner, 2026-11-15, Q4): the page's whole view (`RoadmapView`) is reset when
  its roadmap changes, not `usePublishedState` alone, so no dialog, notice or other state
  of one roadmap's page reaches another's.
- **D3** (owner, 2026-11-15, Q5): back on roadmap A once its write has ended, the page
  shows no outcome the hook held for it; the roadmap's published state says what
  happened, except after a lost answer with no edits sent, which is left without a
  notice until DEF-015's hold covers it. An outcome the pending-edit store keeps for A (a refusal and its conflict
  review) still shows there.
- **D4** (agent, 2026-11-15, review of the triage): D2 must not drop a write under
  way. Whether a write of the roadmap runs is read from where it outlives the page (a
  mutation key per roadmap, or the store), not from the hook's own `isPending`, which
  D2's reset would clear; this also closes the same gap by A, home, A, which the page
  has today. S2 holds it; it keeps STY-035's rule rather than changing it.

## Delivery

The cause was as stated. `RoadmapDetail` now renders `RoadmapView` with `key={roadmap.id}`
(D2), so `usePublishedState`'s `open`, `confirmed` and `notice` and every other state of
the page start afresh on another roadmap; `RoadmapPublishing`'s own key, DEF-010's patch
for the same cause, is dropped as redundant. For D4 the write's mutation carries a key
per roadmap (`["set-roadmap-published", id]`) and `useSetRoadmapPublished` returns
`writing`, read with `useIsMutating` from the query cache, where a write outlives the page
that started it; `usePublishedState` takes `pending` from it in place of the mutation's
own `isPending`.

### Departures

- **No screenshots** (agent): visible UI is unchanged in normal use; only a state that
  used to leak between roadmaps no longer does.

### Contract for dependents

A roadmap page's state is one roadmap's: a new piece of page state needs no reset on
a change of roadmap. DEF-015's hold reads a write's progress from the cache, not from
the hook's `isPending`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-publish-dialog.test.tsx`, "shows another roadmap's page neither A's dialog nor A's outcome", written first: red (B's page held A's open dialog), green with the key                                                                                                                 |
| S2       | Same file, "keeps Publish roadmap unavailable on A until its write ends (S2)". Red with `pending` taken from the mutation's `isPending` again (a scratch edit, reverted): A's action was available after Back and Forward; green with `writing`. D3 holds by the key: the test ends with no outcome on A |
