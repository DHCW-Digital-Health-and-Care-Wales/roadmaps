# DEF-018: Reconnecting on a roadmap's page reads the roadmap list twice

- **Status**: Needs grilling — cause found by DEF-020+018 delivery; the owner chooses (D2)
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

**Verified, at `a6a9683`** (agent, DEF-020+018 delivery): the suspicion above is wrong.
With a subscription on the query cache, a reconnect from the alert starts one fetch each
of the list, the items and the organisations (which makes no request: its list is
built in, ADR-014): no observer restarts the list's read, and nothing invalidates it.
The two list reads in the Actual are not two fetches of one query. A roadmap's items are
read by `listRoadmapItems`, which re-reads the tab list and the roadmap index on every
call, then the roadmap's tab, so on the example spreadsheet a roadmap's page is five
requests: `metadata`, `values:Roadmaps` for the list, then `metadata`, `values:Roadmaps`,
`values:ProductA` for the items (ADR-011, Option 3, which rejected remembering each id's
tab). A spreadsheet with `Families` and `Categories` tabs adds a read of each to every
index read, so two more for the list and two more for the items. A first load of the
page, with no session ending, reads the same five. The Expected is therefore not what
the repository does at any load.

## Acceptance criteria

### S1: Reconnecting reads each thing once

**Given** a roadmap's page open when the session expired
**When** the Product Lead reconnects
**Then** the roadmap list is read once and the roadmap's items once

## Open questions

- Is the doubled index read accepted (Won't fix: the requests are the price of finding
  a renamed tab at once), or is it worth a chore to read a roadmap's items from the
  list's own index read, which needs a successor to ADR-011 Option 3 and a repository
  change?

## Decisions

- **D1** (owner, 2026-11-19, triage in the orchestrator's session): fix, low priority,
  timeboxed to 60 minutes of investigation; if the cause is not verified and a fix in
  hand by then, stop and hand back the findings for the owner to decide.
- **D2** (agent, 2026-11-19, DEF-020+018 delivery): no change made. The doubled reads are
  every load's, by ADR-011 Option 3, not a reconnect fault, so S1 holds for the queries
  and fails for the requests. Remaining, for the owner: the Open question above; the
  status is Needs grilling, not Needs triage, since the owner's triage (D1) is done and
  a product choice is what blocks it. An E2E count of a page's reads is left unwritten
  until one is chosen, since either one fixes what it would hold. The line in
  `tests/e2e/AGENTS.md` that a roadmap's items "add `values:<its tab>`" is the likely
  source of the wrong Expected: the items add the tab list and the index read too; left
  for a retrospective, not edited here.
