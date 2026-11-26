# STY-111: Tenant members list, role changes and membership removal API

- **Status**: Needs grilling — delivers ADR-019's member listing (scoped by
  `members:manage`), shipped-role listing, role updates and membership removal with the
  last-admin guard
- **Type**: Feature
- **Area**: API + Infrastructure
- **Epic**: [EPC-025-tenant-members-and-invitations](README.md)
- **Depends on**: STY-105 (hard), STY-106 (hard)
- **Binding ADRs**: ADR-015 §People, access and permissions, §History; ADR-017 §Errors,
  §The contract with the editor; ADR-019 §The catalogue and the shipped roles, §What
  members and assigned leads may do, §Keeping access current, §Enforcement
- **Suggested model**: Opus — permission-scoped projection, concurrency-safe last-admin
  lock and access change sets

## Summary

Adds the tenant member and role management endpoints in the API: listing the tenant's
shipped roles (so the Admin UI populates role pickers from the API), listing tenant
members (returning names and roles to every member, and additionally email addresses and
last sign-in timestamps only to holders of `members:manage`, per ADR-019 Option 9),
updating a member's role, and ending a membership. Every write runs under the tenant's
access scope lock, records an access change set with idempotency, enforces the last-admin
guard (refusing to remove or demote the tenant's only Admin), and takes effect on the
member's very next request.

## Scope

API routes, services and repositories under `apps/api/src/roadmaps_api/`, OpenAPI and
`packages/api-types` regeneration, `api-error.ts` mappings, and integration +
role-by-route matrix + cross-tenant sweep + concurrency tests. No editor screens yet
(`STY-113`).

## Acceptance criteria

### S1: Every member sees member names and roles; only `members:manage` sees emails and last sign-in

**Given** a tenant with Admins, Product Leads and Viewers
**When** a Product Lead or Viewer calls `GET /api/v1/tenants/{tenantSlug}/members`
**Then** the response returns each active member's ID, display name and roles — with no
email address or last sign-in timestamp
**And** when a Tenant Admin holding `members:manage` calls the same endpoint, the
response also includes each member's identity email address(es) and latest sign-in
timestamp (plus last access-review confirmation date once `STY-114` adds it)
**And** non-members receive 404

### S2: Tenant Admins list available roles and update a member's roles as an access change set

**Given** a Tenant Admin holding `members:manage`
**When** they list the tenant's roles and update a member's role(s) (e.g. Viewer →
Product Lead, or Product Lead → Admin)
**Then** the API validates every role belongs to the tenant, writes the change as a
completed access change set under the access scope lock, and the member's permissions
reflect the change on their very next request
**And** a Product Lead or Viewer attempting to change roles receives 403

### S3: Tenant Admins can end a membership, never leaving the tenant with zero Admins

**Given** a Tenant Admin holding `members:manage`
**When** they remove another member (or remove/demote an Admin while at least one other
Admin remains)
**Then** the membership ends immediately as a completed access change set, and that
person's next request to the tenant receives 404
**And** when attempting to remove or demote the tenant's **last** Admin — including two
Admins racing concurrently to remove/demote each other — the access scope lock ensures at
least one Admin survives and the second operation is refused with a dedicated error code
(`member.last_admin`)

## Open questions

- **Q1**: Should the single `GET /api/v1/tenants/{tenantSlug}/members` endpoint return a
  nullable/omitted `email` and `lastSignInAt` for non-admins (or discriminated summary vs
  admin detail), or should there be a separate admin-only endpoint?
  - (a) One endpoint returning a clear union/optional `adminDetails` (present only when
    the caller holds `members:manage`, omitted otherwise) (recommended) — one URL, one
    authorisation policy (`tenant_member`) with explicit service-level field projection
    tested in the role matrix so no sensitive field ever leaks to non-admins.
  - (b) Two endpoints (`/members` and `/admin/members`) — separates schemas cleanly,
    doubles client fetching and cache invalidation.
- **Q2**: Can a Tenant Admin remove **themselves** if another Admin exists, or should
  self-removal also be refused?
  - (a) Allow self-removal when another Admin exists (with explicit UI confirmation in
    `STY-113`), refusing only when they are the last Admin (recommended) — matches
    ADR-019's exact rule ("the API refuses to end the last admin's membership or remove
    their role").
  - (b) Forbid self-removal completely — prevents accidental lock-out if a second Admin
    is inactive, requires another Admin to remove a departing Admin.
- **Q3**: Does a **disabled** person (disabled via `STY-104`'s `disable-person` platform
  job) count toward the last-admin guard?
  - (a) Count only **enabled** Admins (recommended) — prevents the sole working Admin
    from removing or demoting themselves when the only other Admin is disabled and cannot
    sign in.
  - (b) Count all Admin memberships regardless of disabled state — simpler query, allows
    a tenant to lock itself out until a platform operator intervenes.

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3, D8, D9, D11, D13): memberships carry one
  `NOT NULL role_id` and soft-end via `ended_at`. Tenant-keyed `memberships` RLS returns
  ended rows (`SoftEndMixin` filters ORM selects; raw SQL and the last-admin guard filter
  `ended_at IS NULL` explicitly, tested against ended Admin rows). `identities` RLS allows
  active tenant members (`members:manage` in service); Admin is `roles.system_key = 'admin'`.

## Out of scope

- Showing "who leads which roadmap" per member (arrives when roadmap assignments exist in
  `EPC-026`).
- Six-monthly access review confirmation endpoint (`STY-114`).
- Deleting a member's scratch when their membership ends (wired in `EPC-026` once
  scratches exist, per ADR-015).
