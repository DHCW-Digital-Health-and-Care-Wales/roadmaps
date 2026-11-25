# STY-091: Migrations, the per-transaction tenant and the database test harness

- **Status**: Done
- **Type**: Feature
- **Area**: API + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-090 (hard), STY-101 (hard)
- **Binding ADRs**: ADR-017 §Tenant and person, §Migrations, §Tests, §STY-091
  amendments; ADR-015 §Tenancy, §Roles, operation and data protection
- **Suggested model**: Opus — the roles, grants and harness ADR-015's enforcement suite
  stands on
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/301

## Summary

The API gains its database's foundations, with no table yet. A bootstrap creates
ADR-015's roles locally, from one SQL file that EPC-023 also runs where the API is
hosted. Alembic migrations run as their own step and only upgrade. A listener sets the
request's tenant and person on each transaction. A test harness clones one database per
parallel worker and connects as the application's role. `/ready` also says not ready
while the database is behind the code's migrations, or while the API's login could get
past row-level security. Delivered after STY-101.

## Scope

The API's database roles, migration command and first revision, the session listener,
`/ready`'s two new checks, the test harness and its guide, the `api:` scripts and CI's
API job, and the ADR-015 and ADR-017 lines the answers amend. No table but the harness's own probe
table, no route and nothing in the editor or the public site changes.

## Acceptance criteria

### S1: A bootstrap creates ADR-015's roles, locally and in CI only

**Given** a slot's database, new or with an existing volume
**When** `pnpm api:db:up` runs, once or again
**Then** the database holds three no-login roles: the owner role, which owns the
database and so its `public` schema; the migration role, a member of the owner role with
`SET` and without `INHERIT` or `ADMIN`; and the application's role, a member of neither
(D3, D4, D26, D30)
**And** each login is a member of exactly one of the migration and application roles:
locally two password logins, where the API is hosted the logins EPC-023 creates; no
role or login the file or the runner makes is a superuser or has `CREATEROLE`,
`CREATEDB`, `REPLICATION` or `BYPASSRLS` (D26)
**And** the shared SQL file holds no credential; it makes the three roles, sets on
every run the attributes its runner may set, grants the memberships and the database's
ownership,
revokes `TEMPORARY` on the database from `PUBLIC`, and makes the owner role's new
routines grant no `EXECUTE` to `PUBLIC` (D25, D30)
**And** it stops, naming what it found, when the owner role has a member it did not
grant, when `public` is owned by another role or `PUBLIC` can create in it, or when a
role but the owner owns an object in `public`, or when a role carries an attribute its
runner cannot clear or is one its runner cannot administer; each row asserts the state
after the run (D30)
**And** it succeeds run by a superuser and by a non-superuser login with `CREATEROLE`
and `CREATEDB` that owns the database, as Cloud SQL's administrator is; the test's table
has a row for each, and this record and EPC-023 state what the file grants its runner
(D30)
**And** the local runner creates the two password logins with fixed local passwords
before running the file, and refuses unless `ROADMAPS_ENV` is local or test, which the
script sets, the admin URL's host is a loopback address, and its admin login is a
superuser, which no Cloud SQL login is, naming the setting and never its value (D3,
D30)
**And** a second run changes nothing and fails nothing, so an existing worktree's volume
is updated in place, with no wipe

### S2: Migrations run as their own step, as the owner role, upgrade only

**Given** a bootstrapped database
**When** `pnpm api:migrate` runs
**Then** it brings the database to the code's latest revision as the migration login,
switched to the owner role, so the owner role owns every object a migration creates,
`alembic_version` included; without the switch the login can create nothing (D17, D30)
**And** revision `0001` grants the application's role only `SELECT` on
`alembic_version`, which `/ready` reads; `alembic_version` is the one table without
row-level security, and only the owner role writes it (D28)
**And** each later revision grants the application's role exactly what it needs on each
object it creates, routines included; no default grant exists, and a check fails when
`PUBLIC` can execute a routine in `public` (D5, D25)
**And** each revision's downgrade raises, naming the rule, and writes nothing (D6)
**And** the API never migrates at start-up, and its login can run no DDL and create no
temporary table

### S3: `pnpm api:dev` brings the database up to date first

**Given** a slot's database behind the code's latest revision
**When** a developer runs `pnpm api:dev`
**Then** the bootstrap and the migrations run before the server starts, the API connects
as the application's login, and `/ready` answers 200 (D10)
**And** the server's environment holds no `ROADMAPS_MIGRATION_DATABASE_URL`, and the API
refuses to start with it set, in any environment, naming the setting (D31)

### S4: Revisions are numbered in one line

**Given** the migrations in `apps/api/src/roadmaps_api/migrations/` (D9)
**When** the API's tests run
**Then** they fail when the revisions have more than one head, or when a revision's
four-digit number repeats, skips one, differs from its file's name, or the revision is
longer than Alembic's version column holds
(`0001_<slug>.py`); the check's table has a row for each (D7)

### S5: The models match the migrations

**Given** the SQLAlchemy metadata, with ADR-017's naming convention for every constraint
and index (D18)
**When** the API's tests run
**Then** a check compares a database built to the latest revision with the models and
fails on any difference, passing today with no models (D8)
**And** the check leaves out the harness's probe table, and a standing case adds a table
to a copy of the metadata and sees the check fail naming it (D32)

### S6: Each transaction carries its tenant and person, and nothing outlives it

**Given** a session given a tenant and a person, either or both absent
**When** it begins a transaction, ends it and begins another
**Then** each transaction has `app.tenant_id` and `app.person_id` set from bound
parameters with `set_config(…, true)` before its first statement, and an absent one is
left unset (D19)
**And** on a pool of one connection, a transaction with no tenant after one with a
tenant reads both settings as empty
**And** on the harness's probe table, owned by the owner role under forced row-level
security with the policy expression ADR-015's tables will use, a transaction with no
tenant reads and writes no row, on a new connection and after a transaction with a
tenant on the same one, and one with a tenant reads and writes only that tenant's rows
(D13, D33)

### S7: `/ready` answers by the database's revision

**Given** the API's login can connect
**When** `/ready` is called with `alembic_version` holding the code's latest revision; a
revision `NNNN_<slug>` numbered above it; one numbered below it; another slug at a
number the code knows; a value not of that form; no row; more than one row; or with no
`alembic_version` table
**Then** it answers 200 for the first two, the second logged as ahead, and 503
`service.not_ready` for each of the others; the test's table has a row for each (D11,
D29)
**And** the code's latest revision is read once at start-up, from the package's own
migrations, not on each call (D33)
**And** each 503's warning carries a code telling no connection, a revision it does not
serve and an unsafe login apart, within `/ready`'s two seconds (D20)

### S8: `/ready` serves only a login that holds the application's role and nothing more

**Given** the API connected as some login
**When** `/ready` is called
**Then** it answers 503 `service.not_ready`, with its warning's code, unless the login
is a member, directly or through another role and under any option, of no role but the
application's, held without `ADMIN`, and Cloud SQL's `cloudsqliamuser` and
`cloudsqliamserviceaccount`; and unless the login and every role it is a member of have
none of `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB` and `REPLICATION`, own no
object, and have neither `CREATE` nor `TEMPORARY` on the database nor `CREATE` on any
schema (D12, D24, D34)
**And** a login of the application's role answers 200, as does one also in an inert role
standing for Cloud SQL's; the test's table has a row for each refusal, among them
membership of an extra role such as Cloud SQL's `cloudsqlsuperuser`, that inert role
given an attribute, and the application's role owning an object, each on throwaway
logins and roles that leave the shared ones unchanged (D30, D34)

### S9: Tests run in parallel, each worker on its own database, as the application

**Given** `pnpm api:test`, locally or in CI's API job on the Compose database (D2)
**When** the suite runs
**Then** the harness builds a template database once per run, through the code
`pnpm api:migrate` runs, and pytest-xdist starts as many workers as the machine has
cores, at most four, each on its own clone of the template, owned by the owner role,
given the bootstrap file's database-scoped part from the file itself, since a clone
takes no database-level privilege from its template, and connecting as a login of the
application's role (D14, D21, D33)
**And** between tests a superuser connection that exists only in the harness empties
every table but `alembic_version` with `TRUNCATE … CASCADE`, so a worker's database
keeps its revision, and each worker's database is dropped at the end (D23)
**And** one test runs `pnpm api:migrate`'s command in a subprocess, as the server test
runs the API
**And** the integration tests' guide (`apps/api/tests/integration/AGENTS.md`) states
the harness's rules, and the suite still fails under 100% branch coverage of the package
and the tools

### S10: The records agree with the build

**Given** the change
**When** ADR-015, ADR-017 and the API's guide and README are read
**Then** they state the roles and who runs the bootstrap where, upgrade-only numbered
revisions, explicit grants, `alembic_version`'s exception, `/ready`'s revision and login
checks and the harness's workers, as the two ADRs' _STY-091 amendments_ record them (D3
to D14, D17, D24 to D29); the put-back rule stays in EPC-022 alone (D15), and the
agent's decisions (D23, D30 to D34) in this record

## Tests

pytest against the slot's or CI's Compose PostgreSQL 18 holds S1, S2 and S4 to S9, and
S3's refusal to start with the migration URL:
S1 runs the bootstrap twice on a fresh database; S4, S7 and S8 are each one table; S6
runs on an engine with a pool of one. The check in S4 is the repository's own, so its
rows stand; S5's drift check keeps a standing failing case, since ADR-017's amendment
relies on it. S1's runs as a non-superuser administrator need a login the harness makes
for them. The rest of S3 is an observed run of `pnpm api:dev` on a database behind the code, and
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
  Refined by D25, D26 and D30.
- **D4** (owner, round 2): tables live in `public`, which the owner role owns through
  owning the database, over a dedicated schema. Gives S1.
- **D5** (owner, round 3): each revision grants the application's login exactly what it
  needs, with no default privileges, so a forgotten grant fails as "permission denied".
  Gives S2. Refined by D25.
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
  version before it (EPC-022 _The API's conventions_), the condition the chosen option
  stated. Gives S7. Refined by D29.
- **D12** (owner, rounds 1 and 2): `/ready` refuses a login that is a superuser, has
  `BYPASSRLS`, owns an object or is a member of the owner role or the migration login,
  over refusing at start-up or no guard. Gives S8. Refined by D24.
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
  runs a revision. Refined by D26.
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
- **D23** (agent, 2026-11-24, review): the harness's emptying leaves `alembic_version`
  alone, over emptying every table, which would leave each worker's database with no
  revision after its first test and `/ready` not ready (S7). Changes S9.
- **D24** (owner, 2026-11-24, review question): `/ready` serves only a login with none of
  the five role attributes, a member of no role but the application's, owning nothing
  and with no `CREATE` or `TEMPORARY`, over D12's four checks, which a login given Cloud
  SQL's default `cloudsqlsuperuser` passes (security review). Changes S8. Refined by
  D34.
- **D25** (owner, review question): the bootstrap revokes `TEMPORARY` on the database
  and the owner role's default `EXECUTE` on routines from `PUBLIC`, over accepting that
  a forgotten `REVOKE` leaves a definer function callable by every login (security
  review). D5 now reads "no default grant". Changes S1, S2.
- **D26** (owner, review question): the migration and application roles are no-login
  roles holding every grant, and each login is a member of exactly one (locally
  `roadmaps_migrator_login` and `roadmaps_app_login`; where the API is hosted, EPC-023's
  IAM principals), over password logins with the roles' names, since Cloud SQL names an
  IAM login after its principal (security review). Refines D3, D17. Changes S1, S8.
- **D27** (owner, review question): STY-093 follows the first schema story, which
  creates `tenants`, so the seeder has the DHCW tenant to seed, over a seeder with no
  factory or `tenants` in this story (correctness reviews). Recorded in STY-093 D1 and
  EPC-022's Sequencing.
- **D28** (owner, review question): `alembic_version` is the one table without row-level
  security, a closed list of one that the schema stories' every-table test reads, over
  forcing it with policies Alembic's own writes must pass. Amends ADR-015 _Tenancy_
  (ADR-015 _STY-091 amendments_). Changes S2.
- **D29** (owner, review question): a revision is ahead only when it reads as
  `NNNN_<slug>` numbered above the code's latest, over any revision the code does not
  know, so a database from another branch, a restore from elsewhere or a damaged table is
  not ready (security review). A rollback of two or more versions still reads as ready, a
  stated residual. Refines D11. Changes S7.
- **D30** (agent, 2026-11-24, security review): the bootstrap file sets on every run the
  attributes its runner may set and stops on a member, owner, attribute or `public`
  grant it did not make or cannot clear; the migration role holds the owner role with
  `SET` and without `INHERIT`, so a revision that misses the switch creates nothing; a
  non-superuser administrator gets `SET` on the owner role to make it the database's
  owner, so that administrator's credential is the owner's (EPC-023); the local runner
  also refuses an admin URL that is not on a loopback address or whose login is not a
  superuser, so a Cloud SQL Auth Proxy on 127.0.0.1 is refused. Over trusting what a
  name already carries and testing as a superuser only. Changes S1, S2, S8.
- **D31** (agent, security review): no API process holds the migration URL: the server
  refuses to start with it set, in every environment, and `pnpm api:dev` does not pass
  it on, over relying on the login check alone. Changes S3.
- **D32** (agent, correctness review): the drift check keeps a standing failing case and
  leaves out the probe table, over one observed run, since ADR-017's amendment relies on
  the check (the story template's rule for a control's wiring). Changes S5.
- **D33** (agent, security review): each clone and the probe table are owned by the
  owner role, the probe's policy is the expression the real tables will use, `/ready`
  reads the code's latest revision once at start-up, and the runner and harness compose
  role names, passwords and database names with psycopg's `sql` module, since those
  statements take no bound parameters. Changes S6, S7, S9. After the review cap
  (security re-check): each clone also gets the file's database-scoped part, S8 tests
  every role the login holds and the application's role held without `ADMIN`, and S4
  bounds a revision's length.
- **D34** (agent, 2026-11-24, correctness re-check): D24's closed list names Cloud SQL's
  `cloudsqliamuser` and `cloudsqliamserviceaccount`, each admitted only while it has
  none of the five attributes and owns nothing, over the application's role alone.
  Cloud SQL's documentation says these roles designate IAM logins but neither whether an
  IAM login joins one nor what they hold, so a hosted IAM login is served either way.
  Changes S8.

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
- From PostgreSQL's and Cloud SQL's documentation (security review), not run here:
  `PUBLIC` holds `TEMPORARY` and `CONNECT` on a new database and `EXECUTE` on a new
  function; `ALTER DATABASE … OWNER TO` needs its runner to be able to `SET ROLE` the
  new owner, and a non-superuser with `CREATEROLE` gets a role it creates with `ADMIN`
  only; Cloud SQL's `postgres` administrator is such a login and no login is a
  superuser, a built-in (password) login created through Cloud SQL joins
  `cloudsqlsuperuser` while an IAM login gets no database role by default, and an IAM
  login is named after its principal; a clone takes no database-level privilege from its
  template. Whether Cloud SQL presets `createrole_self_grant` is not known.

## Out of scope

- Any real table, `tenants` included: the first schema story.
- ADR-018's role owning the sign-in functions, and the platform jobs' role: each with
  its own story.
- Putting back the rows a migration inserts (D15).
- Telling a rollback of two or more versions from a deploy (D29).
- The hosted logins, the bootstrap's hosted run and the migration step where the API is
  hosted (EPC-023).
- A deadline for every route's database wait (CHO-049).

## Delivery

### Departures

- **Tests followed the code** (agent): the harness, the roles and the listener were
  built before their tests, so each test's red was shown by breaking the finished code
  (Scenario evidence), not by a test that came first. The review fix to S8's login
  lookup came test-first.
- **S1: who grants the logins' memberships** (agent, from D3 and D26): the file grants
  only roles' memberships, since it names no login; the local runner, and EPC-023
  where the API is hosted, grants each login its one role after the file, and the
  runner revokes the other role from each login. The file also stops when the owner role holds any role, the migration role any
  role but the owner, `roadmaps_app` is a member of any role or a role is a member of both the migration
  and application roles, beside the stops S1 lists; a non-superuser runner's own
  memberships (the `ADMIN` PostgreSQL gives a role's creator, and `SET` on the owner)
  are its, not foreign members. Its check of objects in `public` leaves out a relation's
  row type and an array type, which follow their relation or element.
- **S1: a loopback address** (agent): the local runner takes only an IP literal on the
  loopback range (`127.0.0.0/8`, `::1`), so `localhost`, a name, is refused as a remote
  host is; it refuses an admin URL with any query parameter (`host`, `hostaddr`,
  `service`), and connects at the URL's address whatever `PGHOSTADDR` says.
- **S4: two more rows** (agent): the check also fails numbers that start at `0000` and a
  revision that does not follow the one numbered below it, which the one-head rule
  alone misses (a line in the wrong order). It lives in `apps/api/tools/revisions.py`,
  run by `apps/api/tests/test_revisions.py`.
- **S7, S8: one database query, two verdicts** (agent): `/ready`'s thread reads the
  login's safety, then, only for a safe login, `alembic_version`, since a login lacking
  the grant would otherwise read as no connection. Any database error, a missing grant
  among them, is `readiness.no_connection`; the warning's `exception_*` and `sqlstate`
  fields tell them apart. The warning's cause is a new `cause` field
  (`readiness.no_connection`, `readiness.revision_not_served`,
  `readiness.login_unsafe`) beside the response's `code`; the ahead line is an
  information line, `readiness.ahead`, with a `revision` field, written only once the
  revision reads as `NNNN_<slug>` (ASCII digits only).
- **S8: the login is found by its exact name** (agent, from review): `/ready` looks the
  session's login and the application's role up in `pg_roles` by name, never through a
  `::regrole` cast, which refuses a Cloud SQL IAM login's name (`name@project.iam`) and
  folds case; D34's "a hosted IAM login is served either way" now holds as built.
- **S9: where the harness and its tests live** (agent): the harness is
  `apps/api/tests/harness.py`, its run hooks and fixtures (`database_url`,
  `worker_database`, `worker_admin`) `apps/api/tests/conftest.py`, so the existing
  readiness and log tests take `database_url` in place of `ROADMAPS_TEST_DATABASE_URL`,
  which went; the new suites are in `apps/api/tests/integration/`. The emptying runs
  after each test that takes `database_url`, the fixture through which a test reaches
  the database as the application. The log test's unique violation moved to the probe
  table, since the application's login can no longer create one. The tests that
  bootstrap the shared roles take turns through a lock file the workers share
  (`shared_roles` in `apps/api/tests/conftest.py`), since PostgreSQL refuses concurrent
  updates to one role; pytest-xdist's `xdist_group` with `--dist=loadgroup` grouped
  nothing under pytest 9.2 here. Every test runs without
  `ROADMAPS_MIGRATION_DATABASE_URL`, which a developer may have exported to draft a
  revision, and `pnpm api:test` unsets it.
- **S2: drafting a revision** (agent, from D8 and D9): `[tool.alembic]` in
  `apps/api/pyproject.toml` serves Alembic's own command line (the revision ID is the
  file's name, `file_template = "%%(rev)s"`), whose migration environment then connects
  to `ROADMAPS_MIGRATION_DATABASE_URL`; `roadmaps_api.migrate` hands the environment
  its connection. A test runs `alembic check` from that configuration. Both read the
  URL through `settings.migration_url`, so "only the migrate command reads it" (D22)
  reads "only the migration tooling".
- **S10: the ADRs** (agent): ADR-015's and ADR-017's _STY-091 amendments_ already state
  what the build does, so neither changes; `apps/api/AGENTS.md` and
  `apps/api/README.md` gain the roles, the migrations and the database tests' guide.
  STY-100 gains D22, since `/ready` no longer runs the one `SELECT 1` its S5 and D17
  name.

### Contract for dependents

- A service opens its session with `sessions(info=session_info(tenant_id=…,
person_id=…))` (`apps/api/src/roadmaps_api/database.py`); the factory
  `create_sessions` registers the listener. A tenant-owned table's policy is
  `TENANT_POLICY`, for `USING` and `WITH CHECK`, under forced row-level security.
- The first schema story writes revision `0002_<slug>` from
  `apps/api/src/roadmaps_api/migrations/script.py.mako`, granting `roadmaps_app` what each
  object needs; the models subclass `roadmaps_api.models.Base`, whose naming convention
  the drift check compares (`apps/api/tests/integration/test_migrations.py`).
- The first story whose migration inserts rows makes `harness.empty_tables` put them
  back, with a test (D15).
- EPC-023 runs `apps/api/src/roadmaps_api/bootstrap.sql` with
  `psql --single-transaction --set ON_ERROR_STOP=1`, creating the two logins first and
  granting each its one role after; a non-superuser administrator is granted
  `roadmaps_owner` with `SET` and without `INHERIT`, so its credential is the owner's.
  Each deploy runs `python -m roadmaps_api.migrate` with
  `ROADMAPS_MIGRATION_DATABASE_URL`, never the server's environment.
- `/ready`'s closed list of roles beside the application's is `CLOUD_SQL_IAM_ROLES`
  (`apps/api/src/roadmaps_api/roles.py`).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/api/tests/integration/test_bootstrap.py` (`test_the_file_makes_the_roles_and_a_second_run_changes_nothing` and `test_the_file_clears_an_attribute_its_runner_may_set`, a row per runner; `test_the_file_stops_naming_what_it_found_and_changes_nothing`, a row per stop; the runner's tests, its refusals a table); red without the `TEMPORARY` revoke                                                                                                                        |
| S2       | `apps/api/tests/integration/test_migrations.py` (`test_the_command_brings_the_database_to_the_latest_revision_as_the_owner`, in a subprocess; `test_neither_login_creates_anything_without_switching_to_the_owner`; `test_each_revision_s_downgrade_raises_naming_the_rule`; `test_a_downgrade_writes_nothing`; `test_no_routine_in_public_is_executable_by_public`; `test_the_api_never_migrates_at_start_up`); red without the switch to the owner and without the default revoke |
| S3       | `apps/api/tests/test_settings.py` (a row per environment for `ROADMAPS_MIGRATION_DATABASE_URL`), red without its check; observed run: the slot's `alembic_version` dropped, `pnpm api:dev` run from a shell holding `ROADMAPS_MIGRATION_DATABASE_URL` bootstrapped and migrated it to `0001_app_reads_alembic_version`, `/ready` answered 200, `pg_stat_activity` showed `roadmaps_app_login`, and neither server process's environment held the migration URL                      |
| S4       | `apps/api/tests/test_revisions.py` (the package's revisions, and a row per break); red without the skip rule                                                                                                                                                                                                                                                                                                                                                                        |
| S5       | `apps/api/tests/integration/test_migrations.py` (`test_the_models_match_the_migrations`, with its standing failing case; `test_alembic_s_command_line_drafts_from_the_pyproject_configuration`)                                                                                                                                                                                                                                                                                     |
| S6       | `apps/api/tests/integration/test_tenancy.py`; red with `set_config(…, false)`, with the listener setting nothing, and with the probe's policy `true`                                                                                                                                                                                                                                                                                                                                |
| S7       | `apps/api/tests/integration/test_readiness.py` (`test_ready_answers_by_the_database_s_revision`, a row per revision; `test_the_code_s_latest_revision_is_read_once_at_start_up`); `apps/api/tests/test_logs.py` (the warning's cause); red with the ahead or the row-count rule loosened                                                                                                                                                                                            |
| S8       | `apps/api/tests/integration/test_readiness.py` (the two served logins; `test_ready_refuses_a_login_that_holds_more_than_the_application_s_role`, a row per refusal; the migration login; `test_ready_judges_the_login_it_connects_as_by_its_exact_name`, an IAM-named login and a mixed-case one); red without each of the `BYPASSRLS`, `ADMIN`, ownership, schema `CREATE` and `TEMPORARY` conditions, and the exact-name rows red before the fix                                  |
| S9       | `apps/api/tests/conftest.py`, `apps/api/tests/harness.py`, `apps/api/tests/integration/AGENTS.md`; `pnpm api:test`: 4 workers, 236 tests, 100% branch coverage; the bootstrap file's tests 30 runs in a row at 4 workers with no failure after the shared-roles lock (4 failures in 25 before it); red when the emptying takes `alembic_version` too; CI's worker count: the PR's run of `API: verify`                                                                              |
| S10      | ADR-015 and ADR-017 _STY-091 amendments_ (unchanged); `apps/api/AGENTS.md`, `apps/api/README.md`                                                                                                                                                                                                                                                                                                                                                                                    |
