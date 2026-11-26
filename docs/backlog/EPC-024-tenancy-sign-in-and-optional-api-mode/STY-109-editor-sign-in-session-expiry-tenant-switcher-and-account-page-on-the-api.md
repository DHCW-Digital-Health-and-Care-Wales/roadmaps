# STY-109: Editor sign-in, session expiry, tenant switcher and account page on the API

- **Status**: Needs grilling — implements the chosen `STY-108` UX for API-mode sign-in,
  session warning/expiry, single-tenant shell and Account page (multi-tenant switcher and
  `/$tenantSlug/…` URLs deferred to `EPC-030`, `STY-108` D4)
- **Type**: Feature
- **Area**: Features/UI + Routing + Infrastructure + i18n (en + cy) + E2E
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-107 (hard), STY-108 (hard)
- **Binding ADRs**: ADR-004, ADR-008, ADR-010, ADR-018 §The sign-in transaction,
  §Sessions, §The editor, §STY-108 amendments; ADR-019 §Enforcement, §STY-108 amendments
- **Suggested model**: Opus — new routes, session-expiry tab-focus security check,
  bilingual copy and E2E against the API

## Summary

Delivers the complete sign-in and account experience when the editor runs in API mode
(`VITE_DATA_SOURCE=api`), following the designs chosen in `STY-108`. Users sign in via
the API's OIDC redirect, land on the callback route (which loads `/me`), or see a clear
"You haven't been invited" / sign-in error / "No organisation access" page in a clean
header-only shell when refused or holding zero memberships (D4). Once signed in, the
editor keeps flat routes using the member's active tenant slug from `/me` (D3), the
account menu shows their name and active organisation while keeping Theme and Edit
surface (D2, D5; multi-tenant switcher and `/$tenantSlug/…` routes deferred to `EPC-030`),
the Account page shows their email, sign-in identity, membership and role, and "Sign out
everywhere", and session expiry warns two minutes before the idle limit ("Stay signed in")
or opens sign-in in a new tab for absolute expiry / 401, verifying on tab focus that the
same person signed back in.

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

- **Q3**: Final UI, routing and E2E details (e.g. exact callback/refusal route paths and
  error-code mapping) to be grilled once `STY-108`'s _Outcome_ settles the chosen shell,
  sign-in, Account and session-expiry designs.

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3 and D5): each tenant membership from `/me`
  carries a single `NOT NULL` role and bilingual tenant `nameEn` / optional `nameCy` (shown
  by active UI language with English fallback).
- **D2** (owner, 2026-11-26, `STY-108` D4; refines S2): multi-tenant editor UX (the
  tenant switcher, multi-tenant `/` landing and joining a second tenant in the UI) is
  deferred to
  [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md).
  While the backend stays multi-tenant from the start, `STY-109` assumes each member holds
  one tenant in the UI (e.g. `dhcw`), shows the person's name and active organisation in
  the shell/Account menu, and omits the tenant switcher (falling back deterministically to
  the first active membership from `/me` if dev/test data seeds more than one).
- **D3** (owner, 2026-11-26, `STY-108` D4; settles Q1b; amends ADR-019): keep today's flat
  editor routes (`/`, `/families`, `/roadmaps/$roadmapId`) alongside the new non-tenant
  routes (`/sign-in`, `/auth/callback`, `/account`), reading the member's active tenant
  slug from `/me` for `/api/v1/tenants/{tenantSlug}/…` calls. Prefixing tenant routes
  under `/$tenantSlug/…` is deferred to `EPC-030`.
- **D4** (owner, 2026-11-26, `STY-108` D6; settles Q2a): a signed-in user with zero active
  memberships sees a calm **"No organisation access"** screen with Sign out and a link to
  Account; unauthenticated, refusal and zero-membership screens render in a clean
  header-only shell (no sidebar or search).
- **D5** (owner, 2026-11-26, `STY-108` D7): keep **Theme** and **Edit surface** inside
  `AccountMenu` (consistent with Sheets mode) and keep the 375px phone header trigger
  compact so Cymraeg satisfies `tests/e2e/shell.spec.ts`.

## Out of scope

- Multi-tenant switcher, `/$tenantSlug/…` editor URLs and multi-tenant `/` landing:
  [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)
  (D2, D3).
- Invitation acceptance route (`STY-112`) and Members & Invitations page (`STY-113`),
  both in EPC-025.
- Linking/removing Entra sign-in identities on the Account page (`EPC-028`).
