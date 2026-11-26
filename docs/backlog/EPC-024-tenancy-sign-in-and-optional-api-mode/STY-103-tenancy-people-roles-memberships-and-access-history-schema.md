# STY-103: Tenancy, people, roles, memberships and access-history schema

- **Status**: Proposed — grilled 2026-11-26; first schema migration creating `tenants`,
  identity/access tables, access-scope change sets and ADR-015's database enforcement suite
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: none (STY-091 is Done)
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions, §History, §What
  enforces this, §ADR-018 and ADR-019 amendments, §STY-102 amendments; ADR-017 §Schema
  conventions, §Migrations; ADR-018 §Records and retention; ADR-019 §The catalogue and
  the shipped roles, §Enforcement
- **Suggested model**: Opus — foundational schema, RLS policies, definer roles, commit
  function and immutability proofs

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
- **D3** (owner, 2026-11-26, grilling R1 #2b; overrides S1 and S3 `membership_roles` references
  and amends ADR-015 / ADR-018): each membership and each invitation carries a single `role_id`
  column with a composite `(tenant_id, role_id)` foreign key to `roles`, with no
  `membership_roles` or `invitation_roles` join tables in v1. Settles `STY-110` Q2 (single
  `roleId`) and `STY-113` Q1 (single-role picker).
- **D4** (owner, 2026-11-26, grilling R1 #3a): `tenants.slug` is `NOT NULL`, globally unique,
  lowercase ASCII letters, digits and hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), length 2–63.
- **D5** (owner, 2026-11-26, grilling R1 #4a): `tenants` stores bilingual display names
  (`name_en` required, `name_cy` optional), matching ADR-015's bilingual-column rule.
- **D6** (owner, 2026-11-26, grilling R1 #5a; aligns with D1 and refines S4): each of the
  three dedicated definer owner roles (`roadmaps_history_definer`, `roadmaps_auth_definer`,
  `roadmaps_platform_definer`) is held only by `roadmaps_owner` (`WITH INHERIT FALSE,
  SET TRUE, ADMIN FALSE`, beside the non-superuser runner's creator grant); `bootstrap.sql`
  allows `pg_proc` routines (and only routines) in `public` to be owned by these three roles.
- **D7** (owner, 2026-11-26, grilling R1 #6a; extends S4 and amends ADR-015 / ADR-017): add
  both `roadmaps_platform` and `roadmaps_purge` no-login caller roles to `bootstrap.sql` now
  (pairwise mutual exclusivity across `roadmaps_migrator`, `roadmaps_app`,
  `roadmaps_platform` and `roadmaps_purge`), and create local `roadmaps_platform_login` and
  `roadmaps_purge_login` in `tools/bootstrap_database.py`.
- **D8** (owner, 2026-11-26, grilling R1 #7a): memberships are soft-ended with
  `ended_at timestamptz NULL` and a partial unique index on
  `(tenant_id, person_id) WHERE ended_at IS NULL` (allowing future re-invitation).
  Active-access checks and the person-keyed `memberships` SELECT policy require
  `ended_at IS NULL`; `people`'s tenant SELECT policy permits active or ended members of
  `app.tenant_id` so historical change-set attribution stays readable after a member leaves.
- **D9** (owner, 2026-11-26, grilling R1 #8a; refines S2 and amends ADR-015): `identities`'s
  SELECT policy allows `roadmaps_app` to read rows where `person_id = app.person_id` or the
  person holds an active membership (`ended_at IS NULL`) in `app.tenant_id` (API enforces
  `members:manage`). `tenants`'s SELECT policy allows `id = app.tenant_id` or an active
  membership for `app.person_id`; `roadmaps_app` holds no write grants on `tenants`, `people`,
  `identities` or `platform_audit_log`.
- **D10** (owner, 2026-11-26, grilling R2 #2a; refines S1/S3 and amends ADR-015): access-scope
  `change_summaries` rows are derived automatically in PostgreSQL by triggers on `roles`,
  `role_permissions`, `memberships` and `invitations` from an explicit allow-list of
  non-secret columns (never recording `invitations.token_hash`). Scope locking and revision
  counters live in a tenant-owned `tenant_scopes` table (`(tenant_id, scope)` PK for `'access'`
  and `'lists'`).
- **D11** (owner, 2026-11-26, grilling R2 #1a): automate `ended_at IS NULL` in SQLAlchemy ORM
  queries with a `SoftEndMixin` and a `do_orm_execute` / `with_loader_criteria` session
  listener (bypassed explicitly via `.execution_options(include_ended=True)`), while
  PostgreSQL RLS policies enforce `ended_at IS NULL` independently in SQL.
- **D12** (owner, 2026-11-26, grilling R2 #3a): `change_sets` uses explicit `actor_kind`
  (`'person' | 'platform_job' | 'system'`) with mutually exclusive nullable `actor_person_id`
  (FK → `people.id`) and `actor_ref` text enforced by `CHECK`, and
  `UNIQUE (tenant_id, idempotency_key)` verifying `(actor_kind, actor_person_id, actor_ref,
  request_hash)` on replay. `invitations` uses the matching mutually exclusive nullable
  `invited_by_person_id` / `issued_by_platform_execution_id` (and `revoked_by_*`) pattern.
- **D13** (owner, 2026-11-26, grilling R2 #4a): `roles` carries a nullable `system_key`
  (`CHECK (system_key IN ('admin', 'product_lead', 'viewer'))`, partial-unique per tenant
  where not null) beside tenant-unique `name`; `role_permissions.permission` uses a format
  `CHECK` (`^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$`), keeping ADR-019's Python `Permission` enum
  as the single source of truth for rolling-deploy compatibility and `STY-105` S2.
- **D14** (owner, 2026-11-26, grilling R2 #5a): `invitations.provider` is checked against
  `('google', 'entra', 'local_mock')` (with API/CLI refusing `'local_mock'` outside
  local/test mode), while `identities.issuer` is non-empty `text` holding the exact OIDC
  issuer URL with `UNIQUE (issuer, subject)` and `UNIQUE (person_id, issuer)` per ADR-018.
  Pending-email uniqueness on `invitations` waits for `STY-110` Q1.
- **D15** (owner, 2026-11-26, grilling R2 #6a): `STY-103` ships only the access-scope
  change-set open/sign-off routines (owned by `roadmaps_history_definer`), SQLAlchemy models
  and minimal repository helpers for the enforcement suite, leaving platform procedures to
  `STY-104`, auth/session procedures to `STY-106` and invitation lookup/redemption procedures
  to `STY-110`. All SQL `RAISE EXCEPTION` calls use static messages and SQLSTATEs (ADR-018
  _STY-101 amendments_).

## Out of scope

- Sessions and sign-in transactions tables (`STY-106`).
- Roadmaps, items, lists, scratches, snapshots for roadmaps/lists and publications
  (`EPC-026`).
- Deterministic fake data seeding (`STY-093`, which immediately follows this story).
