# DEF-003: After a refused publish, "Use theirs" can show older text, and a removed roadmap can come back

- **Status**: Done — delivered in its PR, awaiting merge
- **Severity**: Low — only when a read fails just after a refused publish, during
  another read or after a roadmap was removed
- **Area**: Features/UI
- **Epic**: standalone (follows EPC-005's STY-026)
- **Depends on**: none
- **Binding ADRs**: ADR-012
- **Suggested model**: Opus — a concurrency rule in the query cache
- **Delivered**: https://github.com/collisdigital/roadmaps-editor/pull/34

## Summary

When a publish is refused because a co-lead changed the same text, the page shows the
co-lead's text from the refusal, so "Use theirs" shows what the publish found even if
the read straight after it fails (STY-026). Two edges were left, both found by the
automated review of PR #32 just before it merged:

1. If any read of the roadmap landed while the publish was in progress, the page kept
   that read's text, even when it was older than what the publish found. If the read
   after the publish then failed, "Use theirs" showed the older text.
2. Showing a refusal's text counted as a read of the roadmap list. A roadmap that an
   earlier publish found removed, but that a failed read had left in the list, came back
   as editable, without the "removed" message.

Both need a failed read at the wrong moment. There is no workaround short of Refresh.

## Reproduce

At commit `c14e57a` on the default branch:

**Edge 1**

1. Edit a roadmap's title and publish it.
2. While the publish is in progress, have a Refresh land that still holds the title as
   it was before the edit. Meanwhile a co-lead has already changed the title, so the
   publish is refused.
3. Make the reads after the publish fail.

**Expected**: the title shows the co-lead's text the refusal found.
**Actual**: the title shows the text it had before the edit.

**Edge 2**

1. Edit an item on roadmap A. A co-lead removes roadmap A, and reads of the list start
   failing. Publish: the page says the roadmap is not found.
2. Open roadmap B, edit its vision, have a co-lead change that vision, and publish. The
   publish is refused.
3. Go back to roadmap A.

**Expected**: roadmap A's page says it was removed, so the changes couldn't be kept.
**Actual**: roadmap A shows again as editable, without that message.

## Cause

Verified.

- **Edge 1:** `usePublishRoadmapChanges` skipped the whole refusal patch when the
  cache's `dataUpdatedAt` was later than the publish's start. When a read landed does
  not say whether it is newer than what the publish found.
- **Edge 2:** the patch writes with `setQueryData`, which TanStack Query dispatches as a
  `success` action with `manual: true`. `reconcileOnRead` in
  `pending-changes-provider.tsx` restored every listed roadmap on any list `success`.
- `rg -n 'setQueryData' src --glob '!*.test.*'` finds 1 site:
  `features/roadmaps/hooks/use-publish-roadmap-changes.ts`, the refusal patch.
- `rg -n 'dataUpdatedAt' src --glob '!*.test.*'` finds 2 sites:
  - the patch;
  - `roadmap-detail-page.tsx`'s wait for a Refresh after an unconfirmed publish, which
    compares a read's time with when the Refresh started, and is unaffected.

## Acceptance criteria

### S1: "Use theirs" shows what the publish found over a read that changed nothing

**Given** a refused publish of a roadmap's title, during which a read landed that still
held the title as the cache held it when the publish began
**When** the read after the publish fails
**Then** the cached title is the co-lead's text the refusal found; a field that a read
during the publish did change keeps that read's text

- [x] S1

### S2: Only a real read brings back a removed roadmap

**Given** a roadmap a publish found removed, still in the cached list because reads failed
**When** another roadmap's publish is refused and its text is shown
**Then** the removed roadmap's page still says it was removed

- [x] S2

## Decisions

- **D1** (owner, 2026-11-12, triage of the two Codex comments on PR #32,
  [r4546034428](https://github.com/collisdigital/roadmaps-editor/pull/32#discussion_r4546034428)
  and [r4546034433](https://github.com/collisdigital/roadmaps-editor/pull/32#discussion_r4546034433)):
  fix both, as a new PR.
- **D2** (agent): the patch decides per field, against the cache as it was when the
  publish began.
  - A field that no read during the publish changed takes the refusal's text.
  - A field that a read did change keeps that read's text, which may be newer.
  - Rejected alternatives:
    - Comparing with the edit's base text broke STY-026's case of a co-lead's earlier
      text loaded by a Refresh before the publish.
    - Timestamps cannot order a read against the publish's own read.

## Delivery

- **Departures:**
  - The first red test for S1 compared each cached field with the edit's base text. That
    turned the existing STY-026 test "shows the text the publish found after Use theirs,
    not a co-lead's earlier text" red, so the rule became "unchanged since the publish
    began" (D2).
  - The pure-function tests in `conflicts.test.ts` were rewritten for the new `since`
    argument, after the design changed. The hook and page tests below were red first.
- **Contract for dependents:**
  - `withCurrentRoadmapText(roadmap, conflicts, since)` and
    `withCurrentItemText(items, conflicts, since)` patch only the fields equal to
    `since`, the cached data when the publish began; `undefined` patches nothing.
  - `usePublishRoadmapChanges` takes that snapshot in `onMutate`.
  - `reconcileOnRead` ignores `manual` list updates for restoring removed roadmaps. Any
    future `setQueryData` on the list is therefore not a read.
- **Scenario evidence:**
  - S1:
    - `use-publish-roadmap-changes.test.tsx`, "shows the refusal's text over a read
      during the publish that still holds the text edited from", was red at `c14e57a`
      (`Product A roadmap`).
    - "leaves text read while a refused publish was pending, though reading again fails"
      still passes.
    - `conflicts.test.ts` covers the per-field rule.
    - The STY-026 page test above passes.
  - S2: `roadmap-detail-page-editing.test.tsx`, "keeps a removed roadmap removed when
    another roadmap's refusal shows its text (DEF-003)", was red without the `manual`
    check.
  - Gate: see the PR.
