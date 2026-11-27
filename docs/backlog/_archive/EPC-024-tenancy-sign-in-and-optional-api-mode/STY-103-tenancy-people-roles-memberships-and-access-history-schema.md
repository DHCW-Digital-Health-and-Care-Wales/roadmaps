# STY-103: Tenancy, people, roles, memberships and access-history schema

- **Status**: Done — eight no-login roles in `bootstrap.sql` (four local logins),
  migration `0002_tenancy_and_access_schema`, SQLAlchemy models with `SoftEndMixin`,
  `AccessChangeSetRepository`, and PostgreSQL 18 RLS, immutability and commit-guard
  enforcement suite
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](../../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)
- **Depends on**: none (STY-091 is Done)
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions, §History, §What
  enforces this, §ADR-018 and ADR-019 amendments, §STY-102 amendments, §STY-103
  amendments; ADR-017 §Schema conventions, §Migrations, §STY-103 amendments; ADR-018
  §Records and retention, §STY-103 amendments; ADR-019 §The catalogue and the shipped
  roles, §Enforcement, §STY-103 amendments
- **Suggested model**: Opus — foundational schema, RLS policies, definer roles, commit
  function and immutability proofs
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/336

## Summary

Creates the database tables, roles, row-level security policies, access-scope change-set
commit function and enforcement tests that every later API story stands on: `tenants`,
`people`, `identities`, `roles`, `role_permissions`, `memberships`, `invitations`,
`change_sets`, `change_summaries` (for access scope), and `platform_audit_log`, plus the
dedicated no-login roles for ADR-018 definer functions and ADR-019 platform jobs. Ships
SQLAlchemy models matching the migrations and real-PostgreSQL proofs for cross-tenant
isolation, unset-tenant fail-closed, immutability and commit-function sign-off. No HTTP
routes yet.

## Scope

`apps/api/src/roadmaps_api/bootstrap.sql`, Alembic revision `0002_…`, SQLAlchemy models
and repositories, and the real-PostgreSQL enforcement test suite under
`apps/api/tests/integration/`. No HTTP routes and no editor changes.

## Acceptance criteria

### S1: Core shared and tenant-owned tables exist with ADR-015 constraints

**Given** a migrated database
**When** the schema is inspected and compared to SQLAlchemy `Base.metadata`
**Then** it holds shared tables (`tenants`, `people`, `identities`, `platform_audit_log`)
and tenant-owned tables (`roles`, `role_permissions`, `memberships`, `membership_roles`,
`invitations`, `change_sets`, `change_summaries`) using `uuidv7()` keys, `timestamptz`
in UTC, `CHECK` constraints (no native enums), composite `(tenant_id, …)` foreign keys
between tenant-owned tables, and unique `(issuer, subject)` on `identities`
**And** every table except `alembic_version` has row-level security enabled and forced,
with policies matching ADR-015 _Tenancy_ and _ADR-018 and ADR-019 amendments_
**And** `roadmaps_app` holds only the exact table and routine grants it needs, with no
`TRUNCATE`, `REFERENCES`, DDL or `PUBLIC` routine `EXECUTE`

### S2: Tenant isolation and shared-table policies fail closed

**Given** two tenants, each with people, identities, roles, memberships and invitations
**When** queries run as `roadmaps_app` with `app.tenant_id` unset, set to tenant A, or
set to tenant B (and with `app.person_id` unset or set)
**Then** an unset tenant reads and writes zero tenant-owned rows; tenant A cannot read or
write tenant B's rows; people and identities belonging only to tenant B are invisible to
tenant A; and the person-keyed memberships policy is read-only
**And** `app.tenant_id` and `app.person_id` never leak across transactions on a pooled
connection

### S3: Access writes require a signed-off change set and history is immutable

**Given** a tenant with an access scope lock and revision counter
**When** a transaction writes to a tenant's access tables (`memberships`,
`membership_roles`, `roles`, `invitations`) through the `SECURITY DEFINER` commit
function
**Then** it records a completed `change_set` (with idempotency key + request hash
enforcement, incrementing access revision) and its summary
**And** triggers refuse at commit a write outside a completed change set, at once a write
after sign-off, and at once a write outside the change set's scope
**And** `roadmaps_app` cannot `UPDATE`, `DELETE` or `TRUNCATE` `change_sets`,
`change_summaries` or `platform_audit_log`
**And** a retried change set with the same key, tenant, person and request hash returns
its first result without writing; the same key with another payload is refused

### S4: Dedicated no-login roles exist for definer functions and platform jobs

**Given** `bootstrap.sql` run locally and in CI (and tested as superuser and Cloud SQL
non-superuser administrator, matching STY-091 S1)
**When** ADR-018's dedicated definer role(s) and ADR-019's platform caller role are
inspected
**Then** none owns any database, schema, table, sequence or unrelated object, nor holds
`LOGIN`, `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB`, `REPLICATION`, or `CREATE`
on any database or schema after migration completes
**And** ADR-018's dedicated no-login definer role owns **only** its reviewed
`SECURITY DEFINER` routines (never `roadmaps_owner`, which holds DDL rights), has only
`roadmaps_owner` as a member (`SET`, no `INHERIT`, so no runtime role can assume it),
receives only the minimal table grants and RLS policies scoped to it that those routines
need, and `bootstrap.sql`'s checks and integration tests assert that exact ownership,
membership and privilege set
**And** ADR-019's platform caller role (separate from `roadmaps_app` and purge jobs) owns
no objects, is a member of no other role, and holds only `CONNECT`, `USAGE` and `EXECUTE`
on the platform definer procedures (with no direct table write grants); who owns the
platform definer procedures is settled in Q4

## Decisions

- **D1** (owner, 2026-11-26, `STY-102` D13; settles former Q4 and extends S4): every
  `SECURITY DEFINER` routine on ADR-015's closed list is owned by a dedicated no-login
  definer role owning only its routines and holding no `CREATE` on any database or
  schema once migration completes — never by `roadmaps_owner` (`roadmaps_auth_definer`
  for ADR-018 auth/purge routines, `roadmaps_history_definer` for the change-set
  commit/sign-off routines and future `EPC-026` redaction procedure, and
  `roadmaps_platform_definer` for ADR-019 platform procedures; ADR-015 _STY-102
  amendments_). S4's checks and integration tests assert that ownership, membership and
  privilege bound across all three definer roles.
- **D2** (owner, 2026-11-26, grilling R1 #1a): create `invitations` in `STY-103` alongside
  `memberships` and `roles`, so `STY-104` and `STY-093` have it immediately and access-scope
  commit triggers cover all access tables from day one.
- **D3** (owner, 2026-11-26, grilling R1 #2b + review follow-up #1a; overrides S1/S3
  `membership_roles`; amends ADR-015, ADR-018, ADR-019): `memberships.role_id` and
  `invitations.role_id` are single `NOT NULL` composite FKs `(tenant_id, role_id)` to
  `roles` (no join tables in v1). Settles `STY-110` Q2 and `STY-113` Q1; `ADR-019` /
  `STY-105` test `Viewer` and an ended membership instead of a roleless membership.
- **D4** (owner, 2026-11-26, grilling R1 #3a): `tenants.slug` is `NOT NULL`, globally unique,
  lowercase ASCII letters, digits and hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), length 2–63.
- **D5** (owner, 2026-11-26, grilling R1 #4a): `tenants` stores bilingual display names
  (`name_en` required, `name_cy` optional), matching ADR-015's bilingual-column rule.
- **D6** (owner, 2026-11-26, grilling R1 #5a + review follow-up #3a; refines D1 and S4,
  resolving S4's former Q4 reference; amends ADR-015): each definer owner role is held only
  by `roadmaps_owner` (`SET`, no `INHERIT`, beside the non-superuser runner's creator grant);
  `bootstrap.sql` allows `pg_proc` routines (only) in `public` owned by them. Splits future
  `EPC-026` redaction onto `roadmaps_redaction_definer` so `roadmaps_history_definer` stays append-only.
- **D7** (owner, 2026-11-26, grilling R1 #6a; extends S4; amends ADR-015, ADR-017): add
  `roadmaps_platform` and `roadmaps_purge` caller roles to `bootstrap.sql` (pairwise mutual
  exclusivity across all four caller roles) and local `roadmaps_platform_login` and
  `roadmaps_purge_login` in `tools/bootstrap_database.py`.
- **D8** (owner, 2026-11-26, grilling R1 #7a): soft-end memberships with
  `ended_at timestamptz NULL` and partial unique `(tenant_id, person_id) WHERE ended_at IS NULL`.
  `people`'s tenant `SELECT` policy permits active or ended members of `app.tenant_id` so
  historical change-set attribution stays readable after a member leaves.
- **D9** (owner, 2026-11-26, grilling R1 #8a; refines S2; amends ADR-015): `identities`
  `SELECT` allows `person_id = app.person_id` or an active member (`ended_at IS NULL`) in
  `app.tenant_id` (API enforces `members:manage`). `tenants` `SELECT` allows `id = app.tenant_id`
  or an active member (`app.person_id`); `roadmaps_app` holds no writes on `tenants`, `people`,
  `identities` or `platform_audit_log`.
- **D10** (owner, 2026-11-26, grilling R2 #2a + review follow-up #2b, #3a; refines S1/S3;
  amends ADR-015, ADR-018): `tenant_scopes` (`(tenant_id, scope)` PK) holds `'access'`/`'lists'`
  locks and revisions. `SECURITY DEFINER` summary triggers (`roadmaps_history_definer`, added
  to ADR-015's closed list, no caller `EXECUTE`) derive access `change_summaries` from columns
  neither secret nor direct PII (`person_id` keys kept; no `token_hash` or `invitations.email`).
- **D11** (owner, 2026-11-26, grilling R2 #1a + review follow-up): `SoftEndMixin` + SQLAlchemy
  `do_orm_execute` / `with_loader_criteria` filters `ended_at IS NULL` on ORM `select(Membership)`
  (opt-out: `.execution_options(include_ended=True)`). Tenant-keyed `memberships` RLS stays
  `TENANT_POLICY` (so `UPDATE ended_at`, `include_ended=True` and `people` RLS work); RLS enforces
  `ended_at IS NULL` on person-keyed `memberships`, `tenants` and `identities` policies.
- **D12** (owner, 2026-11-26, grilling R2 #3a + review follow-up; refines S3): `change_sets`
  uses `actor_kind` (`'person' | 'platform_job' | 'system'`) + mutually exclusive
  `actor_person_id`/`actor_ref` and `UNIQUE (tenant_id, idempotency_key)` checking
  `(actor_kind, actor_person_id, actor_ref, request_hash)`; `invitations` uses matching
  inviter/revoker columns. App commit routine derives `'person'` from `app.person_id` only.
- **D13** (owner, 2026-11-26, grilling R2 #4a): `roles` carries nullable `system_key`
  (`'admin' | 'product_lead' | 'viewer'`, partial-unique per tenant) beside tenant-unique
  `name`; `role_permissions.permission` uses format `CHECK` (`^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$`),
  keeping ADR-019's `Permission` enum as the single source of truth for rolling deploys and `STY-105` S2.
- **D14** (owner, 2026-11-26, grilling R2 #5a + review follow-up): `invitations.provider` checks
  `('google', 'entra', 'local_mock')` (API/CLI refuses `'local_mock'` outside local/test);
  `identities.issuer` stores the canonical allow-listed issuer matched by the callback (never
  raw `accounts.google.com`), with `UNIQUE (issuer, subject)` and `UNIQUE (person_id, issuer)`.
  Pending-email uniqueness on `invitations` waits for `STY-110` Q1.
- **D15** (owner, 2026-11-26, grilling R2 #6a): `STY-103` ships only access-scope open/sign-off
  and summary trigger routines (`roadmaps_history_definer`), SQLAlchemy models and minimal
  enforcement-suite helpers; platform, auth/session and invitation procedures belong in
  `STY-104`, `STY-106` and `STY-110`. All SQL `RAISE EXCEPTION` calls use static messages/SQLSTATEs.
- **D16** (owner, 2026-11-26, review follow-up #2b, #3a; extends S3; amends ADR-015):
  `roadmaps_app` holds no `INSERT` on `change_sets`/`change_summaries` and no `DELETE` on
  `invitations`; S3 proves direct inserts, non-person change sets and platform-issued invitations
  by `roadmaps_app` are refused. `roadmaps_auth_definer`'s 90-day invitation purge (`DELETE`)
  is exempt from the access commit-guard and summary triggers.

## Out of scope

- Sessions and sign-in transactions tables (`STY-106`).
- Roadmaps, items, lists, scratches, snapshots for roadmaps/lists and publications
  (`EPC-026`).
- Deterministic fake data seeding (`STY-093`, which immediately follows this story).

## Delivery

### Departures

- Added internal append-only sign-off ledger table `change_set_signoffs` (`(tenant_id,
change_set_id)` PK, forced RLS, zero `roadmaps_app` grants, `SELECT`/`INSERT` only for
  `roadmaps_history_definer`) so `roadmaps_history_definer` remains strictly append-only
  (zero `UPDATE`/`DELETE` grants on history, D6) while tracking sign-off in a row only it
  writes without trusting any `set_config` setting (ADR-015 _History_ and _What enforces
  this_).
- Added `opened_xid` on `change_sets` and `signed_off_xid` on `change_set_signoffs` as
  `text` storing `pg_current_xact_id()::text` so SQLAlchemy/Alembic metadata reflection
  produces zero `SAWarning`s under `filterwarnings = ["error"]`.
- `guard_access_working_write()` runs as an `AFTER` immediate trigger (ordered before
  `record_access_change_summary()` via `01`/`02` trigger prefixes) so `CHECK` constraints
  and RLS `WITH CHECK` policies evaluate first, while still refusing unopened,
  post-sign-off and out-of-scope writes immediately during the statement.
- Person-keyed `SELECT` policies on `memberships` and `tenants` also require
  `NULLIF(current_setting('app.tenant_id', true), '') IS NULL` so a multi-tenant person
  acting inside Tenant A never sees Tenant B's membership or tenant rows even if a query
  omits a `WHERE tenant_id` filter.
- `forbid_immutable_history_mutation()` runs `BEFORE UPDATE OR DELETE OR TRUNCATE FOR EACH
STATEMENT` on `change_sets`, `change_summaries`, `change_set_signoffs` and
  `platform_audit_log` as `SECURITY INVOKER` (owned by `roadmaps_owner`, since it only
  raises), failing immediately even when RLS hides rows; the superuser test harness
  (`tests/harness.py:empty_tables`) uses `SET LOCAL session_replication_role = 'replica'`
  inside a transaction for between-test teardown without adding any superuser exemption to
  production SQL.
- `roadmaps_app` receives `SELECT` only on fixed v1 `roles` and `role_permissions`
  (ADR-019 Option 3; platform and migration paths write them), no `INSERT` and
  column-scoped `UPDATE (role_id, ended_at, updated_at)` on active `memberships` only
  (ADR-018: invitation redemption via `roadmaps_auth_definer` is the only runtime path
  that creates memberships), and column-scoped `INSERT` (excluding `id`, `created_at` and
  `updated_at`; RLS `app_insert` and `CHECK` constraints enforce `NULL` terminal/platform
  columns) plus column-scoped revocation `UPDATE` on pending person-issued `invitations`
  (bounded by `ck_invitations_max_lifetime` at `7 days 5 minutes`).
- Every function created in `0002` pins `SET search_path = pg_catalog, public, pg_temp`
  (with `pg_temp` last, preventing unqualified-object shadowing).

### Contract for dependents

- **Roles (`apps/api/src/roadmaps_api/roles.py`, `bootstrap.sql`, `tools/bootstrap_database.py`)**:
  eight no-login roles (`roadmaps_owner`, caller roles `roadmaps_migrator`, `roadmaps_app`,
  `roadmaps_platform`, `roadmaps_purge`, and definer owner roles `roadmaps_auth_definer`,
  `roadmaps_history_definer`, `roadmaps_platform_definer`) and four local password logins
  (`roadmaps_migrator_login`, `roadmaps_app_login`, `roadmaps_platform_login`,
  `roadmaps_purge_login`).
- **Schema (`0002_tenancy_and_access_schema`, `apps/api/src/roadmaps_api/models.py`)**:
  shared tables `tenants`, `people`, `identities`, `platform_audit_log`; tenant-owned
  tables `tenant_scopes`, `roles`, `role_permissions`, `memberships` (`SoftEndMixin`),
  `invitations`, `change_sets`, `change_summaries`, `change_set_signoffs`.
- **Soft-ended memberships (`database.py:create_sessions`)**: ORM selects on `SoftEndMixin`
  automatically filter `ended_at IS NULL`; pass `.execution_options(include_ended=True)`
  to include ended rows. Tenant-keyed `SELECT` RLS on `memberships` stays `TENANT_POLICY`,
  so raw SQL and the last-admin guard (`STY-111`) must filter `ended_at IS NULL` explicitly.
- **Access change sets (`repositories/access_change_set.py`)**: services running as
  `roadmaps_app` call `AccessChangeSetRepository(session, tenant_id).open(...)` before
  updating active `memberships` (`role_id`/`ended_at`/`updated_at`) or inserting/revoking
  person-issued `invitations` (`roles` and `role_permissions` are `SELECT`-only for
  `roadmaps_app` in v1; memberships are inserted only via `roadmaps_auth_definer`
  redemption in `STY-110` or owner/internal paths), and `.sign_off(id)` before committing.
  Internal non-person/platform/redemption definers (`STY-104`, `STY-110`, future
  migrations) call `open_access_change_set_internal(...)` and
  `sign_off_access_change_set_internal(...)` (executable only by `roadmaps_owner`,
  `roadmaps_auth_definer` and `roadmaps_platform_definer`).
- **`platform_audit_log`**: `action` checks `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` and
  `target_type` checks `^[a-z][a-z0-9_]*$`; `STY-104` and `STY-106` add role-scoped
  `INSERT` grants and RLS policies for `roadmaps_platform_definer` / `roadmaps_auth_definer`.
- **Invitation 90-day purge (`STY-110`)**: `DELETE` on `invitations` running with
  `current_user = 'roadmaps_auth_definer'` bypasses access commit-guard and summary
  triggers via trigger `WHEN` clauses; `STY-110` adds the `DELETE` grant, policy and
  purge definer routine.
- **Threat model**: `TM-56` in `docs/analysis/identity-threat-model.md` promoted to
  `Mitigated`, and `TM-54` updated to reflect the eight-role split.

### Scenario evidence

- **TDD slices**:
  - Slice 1 (S4 roles & bootstrap): updated `test_bootstrap.py` and `test_readiness.py`
    first to fail on the missing roles and logins, then implemented `bootstrap.sql`,
    `roles.py` and `tools/bootstrap_database.py` until green.
  - Slice 2 (S1–S3 schema, RLS, access change sets): wrote `test_schema_and_privileges.py`
    first to fail on the missing tables and privileges, then implemented `models.py`,
    `database.py`, `repositories/access_change_set.py` and
    `0002_tenancy_and_access_schema.py`, followed by `test_rls_isolation.py` and
    `test_access_change_sets.py`.
  - Slice 3 (review hardening): added regressions for NULL `revoked_by_kind` on revoked
    invitations, transitive caller-role overlap, `SELECT`-only `roles`/`role_permissions`,
    and column-scoped/pending-only `invitations` `UPDATE` before tightening `0002`,
    `models.py` and `bootstrap.sql`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/api/tests/integration/test_schema_and_privileges.py`, `apps/api/tests/integration/test_migrations.py` (`compare_metadata` & `alembic check` zero drift, no `PUBLIC` routine `EXECUTE`)                                                                                                                                                                                                                                  |
| S2       | `apps/api/tests/integration/test_rls_isolation.py`, `apps/api/tests/integration/test_tenancy.py` (unset fail-closed, cross-tenant A/B including multi-tenant user, `people`/`identities` rules, `SoftEndMixin`, `pool_size=1` no-leak)                                                                                                                                                                                        |
| S3       | `apps/api/tests/integration/test_access_change_sets.py` (open/sign-off, two change sets in one tx, unopened/unsigned-at-commit/post-sign-off/out-of-scope refusals, idempotency replay/conflict/retry, immutability for `roadmaps_app` and `roadmaps_owner`, allow-listed summaries omitting `email`/`token_hash`, non-person & platform-invitation refusals, `roadmaps_auth_definer` purge exemption, static SQL exceptions) |
| S4       | `apps/api/tests/integration/test_bootstrap.py` (superuser & Cloud SQL non-superuser runner, 8 roles, 4 local logins, pairwise caller exclusivity, definer ownership & no-`CREATE` bounds), `apps/api/tests/integration/test_readiness.py` (refuses migrator/platform/purge logins), `apps/api/tests/integration/test_schema_and_privileges.py` (post-migration definer/caller bounds and live platform/purge login denials)   |
