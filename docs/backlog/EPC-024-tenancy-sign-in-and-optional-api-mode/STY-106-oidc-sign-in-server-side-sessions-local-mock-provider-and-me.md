# STY-106: OIDC sign-in, server-side sessions, local mock provider and `/me`

- **Status**: Proposed — grilled (D1–D15); selectable once STY-105 is Done
- **Type**: Feature
- **Area**: API + Infrastructure + CI/CD
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-093 (hard — exports canonical `local_mock` persona fixture specs
  from `tools/seed/`), STY-102 (hard — threat model written first, ADR-018 _EPC-024
  amendments_; cyber review runs in parallel and gates hosted deployment), STY-103
  (hard), STY-105 (hard)
- **Binding ADRs**: ADR-015 §Tenancy, §ADR-018 and ADR-019 amendments; ADR-017 §The
  contract with the editor, §Errors; ADR-018; ADR-019 §Enforcement; ADR-020
- **Suggested model**: Opus — OIDC/PKCE/JWKS security implementation, session cookies,
  definer functions and mock provider harness

## Summary

Implements server-side OpenID Connect sign-in and session management in the API. Adds the
`sign_in_transactions` and `sessions` shared tables with their dedicated-role definer
functions and read-only `person_select` RLS on `roles`/`role_permissions` (D7), an in-repo
loopback mock OIDC provider under `apps/api/tools/mock_oidc/` (strictly refused whenever
`K_SERVICE`, `CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL` or non-local settings apply; D5),
DHCW Google Workspace OIDC client using `authlib` + `httpx` (`hd` and `email_verified`
checked, full JWKS validation and key rollover; D4), `POST /api/v1/auth/sign-in`,
provider-specific callback `GET`, `GET /api/v1/me`, `POST /api/v1/auth/extend`,
`POST /api/v1/auth/sign-out`, `POST /api/v1/auth/sign-out-all`, structured security events,
and the retention purge CLIs (`roadmaps-purge-transactions`, `roadmaps-purge-sessions`;
D15). Regenerates OpenAPI and `packages/api-types` and maps every new error code in the
editor.

## Scope

Alembic migration for `sign_in_transactions` and `sessions` + definer functions +
`person_select` RLS on `roles` and `role_permissions`; `apps/api/tools/mock_oidc/`
loopback mock OIDC server wired into `apps/api/scripts/api.sh` and
`scripts/worktree/worktree.sh`; `apps/api/tools/seed/factories.py` factories for
`sign_in_transactions` and `sessions`; `apps/api/src/roadmaps_api/identity/` (only module
allowed by import-linter to import `authlib`/`httpx`, with `jose`/`python-jose` banned by
ruff); auth routes, session service (only module writing sessions), retention purge CLIs
sharing a thin runner module; OpenAPI and `packages/api-types` regeneration;
`apps/editor/src/infrastructure/roadmaps-api/api-error.ts` mappings; integration tests
covering every refused JWT claim, key rollover and idle/absolute session timeouts.

## Acceptance criteria

### S1: Sign-in start and callback establish an opaque server-side session

**Given** an existing, enabled person with a sign-in identity for the chosen provider
(local mock in local/test mode, or DHCW Google Workspace)
**When** the client posts `POST /api/v1/auth/sign-in` (with provider, purpose `sign-in`
and allow-listed return path), navigates to the returned authorisation URL, and completes
the provider's callback `GET /api/v1/auth/callback/{provider}`
**Then** the API sets a single-use 10-minute `__Host-` transaction cookie (`SameSite=Lax`,
carrying the local port after the `__Host-` prefix in local mode) on start, validates
`state`, PKCE `S256`, `nonce`, issuer, `aud`, `exp`/`iat` (≤ 60 s skew), `azp` where
present, `RS256` signature against cached JWKS (with rate-limited refetch on unknown
`kid`), Google `hd` allow-list and `email_verified=true`
**And** creates an opaque 256-bit session (storing only its SHA-256 hash, 60-minute idle
and 10-hour absolute expiry), refreshes the identity's display email/name and last
sign-in time, sets the `__Host-` `HttpOnly` `Secure` `SameSite=Strict` `Path=/` session
cookie (no expiry attribute, carrying the local port after the `__Host-` prefix in local
mode), and redirects to the static editor callback route
**And** a missing, expired, reused or cross-provider `state`, a refused claim, a disabled
person, or a person holding an Entra identity signing in with Google is refused, writes
no session, logs an allow-listed security event, and redirects to the editor error route
with a code

### S2: Uninvited sign-in writes no person record

**Given** a valid provider user whose `(issuer, subject)` has no person record
**When** they complete a `sign-in` callback without an invitation
**Then** no `people`, `identities` or `sessions` row is written, an allow-listed security
event is logged, and the callback redirects to the editor with the "not invited" error
code

### S3: `/me`, idle/absolute expiry, extend, sign-out and sign-out everywhere work

**Given** an active session cookie
**When** the client calls `GET /api/v1/me`, `POST /api/v1/auth/extend`,
`POST /api/v1/auth/sign-out` or `POST /api/v1/auth/sign-out-all`
**Then** `/me` returns the person's ID, display name, sign-in identities (provider,
email, last sign-in), active tenant memberships (tenant ID, slug, name, roles and
effective permissions as UI hints) and session idle/absolute expiry timestamps
**And** every authenticated request re-reads the session and person (refusing disabled
people immediately), updates `last_activity_at` at most once per minute, and refuses
sessions past either the 60-minute idle or 10-hour absolute limit with 401
**And** `extend` extends only the idle expiry (never past the 10-hour absolute limit);
`sign-out` revokes the current session and expires the cookie; `sign-out-all` revokes
every session for the person; next sign-in passes `prompt=select_account` to Google

### S4: Local mock OIDC provider cannot be admitted outside local/test

**Given** API settings with a non-HTTPS or loopback issuer, or the local mock provider
enabled
**When** `ROADMAPS_ENV` is production, unset or invalid, or any Cloud Run marker
(`K_SERVICE`, `CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL`) is set
**Then** the API refuses to start, naming the setting and never its value
**And** the local mock provider binds to loopback only and drives the exact same OIDC
code path locally and in CI

### S5: Retention purge CLI removes expired transactions and ended sessions

**Given** expired sign-in transactions (> 1 day) and ended sessions (> 30 days)
**When** the retention purge CLI runs
**Then** it deletes only records past their retention window through the dedicated
definer functions, leaving active and recent records untouched

## Open questions

_None — Q1–Q3 and the full design tree were settled in D4–D15._

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3, D5, D7, D14, D15): `/me` returns each active
  membership's single `NOT NULL` role (plus effective permission hints) and bilingual
  `nameEn` / optional `nameCy`. `STY-106` adds `sign_in_transactions`, `sessions` and its
  auth/purge definers (`roadmaps_auth_definer`, purge `EXECUTE` to `roadmaps_purge`),
  storing the canonical allow-listed issuer in `identities.issuer` (tested with `accounts.google.com`).
- **D2** (owner, 2026-11-26, `STY-108` review follow-up #1a): `GET /api/v1/me` returns
  active memberships in a fixed deterministic order (`memberships.id ASC,
memberships.tenant_id ASC`, using `STY-103` S1's `uuidv7()` primary key), verified by an
  integration test, so `/` redirection in `STY-109` is deterministic if dev/test data
  holds more than one membership.
- **D3** (owner, 2026-11-27, `STY-093` grilling R2 #4a): `STY-106`'s local mock OIDC
  provider uses the canonical `local_mock` persona fixture specs (`(issuer, subject)` with
  `issuer` pinned to a fixed non-HTTPS or loopback URL, email, display name) exported by
  `STY-093` under `tools/seed/` (imported directly under D5, plus `UNINVITED_PERSONA` with
  no database row) rather than duplicating subjects.
- **D4** (owner, 2026-11-27, `STY-106` grilling R2 #1a; settles Q1): Use `authlib` +
  `httpx` in `apps/api`'s runtime dependencies (`OAuth2Client` with PKCE `S256` and
  `CodeIDToken` claim validation), keeping `httpx2` in dev dependencies for Starlette's
  `TestClient`; add a thin cached JWKS fetcher that retains stale keys across provider
  outages with a rate-limited refetch on unknown `kid`, plus Google `hd` and
  `email_verified=true` checks. Ban `jose` / `python-jose` in ruff and confine
  `authlib`/`httpx` to `roadmaps_api.identity` and session writes to the session service
  via `import-linter`. Revisiting consolidation onto `httpx2` once `authlib` supports it
  is tracked in
  [CHO-055](../chores/CHO-055-revisit-consolidating-httpx-onto-httpx2-once-authlib-supports-it.md)
  (target revisit: January 2027).
- **D5** (owner, 2026-11-27, `STY-106` grilling R2 #2a & #5a; settles Q2; amends ADR-018):
  Implement the local mock OIDC provider as an in-repo Python/FastAPI service under
  `apps/api/tools/mock_oidc/` importing `LOCAL_MOCK_ISSUER`, `NAMED_PERSONAS` and
  `UNINVITED_PERSONA` directly from `apps/api/tools/seed/personas.py`, started as a
  separate loopback process on `127.0.0.1:${OIDC_PORT}` (offset 6 in
  `scripts/worktree/worktree.sh`, default `8001` outside a worktree) by
  `apps/api/scripts/api.sh` via `uv run --locked` rather than as a Compose container
  (pytest runs the same ASGI app on an ephemeral loopback port per worker). Serve an HTML
  persona picker for manual dev and Playwright E2E plus local-only `/_test/*` control
  endpoints (e.g. `POST /_test/rotate-key` and per-request fault presets) strictly inside
  `tools/mock_oidc/`.
- **D6** (owner, 2026-11-27, `STY-106` grilling R1 #3a): Require an explicit
  `ROADMAPS_EDITOR_ORIGIN` setting on startup (must be HTTPS outside `local`/`test`, and
  its host must appear in `ROADMAPS_ALLOWED_HOSTS` in `production`; `scripts/api.sh dev`
  defaults it to `http://localhost:${DEV_PORT}`, and preview/E2E passes `PREVIEW_PORT`).
  Build OIDC `redirect_uri`, post-callback redirects and local `__Host-` cookie port
  suffixes from `ROADMAPS_EDITOR_ORIGIN` without reading `Host` or `X-Forwarded-Host`
  (also reusable by `STY-104` for local invitation links).
- **D7** (owner, 2026-11-27, `STY-106` grilling R2 #3a; amends ADR-018): Add narrow
  read-only `person_select` RLS policies on `roles` and `role_permissions` (active only
  when `app.tenant_id IS NULL`, matching rows referenced by an active membership of
  `app.person_id`, mirroring `tenants` and `memberships`), and update
  `apps/api/tests/integration/test_rls_isolation.py` to prove a person sees only their own
  active memberships' roles and permissions. Keeps `GET /api/v1/me` a single ORM query
  without adding another `SECURITY DEFINER` routine.
- **D8** (owner, 2026-11-27, `STY-106` grilling R2 #4a): Require
  `ROADMAPS_GOOGLE_CLIENT_ID`, `ROADMAPS_GOOGLE_CLIENT_SECRET` and
  `ROADMAPS_GOOGLE_ALLOWED_HD` whenever `ROADMAPS_ENV=production` or any Cloud Run marker
  (`K_SERVICE`, `CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL`) is set, and make them
  all-or-nothing optional in `local` and `test`. `local_mock` and any non-HTTPS or
  loopback issuer remain strictly refused at startup outside `local`/`test` or on Cloud
  Run.
- **D9** (owner, 2026-11-27, `STY-106` grilling R1 #6a & R2 #7a; settles Q3 refusal
  codes): Callback success redirects `302` to `/#/auth/callback` (appending
  `?returnTo=<url-encoded path>` when `returnPath` was supplied and is not `/`); refusals
  redirect `302` to `/#/sign-in?error=<code>` with five closed codes: `not_invited`,
  `person_disabled`, `entra_required`, `sign_in_cancelled` (provider returned
  `error=access_denied`) and `sign_in_failed` (all other state/cookie/claim/domain/provider
  failures). `POST /api/v1/auth/sign-in` takes an optional `returnPath` (default `"/"`),
  validated as a strict internal relative SPA path starting with `"/"` (rejecting `"//"`,
  `"/\\"`, schemes/hosts, `#`, whitespace or control characters; max 512 characters),
  allowing query strings (e.g. `?view=compact`).
- **D10** (owner, 2026-11-27, `STY-106` grilling R1 #7a; settles Q3
  `prompt=select_account`; amends ADR-018): Always pass `prompt=select_account` to Google
  on every `POST /api/v1/auth/sign-in` (covering explicit sign-out, natural session expiry
  and `STY-108` Design 2B's `"Try a different account"` flow without extra cookie or
  request-flag state; a future per-account preference may be revisited after real user
  testing if Google sign-in is still active).
- **D11** (owner, 2026-11-27, `STY-106` grilling R1 #8a): Declare
  `POST /api/v1/auth/sign-out` (alongside `POST /api/v1/auth/extend`,
  `POST /api/v1/auth/sign-out-all` and `GET /api/v1/me`) under the `signed_in` route policy
  (requiring same-origin proof and `STY-105`'s person-assertion header on the three `POST`
  routes); `POST /api/v1/auth/sign-in` and `GET /api/v1/auth/callback/{provider}` join the
  reviewed `public` allow-list (with callback exempt from same-origin CSRF per
  ADR-018/ADR-020).
- **D12** (owner, 2026-11-27, `STY-106` grilling R1 #9a): Every authenticated request
  (including `GET /api/v1/me`) slides `idle_expires_at = LEAST(now() + interval '60
minutes', absolute_expires_at)` and updates `last_activity_at` at most once per minute
  (when `now() - last_activity_at >= interval '1 minute'`). `POST /api/v1/auth/extend`
  slides `idle_expires_at` immediately (bypassing the 1-minute throttle, still capped at
  `absolute_expires_at`) and returns `{ idleExpiresAt, absoluteExpiresAt }`.
- **D13** (owner, 2026-11-27, `STY-106` grilling R2 #6a; settles Q3 `/me` contract):
  `GET /api/v1/me` returns `{ personId, displayName, identities: [{ id, provider, email,
lastSignInAt, linkedAt }], memberships: [{ tenantId, tenantSlug, nameEn, nameCy, role:
{ id, name, systemKey }, permissions }], session: { idleExpiresAt, absoluteExpiresAt,
signedInAt, provider } }`, with `memberships` ordered `(memberships.id ASC,
memberships.tenant_id ASC)` (D2) and `permissions` sorted deterministically.
- **D14** (owner, 2026-11-27, `STY-106` grilling R1 #10a & R2 #8a): Create
  `sign_in_transactions` with the full ADR-018 columns and constraints up front (`purpose
IN ('sign_in', 'redeem', 'link')`, nullable `invitation_id` FK to `invitations`,
  nullable `initiating_session_id` / `initiating_person_id` with `CHECK` constraints tied
  to `purpose`), while `POST /api/v1/auth/sign-in` accepts only `purpose: "sign-in"` until
  `STY-110` and `EPC-028`. Add `create_session` and `create_sign_in_transaction` factories
  to `apps/api/tools/seed/factories.py` for tests; `pnpm api:seed` leaves both tables
  empty.
- **D15** (owner, 2026-11-27, `STY-106` grilling R1 #11b; refines S5; amends ADR-018):
  Expose separate single-purpose console scripts per retention table —
  `roadmaps-purge-transactions` (> 1 day past `expires_at`) and `roadmaps-purge-sessions`
  (> 30 days past `LEAST(COALESCE(revoked_at, absolute_expires_at), idle_expires_at,
absolute_expires_at)`) — sharing one thin reusable runner module, reading
  `ROADMAPS_PURGE_DATABASE_URL` (refused by the API's `load_settings()` just like
  `ROADMAPS_MIGRATION_DATABASE_URL`), invoking `roadmaps_auth_definer`'s purge functions
  under `roadmaps_purge`, and logging deleted row counts only via allow-listed JSON fields.
  (`STY-110` adds `roadmaps-purge-invitations` on the same shared runner.)

## Out of scope

- Testing mock-provider and non-HTTPS/loopback-issuer refusal against the built
  production container image: handed over to
  [EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md) (_The API's image
  and server_), where the Dockerfile and production image are built (ADR-018).
- Invitation redemption (`purpose=redeem`, `STY-110` in EPC-025).
- Microsoft Entra ID provider and identity linking (`purpose=link`, `EPC-028`).
- Editor sign-in UI (`STY-107`, `STY-109`).
