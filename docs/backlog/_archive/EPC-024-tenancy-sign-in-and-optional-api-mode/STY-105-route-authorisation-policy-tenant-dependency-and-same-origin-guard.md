# STY-105: Route authorisation policy, tenant dependency and same-origin guard

- **Status**: Done — fail-closed route policy enforcement, tenant dependency, same-origin/JSON
  and person-assertion guards, permission-literal lint and standing authorisation suite
- **Type**: Feature
- **Area**: API + Infrastructure
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](../../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)
- **Depends on**: STY-103 (hard)
- **Binding ADRs**: ADR-017 §Errors, §Layering; ADR-018 §Sessions; ADR-019 §The catalogue
  and the shipped roles, §Enforcement; ADR-020
- **Suggested model**: Opus — security-critical authorisation boundary, fail-closed route
  registration and generated policy matrix

## Summary

Installs the authorisation and CSRF enforcement machinery that every API endpoint relies
on: ADR-019's typed `Permission` enumeration with code-level startup and per-read
role-permission validation, a custom `APIRoute` class that refuses to start if any route
lacks a declared policy (`public`, `signed_in`, `tenant_member`, or
`tenant_permission(Permission.…)`), the reviewed public-route allow-list, the tenant
dependency (returning 404 for non-members or unknown tenants and binding `app.tenant_id`
and `app.person_id`), ADR-018's person-assertion check on state-changing requests,
ADR-020's same-origin and `application/json` guard, and the generated role-by-route
matrix, cross-tenant sweep and permission-literal lint tests.

## Scope

`apps/api/src/roadmaps_api/authz/` (building on `STY-093`'s `permissions.py`: route policy
declarations, `PolicyAPIRoute` with same-origin and JSON guards, `verify_app_routes`,
`get_current_principal` seam, and `TenantContext` tenant dependency), `settings.py` +
`apps/api/scripts/api.sh` + `apps/api/tools/export_openapi.py` (`ROADMAPS_EDITOR_ORIGIN`),
`logs.py` (`ALLOWED_EXTRA_FIELDS` additions), `errors.py` (new auth/authz/CSRF/media-type
error codes), `apps/api/tools/check_permissions.py` (wired into `apps/api/package.json`
`lint`), OpenAPI + `packages/api-types` regeneration and
`apps/editor/src/infrastructure/roadmaps-api/api-error.ts` mapping, plus the standing
enforcement tests in `apps/api/tests/`.

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

_None — Q1–Q2 and the full design tree were settled in D1–D15._

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3, D8, D11, D13; amends S5 via ADR-019 _STY-103
  amendments_): `memberships.role_id` is `NOT NULL`, so S5's matrix tests `Viewer`, ended
  membership (`ended_at IS NOT NULL`, 404), and ended-Admin + active-Viewer resolving to
  Viewer. Tenant checks use the person-keyed policy or explicit `ended_at IS NULL`
  (tenant-keyed RLS returns ended rows); `role_permissions.permission` format `CHECK` enables S2 DB tests.
- **D2** (owner, 2026-11-26, `STY-108` review follow-up #2a; settles Q1a): tenant-scoped
  API routes identify the tenant by slug (`/api/v1/tenants/{tenantSlug}/…`), matching
  `STY-109` D3's `/$tenantSlug/…` editor routes so the editor calls tenant routes directly
  from the URL while the dependency resolves slug → `tenant_id` and returns 404 for
  unknown tenants or non-members.
- **D3** (owner, 2026-11-27, `STY-093` grilling R2 #2a): `STY-093` introduces the small
  canonical `Permission` `StrEnum` and immutable `SHIPPED_ROLES` mapping at
  `apps/api/src/roadmaps_api/authz/permissions.py` so `tools/seed/` holds zero raw
  permission literals and `STY-093` can run straight after `STY-103`; `STY-105` builds its
  route policy, startup role-permission validation and S2 permission-literal lint check
  (scanning `src/roadmaps_api/` and `tools/`) directly on that catalogue module (or
  introduces it if `STY-105` runs before `STY-093`).
- **D4** (owner, 2026-11-27, `STY-106` D6 & D12; refines S4): S4's read-only `GET`
  guarantee (no state-changing `GET` other than the OIDC callback) forbids domain and
  access writes while permitting authenticated session-activity bookkeeping
  (`sessions.last_activity_at` and `sessions.idle_expires_at` updated at most once per
  minute via `roadmaps_auth_definer`, ADR-018 / `STY-106` D12) **only** when a `GET` does
  not arrive from a cross-origin site (`Sec-Fetch-Site` is `same-origin` or absent, never
  `same-site` or `cross-site`, so a sibling host on the editor's registrable domain cannot
  keep a session's idle timer alive); S4's standing `GET` test distinguishes same-origin
  session bookkeeping from domain/access writes and proves a `same-site` or `cross-site`
  `GET` writes nothing at all.
- **D5** (owner, 2026-11-27, `STY-105` grilling R1 #1a; settles Q2): the person-assertion
  header is `X-Roadmaps-Person-Id` (UUID string), required on every authenticated
  non-`GET`/`HEAD`/`OPTIONS` route (`signed_in`, `tenant_member`, `tenant_permission`) and
  omitted/ignored on anonymous `public` calls (such as `POST /api/v1/auth/sign-in` for
  `purpose="sign-in"` or `"redeem"`) and safe-method routes. When Phase 2 identity linking
  (`EPC-028`) arrives, link start either uses its own `signed_in` route or explicitly
  enforces `X-Roadmaps-Person-Id` against the active session (refusing mismatches with
  `409 auth.person_mismatch`), preserving Flow C in `identity-threat-model.md`.
- **D6** (owner, 2026-11-27, `STY-105` grilling R1 #2a & R2 #2a): same-origin proof and
  JSON media-type checks run inside `PolicyAPIRoute.get_route_handler` (after routing,
  before body parsing and handler execution), and person-assertion runs in the route's
  auth dependency. This preserves RFC 9110 `405` (`Allow: GET` on `POST /health`,
  `Allow: POST` on `DELETE /test/echo`) and `404` on unknown paths while guaranteeing via
  D10's startup route check that no state-changing route can bypass `PolicyAPIRoute`;
  existing `POST /test/*` test helpers send `Sec-Fetch-Site: same-origin` (and
  `Content-Type: application/json` when exercising body parsing or the 413 body limit).
- **D7** (owner, 2026-11-27, `STY-105` grilling R1 #3a): introduce the required
  `ROADMAPS_EDITOR_ORIGIN` setting in `STY-105` (`scheme://host[:port]` bare origin with
  no path, query, fragment, userinfo or wildcard — tested per case in `test_settings.py`,
  stored in canonical form with lowercase scheme/host, no default `:80`/`:443` port and
  no trailing slash for exact string matching; requiring `https` and a host in
  `ROADMAPS_ALLOWED_HOSTS` whenever `ROADMAPS_ENV` is `production`, unset/invalid or any
  Cloud Run marker `K_SERVICE`, `CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL` is set). Teach
  `apps/api/scripts/api.sh` to read `DEV_PORT` from `.env.worktree` via
  `worktree_value DEV_PORT` (falling back to `5173` only outside a worktree, mirroring
  `API_PORT`/`DB_PORT`) and export `ROADMAPS_EDITOR_ORIGIN="http://localhost:$DEV_PORT"`
  in `api.sh dev` (verified by a check that a worktree's `DEV_PORT` reaches the setting),
  and set `editor_origin` in `tools/export_openapi.py` and test settings. On every
  non-`GET`/`HEAD`/`OPTIONS` route: if `Sec-Fetch-Site` is present it must equal
  `same-origin` (never falling back to `Origin` on `cross-site`/`same-site`/`none`), and
  if `Origin` is also present it must equal `ROADMAPS_EDITOR_ORIGIN`; if `Sec-Fetch-Site`
  is absent, `Origin` must be present and equal `ROADMAPS_EDITOR_ORIGIN`; duplicate
  `Sec-Fetch-Site` or `Origin` headers are refused.
- **D8** (owner, 2026-11-27, `STY-105` grilling R1 #4a & R2 #4a): on non-`GET`/`HEAD`/
  `OPTIONS` routes, any route declaring a request body parameter requires
  `Content-Type: application/json` (allowing parameters such as `; charset=utf-8`) upfront
  before body parsing, preventing any unlabelled body from reaching body parsing on routes
  expecting JSON; bodyless routes (`POST`/`DELETE` with no body parameter) allow omitted
  `Content-Type` only when `Content-Length` is absent or `"0"` and `Transfer-Encoding` is
  absent, and still refuse any non-JSON `Content-Type` (such as `text/plain`,
  `application/x-www-form-urlencoded`, or `multipart/form-data`) or non-zero/chunked body
  without `application/json`. FastAPI's native `strict_content_type=True` stays enabled as
  defence-in-depth.
- **D9** (owner, 2026-11-27, `STY-105` grilling R1 #5a): add five `ErrorCode`s in
  `apps/api/src/roadmaps_api/errors.py`, regenerated into OpenAPI / `@roadmaps/api-types`,
  and mapped in `apps/editor/src/infrastructure/roadmaps-api/api-error.ts`:
  - `401 auth.unauthenticated` → `unauthenticated` (`retryable: false`)
  - `403 authz.forbidden` → `forbidden` (`retryable: false`)
  - `403 request.origin_not_allowed` → `unknown` (`retryable: false`)
  - `415 request.unsupported_media_type` → `unknown` (`retryable: false`)
  - `409 auth.person_mismatch` (missing, malformed or disagreeing `X-Roadmaps-Person-Id`
    on authenticated state-changing routes) → `unauthenticated` (`retryable: false`)

  Starlette's `RequestBodyLimitMiddleware` answers any declared `Content-Length` above
  `max_body_bytes` with plain-text `413` ahead of every route refusal (replacing even a
  403/415 response). Otherwise, because FastAPI's `get_request_handler` reads and
  JSON-decodes declared bodies before `solve_dependencies` runs auth dependencies (bounded
  by the 1 MiB body limit with zero session or tenant state leakage), matched routes
  evaluate in fixed order:
  `same-origin (403) → content-type (415) → streamed body read / JSON decode (413 / 400 / 422 json_invalid) → auth (401) → person-assertion (409) → tenant/permission (404 / 403) → Pydantic body validation (422)`.
  Auth/person-assertion and tenant dependencies read `X-Roadmaps-Person-Id` from
  `request.headers` and `tenantSlug` from `request.path_params` directly (never validated
  `Header()`/`Path()` parameters) so missing/malformed values do not bypass `401`/`409`/
  `404` with `422`. S5's anonymous matrix sends well-formed JSON bodies on body routes so
  it proves `401`.

- **D10** (owner, 2026-11-27, `STY-105` grilling R1 #6a): enforce route policies
  default-deny at both registration and app assembly:
  - Every API route declares exactly one policy (`public()`, `signed_in()`,
    `tenant_member()`, or `tenant_permission(Permission.…)`), checked in
    `PolicyAPIRoute.__init__` (refusing missing, duplicate or invalid policies).
  - `create_app` sets `app.router.route_class = PolicyAPIRoute` and calls
    `verify_app_routes(app)`, inspecting both `fastapi.routing.iter_route_contexts(app.routes)`
    and `app.router._iter_low_priority_routes()`.
  - `verify_app_routes(app)` is strictly default-deny: a route passes **only** as either
    (1) a `PolicyAPIRoute` with a non-empty method set subset of
    `{"GET", "POST", "PUT", "PATCH", "DELETE"}` (refusing `methods=[]`, `HEAD`, `OPTIONS`,
    and any other method), checking `{tenantSlug}` against effective
    `RouteContext.path_format` (supporting include-time prefixes such as
    `include_router(..., prefix="/tenants/{tenantSlug}")`) and checking `public()` routes
    against `PUBLIC_ROUTES`; or (2) a plain Starlette `Route` with a non-`None`,
    non-empty method set whose every `(method, path)` appears in `PUBLIC_ROUTES` —
    specifically `("GET", "/health")`, `("GET", "/ready")`, plus FastAPI's local
    `/api/v1/openapi.json` (`GET` and `HEAD`) when `serves_live_openapi` is true. Every
    other route object (`Mount`, `Host`, `WebSocketRoute`, plain `APIRoute`, unknown
    classes) is refused regardless of class, and `_iter_low_priority_routes()` must be
    empty (refusing every `frontend()` route). S1 tests register `app.frontend(...)`, a
    nested router's `frontend(...)`, `app.host(...)`, `methods=[]` on a `PolicyAPIRoute`,
    and a plain `Route` with `methods=None`, proving startup raises for each. Test helpers
    that register `/test/*` routes after `create_app` declare `public()`.
- **D11** (owner, 2026-11-27, `STY-105` grilling R1 #7a; amends ADR-019): keep
  `create_app` offline (no DB connection at startup) and stay within forced RLS without
  adding a cross-tenant definer. Validate code-level `SHIPPED_ROLES` against `Permission`
  at startup; at runtime, whenever the tenant dependency loads a role's `role_permissions`
  rows, parse every row through `Permission(raw)` and, if any unknown permission string is
  present, log an allow-listed `authz.unknown_permission` event (adding `tenant_id` and
  `role_id` to `ALLOWED_EXTRA_FIELDS` in `logs.py`, never logging the raw unknown string;
  alerting target for `EPC-023`) and fail closed with `403 authz.forbidden` on both
  `tenant_member` and `tenant_permission` routes. Deploy ordering consequence (recorded in
  ADR-019): a permission enters the code catalogue one release before any migration writes
  it into `role_permissions`, and leaves `role_permissions` one release before leaving
  code.
- **D12** (owner, 2026-11-27, `STY-105` grilling R2 #8a): the tenant dependency provides a
  frozen `TenantContext` (`tenant_id`, `tenant_slug`, `person_id`, `role_id`,
  `permissions`) with a pre-bound `open_session() -> Session` factory configured with
  `info=session_info(tenant_id=..., person_id=...)`, matching `ReadinessService`'s
  `sessionmaker` pattern so services own transaction boundaries cleanly under ADR-017
  _Layering_ and `tools/check_transactions.py`.
- **D13** (owner, 2026-11-27, `STY-105` grilling R2 #9a): implement S2's permission-literal
  source check as standalone AST script `apps/api/tools/check_permissions.py` (mirroring
  `tools/check_transactions.py`), scanning `src/roadmaps_api/` and `tools/` (excluding
  `src/roadmaps_api/authz/permissions.py` and docstrings) for any code string literal
  matching a `Permission` catalogue value, wired into `apps/api/package.json`'s `lint`
  script and unit-tested in `apps/api/tests/test_check_permissions.py`.
- **D14** (owner, 2026-11-27, `STY-105` grilling R2 #10a): expose one session-authenticator
  seam dependency `get_current_principal` returning `AuthenticatedPrincipal(person_id,
session_id)` or raising `401 auth.unauthenticated` (default stub raises `401` in
  `STY-105`; tests inject principals via FastAPI's native
  `app.dependency_overrides[get_current_principal]`; `STY-106` wires real cookie-hash
  session lookup and `people.disabled_at IS NULL` verification once in
  `get_current_principal`, with no redundant `people` query in the tenant dependency).
- **D15** (owner, 2026-11-27, `STY-105` grilling R2 #11a): drive S5's standing
  role-by-route matrix, cross-tenant sweep and S4's read-only `GET` test from a
  fail-closed route-spec registry walking every effective route on `create_app(...)` (plus
  a minimal test-only probe router in `STY-105` covering `public`, `signed_in`,
  `tenant_member`, `tenant_permission(...)` and a tenant write route), failing immediately
  if any newly added route lacks an entry in the suite's call-spec table (or allow-listed
  OIDC callback exemption for S4).

## Out of scope

- Real OIDC sign-in and session lookup (`STY-106`, which plugs into the session
  authenticator dependency established here).
- Object-level assignment and retired-roadmap checks (`EPC-026`).

## Delivery

### Departures

None. All acceptance criteria (S1–S5) and decisions (D1–D15) were implemented as specified.

### Contract for dependents

- **Route policies and `PolicyAPIRoute` (`roadmaps_api.authz`)**:
  - Every API router must set `route_class=PolicyAPIRoute` (as `probes.router` and
    `api_v1.router` do; `create_app` also sets `app.router.route_class = PolicyAPIRoute`).
  - Every route declares exactly one policy: `public()`, `signed_in()`, `tenant_member()`,
    or `tenant_permission(Permission.…)`. `verify_app_routes(app)` runs during `create_app`
    and refuses unclassified/duplicate/invalid policies, router-level or include-time
    dependencies placed ahead of the policy, body parameters inherited solely from a router
    include, empty or disallowed HTTP methods, tenant routes missing `{tenantSlug}`,
    unlisted `public()` routes, plain `APIRoute`s, `PolicyAPIRoute` subclasses, `Mount`,
    `Host`, `WebSocketRoute`, `frontend()`/low-priority routes and any plain Starlette
    `Route` whose explicit methods are not all in the active public allow-list.
  - Adding a new public endpoint (such as `STY-106`'s OIDC start/callback) adds its
    `(method, path)` to `PUBLIC_ROUTES` in `apps/api/src/roadmaps_api/authz/routing.py`
    and its call spec to `CALL_SPECS` (and `READ_ONLY_GET_EXEMPTIONS` for the callback) in
    `apps/api/tests/integration/test_authorisation.py`.
- **Session-authenticator seam and person assertion (`roadmaps_api.authz`)**:
  - `get_current_principal(request: Request) -> AuthenticatedPrincipal(person_id, session_id)`
    raises `401 auth.unauthenticated` by default; tests override it via
    `app.dependency_overrides[get_current_principal]`. `STY-106` wires cookie-hash session
    lookup and `people.disabled_at IS NULL` verification here.
  - `require_asserted_person` enforces `X-Roadmaps-Person-Id` (`PERSON_ASSERTION_HEADER`)
    on every authenticated non-`GET`/`HEAD`/`OPTIONS` route (`409 auth.person_mismatch`).
- **Tenant context (`roadmaps_api.authz`)**:
  - `CurrentTenant` (`resolve_tenant_context`) resolves `{tenantSlug}` from
    `request.path_params` against active memberships (`ended_at IS NULL`) via person-scoped
    RLS, reads `role_permissions` under tenant-scoped RLS, validates every row against
    `Permission` (logging `authz.unknown_permission` with `tenant_id`, `role_id` and `code`
    only and failing closed with `403 authz.forbidden` on unknown values), and returns a
    frozen `TenantContext(tenant_id, tenant_slug, person_id, role_id, permissions)` with
    `open_session() -> Session` pre-bound to `(tenant_id, person_id)`.
- **Settings and error codes**:
  - `ROADMAPS_EDITOR_ORIGIN` is required (`Settings.editor_origin`, canonical bare origin;
    HTTPS + `ROADMAPS_ALLOWED_HOSTS` membership enforced in production, unset/invalid
    `ROADMAPS_ENV` or on Cloud Run). `apps/api/scripts/api.sh dev` reads `DEV_PORT` from
    `.env.worktree` (falling back to `5173` outside a worktree) and exports
    `ROADMAPS_EDITOR_ORIGIN="http://localhost:$DEV_PORT"`.
  - Five `ErrorCode`s added in `errors.py`, exported to `apps/api/openapi.json` and
    `packages/api-types/src/generated/`, and mapped in
    `apps/editor/src/infrastructure/roadmaps-api/api-error.ts`: `auth.unauthenticated`
    (401), `auth.person_mismatch` (409), `authz.forbidden` (403),
    `request.origin_not_allowed` (403) and `request.unsupported_media_type` (415).
- **Permission-literal lint (`apps/api/tools/check_permissions.py`)**:
  - Runs inside `pnpm api:lint`, scanning `src/roadmaps_api/` and `tools/` (excluding
    `src/roadmaps_api/authz/permissions.py` and docstrings) for raw permission literals.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/api/tests/test_route_policies.py` (`test_create_app_runs_startup_policy_and_shipped_role_checks`, `test_every_route_on_create_app_is_classified_and_public_routes_match_allow_list`, `test_policy_api_route_refuses_missing_duplicate_or_invalid_policy`, `test_policy_api_route_refuses_empty_or_disallowed_methods`, `test_verify_app_routes_refuses_every_illicit_route`; test-first)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S2       | `apps/api/tests/test_check_permissions.py` (`tools/check_permissions.py` wired into `pnpm api:lint`), `apps/api/tests/test_permissions.py` (`test_validate_shipped_roles_accepts_the_catalogue_and_rejects_corrupted_roles`), `apps/api/tests/integration/test_authorisation.py` (`test_unknown_permission_in_role_fails_closed_without_logging_raw_value`; test-first)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S3       | `apps/api/tests/integration/test_authorisation.py` (`test_tenant_dependency_scopes_session_and_isolates_roles_across_tenants`, `test_tenant_context_is_frozen_and_never_leaks_rls_across_pooled_connections`, `test_tenant_dependency_fails_closed_if_route_lacks_tenant_slug`, `test_tenant_and_permission_checks_run_before_body_validation`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S4       | `apps/api/tests/test_settings.py` (`ROADMAPS_EDITOR_ORIGIN` canonicalisation/strict checks; test-first), `apps/api/tests/test_api_script.py` (`api.sh` `DEV_PORT` wiring), `apps/api/tests/test_route_policies.py` (`test_enforce_same_origin_rules`, `test_same_origin_guard_runs_on_every_non_safe_method`, `test_same_origin_guard_uses_configured_editor_origin`, `test_enforce_json_media_type`, `test_json_media_type_guard_wiring_for_body_and_bodyless_routes`, `test_person_assertion_header_on_authenticated_state_changing_routes`, `test_guard_and_dependency_evaluation_order_on_authenticated_body_route`, `test_wrong_method_still_answers_405_with_allow_header_before_guards`), `apps/api/tests/integration/test_authorisation.py` (`test_every_non_get_route_refuses_missing_same_origin_proof`, `test_every_non_exempt_get_route_makes_no_domain_write_and_cross_site_writes_nothing`, `test_read_only_get_detector_catches_every_write_kind`), `apps/editor/src/infrastructure/roadmaps-api/api-error.test.ts` |
| S5       | `apps/api/tests/integration/test_authorisation.py` (`test_call_specs_registry_is_fail_closed_for_unregistered_routes`, `test_generated_role_by_route_matrix_exercises_every_route_and_principal`, `test_cross_tenant_sweep_returns_404_and_changes_nothing`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
