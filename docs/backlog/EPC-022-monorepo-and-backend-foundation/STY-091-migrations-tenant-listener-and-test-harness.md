# STY-091: Migrations, the per-transaction tenant and the database test harness

- **Status**: Proposed — acceptance criteria from the owner's STY-091 grilling
  (2026-11-24); delivered after STY-101
- **Type**: Feature
- **Area**: API + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard), STY-101 (hard)
- **Binding ADRs**: ADR-017 §Tenant and person, §Migrations, §Tests, §STY-091
  amendments; ADR-015 §Tenancy, §Roles, operation and data protection
- **Suggested model**: Opus — the roles, grants and harness ADR-015's enforcement suite
  stands on

## Summary

The API gains its database's foundations, with no table yet. A bootstrap creates
ADR-015's three roles locally, from one SQL file that EPC-023 also runs where the API is
hosted. Alembic migrations run as their own step and only upgrade. A listener sets the
request's tenant and person on each transaction. A test harness clones one database per
parallel worker and connects as the application's role. `/ready` also says not ready
while the database is behind the code's migrations, or while the API's login could get
past row-level security. Delivered after STY-101.

## Scope

The API's database roles, migration command and first revision, the session listener,
`/ready`'s two new checks, the test harness and its guide, the `api:` scripts and CI's
API job, and the ADR-017 lines the answers amend. No table but the harness's own probe
table, no route and nothing in the editor or the public site changes.

## Acceptance criteria

### S1: A bootstrap creates ADR-015's roles, locally and in CI only

**Given** a slot's database, new or with an existing volume
**When** `pnpm api:db:up` runs, once or again
**Then** the database holds a no-login owner role that owns the database, and so its
`public` schema; a migration login that is a member of the owner role; and the
application's login, a member of neither; neither login is a superuser or has
`CREATEROLE`, `CREATEDB` or `BYPASSRLS` (D3, D4)
**And** the shared SQL file creates only the owner role, its membership and the
database's ownership, and holds no credential; the local runner creates the two logins
with fixed local passwords before running it, and refuses any `ROADMAPS_ENV` but local
and test, naming the setting and never its value (D3)
**And** a second run changes nothing and fails nothing, so an existing worktree's volume
is updated in place, with no wipe

### S2: Migrations run as their own step, as the owner role, upgrade only

**Given** a bootstrapped database
**When** `pnpm api:migrate` runs
**Then** it brings the database to the code's latest revision as the migration login,
switched to the owner role, so the owner role owns every object a migration creates,
`alembic_version` included (D17)
**And** revision `0001` grants the application's login only `SELECT` on
`alembic_version`, which `/ready` reads; each later revision grants that login exactly
what it needs on each object it creates, and no default privileges exist (D5)
**And** each revision's downgrade raises, naming the rule, and writes nothing (D6)
**And** the API never migrates at start-up, and its login can run no DDL

### S3: `pnpm api:dev` brings the database up to date first

**Given** a slot's database behind the code's latest revision
**When** a developer runs `pnpm api:dev`
**Then** the bootstrap and the migrations run before the server starts, the API connects
as the application's login, and `/ready` answers 200 (D10)

### S4: Revisions are numbered in one line

**Given** the migrations in `apps/api/src/roadmaps_api/migrations/` (D9)
**When** the API's tests run
**Then** they fail when the revisions have more than one head, or when a revision's
four-digit number repeats, skips one, or differs from its file's name
(`0001_<slug>.py`); the check's table has a row for each (D7)

### S5: The models match the migrations

**Given** the SQLAlchemy metadata, with ADR-017's naming convention for every constraint
and index (D18)
**When** the API's tests run
**Then** a check compares a database built to the latest revision with the models and
fails on any difference, passing today with no models (D8)
**And** delivery plants a model change with no migration, sees the check fail naming
it, and records the run in Scenario evidence

### S6: Each transaction carries its tenant and person, and nothing outlives it

**Given** a session given a tenant and a person, either or both absent
**When** it begins a transaction, ends it and begins another
**Then** each transaction has `app.tenant_id` and `app.person_id` set from bound
parameters with `set_config(…, true)` before its first statement, and an absent one is
left unset (D19)
**And** on a pool of one connection, a transaction with no tenant after one with a
tenant reads both settings as empty
**And** on the harness's probe table, under forced row-level security with ADR-015's
policy shape, a transaction with no tenant reads and writes no row, and one with a
tenant reads and writes only that tenant's rows (D13)

### S7: `/ready` answers by the database's revision

**Given** the API's login can connect
**When** `/ready` is called with the database at the code's latest revision, behind it,
at a revision the code does not know, or with no `alembic_version` table
**Then** it answers 200, 503 `service.not_ready`, 200, and 503 `service.not_ready`, in
that order; the test's table has a row for each (D11)
**And** a database ahead of the code is logged as ahead, and each 503's warning carries
a code telling no connection, migrations behind and an unsafe login apart, within
`/ready`'s two seconds (D20)

### S8: `/ready` refuses a login that could get past row-level security

**Given** the API connected as a login that is a superuser, has `BYPASSRLS`, owns any
object in the database, or is a member of the owner role or the migration login
**When** `/ready` is called
**Then** it answers 503 `service.not_ready`, with its warning's code, and the
application's login answers 200; the test's table has a row for each case (D12)

### S9: Tests run in parallel, each worker on its own database, as the application

**Given** `pnpm api:test`, locally or in CI's API job on the Compose database (D2)
**When** the suite runs
**Then** the harness builds a template database once per run, through the code
`pnpm api:migrate` runs, and pytest-xdist starts as many workers as the machine has
cores, at most four, each on its own clone of the template, connecting as the
application's login (D14, D21)
**And** between tests a superuser connection that exists only in the harness empties
every table with `TRUNCATE … CASCADE`, and each worker's database is dropped at the end
**And** one test runs `pnpm api:migrate`'s command in a subprocess, as the server test
runs the API
**And** the integration tests' guide (`apps/api/tests/integration/AGENTS.md`) states
the harness's rules, and the suite still fails under 100% branch coverage of the package
and the tools

### S10: The records agree with the build

**Given** the change
**When** ADR-017 and the API's guide and README are read
**Then** they state the bootstrap and who runs it where, upgrade-only numbered
revisions, explicit grants, `/ready`'s revision and login checks and the harness's
workers, as ADR-017 _STY-091 amendments_ records them (D3 to D16)

## Tests

pytest against the slot's or CI's Compose PostgreSQL 18 holds S1, S2, S4 and S6 to S9:
S1 runs the bootstrap twice on a fresh database; S4, S7 and S8 are each one table; S6
runs on an engine with a pool of one. The check in S4 is the repository's own, so its
rows stand; S5's planted model change is an observed run, since the comparison is
Alembic's. S3 is an observed run of `pnpm api:dev` on a database behind the code, and
S9's worker count an observed CI run.

## Decisions

- **D1** (owner, 2026-11-23, STY-090 grilling round 6, STY-090 D21): `/ready` also
  answers 503 `service.not_ready` until the database is at the code's Alembic head, over
  connectivity only, so a version deployed before its migration step takes no traffic.
  Refined by D11.
- **D2** (owner, 2026-11-24, STY-101 grilling round 1, STY-101 D5): CI's API job starts
  the Compose database, as `pnpm api:test` does locally, over STY-090 D5's service
  container, so the harness grows that one.
- **D3** (owner, 2026-11-24, STY-091 grilling rounds 1 and 2): a bootstrap outside
  Alembic creates the roles, over the first revision or Compose's init scripts. One
  idempotent SQL file holds the owner role, its membership and the database's ownership,
  with no credential; locally and in CI a runner creates the two logins first, and
  hosted, EPC-023 creates them (IAM if it chooses) and runs the same file, over a
  local-only script or one command everywhere holding an admin login. Gives S1.
- **D4** (owner, round 2): tables live in `public`, which the owner role owns through
  owning the database, over a dedicated schema. Gives S1.
- **D5** (owner, round 3): each revision grants the application's login exactly what it
  needs, with no default privileges, so a forgotten grant fails as "permission denied".
  Gives S2.
- **D6** (owner, round 2): revisions upgrade only; a bad one is fixed by a new one, and
  hosted recovery is a restore. Gives S2.
- **D7** (owner, round 3): revisions are `0001_<slug>`, with a test that fails on two
  heads, a gap or a repeat, over Alembic's random IDs. Gives S4.
- **D8** (owner, round 3): autogenerate only drafts; each revision is reviewed and
  finished by hand, and a drift check runs from this story, over none or one from the
  first schema story. Gives S5.
- **D9** (owner, round 2): migrations live in the package, configured in
  `pyproject.toml`, so the image carries them and `/ready` finds them, over
  `apps/api/migrations/` with an `alembic.ini`. Gives S4.
- **D10** (owner, round 2): `pnpm api:dev` runs the bootstrap and the migrations before
  the server, beside a `pnpm api:migrate` of its own. Gives S3.
- **D11** (owner, rounds 1 and 2): `/ready` is ready at or ahead of the code's latest
  revision, a revision the code does not know being ahead, and not ready behind it or
  with no revision table, over an exact match, which takes the old version out of
  traffic while a deploy migrates. Every revision therefore stays compatible with the
  version before it (EPC-022 _The API's conventions_). Gives S7.
- **D12** (owner, rounds 1 and 2): `/ready` refuses a login that is a superuser, has
  `BYPASSRLS`, owns an object or is a member of the owner role or the migration login,
  over refusing at start-up or no guard. Gives S8.
- **D13** (owner, round 1): the listener's tests run on a probe table the harness adds
  to its template, with forced row-level security, over reading the settings alone or
  bringing `tenants` forward. Gives S6.
- **D14** (owner, rounds 2 and 3): pytest-xdist from this story, with
  `-n auto --maxprocesses=4`, over adding it later or no cap. Gives S9.
- **D15** (owner, round 2): putting back the rows a migration inserts, after each
  emptying, is built by the first story whose migration inserts any; until then the
  rule waits in EPC-022 _The API's conventions_, not in a guide.
- **D16** (owner, round 2): delivered after STY-101, which changes the same script, CI
  job and readiness tests, over either order.
- **D17** (owner, 2026-11-24, confirming the grilling's summary): the roles are
  `roadmaps_owner`, `roadmaps_migrator` and `roadmaps_app`, Compose's `roadmaps` staying
  the local admin login; the migration environment switches to the owner role before it
  runs a revision.
- **D18** (owner, confirming the summary): SQLAlchemy's documented naming convention for
  constraints and indexes.
- **D19** (owner, confirming the summary): the listener takes the tenant and the person
  from the session it is given, and sets each only for its transaction.
- **D20** (owner, confirming the summary): `/ready` keeps one 503 code; its warning gains
  a code for each cause, within STY-101's log rules.
- **D21** (owner, confirming the summary): the template database is rebuilt on every
  run, and each worker's clone dropped at its end, over caching it by revision.
- **D22** (owner, confirming the summary): `ROADMAPS_DATABASE_URL` is the application's
  login; only the migrate command reads `ROADMAPS_MIGRATION_DATABASE_URL`; only the
  bootstrap runner and the harness take the local admin login; each fails closed.
  Alembic becomes a runtime dependency and pytest-xdist a development one.

## Starting point

Audited at `4d94e5a7`, with PostgreSQL 18.7 (the Compose image), Alembic 1.20.1 and
pytest-xdist 3.8.0:

- `public` is owned by `pg_database_owner`, so the database's owner owns it; `PUBLIC`
  has `USAGE` on it and no `CREATE`.
- After a transaction that ran `set_config('app.tenant_id', …, true)`, the connection
  reads the setting as `''`, not `NULL`: ADR-015's policies fail closed on unset or
  empty, and S6's second transaction reads empty.
- Alembic's `Config` takes a `toml_file` for `[tool.alembic]`, but `pyproject.toml` is
  not in the installed package; `ScriptDirectory` takes a directory, so `/ready` finds
  the revisions from the package's own path.
- `pnpm api:dev` and the readiness and log tests (`tests/test_probes.py`,
  `tests/test_logs.py`) connect as Compose's `roadmaps` superuser, which S8 makes
  `/ready` refuse: they move to the application's login.
- CI's `ubuntu-latest` runner has four cores on this public repository.

## Out of scope

- Any real table, `tenants` included: the first schema story.
- ADR-018's role owning the sign-in functions, and the platform jobs' role: each with
  its own story.
- Putting back the rows a migration inserts (D15).
- The hosted logins, the bootstrap's hosted run and the migration step where the API is
  hosted (EPC-023).
- A deadline for every route's database wait (CHO-049).
