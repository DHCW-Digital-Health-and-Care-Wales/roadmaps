# EPC-022: Monorepo and backend foundation — an API and its database beside the Sheets editor

- **Status**: Needs grilling — placeholder: stories are split once the API stack, identity
  and authorisation ADRs exist
- **Progress**: 0 of 0 terminal; next selectable: none; blocked on: the owner decisions
  below
- **Binding ADRs**: ADR-015, ADR-002

## Summary

The editor reads and writes one Google spreadsheet, a temporary data source (ADR-002).
This epic makes the repository a monorepo and establishes the backend that will replace
it: a Python FastAPI service over the PostgreSQL 18 database ADR-015 designs, scoped by
tenant, keeping every version, with private scratch, shared drafts, publications,
people, roles and assignments. Google Sheets stays the deployed data source throughout,
so Product Leads see no change; the API is developed, tested and run locally beside it,
and the editor can be built against either data source, as the composition root
chooses (ADR-002). The editor's new editing model (scratch, draft, permissions), the
switch of the deployed editor to the API, and the infrastructure as code for its
environments are later epics.

## Owner decisions waiting

- The API stack ADR — Python, FastAPI, the ORM, the migration tool and the Python
  tooling, which the owner is writing separately
- An identity ADR (successor to ADR-003) — sign-in with both Microsoft and Google (owner,
  2026-11-20), linking identities as ADR-015 Option 11 holds them
- An authorisation ADR — the permission catalogue, the shipped roles and how the API
  checks them and who assigns leads (ADR-015 Options 16, 17, 19–23)

## Findings

Greenfield for the backend; the precedent is the editor's own seams, audited at
`93b12d4` on 2026-11-20:

- `RoadmapRepository` (`src/domain/roadmap/roadmap-repository.ts`) is the editor's only
  view of its data, and `composeApp` (`src/app/composition.ts`) the only place that
  picks an adapter, so a second adapter needs no change to features.
- The shared contract suite (`src/domain/roadmap/testing/`) is the parity check an API
  adapter runs.
- `docs/operations/replacing-google-sheets.md` is the runbook for the adapter.
- Today's repository has no call for a scratch, a draft, a discard, people, roles or
  assignments: the adapter maps today's calls onto the API, and the new calls arrive
  with the editor's new editing model.

## Design

Owner answers of 2026-11-20 (ADR-015 grilling, rounds 1–7):

1. **Layout**: `apps/editor` (today's app, moved) and `apps/api`. The move is the
   epic's first story and one mechanical change, with docs, skills, configs, worktree
   scripts and CI paths updated together; it was chosen over keeping the editor at the
   root.
2. **The editor's API adapter and a build-time data source switch are in this epic**,
   running the shared contract suite against the API; Sheets stays the deployed source.
3. **The database is ADR-015**, delivered with its enforcement suite (ADR-015 _What
   enforces this_).
4. **Live presence and real-time updates are out of scope**; saves and conflicts carry
   correctness.
5. **The adapter publishes through the scratch**: a scratch write, then "save and
   publish" (ADR-015 Option 28), so the scratch is exercised from the first delivery.
6. **Scratch expiry**: after 30 days without activity, with a warning at 23 (ADR-015
   Option 24), run by a scheduled API job (Option 29).

_The rest is written once the follow-on ADRs exist._

## Shared assumptions and contracts

_To be written when the stories are split._

## Stories

| ID  | Story | Area | Depends on | State |
| --- | ----- | ---- | ---------- | ----- |

_None yet. Candidate scope, to split later: the monorepo move and its CI; the API
service skeleton with health checks and local running; the first schema and its
enforcement suite; people, memberships, roles and assignments; the scratch, draft,
save, publish and restore path; the API's endpoints for the roadmap repository's
calls and for the public site's read; the import of the spreadsheet's data; and the
editor's API adapter with its build-time switch._

## Sequencing

_To be written when the stories are split._ The monorepo move comes first and stays
one change; the schema precedes the endpoints that use it.

## Out of scope

- The editor's new editing model: a server scratch, a shared draft, permissions and
  assignments in the interface (ADR-015 _Consequences_). A later epic, once this one's
  API exists.
- Switching the deployed editor to the API, retiring the Sheets adapter, and moving
  the public site to the API's read: after an environment exists.
- Infrastructure as code and provisioned environments: a later epic, handed a service
  that runs locally and in CI.
- Live presence and real-time updates.

## Defects

None.

## Related

- [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-002](../../adr/ADR-002-layered-architecture-and-repository-boundary.md)
- [Replacing Google Sheets](../../operations/replacing-google-sheets.md)
- [STY-048](../EPC-011-adding-roadmaps-and-items/STY-048-remove-a-roadmap.md) —
  removing a roadmap, bound by ADR-015 Option 8
- [CHO-005](../chores/CHO-005-send-last-updated-to-the-api-in-utc.md)
