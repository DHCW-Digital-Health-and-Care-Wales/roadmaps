# STY-093: A deterministic seeder fills a local database, growing with each schema story

- **Status**: Proposed — grilled 2026-11-27; deterministic ORM seeder over `STY-103`'s
  tenancy/access schema, reusable test factories and canonical `Permission` / `SHIPPED_ROLES`
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-103 (hard, Done; creates `tenants`, `tenant_scopes`, `people`,
  `identities`, `roles`, `role_permissions`, `memberships`, `invitations`, `change_sets`,
  `change_set_signoffs`, `change_summaries`, `platform_audit_log` and access-scope commit
  routines; STY-091 is Done)
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions, §History,
  §STY-103 amendments; ADR-017 §Operation, §STY-091 amendments; ADR-018 §Getting in,
  §Records and retention; ADR-019 §The catalogue and the shipped roles
- **Suggested model**: Sonnet — deterministic ORM factories, local-only safety guards and
  reusable seed harness

## Summary

A developer runs one command (`pnpm api:seed`) to migrate and deterministically populate a
local PostgreSQL database with realistic English and Welsh data for every table `STY-103`
creates: DHCW and a fictional second Welsh health tenant, each with its three shipped
roles, named `local_mock` personas plus Faker-generated members, sample invitations
(stored hash-only), and trigger-verified access history. Running it again truncates and
reseeds to the exact same state. It refuses any non-local environment or
remote/non-superuser database, stays outside the production package, and establishes the
factory and Welsh-helper pattern later schema stories extend.

## Scope

Dev-only seeder package under `apps/api/tools/seed/` (with `faker` in
`[dependency-groups].dev`, excluded from `src/roadmaps_api/` and the production image, and
importable by `apps/api/tests/`), the canonical `Permission` `StrEnum` and immutable
`SHIPPED_ROLES` mapping (`MappingProxyType` / `frozenset[Permission]`) in
`apps/api/src/roadmaps_api/authz/permissions.py` (reused by `STY-104` and `STY-105`, or
reused here if `STY-105` lands first), `apps/api/scripts/api.sh seed` wired to
`apps/api/package.json` (`seed`) and root `package.json` (`api:seed`), `apps/api/README.md`,
and unit + real-PostgreSQL integration tests at 100% branch coverage. No HTTP routes, no
migrations, no auto-seeding in `pnpm api:dev`, and no ahead-of-schema roadmap or list
tables (`EPC-026`).

## Acceptance criteria

### S1: One command migrates, truncates and seeds every `STY-103` table through the ORM and real commit triggers

**Given** a local PostgreSQL 18 database migrated to `STY-103`'s schema (empty, previously
seeded, or carrying manual local edits)
**When** a developer runs `pnpm api:seed` (or `uv run --locked python -m tools.seed` with
`ROADMAPS_ENV=local` and a loopback `ROADMAPS_ADMIN_DATABASE_URL`)
**Then** `pnpm api:seed` runs `migrate` first, truncates every `public` table except
`alembic_version` (using `SET LOCAL session_replication_role = 'replica'` for the
`TRUNCATE … CASCADE` teardown step only, matching `tests/harness.py:empty_tables` to clear
immutable history tables, then immediately resetting
`SET LOCAL session_replication_role = 'origin'` before any write), and seeds in the same
transaction using `STY-103`'s SQLAlchemy ORM models:

- two bilingual tenants — DHCW (`dhcw`, _Digital Health and Care Wales_ / _Iechyd a Gofal
  Digidol Cymru_) and a fictional second Welsh health organisation (`cwm-aur`, _Cwm Aur
  Health Board_ / _Bwrdd Iechyd Cwm Aur_) — each with its `tenant_scopes` (`'access'`,
  `'lists'`) and three shipped roles (`admin`, `product_lead`, `viewer` populated from the
  canonical `Permission` `StrEnum` and `SHIPPED_ROLES` mapping);
- the fixed named persona roster with RFC 2606 `.example` emails and canonical
  `local_mock` `(issuer, subject)` identities (with `issuer` pinned to a fixed non-HTTPS
  or loopback URL so both ADR-018's mock-provider guard and its non-HTTPS/loopback issuer
  guard independently refuse it outside local/test) exported from `tools/seed/` for
  `STY-106` (two DHCW Admins, a DHCW Product Lead, a DHCW Viewer, a multi-tenant member
  holding Product Lead in DHCW and Admin in Cwm Aur, a Cwm Aur-only Admin, an ended DHCW
  member with `ended_at IS NOT NULL`, and a disabled DHCW person with
  `disabled_at IS NOT NULL`), plus a small deterministic Faker-generated batch of extra
  members across both tenants using RFC 2606 `.example` emails (e.g. `@dhcw.example` /
  `@cwm-aur.example` or `faker.safe_email()`), `local_mock` identities and a Welsh names
  helper pattern scoped to `STY-103`'s columns; and
- sample invitations (pending, revoked and expired), all using `provider = 'local_mock'`
  and RFC 2606 `.example` email domains

**And** every tenant-owned write (`roles`, `role_permissions`, `memberships`,
`invitations`) runs under `session_replication_role = 'origin'` with all triggers active
through `STY-103`'s real access open/sign-off commit routines — recording bootstrap writes
as `actor_kind = 'system'` (`actor_ref = 'seed'`) via
`public.open_access_change_set_internal` / `public.sign_off_access_change_set_internal`,
follow-on admin actions (creating and revoking sample invitations, ending a membership) as
`actor_kind = 'person'` attributed to the primary DHCW Admin via `app.person_id` and
`public.open_access_change_set` / `public.sign_off_access_change_set`, and matching
`'seed'` entries in `platform_audit_log`
**And** `pnpm api:dev` remains `migrate`-only and never auto-seeds

### S2: Repeated runs are deterministic with stable UUIDv7 IDs and anchor timestamps

**Given** a migrated local database and a fixed reference clock (injectable `now`,
defaulting to `datetime.now(UTC)`)
**When** the seeder runs twice with the default seed (or with an explicit `--seed <int>`)
**Then** both runs produce identical rows across all ORM-written tables (`tenants`,
`tenant_scopes`, `people`, `identities`, `roles`, `role_permissions`, `memberships`,
`invitations`, `platform_audit_log`) — identical content, deterministic UUIDv7 primary
keys and deterministic anchor timestamps for historical rows, while live-pending
invitations set `created_at` and `expires_at` relative to `now` (`now` and `now + 7 days`,
satisfying `ck_invitations_max_lifetime`) so they remain unexpired on any run date — and
trigger-/routine-written `change_sets`, `change_set_signoffs` and `change_summaries` match
deterministically on all domain columns (`tenant_id`, `scope`, `kind`, `revision`,
`actor_kind`, `actor_person_id`/`actor_ref`, `idempotency_key`, `request_hash`, and
summary target/field/old/new values), excluding PostgreSQL-generated surrogate IDs,
transaction IDs and commit timestamps
**And** running with a different `--seed <int>` varies Faker-generated members and derived
invitation tokens while preserving the fixed named tenant and persona contracts

### S3: Seeded invitations uphold hash-only storage and surface local test tokens only on stdout

**Given** the seeded pending, revoked and expired invitations
**When** the seeder writes them to PostgreSQL and prints its local run summary
**Then** PostgreSQL stores only the SHA-256 hash (`token_hash`) of each deterministically
derived 256-bit token, and no raw token appears in any table column or in application
structured logs
**And** the CLI prints a concise local summary to stdout listing the seeded persona
accounts and pending invitation raw token(s) so developers can exercise local flows
directly

### S4: Five fail-closed safety guards refuse any non-local or non-superuser target

**Given** `tools.seed` invoked under any disallowed condition:

1. `ROADMAPS_ENV` unset, invalid or `production`;
2. any Cloud Run marker (`K_SERVICE`, `CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL`) set;
3. `ROADMAPS_ADMIN_DATABASE_URL` missing, malformed or carrying query parameters;
4. URL host not a loopback IP (`127.0.0.1` or `::1`); or
5. connected login not a superuser (`rolsuper`), verified on the same `hostaddr`-pinned
   SQLAlchemy connection (`connect_args={"hostaddr": parsed.host}`) that performs
   `TRUNCATE … CASCADE` and ORM seeding (no separate unpinned engine, proved by an
   integration test running a full seed with `PGHOSTADDR=192.0.2.1` set in the environment
   and confirming it still targets loopback)

**When** the seeder starts
**Then** it exits non-zero before truncating or writing anything, leaving existing rows
untouched, and logs via `log_config()` (`settings=None`, `messages=False`, logger under
`roadmaps_api.*`, matching `tools/bootstrap_database.py`) naming only the refused setting
or marker names — never their values or raw exception messages

### S5: Dev-only packaging keeps `faker` and seed fixtures out of `roadmaps_api` while tests reuse factories

**Given** `apps/api/pyproject.toml`, `apps/api/src/roadmaps_api/` and
`apps/api/tools/seed/`
**When** dependencies, imports and integration tests are checked
**Then** `faker` is declared only in `[dependency-groups].dev` (never
`[project.dependencies]`), nothing in `src/roadmaps_api/` imports `faker` or `tools.seed`,
integration tests can import and invoke the seed factories directly against a worker
database without auto-seeding empty-DB tests, and seeded rows satisfy `roadmaps_app`'s
real RLS policies (DHCW sees DHCW rows and never Cwm Aur-only people or identities)

## Decisions

- **D1** (owner, 2026-11-24, STY-091 review question, STY-091 D27): this story follows
  the first schema story, which creates `tenants`, so the DHCW tenant has a table to be
  seeded into, over a seeder with no factory or `tenants` in STY-091.
- **D2** (owner, 2026-11-27, grilling R1 #1a): seed every table `STY-103` creates across
  two tenants (DHCW plus a second Welsh health tenant), with shipped roles, full persona
  coverage, `local_mock` identities, sample invitations and real access history, over
  DHCW-only or tenant-only seeding.
- **D3** (owner, 2026-11-27, grilling R1 #2 / R2 #1a): build factories in Python with
  `STY-103`'s SQLAlchemy ORM models under local superuser (`ROADMAPS_ADMIN_DATABASE_URL`),
  writing every tenant-owned table through `STY-103`'s real access open/sign-off routines
  with all triggers active, over bypassing triggers with `session_replication_role`.
- **D4** (owner, 2026-11-27, grilling R1 #3a): truncate-and-reseed all `public` tables
  except `alembic_version` by default in one transaction (using
  `SET LOCAL session_replication_role = 'replica'` only for `TRUNCATE … CASCADE` around
  `STY-103`'s `forbid_immutable_history_mutation` trigger, then resetting to `'origin'`
  before seeding), over refusing without `--reset` or upserting around immutable history.
- **D5** (owner, 2026-11-27, grilling R1 #4a): deterministic content, deterministic UUIDv7
  IDs and deterministic anchor timestamps for ORM-written historical rows, with
  relative-to-now timestamps (`created_at = now`, `expires_at = now + 7 days` per
  `ck_invitations_max_lifetime`) only on live-pending invitations plus optional
  `--seed <int>` (PostgreSQL-generated `change_sets`/`change_set_signoffs`/
  `change_summaries` surrogate IDs, transaction IDs and commit timestamps stay native to
  `STY-103`'s `SECURITY DEFINER` routines and triggers), over a fully frozen clock
  (far-future expiries) or DB-generated IDs on all tables.
- **D6** (owner, 2026-11-27, grilling R1 #5a): place the seeder in `apps/api/tools/seed/`
  with `faker` in `[dependency-groups].dev` (out of `src/roadmaps_api/` and the production
  image, importable by `apps/api/tests/`), over stdlib-only pools or runtime packaging.
- **D7** (owner, 2026-11-27, grilling R1 #6a): `pnpm api:seed` runs `migrate` then seeds
  explicitly; `pnpm api:dev` stays `migrate`-only and never auto-seeds.
- **D8** (owner, 2026-11-27, grilling R1 #7b): seed Welsh data only for columns present in
  `STY-103`'s schema (bilingual tenant names and a Welsh names helper pattern); later
  schema stories (`EPC-026`) extend the seeder and Welsh phrase lists as they add tables.
- **D9** (owner, 2026-11-27, grilling R2 #2a): introduce the canonical `Permission`
  `StrEnum` and immutable `SHIPPED_ROLES` mapping (`MappingProxyType` /
  `frozenset[Permission]`) at `apps/api/src/roadmaps_api/authz/permissions.py` here (or
  reuse it if `STY-105` lands first) so `tools/seed/` holds zero raw permission literals
  and `STY-093` runs straight after `STY-103`; `STY-105` builds its policy and literal-ban
  check on it and `STY-104` reuses `SHIPPED_ROLES`.
- **D10** (owner, 2026-11-27, grilling R2 #3a): use a clearly fictional second Welsh
  health organisation (`cwm-aur` — _Cwm Aur Health Board_ / _Bwrdd Iechyd Cwm Aur_) beside
  DHCW, over a real NHS Wales health board name, so fake local data is never mistaken for
  real health board data.
- **D11** (owner, 2026-11-27, grilling R2 #4a): seed a fixed named persona roster (two
  DHCW Admins, Product Lead, Viewer, multi-tenant member, Cwm Aur-only Admin, ended member,
  disabled person) exporting canonical `local_mock` `(issuer, subject)` specs (with
  `issuer` pinned to a fixed non-HTTPS or loopback URL) for `STY-106` to import directly,
  plus a small Faker-generated batch of extra members using `.example` emails and
  `local_mock` identities.
- **D12** (owner, 2026-11-27, grilling R2 #5a): derive seeded invitation tokens
  deterministically from the seed, store only SHA-256 hashes in PostgreSQL (never in
  structured logs), and print a concise local summary (personas + pending invitation raw
  token(s)) to stdout.
- **D13** (owner, 2026-11-27, grilling R2 #6a): record bootstrap writes as
  `actor_kind = 'system'` (`actor_ref = 'seed'`) via `STY-103`'s
  `open_access_change_set_internal` / `sign_off_access_change_set_internal`, and follow-on
  admin actions (inviting, revoking, ending a membership) as `actor_kind = 'person'` via
  the primary DHCW Admin's `app.person_id` and `open_access_change_set` /
  `sign_off_access_change_set`, with `'seed'` entries in `platform_audit_log`.
- **D14** (owner, 2026-11-27, grilling R2 #7a): fail closed on all five safety guards
  (`ROADMAPS_ENV in {"local", "test"}`, no Cloud Run markers, valid URL without query
  params, loopback IP host, `rolsuper` verified on the `hostaddr`-pinned ORM engine itself)
  before touching the database.

## Out of scope

- Ahead-of-schema roadmap, item, list, scratch, snapshot and publication factories and
  Welsh roadmap phrase lists (`EPC-026` stories add them alongside their migrations).
- Local mock OIDC provider server, sign-in transactions and sessions (`STY-106`, which
  imports `tools/seed/`'s `local_mock` persona specs).
- Platform operator CLI commands (`STY-104`, which reuses `SHIPPED_ROLES`).
- Route authorisation policies, custom `APIRoute` class and permission-literal lint check
  (`STY-105`, which builds on `Permission` and `SHIPPED_ROLES`).
