# STY-103: Tenancy, people, roles, memberships and access-history schema

- **Status**: Needs grilling — first schema migration creating `tenants`, identity/access
  tables, access-scope change sets and ADR-015's database enforcement suite
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: none (STY-091 is Done)
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions, §History, §What
  enforces this, §ADR-018 and ADR-019 amendments; ADR-017 §Schema conventions,
  §Migrations; ADR-018 §Records and retention; ADR-019 §The catalogue and the shipped
  roles, §Enforcement
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
**When** ADR-018's definer role and ADR-019's platform role are inspected
**Then** neither owns schema objects or holds `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`,
`CREATEDB` or `REPLICATION`, and each holds only the minimal grants its procedures need

## Open questions

- **Q1**: Should `invitations` be created in `STY-103` alongside `memberships` and
  `roles`, or deferred to `STY-110`?
  - (a) Create `invitations` in `STY-103` (recommended) — `STY-104`'s platform CLI
    ("create tenant and invite its first admin") needs `invitations` immediately, so
    having it in `STY-103` avoids an extra dependency between `STY-104` and `STY-110`.
  - (b) Defer `invitations` to `STY-110` — keeps `STY-103` slightly smaller, but forces
    `STY-104`'s first-admin invitation to wait for `STY-110`.
- **Q2**: Should a member hold **one role** or **multiple roles** per tenant in the
  schema?
  - (a) A `membership_roles` join table supporting one or more roles per membership
    (recommended) — matches ADR-015 ("with the roles they hold there") and ADR-018 ("the
    roles" on an invitation), while the first UI can offer a single-role picker if desired
    without schema rework later.
  - (b) A single `role_id` column on `memberships` — simpler queries today, requires a
    migration if a tenant ever adds custom composable roles later.
- **Q3**: How should `tenants.slug` (the public address / URL identifier) be constrained?
  - (a) Lowercase ASCII letters, digits and hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), length
    2–63, globally unique (e.g. `dhcw`) (recommended) — safe in URL paths and future
    public-site addresses, matches short-name address style.
  - (b) UUID-only in editor URLs with an optional separate public slug later — avoids
    slug renames affecting editor links, less readable URLs.

## Decisions

_Recorded during grilling._

## Out of scope

- Sessions and sign-in transactions tables (`STY-106`).
- Roadmaps, items, lists, scratches, snapshots for roadmaps/lists and publications
  (`EPC-026`).
- Deterministic fake data seeding (`STY-093`, which immediately follows this story).
