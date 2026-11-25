# STY-106: OIDC sign-in, server-side sessions, local mock provider and `/me`

- **Status**: Needs grilling — delivers ADR-018's confidential OIDC client (Google
  Workspace + local mock), opaque PostgreSQL sessions, `/me`, extend, sign-out and
  retention purge CLI
- **Type**: Feature
- **Area**: API + Infrastructure + CI/CD
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-103 (hard), STY-105 (hard), STY-102 (preferred order — threat
  model drafted first; cyber review gates deployment, ADR-018 _EPC-024 amendments_)
- **Binding ADRs**: ADR-015 §Tenancy, §ADR-018 and ADR-019 amendments; ADR-017 §The
  contract with the editor, §Errors; ADR-018; ADR-019 §Enforcement; ADR-020
- **Suggested model**: Opus — OIDC/PKCE/JWKS security implementation, session cookies,
  definer functions and mock provider harness

## Summary

Implements server-side OpenID Connect sign-in and session management in the API. Adds the
`sign_in_transactions` and `sessions` shared tables with their dedicated-role definer
functions, a local mock OIDC provider in Compose (strictly refused whenever `K_SERVICE`,
`CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL` or non-local settings apply), DHCW Google
Workspace OIDC client (`hd` and `email_verified` checked, full JWKS validation and key
rollover), `POST /api/v1/auth/sign-in`, provider-specific callback `GET`, `GET /api/v1/me`,
`POST /api/v1/auth/extend`, `POST /api/v1/auth/sign-out`, `POST /api/v1/auth/sign-out-all`,
structured security events, and the retention purge CLI. Regenerates OpenAPI and
`packages/api-types` and maps every new error code in the editor.

## Scope

Alembic migration for `sign_in_transactions` and `sessions` + definer functions; Compose
mock OIDC service; `apps/api/src/roadmaps_api/identity/` (only module allowed by
import-linter to import the OIDC library, with `python-jose` banned by ruff); auth
routes, session service (only module writing sessions), retention purge CLI; OpenAPI and
`packages/api-types` regeneration; `apps/editor/src/infrastructure/roadmaps-api/api-error.ts`
mappings; integration tests covering every refused JWT claim, key rollover, timeouts and
`disable-person` session revocation (`STY-104`).

## Acceptance criteria

### S1: Sign-in start and callback establish an opaque server-side session

**Given** an existing, enabled person with a sign-in identity for the chosen provider
(local mock in local/test mode, or DHCW Google Workspace)
**When** the client posts `POST /api/v1/auth/sign-in` (with provider, purpose `sign-in`
and allow-listed return path), navigates to the returned authorisation URL, and completes
the provider's callback `GET /api/v1/auth/callback/{provider}`
**Then** the API sets a single-use 10-minute `__Host-` transaction cookie (`SameSite=Lax`,
port-prefixed locally) on start, validates `state`, PKCE `S256`, `nonce`, issuer, `aud`,
`exp`/`iat` (≤ 60 s skew), `RS256` signature against cached JWKS (with rate-limited
refetch on unknown `kid`), Google `hd` allow-list and `email_verified=true`
**And** creates an opaque 256-bit session (storing only its SHA-256 hash, 60-minute idle
and 10-hour absolute expiry), refreshes the identity's display email/name and last
sign-in time, sets the `__Host-` `HttpOnly` `Secure` `SameSite=Strict` `Path=/` session
cookie (no expiry attribute), and redirects to the static editor callback route
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

- **Q1**: Which Python OIDC/JWT library should `apps/api` adopt (with `python-jose`
  banned per ADR-018)?
  - (a) `authlib` (JWT/JWS + OIDC helpers) or `PyJWT[crypto]` + `httpx` (for discovery &
    JWKS) — recommended: `PyJWT[crypto]` + `httpx` (small, mature, explicit control over
    pinned discovery, JWKS cache/rollover rate limit and `RS256` allow-list; `httpx` is
    already idiomatic in FastAPI).
  - (b) `authlib` — broader OAuth feature set, larger surface area to audit and pin.
- **Q2**: How should the local mock OIDC provider in Compose be provided?
  - (a) A tiny, deterministic in-repo Python/FastAPI mock OIDC server container (or script
    in Compose) supporting multiple seeded personas (Admin, Product Lead, Viewer,
    Uninvited) with real RSA signing keys and key-rollover test endpoints (recommended) —
    zero third-party image supply-chain risk, full control over claims (`hd`,
    `email_verified`, `nonce`, `sub`) for both local dev and Playwright E2E.
  - (b) A third-party mock OIDC container image (e.g. `dex` or `mock-oauth2-server`) —
    less code to maintain, adds an external container image and trickier claim/rollover
    scripting.

## Decisions

_Recorded during grilling._

## Out of scope

- Invitation redemption (`purpose=redeem`, `STY-110` in EPC-025).
- Microsoft Entra ID provider and identity linking (`purpose=link`, `EPC-028`).
- Editor sign-in UI (`STY-107`, `STY-109`).
