# DEF-018: Reconnecting on a roadmap's page reads the roadmap list twice

- **Status**: Needs triage — found by STY-057 delivery
- **Severity**: Low — two extra requests to the data source per reconnect; nothing
  shown is wrong
- **Area**: Features/UI
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: none
- **Binding ADRs**: ADR-002, ADR-003
- **Suggested model**: Sonnet — a query-lifecycle trace, with an E2E read count to hold it
- **Delivered**: _(add on delivery)_

## Summary

When a Product Lead reconnects after their session expired while a roadmap's page is
open, the page reads the roadmap list twice and the roadmap's items once. Nothing on
screen is wrong; the second read costs two requests against the data source's quota.
It happens at every reconnect from a roadmap's page, whether from the alert's
Reconnect or from the reconnect dialog (STY-057). No workaround is needed.

## Reproduce

At commit `852097f` on the default branch, in the E2E harness (Google faked):

1. Open `./#/roadmaps/producta` and connect; wait for "Minimal card".
2. Move the clock past the session's end (`sessionMs()`), then press Escape.
3. Note `sheets.reads.length`, then choose the alert's Reconnect and wait 1.5 s.

**Expected**: `metadata`, `values:Roadmaps`, `values:ProductA`: the list once, the
items once.
**Actual**: `metadata`, `metadata`, `values:Roadmaps`, `values:Roadmaps`,
`values:ProductA`. STY-057's branch reads the same; its Refresh adds no read to them
(`tests/e2e/reconnect.spec.ts`).

## Cause

Suspected, not verified. The list's query (`roadmapKeys.list()`) has several observers
on the page (`useRoadmap`, `useRoadmaps` through the pending-edit store and the items
area), and the session's end marks it stale (`invalidateAuthScopedQueriesOnSessionEnd`).
Something starts a second fetch of it as the session resumes, rather than joining the
first: an observer re-enabled after the first fetch began with `cancelRefetch`, or an
invalidation that refetches.

- `rg -n 'roadmapKeys.list\(\)|useRoadmaps\(|useRoadmap\(' src/features --glob '!*.test.*'`

## Acceptance criteria

### S1: Reconnecting reads each thing once

**Given** a roadmap's page open when the session expired
**When** the Product Lead reconnects
**Then** the roadmap list is read once and the roadmap's items once
