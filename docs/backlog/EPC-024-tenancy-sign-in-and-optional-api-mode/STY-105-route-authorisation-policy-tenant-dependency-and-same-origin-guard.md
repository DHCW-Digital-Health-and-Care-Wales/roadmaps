# STY-105: Route authorisation policy, tenant dependency and same-origin guard

- **Status**: Needs grilling — establishes ADR-019's fail-closed route policy
  enforcement, tenant path dependency and ADR-020's same-origin CSRF guard before domain
  routes land
- **Type**: Feature
- **Area**: API + Infrastructure
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-103 (hard)
- **Binding ADRs**: ADR-017 §Errors, §Layering; ADR-018 §Sessions; ADR-019 §The catalogue
  and the shipped roles, §Enforcement; ADR-020
- **Suggested model**: Opus — security-critical authorisation boundary, fail-closed route
  registration and generated policy matrix

## Summary

Installs the authorisation and CSRF enforcement machinery that every API endpoint relies
on: ADR-019's typed `Permission` enumeration and startup role-permission validation, a
custom `APIRoute` class that refuses to start if any route lacks a declared policy
(`public`, `signed_in`, `tenant_member`, or `tenant_permission(Permission.…)`), the
reviewed public-route allow-list, the tenant dependency (returning 404 for non-members or
unknown tenants and binding `app.tenant_id` + `app.person_id`), ADR-018's person-assertion
check on state-changing requests, ADR-020's same-origin and `application/json` guard, and
the generated role-by-route matrix, cross-tenant sweep and permission-literal lint tests.

## Scope

`apps/api/src/roadmaps_api/authz/` (permission enum, policy declarations, custom route
class, tenant dependency), `apps/api/src/roadmaps_api/middleware.py` (same-origin CSRF
and content-type check), `errors.py` (new auth/authz/CSRF error codes), OpenAPI +
`packages/api-types` regeneration and `apps/editor/src/infrastructure/roadmaps-api/api-error.ts`
mapping, plus the standing enforcement tests in `apps/api/tests/`.

## Acceptance criteria

### S1: Every route declares one policy or the app refuses to start

**Given** the FastAPI application using the custom policy `APIRoute` class
**When** a route is registered without a declared policy (or with an invalid policy)
**Then** application startup raises immediately
**And** a standing test walks every route on the app (mounted routes included) and fails
if any route is unclassified or if any `public` route is not in the reviewed allow-list
(currently `/health`, `/ready`, and local `/api/v1/openapi.json` when enabled)

### S2: Permission catalogue is typed and never referenced as raw strings

**Given** the `Permission` `StrEnum` holding ADR-019's ten permissions
**When** the API's tests and lint run
**Then** a source-level check fails if any permission string literal appears outside the
catalogue module
**And** reading a tenant role containing an unknown permission name fails closed and logs
an allow-listed security/error event without granting access

### S3: Tenant dependency isolates tenants and returns 404 on non-membership

**Given** an authenticated principal (injected via a test/session seam wired to real
sessions in `STY-106`) calling a tenant-scoped route
**When** the principal is a member holding the required permission, a member lacking it,
a non-member, or an anonymous caller
**Then** the allowed member receives a session scoped to `(tenant_id, person_id)`; a
member lacking the permission gets 403 (`authz.forbidden`); a non-member or unknown
tenant gets 404 (`request.not_found`, never leaking existence); and an anonymous caller
gets 401 (`auth.unauthenticated`)

### S4: Same-origin proof, JSON content type and person assertion guard state-changing routes

**Given** any non-`GET`/`HEAD`/`OPTIONS` route (and every `GET` except the future OIDC
callback is tested to make no write)
**When** called without `Sec-Fetch-Site: same-origin` (or matching `Origin` when Fetch
Metadata is absent), with a non-`application/json` body when a body is sent, or (on an
authenticated route) with a missing or disagreeing asserted-person header compared to the
authenticated session's person
**Then** the API refuses with a documented `ErrorCode` in ADR-017's envelope, mapped in
`apps/editor/src/infrastructure/roadmaps-api/api-error.ts`

### S5: Generated role-by-route matrix and cross-tenant sweep stand ready

**Given** the shipped roles (Admin, Product Lead, Viewer), a member with no role, a
non-member and an anonymous caller
**When** the standing authorisation test suite runs
**Then** it automatically exercises every registered route against every principal class
and verifies cross-tenant requests return 404 and change nothing (using a minimal
test-only probe router until real routes land in `STY-106` and `EPC-025`)

## Open questions

- **Q1**: Should tenant-scoped routes identify the tenant by **slug** (`/api/v1/tenants/{tenantSlug}/…`) or **UUID** (`/api/v1/tenants/{tenantId}/…`)?
  - (a) Tenant slug (`/api/v1/tenants/{tenantSlug}/…`) (recommended) — matches readable
    editor URLs (e.g. `#/dhcw/members`) and lets the editor call tenant routes straight
    from the URL without an extra lookup, while the dependency resolves slug → `tenant_id`
    and returns 404 if unknown or non-member.
  - (b) Tenant UUID (`/api/v1/tenants/{tenantId}/…`) — immune to future tenant slug
    changes; editor URLs either show UUIDs or map slug ↔ UUID from `/me`.
- **Q2**: Which request header should carry the person ID the editor believes is signed
  in on state-changing requests (ADR-018 _Sessions_)?
  - (a) `X-Roadmaps-Person-Id` (required on every authenticated state-changing route,
    omitted on anonymous sign-in start) (recommended) — explicit, single-purpose, easy to
    enforce in one middleware/dependency and never collides with standard headers.
  - (b) A field inside every state-changing JSON body — pollutes every request schema and
    doesn't work on bodyless `POST`/`DELETE` endpoints (like sign-out or revoke).

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3, D8, D11, D13; amends S5 via ADR-019 _STY-103
  amendments_): `memberships.role_id` is `NOT NULL`, so S5's matrix tests `Viewer`, ended
  membership (`ended_at IS NOT NULL`, 404), and ended-Admin + active-Viewer resolving to
  Viewer. Tenant checks use the person-keyed policy or explicit `ended_at IS NULL`
  (tenant-keyed RLS returns ended rows); `role_permissions.permission` format `CHECK` enables S2 DB tests.

## Out of scope

- Real OIDC sign-in and session lookup (`STY-106`, which plugs into the session
  authenticator dependency established here).
- Object-level assignment and retired-roadmap checks (`EPC-026`).
