# STY-112: Editor invitation acceptance and redemption flow

- **Status**: Needs grilling — delivers the editor's fragment-token invitation landing,
  confirmation and OIDC redemption experience in English and Welsh
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + Routing + i18n (en + cy) + E2E
- **Epic**: [EPC-025-tenant-members-and-invitations](README.md)
- **Depends on**: STY-108 (hard), STY-109 (hard), STY-110 (hard)
- **Binding ADRs**: ADR-002, ADR-004, ADR-008, ADR-010, ADR-018 §Getting in
- **Suggested model**: Sonnet — well-bounded vertical UI flow following `STY-108`'s chosen
  prototype and `STY-110`'s contract

## Summary

Lets an invited colleague (such as a newly invited Product Lead, Viewer or first Tenant
Admin) open their single-use invitation link in the editor, see which organisation and
person invited them and which role they are being offered, accept the invitation, sign in
through the API's OIDC flow, and land inside their new tenant. Reads the token from the
URL fragment, strips it from the address bar immediately so it never lingers in browser
history or `Referer`, posts it only on explicit acceptance, and handles invalid, expired,
revoked and mismatched-email states clearly in English and Welsh.

## Scope

New invitation port/adapter methods in `apps/editor/src/domain/` and
`apps/editor/src/infrastructure/roadmaps-api/`, invitation acceptance feature and route
(following `STY-108` Outcome), bilingual copy (`en.ts`, `cy.ts` via `copywriter`), unit
and component tests, and an API-mode Playwright E2E test redeeming a mock OIDC
invitation end to end.

## Acceptance criteria

### S1: Fragment token is read, cleared from the URL and previewed before acceptance

**Given** an invitation URL carrying the single-use token in its fragment
**When** the invited user opens it in API mode
**Then** the editor extracts the token into memory, clears the token from the browser
URL immediately (before any navigation or reload can leak it), calls the lookup endpoint
via `POST` JSON body, and shows the inviting tenant's name, who invited them, the role(s)
offered, and an explicit "Accept and sign in" action
**And** the invitation is never redeemed merely by opening the link (ADR-018 §Getting in)

### S2: Accepting triggers `purpose=redeem` OIDC sign-in and lands in the tenant

**Given** a previewed valid invitation
**When** the user clicks "Accept and sign in"
**Then** the editor posts `POST /api/v1/auth/sign-in` (`purpose=redeem`, token in body)
and navigates to the provider; upon callback completion, `/me` loads their new membership
and lands them inside that tenant with their name and tenant in the account menu

### S3: Unavailable invitations and mismatched emails show clear English and Welsh guidance

**Given** an expired, revoked, already-used or malformed token, or a callback returning
the email-mismatch refusal
**When** the user lands on the invitation or error screen
**Then** they see plain English/Welsh copy explaining the invitation cannot be used (or
that they must sign in with the invited email address) and to ask their organisation's
Admin for a new link, with no raw error codes or token values shown

## Open questions

- **Q1**: With TanStack Router using hash history (ADR-004, e.g. `/#/…`), how should the
  invitation token travel in the URL fragment without colliding with the hash route?
  - (a) A dedicated non-hash entry path or clean fragment format parsed before router
    navigation (e.g. `/#/invitations/accept?token=…` is still inside the URL fragment —
    never sent to the server in HTTP requests or logs! — cleared via
    `window.history.replaceState` on mount) (recommended) — works natively with ADR-004's
    hash history AND keeps the entire `#/…` fragment off the wire and out of server
    request logs.
  - (b) A top-level path `/invitations/accept#<token>` served by the static SPA fallback —
    cleaner separation from hash routing, requires SPA path fallback in Vite dev and
    hosted static serving.
- **Q2**: If someone opens an invitation link while **already signed in** in that browser,
  what should the acceptance screen show before they click Accept?
  - (a) Show a brief notice ("You're currently signed in as X; accepting will sign in with
    the invited account") and proceed cleanly since ADR-018 specifies `redeem` ignores any
    existing session and replaces it with a new one (recommended) — transparent and avoids
    surprise account switches on shared devices.
  - (b) Say nothing and silently replace the session on accept — simpler UI, potentially
    confusing if they are already signed in as another user.

## Decisions

_Recorded during grilling and from `STY-108` Outcome._

## Out of scope

- Creating and revoking invitations (`STY-113`).
- Asking for access without an invitation (`STY-094`).
