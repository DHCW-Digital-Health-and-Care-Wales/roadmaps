# STY-109: Editor sign-in, session expiry, tenant switcher and account page on the API

- **Status**: Needs grilling — implements the chosen `STY-108` UX for API-mode sign-in,
  session warning/expiry, tenant-scoped shell, tenant switcher and Account page
- **Type**: Feature
- **Area**: Features/UI + Routing + Infrastructure + i18n (en + cy) + E2E
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-107 (hard), STY-108 (hard)
- **Binding ADRs**: ADR-004, ADR-008, ADR-010, ADR-018 §The sign-in transaction,
  §Sessions, §The editor; ADR-019 §Enforcement
- **Suggested model**: Opus — new routes, session-expiry tab-focus security check,
  bilingual copy and E2E against the API

## Summary

Delivers the complete sign-in and account experience when the editor runs in API mode
(`VITE_DATA_SOURCE=api`), following the designs chosen in `STY-108`. Users sign in via
the API's OIDC redirect, land on the callback route (which loads `/me`), or see a clear
"You haven't been invited" / sign-in error page when refused. Once signed in, the account
menu shows their name and current tenant (with a tenant switcher only for multi-tenant
members, encoding the tenant in the URL per ADR-019), the Account page shows their email,
sign-in identity and "Sign out everywhere", and session expiry warns two minutes before
the idle limit ("Stay signed in") or opens sign-in in a new tab for absolute expiry /
401, verifying on tab focus that the same person signed back in.

## Scope

`apps/editor/src/features/auth/`, new routes under `apps/editor/src/routes/` (with
regenerated `routeTree.gen.ts`), `apps/editor/src/i18n/locales/{en,cy}.ts` (using
`copywriter`), unit/component/page tests, and Playwright E2E tests in API mode. Sheets
mode stays unchanged.

## Acceptance criteria

### S1: Sign-in, OIDC callback and refusal pages work in English and Welsh

**Given** an unauthenticated visitor in API mode (`VITE_DATA_SOURCE=api`)
**When** they click Sign in
**Then** the editor posts `POST /api/v1/auth/sign-in` and navigates to the provider's
authorisation URL; upon return to the static callback route, it calls `GET /api/v1/me`
and lands inside their tenant
**And** when redirected with a refusal code (`not_invited`, `person_disabled`,
`sign_in_failed`, etc.), the editor shows clear English/Welsh copy with no raw error
codes or token details

### S2: Account menu shows name, tenant and (when multi-tenant) a tenant switcher

**Given** a signed-in user in API mode
**When** they open the Account menu
**Then** it shows their display name and current tenant name, a link to the Account page,
and Sign out (revoking the session via `POST /api/v1/auth/sign-out` and clearing
auth-scoped queries)
**And** a tenant switcher appears if and only if the person holds active memberships in
more than one tenant, and switching updates the tenant in the URL (ADR-019)

### S3: Account page shows identity details and "Sign out everywhere"

**Given** a signed-in user visiting the Account page
**When** the page loads
**Then** it shows their display name, their sign-in identity's provider, email and last
sign-in time, their tenant memberships and roles, and a "Sign out everywhere" action that
calls `POST /api/v1/auth/sign-out-all` and signs the current tab out

### S4: Session warning, new-tab re-sign-in and tab-focus person check protect open work

**Given** a signed-in user in API mode
**When** two minutes remain before the 60-minute idle limit
**Then** the session warning offers "Stay signed in" (`POST /api/v1/auth/extend`) or
Sign out
**And** before the 10-hour absolute limit, or after any 401 expiry, "Sign in again" opens
sign-in in a new tab; when the original tab regains focus it re-checks `GET /api/v1/me`:
if the same person is signed in, open state is kept; if a different person signed in, the
tab discards held state and cached queries unsent and treats itself as signed out
(ADR-018 Option 15)

### S5: Sheets mode remains unaffected

**Given** `VITE_DATA_SOURCE=sheets` (or unset)
**When** the existing editor unit, integration and E2E suites run
**Then** every existing Google Sheets sign-in, account menu, session warning and roadmap
flow passes unchanged

## Open questions

- **Q1**: How should API-mode routes carry the tenant slug in TanStack Router (ADR-019:
  "every tenant route names its tenant in the request; the editor's address carries it")
  while Sheets mode keeps its existing `/`, `/roadmaps/$roadmapId`, `/families` paths?
  - (a) Prefix tenant-scoped routes under `/$tenantSlug/…` (e.g. `/#/dhcw/members`,
    `/#/dhcw/roadmaps`, `/#/dhcw/families`) in API mode, with `/` redirecting to the
    user's tenant (or a tenant picker when in multiple tenants), while Sheets mode keeps
    today's flat routes (recommended) — cleanly separates tenant-scoped routes from
    non-tenant routes (`/sign-in`, `/auth/callback`, `/invitations/accept`, `/account`)
    and matches ADR-019 Option 14 directly.
  - (b) Pass tenant as a search parameter (`?tenant=dhcw`) on existing routes — fewer
    route files, fragile across links and easier to lose on navigation.
- **Q2**: What should a signed-in user who has **zero** active memberships (e.g. removed
  from their only tenant while signed in, or before their next invitation) see?
  - (a) A dedicated "No organisation access" screen with Sign out and a link to Account
    (recommended) — calm, honest state with no broken tenant URLs.
  - (b) Treat as signed out — hides why they lost access and forces a confusing re-sign-in
    loop.

## Decisions

_Recorded during grilling and from `STY-108` Outcome._

## Out of scope

- Invitation acceptance route (`STY-112`) and Members & Invitations page (`STY-113`),
  both in EPC-025.
- Linking/removing Entra sign-in identities on the Account page (`EPC-028`).
