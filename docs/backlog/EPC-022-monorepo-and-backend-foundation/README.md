# EPC-022: Monorepo and backend foundation — an API and its database beside the Sheets editor

- **Status**: Active — every binding ADR is accepted (owner, 2026-11-21); STY-085 to
  STY-088, the two apps' alignment (owner, 2026-11-23: STY-095 to STY-098), STY-089 and
  the API skeleton (STY-090) and, from the owner's review of it, STY-101 and STY-091 are
  done, and so are STY-092, STY-100 and CHO-047; the remaining API placeholders'
  acceptance criteria come next
- **Progress**: 16 of 20 terminal (STY-085 to STY-092, STY-095, CHO-044, STY-096 to
  STY-098, STY-100, STY-101, CHO-047); next selectable: none — STY-093, STY-094,
  STY-099 and CHO-049 wait for their acceptance criteria
- **Binding ADRs**: ADR-015, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020, ADR-002

## Summary

The editor reads and writes one Google spreadsheet, a temporary data source (ADR-002).
This epic makes the repository a monorepo, renamed `roadmaps`, that also takes in the
public site, and establishes the backend that will replace the spreadsheet: a Python
FastAPI service over the PostgreSQL 18 database ADR-015 designs, scoped by tenant,
keeping every version, with private scratch, shared drafts, publications, people, roles
and assignments. Google Sheets stays the deployed data source throughout, so Product
Leads see no change beyond the editor's new address; the API is developed, tested and run locally beside it,
and the editor can be built against either data source, as the composition root
chooses (ADR-002). The editor's new editing model (scratch, draft, permissions), the
switch of the deployed editor to the API, and the infrastructure as code for its
environments are later epics.

## Owner decisions waiting

None. ADR-016 to ADR-020 were accepted on 2026-11-21.

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
`2548219` (`product-roadmaps`) on 2026-11-21:

- The public site is a static Vite site prerendered from a snapshot of the spreadsheet,
  on npm and Node 24, published nightly and on a push to Pages at `/product-roadmaps/`.
  It parses the format the editor writes with its own parser, and the editor copies its
  fixture CSVs (`tests/fixtures/sheets/README.md`).
- GitHub Pages serves one site per repository, and `deploy-pages` publishes only to its
  own repository; every organisation site shares one origin.
- This repository's `main` is unprotected and allows only squash and rebase merges;
  `product-roadmaps` requires code-owner review on `main`.
- `product-roadmaps`' ruleset allows only squash and rebase merges, so the public site's
  history merge needs it widened for one pull request, or the owner's bypass.
- The `postgres:18` image keeps its data under `/var/lib/postgresql/18/docker` and
  refuses a mount at the old `/var/lib/postgresql/data`.
- ty, evaluated on 2026-11-21 (0.0.107 on Python 3.15.0, with SQLAlchemy 2.1.9, FastAPI
  and Pydantic), reported no false positives and the same errors as mypy strict on a
  sample of typed models, `select()` tuples, a session listener and a route.

## Design

Owner answers of 2026-11-20 (ADR-015 grilling, rounds 1–7):

1. **Layout**: `apps/editor` (today's app, moved), `apps/public-site`, `apps/api` and
   `packages/api-types` (ADR-016, amended 2026-11-21 from `apps/editor` and `apps/api`).
   The move is one mechanical change, with docs, skills, configs, worktree scripts and
   CI paths updated together, chosen over keeping the editor at the root; the rename
   comes before it.
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

7. **The public site joins now** (ADR-016 _The public site_), and `product-roadmaps`
   keeps publishing it, nightly and by hand, from this repository's `main` head.
8. **The repository is renamed `roadmaps` first**, on its own; the old editor address
   gets no redirect, and leads are told the new one.
9. **`main` is protected** by `product-roadmaps`' ruleset, applied repository-wide, with
   required checks and signed commits; the owner keeps bypass. Amended in STY-087's
   grilling: squash only, bypass through pull requests only, one gate check; and in
   its review: an agent merges only when the owner authorises it, and
   `product-roadmaps` is protected as `main` is (STY-088 D8).
10. **Workspace tooling, CI and agent guides**: ADR-016 _Workspace tooling_, _CI_,
    _Agent guides_.
11. **The API stack**: ADR-017, including the public read (no key, open CORS, OGL v3.0,
    current publications only) and the seeder, which starts right after the migrations
    (moved after the first schema story by STY-091 D27).

Owner answers of 2026-11-21 (identity and authorisation grilling, and the review of
its drafts), from the
[identity and authorisation analysis](../../analysis/identity-and-authorisation.md):

12. **Sign-in**: through the API, with DHCW's Google Workspace first and Entra next,
    after which Google is retired; an opaque server-side session; a person exists only
    once an invitation is redeemed (ADR-018); asking for access later (STY-094).
13. **Authorisation**: a permission catalogue in code, Admin, Product Lead and Viewer,
    every route declaring a policy, every request naming its tenant (ADR-019).
14. **Origins**: the editor and the API on one origin in every environment, the public
    read on its own host (ADR-020).
15. **Supply-chain checks**: CHO-031, done beside STY-087.
16. **Infrastructure-held protections**: EPC-023, a placeholder.

Owner answers of 2026-11-23 (STY-095 grilling), recorded in STY-095 D2–D8 and the
records it split into:

17. **The two apps are aligned first** on the repository track, strictly in sequence:
    STY-095 (file names, the shared ESLint and TypeScript bases, the shared conventions
    file), CHO-044 (one dev-ports resolver), STY-096 (the site's interface text in
    typed catalogues, without react-i18next for the script budget, STY-096 D10),
    STY-097 (one version per shared dependency, one font) and STY-098 (the editor marks
    English shown in place of Welsh), each merged before the next.
    The public sees no change but STY-096's new Welsh count forms and `lang` marks and
    STY-097's font and package updates; the owner sees both stories' screenshots before
    approving their merges. The site's design tokens follow as a placeholder, STY-099;
    shared code packages are out of scope.

Owner answers of 2026-11-23 (STY-089 grilling), recorded in STY-089 D2–D16:

18. **One copy of the spreadsheet fixtures** in a root folder, `fixtures/sheets/`, read
    by both apps' tests; only the data moves, and each app keeps its own CSV parser
    until the Sheets format retires. ADR-016's _STY-089 amendments_ record where shared
    config, data and code live: a package only for code two or more apps import that
    outlives the Sheets format.

Owner answers of 2026-11-23 (STY-090 grilling), recorded in STY-090 D1–D35 and ADR-017
_STY-090 amendments_:

19. **The API's paths**: contract routes under `/api/v1`, the probes `/health` and
    `/ready` at the root, unversioned; the editor's dev server proxies `/api` from
    STY-090.
20. **The skeleton's shape**: one command (`pnpm api:dev`) runs the API beside the
    slot's database, which teardown removes with its volume; settings from environment
    variables only, failing closed; JSON logs everywhere, with a request ID in each line
    and in `X-Request-ID`; ADR-020's headers, a 1 MiB body limit and the `Host`
    allow-list from the start; logs hold only ADR-018's allow-listed fields, naming a
    request by its route's template, never its path; 100%
    branch coverage; the gate before a PR runs only the apps a change touches. Tracing
    follows as STY-100; the image and the production server are EPC-023's.

Owner answers of 2026-11-23 and 2026-11-24 (STY-100 grilling and review), recorded in
STY-100 D5–D15:

21. **Tracing**: traces only, sent to one shared local Jaeger that keeps them in
    memory; every request starts its own trace, ignoring a caller's `traceparent`;
    spans keep only allow-listed attribute keys, and database spans carry statement
    text with placeholders, never a value; nothing is exported without an endpoint.
    Metrics, hosted export and sampling, and the load balancer's trace header are
    EPC-023's.

Owner answers of 2026-11-24 (review of STY-090 and STY-101 grilling), recorded in
STY-101 D2–D22:

22. **The skeleton leans on its framework**: Starlette's body limit and `Host`
    allow-list, whose two refusals are plain text, the envelope's only exceptions, the
    limit counting a body as a route reads it; no wildcard host anywhere; a mounted
    app's request logged `unmatched`; logs gain an exception's chain of types and a
    database error's SQLSTATE and constraint name, and only a local API, never one on
    Cloud Run, writes messages; CI's API job uses the Compose database; a tool the
    repository only configures is proved by an observed run, its wiring of a control
    keeping a standing test (CHO-048). `/ready`'s thread and 100% branch coverage stay;
    a deadline for every route's database wait is CHO-049.

Owner answers of 2026-11-24 (STY-091 grilling and its review), recorded in STY-091
D3–D33 and the _STY-091 amendments_ of ADR-015 and ADR-017:

23. **The database's foundations**: one SQL file, run locally by a bootstrap and where
    the API is hosted by EPC-023, makes the no-login owner role the database's owner,
    so it owns `public`, and no-login migration and application roles, each login a
    member of one; `PUBLIC` loses `TEMPORARY` and default `EXECUTE` on routines;
    migrations upgrade only, numbered in one line, each granting the application's role
    exactly what it needs; `alembic_version` is the one table without row-level
    security; `/ready` is ready at the code's latest revision or one numbered above it,
    and serves only a login that holds the application's role and nothing more; the
    harness runs at most four pytest-xdist workers, each on its own database;
    `pnpm api:dev` migrates first. STY-091 follows STY-101, and the seeder (STY-093)
    follows the first schema story, which creates `tenants`.

Owner answers of 2026-11-24 (STY-092 grilling and review), recorded in STY-092 D1–D18
(with agent decisions D19–D22 in STY-092) and the _STY-092 amendments_ of ADR-016 and
ADR-017:

24. **The OpenAPI contract and generated schemas**: camelCase across the whole API JSON
    contract via `ApiRequestModel` (`validate_by_name=False`, never binding `snake_case`
    on inbound bodies, query models or nested request models; `extra="forbid"` deferred
    to CHO-047, and still off once it is done: its D3) and `ApiResponseModel`
    (`validate_by_name=True`); `ErrorCode` and
    `ErrorResponse` injected into `components.schemas` (served from local
    `/api/v1/openapi.json` too), with FastAPI's built-in
    `HTTPValidationError`/`ValidationError` stripped; `apps/api/openapi.json` and raw
    TypeScript in `packages/api-types/src/generated/` (types and `zod/mini` schemas only,
    no SDK, no build step) both committed and checked for drift in CI; the editor maps
    the 5 skeleton codes and `400`/`413` refusals onto existing `AppErrorKind`s with a
    status fallback for edge `401`/`403`/`404`/`429`/`5xx`; ESLint forbids
    `@roadmaps/api-types` everywhere in `apps/editor/src/` except `src/infrastructure/**`;
    `knip` checks unused files, exports and dependencies across the workspace in CI's
    `repository` job; `classify-changes.sh` routes `packages/api-types/*` to `editor` and
    `api` only (skipping `site` until the public site adopts the API).

_The schema, identity and endpoint stories are written next, from ADR-015 and ADR-018 to
ADR-020._

## Shared assumptions and contracts

### Workspace commands

Root scripts that run one app carry its prefix (`editor:dev`, later `site:` and `api:`)
and delegate with `pnpm --filter`; `lint`, `typecheck`, `test`, `build`,
`format:check` and `test:docs` run across the workspace (STY-086 D1). The root
package's own checks are `repo:typecheck`, `repo:lint` and `repo:test`, and each app's
CI job runs its `<prefix>:typecheck`, `:lint`, `:test` and `:build` (STY-087 D14). The
API's run through uv from its own directory. A story that adds a command adds its root
script.

### CI and hooks

A new CI job joins the needs of the _CI result_ gate, which `build/ci-workflow.test.ts`
checks, and an app's jobs run unless its output from `scripts/ci/classify-changes.sh` is
`false`; STY-088 added the public site's case, output (`site`) and `--all` line, and
STY-090 adds the API's, with tests. A package's commit check
is a job in `lefthook.yml`; every Dependabot entry carries the 7-day cooldown (STY-087
D12, D13), and pnpm resolves no version younger than a week (CHO-031). A new lockfile is
audited weekly without a change to the audit, and uv takes a 7-day `exclude-newer`.

### The API's conventions

Every API story follows ADR-017's layering, error envelope and test harness, with its
routes under `/api/v1` (ADR-017 _STY-090 amendments_). From STY-101, two refusals are
outside the envelope, Starlette's plain-text 400 for an unlisted `Host` and 413 for an
oversize body, and the editor's API adapter maps them by status (STY-101 D2, D10). A story
that adds an error code maps it in the editor's API adapter (ADR-017 _Errors_), with
copy in English and Welsh when it needs a new `AppError` kind, and adds factories to
the seeder for any table it creates; STY-093 writes those of the first schema story,
which comes before it (STY-091 D27). From STY-091, a story's migration stays compatible
with the version before it, which serves while a deploy migrates (STY-091 D11), and
grants the application's role exactly what its objects need, routines included, since
`PUBLIC` gets no default grant (D5, D25); the first story
whose migration inserts rows also makes the test harness put them back after each
emptying, with a test (D15). From STY-092, API JSON schemas inherit `ApiRequestModel`
(including nested request models, never binding `snake_case`) or `ApiResponseModel`
(camelCase wire format) and a story that changes routes or `ErrorCode` regenerates
`apps/api/openapi.json` and `packages/api-types` (`pnpm api:contract`). The first story
with a request body or a query model also turns `extra="forbid"` on for
`ApiRequestModel` (ADR-017 _STY-092 amendments_; CHO-047 D3), whose refusals CHO-047
already keeps free of the caller's keys.

## Stories

| ID      | Story                                                                                                                                                                     | Area                         | Depends on       | State |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- | ----- |
| STY-085 | [Rename the repository to roadmaps](../_archive/EPC-022-monorepo-and-backend-foundation/STY-085-rename-the-repository-to-roadmaps.md)                                     | CI/CD + Docs                 | —                | ✅    |
| STY-086 | [Move the editor into apps/editor](../_archive/EPC-022-monorepo-and-backend-foundation/STY-086-move-the-editor-into-a-pnpm-workspace.md)                                  | CI/CD + Docs                 | STY-085          | ✅    |
| STY-087 | [Workspace tooling and the ruleset](../_archive/EPC-022-monorepo-and-backend-foundation/STY-087-workspace-tooling-and-the-main-ruleset.md)                                | CI/CD                        | STY-086          | ✅    |
| STY-088 | [Bring the public site in](../_archive/EPC-022-monorepo-and-backend-foundation/STY-088-bring-the-public-site-into-the-workspace.md)                                       | CI/CD + Docs                 | STY-087          | ✅    |
| STY-089 | [One copy of the spreadsheet fixtures](../_archive/EPC-022-monorepo-and-backend-foundation/STY-089-one-copy-of-the-spreadsheet-fixtures.md)                               | Infrastructure + CI/CD       | STY-098          | ✅    |
| STY-090 | [The API skeleton](../_archive/EPC-022-monorepo-and-backend-foundation/STY-090-the-api-skeleton.md)                                                                       | API + CI/CD                  | STY-087          | ✅    |
| STY-091 | [Migrations, tenant listener, test harness](../_archive/EPC-022-monorepo-and-backend-foundation/STY-091-migrations-tenant-listener-and-test-harness.md)                   | API + CI/CD                  | STY-101          | ✅    |
| STY-092 | [The OpenAPI contract and schemas](../_archive/EPC-022-monorepo-and-backend-foundation/STY-092-the-openapi-contract-and-generated-schemas.md)                             | API + Infrastructure + CI/CD | STY-090, STY-101 | ✅    |
| STY-093 | [A deterministic seeder](STY-093-a-deterministic-seeder.md)                                                                                                               | API                          | `tenants` story  |       |
| STY-094 | [Ask for access to a tenant](STY-094-ask-for-access-to-a-tenant.md)                                                                                                       | API                          | invitations      |       |
| STY-095 | [The public site adopts the conventions](../_archive/EPC-022-monorepo-and-backend-foundation/STY-095-the-public-site-adopts-the-workspace-conventions.md)                 | Features/UI + CI/CD + Docs   | STY-088          | ✅    |
| CHO-044 | [One dev-ports resolver](../_archive/chores/CHO-044-one-dev-ports-resolver-for-both-apps.md)                                                                              | CI/CD                        | STY-095          | ✅    |
| STY-096 | [The site's interface text in typed catalogues](../_archive/EPC-022-monorepo-and-backend-foundation/STY-096-the-public-sites-interface-text-moves-to-typed-catalogues.md) | Features/UI + i18n           | CHO-044          | ✅    |
| STY-097 | [One version per shared dependency, one font](../_archive/EPC-022-monorepo-and-backend-foundation/STY-097-one-version-per-shared-dependency-and-one-font.md)              | Features/UI + CI/CD          | STY-096          | ✅    |
| STY-098 | [The editor marks English in place of Welsh](../_archive/EPC-022-monorepo-and-backend-foundation/STY-098-the-editor-marks-english-shown-in-place-of-welsh.md)             | Domain + Features/UI         | STY-097          | ✅    |
| STY-099 | [The site takes the DHCW design tokens](STY-099-the-public-site-takes-the-dhcw-design-tokens.md)                                                                          | Features/UI                  | STY-098          |       |
| STY-100 | [The API traces its requests](../_archive/EPC-022-monorepo-and-backend-foundation/STY-100-the-api-traces-requests-locally.md)                                             | API                          | STY-101          | ✅    |
| STY-101 | [The skeleton leans on its framework](../_archive/EPC-022-monorepo-and-backend-foundation/STY-101-the-api-skeleton-leans-on-its-framework.md)                             | API + CI/CD + Docs           | CHO-048          | ✅    |
| CHO-047 | [A 422 never names a key the caller chose](../_archive/chores/CHO-047-a-422-never-names-a-key-the-caller-chose.md)                                                        | API                          | —                | ✅    |
| CHO-049 | [Every route's database wait has a deadline](../chores/CHO-049-every-routes-database-wait-has-a-deadline.md)                                                              | API                          | —                |       |

_STY-085 to STY-092, STY-095, CHO-044, STY-096 to STY-098, STY-100, STY-101 and CHO-047
are done. STY-093 is a Placeholder
until its acceptance criteria are written: ADR-017 is accepted. STY-094
is a Placeholder until the invitation story exists, and STY-099 until design input
settles what the public sees.
Candidate scope, to split next: the first schema,
`tenants` first, and its enforcement suite; people, identities, memberships, roles, assignments and
invitations, with ADR-019's authorisation suite; the threat model, then sign-in with
Google and the mock provider, sessions and signing out (ADR-018); the scratch, draft,
save, publish and restore path; the API's endpoints for the roadmap repository's calls
and for the public read; serving the editor's built files with their document headers
(ADR-020); the import of the spreadsheet's data; and the editor's API
adapter with its build-time switch, signing in through the API. Entra, with its spike,
is a later story._

## Sequencing

The rename (STY-085) comes first, then the workspace move (STY-086), which stays one
change, with no other editor-code pull request open while it is in flight (STY-086
D8), then STY-087, whose hooks and gate the API joins. Then two tracks run in
parallel: the repository's (STY-088 into a protected `main`, then the alignment
sequence STY-095, CHO-044, STY-096, STY-097 and STY-098, strictly in that order, each
merged before the next starts, then STY-089 and the STY-099 placeholder) and the API's (STY-090, then STY-101 after the standalone CHO-048, then
STY-091, STY-092 and STY-100 in any order). CHO-031 (supply-chain checks) is done, beside STY-087. The
threat model comes before
any identity story (ADR-018); STY-094 follows the invitation story. The first schema
story, which creates `tenants`, follows STY-091, and STY-093 follows it (STY-091 D27);
the other schema stories follow STY-093, adding their factories; the editor's adapter follows STY-092.

## Out of scope

- The editor's new editing model: a server scratch, a shared draft, permissions and
  assignments in the interface (ADR-015 _Consequences_). A later epic, once this one's
  API exists.
- Switching the deployed editor to the API, retiring the Sheets adapter, and moving
  the public site to the API's read: after an environment exists.
- Infrastructure as code, provisioned environments, Google Cloud hosting and custom
  domains: [EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md), handed
  a service that runs locally and in CI. A cross-repository deploy trigger was rejected
  (ADR-016), not deferred.
- Live presence and real-time updates.

## Defects

- [DEF-028](../_archive/defects/DEF-028-a-fresh-clone-gets-no-git-hooks-from-pnpm-install.md):
  a fresh clone got no Git hooks from `pnpm install` (Done).
- [DEF-033](../defects/DEF-033-the-editor-leaves-text-it-always-shows-in-one-language-unmarked.md):
  the editor leaves text it always shows in one language unmarked (Needs triage).
- [DEF-036](../defects/DEF-036-the-sheets-replacement-runbook-describes-cors-and-browser-held-tokens.md):
  the Sheets replacement runbook still describes CORS and a browser-held token (Needs
  triage).
- [DEF-040](../defects/DEF-040-a-422-lists-every-error-however-many-a-body-has.md): a
  small request can get a much larger 422, which lists every error (Needs triage).

## Related

- [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md),
  [ADR-017](../../adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md),
  [ADR-018](../../adr/ADR-018-sign-in-through-the-api-with-a-server-side-session.md),
  [ADR-019](../../adr/ADR-019-the-api-authorises-every-route-from-a-permission-catalogue-in-code.md),
  [ADR-020](../../adr/ADR-020-the-editor-and-the-api-share-one-origin.md),
  [ADR-002](../../adr/ADR-002-layered-architecture-and-repository-boundary.md)
- [Identity and authorisation analysis](../../analysis/identity-and-authorisation.md)
- [EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md) — hosting and
  infrastructure security, a placeholder
- [Replacing Google Sheets](../../operations/replacing-google-sheets.md)
- [STY-048](../EPC-011-adding-roadmaps-and-items/STY-048-remove-a-roadmap.md) —
  removing a roadmap, bound by ADR-015 Option 8
- [CHO-005](../chores/CHO-005-send-last-updated-to-the-api-in-utc.md)
- [CHO-031](../_archive/chores/CHO-031-supply-chain-checks-on-every-pull-request.md) —
  supply-chain checks, beside STY-087 ✅
