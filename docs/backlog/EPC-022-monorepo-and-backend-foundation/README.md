# EPC-022: Monorepo and backend foundation — an API and its database beside the Sheets editor

- **Status**: Needs grilling — the repository and API foundation is split (STY-085–093);
  the schema and endpoint stories wait on the identity and authorisation ADRs
- **Progress**: 0 of 9 terminal; next selectable: none; blocked on: accepting ADR-016 and
  ADR-017
- **Binding ADRs**: ADR-015, ADR-016, ADR-017, ADR-002

## Summary

The editor reads and writes one Google spreadsheet, a temporary data source (ADR-002).
This epic makes the repository a monorepo, renamed `roadmaps`, that also takes in the
public site, and establishes the backend that will replace it: a Python FastAPI service over the PostgreSQL 18 database ADR-015 designs, scoped by
tenant, keeping every version, with private scratch, shared drafts, publications,
people, roles and assignments. Google Sheets stays the deployed data source throughout,
so Product Leads see no change; the API is developed, tested and run locally beside it,
and the editor can be built against either data source, as the composition root
chooses (ADR-002). The editor's new editing model (scratch, draft, permissions), the
switch of the deployed editor to the API, and the infrastructure as code for its
environments are later epics.

## Owner decisions waiting

- [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md)
  — Proposed: accept the workspace, the rename and the public site's move
- [ADR-017](../../adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md)
  — Proposed: accept the API stack
- An identity ADR (successor to ADR-003) — sign-in with both Microsoft and Google (owner,
  2026-11-20), linking identities as ADR-015 Option 11 holds them; ADR-016 adds tokens
  in memory and a custom domain for the editor before it switches to the API
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

For the repository and the public site, audited at `5d8c58d` (this repository) and
`6128b5f` (`product-roadmaps`) on 2026-11-21:

- The public site is a static Vite site prerendered from a snapshot of the spreadsheet,
  on npm and Node 24, published nightly and on a push to Pages at `/product-roadmaps/`.
  It parses the format the editor writes with its own parser, and the editor copies its
  fixture CSVs (`tests/fixtures/sheets/README.md`).
- GitHub Pages serves one site per repository, and `deploy-pages` publishes only to its
  own repository; every organisation site shares one origin.
- This repository's `main` is unprotected and allows only squash and rebase merges;
  `product-roadmaps` requires code-owner review on `main`.
- The `postgres:18` image keeps its data under `/var/lib/postgresql/18/docker` and
  refuses a mount at the old `/var/lib/postgresql/data`.

## Design

Owner answers of 2026-11-20 (ADR-015 grilling, rounds 1–7):

1. **Layout**: `apps/editor` (today's app, moved) and `apps/api`. The move is the
   epic's first story and one mechanical change, with docs, skills, configs, worktree
   scripts and CI paths updated together; it was chosen over keeping the editor at the
   root. _Amended by 7 and 8: the layout adds `apps/public-site` and
   `packages/api-types`, and the rename comes before the move._
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

Owner answers of 2026-11-21 (monorepo grilling), drafted into ADR-016 and ADR-017:

7. **The public site joins now** (ADR-016 _The public site_): its history merged into
   `apps/public-site`, on pnpm, Node 26 and the root Prettier style;
   `product-roadmaps` keeps publishing it, nightly and by hand, from this repository's
   `main` head. The two apps share one copy of the spreadsheet fixtures, and no contract
   package.
8. **The repository is renamed `roadmaps` first**, on its own; the old editor address
   gets no redirect, and leads are told the new one.
9. **`main` is protected** by `product-roadmaps`' ruleset, applied repository-wide, with
   required checks and signed commits; the owner keeps bypass.
10. **Workspace tooling and CI** as ADR-016: pnpm alone with catalogs, one Prettier
    config, ESLint per app, commit and push hooks, one `ci.yml` with jobs per app,
    Dependabot for Actions, pnpm and uv, E2E inside each app, a guide per app.
11. **The API stack** as ADR-017, with a deterministic seeder from the skeleton onwards.

_The schema and endpoint design is written once the identity and authorisation ADRs
exist._

## Shared assumptions and contracts

### Workspace commands

Root scripts delegate to an app with `pnpm --filter <app>`; the API's run through uv
from its own directory. A story that adds a command adds its root script.

### The API's conventions

Every API story follows ADR-017's layering, error envelope and test harness, and adds
its error codes to the editor's catalogue in English and Welsh in the same change.

## Stories

| ID      | Story                                                                                               | Area                   | Depends on | State |
| ------- | --------------------------------------------------------------------------------------------------- | ---------------------- | ---------- | ----- |
| STY-085 | [Rename the repository to roadmaps](STY-085-rename-the-repository-to-roadmaps.md)                   | CI/CD + Docs           | —          |       |
| STY-086 | [Move the editor into apps/editor](STY-086-move-the-editor-into-a-pnpm-workspace.md)                | CI/CD + Docs           | STY-085    |       |
| STY-087 | [Workspace tooling and the ruleset](STY-087-workspace-tooling-and-the-main-ruleset.md)              | CI/CD                  | STY-086    |       |
| STY-088 | [Bring the public site in](STY-088-bring-the-public-site-into-the-workspace.md)                     | CI/CD + Docs           | STY-087    |       |
| STY-089 | [One copy of the spreadsheet fixtures](STY-089-one-copy-of-the-spreadsheet-fixtures.md)             | Infrastructure + CI/CD | STY-088    |       |
| STY-090 | [The API skeleton](STY-090-the-api-skeleton.md)                                                     | CI/CD + Docs           | STY-086    |       |
| STY-091 | [Migrations, tenant listener, test harness](STY-091-migrations-tenant-listener-and-test-harness.md) | Infrastructure + CI/CD | STY-090    |       |
| STY-092 | [The OpenAPI contract and schemas](STY-092-the-openapi-contract-and-generated-schemas.md)           | Infrastructure + CI/CD | STY-090    |       |
| STY-093 | [A deterministic seeder](STY-093-a-deterministic-seeder.md)                                         | Infrastructure         | STY-091    |       |

_All Placeholders until ADR-016 (STY-085–089) and ADR-017 (STY-090–093) are accepted.
Candidate scope, to split after the identity and authorisation ADRs: the first schema
and its enforcement suite; people, memberships, roles and assignments; the scratch, draft,
save, publish and restore path; the API's endpoints for the roadmap repository's
calls and for the public site's read; the import of the spreadsheet's data; and the
editor's API adapter with its build-time switch._

## Sequencing

The rename (STY-085) comes first, then the workspace move (STY-086), which stays one
change. Then two tracks run in parallel: the repository's (STY-087, then STY-088 into
a protected `main`, then STY-089) and the API's (STY-090, then STY-091 and STY-092,
then STY-093). The schema stories follow STY-091; the editor's adapter follows
STY-092.

## Out of scope

- The editor's new editing model: a server scratch, a shared draft, permissions and
  assignments in the interface (ADR-015 _Consequences_). A later epic, once this one's
  API exists.
- Switching the deployed editor to the API, retiring the Sheets adapter, and moving
  the public site to the API's read: after an environment exists.
- Infrastructure as code and provisioned environments: a later epic, handed a service
  that runs locally and in CI.
- Live presence and real-time updates.
- A cross-repository deploy trigger, Google Cloud hosting and custom domains: the
  infrastructure epic, before `product-roadmaps`' schedule lapses (ADR-016
  _Consequences_).

## Defects

None.

## Related

- [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md),
  [ADR-017](../../adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md),
  [ADR-002](../../adr/ADR-002-layered-architecture-and-repository-boundary.md)
- [Replacing Google Sheets](../../operations/replacing-google-sheets.md)
- [STY-048](../EPC-011-adding-roadmaps-and-items/STY-048-remove-a-roadmap.md) —
  removing a roadmap, bound by ADR-015 Option 8
- [CHO-005](../chores/CHO-005-send-last-updated-to-the-api-in-utc.md)
