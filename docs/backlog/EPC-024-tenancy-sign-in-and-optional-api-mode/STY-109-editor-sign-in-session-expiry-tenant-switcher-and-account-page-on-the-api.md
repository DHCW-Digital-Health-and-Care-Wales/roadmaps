# STY-109: Editor sign-in, session expiry, tenant switcher and account page on the API

- **Status**: Needs grilling — implements `STY-108`'s chosen UX (1A, 2B, 3B, 4A) for
  API-mode sign-in, session warning/expiry, tenant-prefixed single-tenant shell
  (`/$tenantSlug/…`) and Account page (multi-tenant switcher deferred to `EPC-030`,
  `STY-108` D4)
- **Type**: Feature
- **Area**: Features/UI + Routing + Infrastructure + i18n (en + cy) + E2E
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-107 (hard), STY-108 (hard)
- **Binding ADRs**: ADR-004, ADR-008, ADR-010, ADR-018 §The sign-in transaction,
  §Sessions, §The editor, §STY-108 amendments; ADR-019 §Enforcement
- **Suggested model**: Opus — new routes, session-expiry tab-focus security check,
  bilingual copy and E2E against the API

## Summary

Delivers the complete sign-in and account experience when the editor runs in API mode
(`VITE_DATA_SOURCE=api`), following the designs chosen in `STY-108`. Users sign in via
the API's OIDC redirect, land on the callback route (which loads `/me`), or see a clear
"You haven't been invited" / sign-in error / "No organisation access" page in a clean
header-only shell when refused or holding zero memberships (D4). Once signed in, API-mode
tenant routes carry `/$tenantSlug/…` per ADR-019 Option 14 (with `/` redirecting to the
member's tenant, keeping Sheets mode's flat routes untouched; D3), the account menu shows
their name and active organisation while keeping Theme and Edit surface (D2, D5;
multi-tenant switcher and multi-tenant `/` picker deferred to `EPC-030`), the Account
page shows their display name, sign-in identity (provider, email and last sign-in),
membership and role, and "Sign out everywhere",
and session expiry warns two minutes before the idle limit ("Stay signed in") or opens
sign-in in a new tab for absolute expiry / 401, verifying on tab focus that the same
person signed back in.

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

- **Q3**: Final UI, routing and E2E details (UI copy/mapping for `STY-106` D9's five
  callback refusal codes, URL-bound tenant display and URL-tenant-removed discard notice
  copy, and reserved root paths such as `sign-in`, `auth`, `account`, `invitations`
  against tenant slugs) to be grilled against `STY-108`'s settled designs (D6) and
  `STY-106`/`STY-107`'s contracts.
- **Q4** (from `STY-108` _Decisions needed_ #7): What happens when a user clicks **Sign
  out** or **Sign out everywhere** while holding pending edits (before `EPC-027` server
  scratch exists)?
  - (a) Confirm before discarding held edits (reusing a simplified version of Sheets'
    discard warning, without a "keep changes" option since another person may sign in
    next) (recommended) — prevents accidental edit loss on sign-out.
  - (b) Sign out immediately, discarding held edits — fewer clicks, relies on the user
    checking the pending-edits bar first.
- **Q5** (from `STY-108` _Decisions needed_ #8): What should the newly opened tab show
  once OIDC callback finishes when launched from **"Sign in again (opens in a new tab)"**
  (Design 4A)?
  - (a) Show a brief `"You're signed in — you can close this tab and return to your work"`
    message with a link to roadmaps (recommended) — avoids leaving two duplicate
    workspaces open while the original tab refreshes on focus.
  - (b) Land normally on `/#/dhcw/` — simpler callback flow, leaves two editor tabs open.

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3 and D5): each tenant membership from `/me`
  carries a single `NOT NULL` role and bilingual tenant `nameEn` / optional `nameCy` (shown
  by active UI language with English fallback).
- **D2** (owner, 2026-11-26, `STY-108` D4; refines S2): multi-tenant editor UX (the
  tenant switcher, multi-tenant `/` landing/picker and joining a second tenant in the UI)
  is deferred to
  [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md).
  While the backend and URLs stay multi-tenant from the start, `STY-109` assumes each
  member holds one tenant in the UI (e.g. `dhcw`), shows the person's name and active
  organisation in the shell/Account menu, and omits the tenant switcher (`/` redirects
  deterministically to the first active membership in `STY-106` D2's fixed order if
  dev/test data seeds more than one).
- **D3** (owner, 2026-11-26, `STY-108` D4 / review follow-up #1a; settles Q1a): prefix
  API-mode tenant routes under `/$tenantSlug/…` (e.g. `/#/dhcw/`, `/#/dhcw/families`,
  `/#/dhcw/roadmaps/$roadmapId`) beside non-tenant routes (`/sign-in`, `/auth/callback`,
  `/account`), while Sheets mode keeps today's flat routes unchanged. Each tab binds its
  tenant from the URL per ADR-019 Option 14 and calls `/api/v1/tenants/{tenantSlug}/…`
  (`STY-105` D2) directly; `/` redirects to `/#/$tenantSlug/` for a signed-in member with
  an active membership, and if a `/me` refresh shows the tab's URL tenant is no longer an
  active membership, the tab discards held state and cached tenant queries unsent.
- **D4** (owner, 2026-11-26, `STY-108` D6; settles Q2a): a signed-in user with zero active
  memberships sees a calm **"No organisation access"** screen with Sign out and a link to
  Account; unauthenticated, refusal and zero-membership screens render in a clean
  header-only shell (no sidebar or search).
- **D5** (owner, 2026-11-26, `STY-108` D7): keep **Theme** and **Edit surface** inside
  `AccountMenu` (consistent with Sheets mode) and keep the 375px phone header trigger
  compact so Cymraeg satisfies `tests/e2e/shell.spec.ts`.
- **D6** (owner, 2026-11-27, `STY-108` D11 /
  [Outcome](../../analysis/api-sign-in-and-account-ux-analysis.md#outcome)): build from
  the settled [prototype designs](../../analysis/api-sign-in-and-account-ux-analysis/api-sign-in-and-account-ux-prototypes.html)
  — **1A** (header `AccountMenu` + quiet sidebar org band folded to a `DHCW` rail chip,
  icon-only 375px phone account trigger, omitting `Members` in `STY-109` and reserving the
  slot beneath `Families, categories and organisations` for `STY-113`), **2B** (centred
  single-column card in a clean header-only shell, with dedicated refusal screen for
  `not_invited`/`person_disabled` and inline `AuthNotice` for `sign_in_failed`), **3B**
  (stacked DHCW section cards on `/account` inside the full authenticated shell for
  active-org members, per-identity email in `Sign-in methods` with room for `EPC-028`
  Entra linking, and one-line role permissions summary), and **4A** (2-minute idle
  warning, 2-minute pre-absolute-limit warning, post-expiry / 401 new-tab re-sign-in, and
  destructive red notice on cross-person edit discard).
- **D7** (owner, 2026-11-27, `STY-106` D9–D13): `STY-106` pins the callback redirect
  routes and auth contracts consumed here — success redirects to `/#/auth/callback`
  (with `?returnTo=<encoded relative path>` when non-root), refusals redirect to
  `/#/sign-in?error=<code>` with five closed codes (`not_invited`, `person_disabled`,
  `entra_required`, `sign_in_cancelled`, `sign_in_failed`), Google sign-in start always
  passes `prompt=select_account` (so Design 2B's `"Try a different account"` needs no
  extra flag), `/me` carries `identities[].lastSignInAt`/`linkedAt` and
  `session.signedInAt`/`provider`, and `POST /api/v1/auth/extend` returns
  `{ idleExpiresAt, absoluteExpiresAt }`. Because `/#/auth/callback?returnTo=…` lives in a
  client-side hash fragment that any external link can supply directly, the callback route
  parses `returnTo` as untrusted input with `STY-106` D9's exact relative-path grammar
  (starting with `"/"`, rejecting `"//"`, `"/\\"`, schemes/hosts, `#`, whitespace or
  control chars; max 512 chars; falling back to `"/"`), navigates strictly via internal
  TanStack Router `to` (never `href` or `window.location`), and includes unit tests
  refusing `https://…`, `//…`, `/\…` and `javascript:`.

## Out of scope

- Multi-tenant switcher, multi-tenant `/` landing/picker and joining a second tenant in
  the UI:
  [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)
  (D2).
- Invitation acceptance route (`STY-112`) and Members & Invitations page (`STY-113`),
  both in EPC-025.
- Linking/removing Entra sign-in identities on the Account page (`EPC-028`).
