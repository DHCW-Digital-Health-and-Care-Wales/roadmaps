# STY-107: Editor optional API mode, reshaped AuthClient and stub roadmap repository

- **Status**: Needs grilling — introduces build-time `VITE_DATA_SOURCE=sheets|api`,
  reshapes `AuthClient` without tokens, adds `ApiAuthClient` and a stub
  `ApiRoadmapRepository` failing cleanly on unimplemented roadmap/list calls
- **Type**: Refactor + Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy)
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-106 (hard)
- **Binding ADRs**: ADR-002, ADR-008, ADR-017 §Errors, §The contract with the editor;
  ADR-018 §The editor; ADR-020
- **Suggested model**: Opus — reshapes the editor's core `AuthClient` port and
  composition root while keeping the deployed Sheets mode 100% intact

## Summary

Lets the editor run optionally against the backend API (`VITE_DATA_SOURCE=api`) while
keeping Google Sheets as the default deployed mode (`VITE_DATA_SOURCE=sheets` or unset).
Reshapes `AuthClient` so no access token leaves the port (keeping GIS token plumbing
private to the Sheets adapters inside `composeApp`), adds an `ApiAuthClient` backed by
`/api/v1/me` and `/api/v1/auth/*` plus a same-origin API HTTP client (attaching
`X-Roadmaps-Person-Id` per `STY-105` D5 on authenticated state-changing calls and routing
errors through `toApiError`), and wires a stub `ApiRoadmapRepository` whose unimplemented roadmap and list calls reject
with a dedicated "not yet available" error kind in English and Welsh so existing screens
fail cleanly until `EPC-026` and `EPC-027` implement them.

## Scope

`apps/editor/src/app/config.ts`, `apps/editor/src/app/composition.ts`,
`apps/editor/src/domain/auth/auth-client.ts`, `apps/editor/src/lib/errors.ts`,
`apps/editor/src/infrastructure/roadmaps-api/` (HTTP client, `ApiAuthClient`, stub
`ApiRoadmapRepository`, removing its temporary `knip.jsonc` ignore),
`apps/editor/src/infrastructure/google-identity/` (keeping token getter internal to
`composeApp`), `apps/editor/src/i18n/locales/{en,cy}.ts`, and a root/editor dev script
(e.g. `pnpm editor:dev:api`). No new routes or redesigned screens yet (`STY-109`).

## Acceptance criteria

### S1: Build-time `VITE_DATA_SOURCE` selects Sheets (default) or API cleanly

**Given** the editor's config parser (`parseConfig`) and `composeApp`
**When** `VITE_DATA_SOURCE` is unset or `"sheets"`
**Then** Google Sheets env vars are validated and `composeApp` wires the Google Sheets
and GIS adapters with zero behaviour change to existing tests or GitHub Pages builds
**And** when `VITE_DATA_SOURCE="api"`, Google Sheets env vars are not required and
`composeApp` wires `ApiAuthClient` and `ApiRoadmapRepository` against same-origin
`/api/v1` paths (no API URL env var, ADR-020)
**And** any other value of `VITE_DATA_SOURCE` fails config validation immediately

### S2: `AuthClient` holds no access token and supports identity/tenant metadata in API mode

**Given** the reshaped `AuthClient` port in `apps/editor/src/domain/auth/auth-client.ts`
**When** used by either the Sheets or API adapter
**Then** `getAccessToken` is removed from `AuthClient` (the Sheets adapter receives its
token reader privately inside `composeApp`)
**And** `AuthState` represents both the Sheets connection and an API authenticated
session (person ID, display name, memberships with tenant slug/name/roles/permissions,
idle and absolute expiry timestamps) cleanly without leaking API wire types out of
`infrastructure/`

### S3: API HTTP client enforces same-origin, person assertion and generated-schema parsing

**Given** the new HTTP client in `apps/editor/src/infrastructure/roadmaps-api/`
**When** it calls `/api/v1/*` endpoints
**Then** responses are parsed with `@roadmaps/api-types` `zod/mini` schemas (malformed
successes become `invalid-response`), non-2xx responses go through `toApiError` (with
401 reporting unauthenticated), fetch failures become retryable `network`, aborted
requests rethrow abort, and every authenticated state-changing call sends
`Content-Type: application/json` and the signed-in person assertion header settled in
`STY-105` Q2 (ADR-018)

### S4: Stub `ApiRoadmapRepository` fails unimplemented calls cleanly in English and Welsh

**Given** the editor running with `VITE_DATA_SOURCE=api` and a signed-in session
**When** a user visits an unimplemented existing feature (Roadmaps list, Roadmap detail,
Families)
**Then** `ApiRoadmapRepository` rejects with a non-retryable `not-implemented` `AppError`
kind, and the screen displays its standard error panel with clear English and Welsh copy
(reviewed via the `copywriter` skill) saying the feature is not yet available in API mode
rather than crashing or looping

## Open questions

- **Q1**: Should the editor have a convenience dev script `pnpm editor:dev:api` (setting
  `VITE_DATA_SOURCE=api`) beside `pnpm editor:dev`?
  - (a) Yes, add `editor:dev:api` in root and editor `package.json` (recommended) — one
    command to run the editor in API mode against `pnpm api:dev` without editing
    `.env.local`.
  - (b) Env var only (`VITE_DATA_SOURCE=api pnpm editor:dev`) — fewer scripts, easier to
    forget when switching modes.
- **Q2**: While both modes exist, should `AuthClient` use a discriminated `mode: "sheets" | "api"` (or optional `session` identity fields on `connected`) so Sheets UI stays untouched while API UI reads person/tenant/permissions?
  - (a) Add explicit `mode: "sheets" | "api"` and typed `ApiSession` on the API connected
    state (recommended) — makes dual-mode branching explicit, type-safe and trivial to
    delete when Sheets retires in EPC-028.
  - (b) Keep one blended `AuthState` with optional identity fields — fewer union branches,
    harder to tell which fields exist in which mode.

## Decisions

- **D1** (owner, 2026-11-25, EPC-024 planning Q3): build-time switch
  (`VITE_DATA_SOURCE=sheets|api`, defaulting to `sheets`) plus a stub
  `ApiRoadmapRepository` failing unimplemented calls with a dedicated "not yet available"
  error kind, over feature flags hiding routes or a runtime switch.
- **D2** (owner, 2026-11-26, `STY-103` D3 and D5): `/me` carries a single `NOT NULL` role
  per tenant membership and bilingual tenant `nameEn` / optional `nameCy`.
- **D3** (owner, 2026-11-27, `STY-106` D9, D11–D13): `ApiAuthClient` consumes `STY-106`'s
  pinned contracts — `GET /api/v1/me` (`personId`, `displayName`, `identities` with
  `id`/`provider`/`email`/`lastSignInAt`/`linkedAt`, `memberships` with `tenantId`/
  `tenantSlug`/`nameEn`/`nameCy`/`role`/`permissions` in deterministic order, and `session`
  with `idleExpiresAt`/`absoluteExpiresAt`/`signedInAt`/`provider`), `POST /api/v1/auth/extend`
  returning `{ idleExpiresAt, absoluteExpiresAt }`, and `POST /api/v1/auth/sign-out` under
  `signed_in` policy (sending `X-Roadmaps-Person-Id` per `STY-105` D5 and treating 401 as
  signed out locally).
- **D4** (owner, 2026-11-27, `STY-105` D5, D8 & D9): authenticated state-changing calls
  send `X-Roadmaps-Person-Id` (omitted on anonymous `public` calls like
  `POST /api/v1/auth/sign-in` for `sign-in`/`redeem` and on `GET` calls; Phase 2 `link`
  start in `EPC-028` keeps person assertion per `STY-105` D5) and
  `Content-Type: application/json` whenever a JSON body is sent; missing, malformed or
  disagreeing person assertions return `409 auth.person_mismatch`, mapped in
  `api-error.ts` to `AppError(kind: "unauthenticated", retryable: false, status: 409)`
  (same `kind` as `401`, distinguishable inside `infrastructure/roadmaps-api/` by
  `status === 409` or `code === "auth.person_mismatch"` unless `STY-107`/`STY-109`
  grilling introduces a dedicated `AppErrorKind`).

## Out of scope

- New API-mode screens (Sign-in page, Account page, new session-warning flow): `STY-109`
  (multi-tenant switcher deferred to
  [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md),
  `STY-108` D4; `AuthState` still carries `/me`'s memberships array so the domain boundary
  stays multi-tenant ready).
- Implementing real roadmap/list endpoints in `ApiRoadmapRepository`: `EPC-027`.
