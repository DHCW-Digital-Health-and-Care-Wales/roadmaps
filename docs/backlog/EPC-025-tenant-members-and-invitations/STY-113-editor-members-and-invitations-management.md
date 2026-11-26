# STY-113: Editor members and invitations management

- **Status**: Needs grilling — delivers the Members & Invitations page in API mode so
  Tenant Admins can invite Product Leads (and other roles), copy links, revoke
  invitations, change roles and remove members, while non-Admins see the member directory
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + Routing + i18n (en + cy) + E2E
- **Epic**: [EPC-025-tenant-members-and-invitations](README.md)
- **Depends on**: STY-108 (hard), STY-109 (hard), STY-110 (hard), STY-111 (hard)
- **Binding ADRs**: ADR-002, ADR-008, ADR-010, ADR-018 §Getting in; ADR-019 §What
  members and assigned leads may do, §Keeping access current
- **Suggested model**: Opus — new feature slice (domain port, API adapter, Admin &
  read-only UI, clipboard copy, confirmation dialogs, bilingual copy and E2E)

## Summary

Delivers the tenant Members & Invitations screen in the editor's API mode, implementing
the design chosen in `STY-108`. Every member of the tenant can view the member list
(names and roles). Tenant Admins (`members:manage`) also see each member's email and
last sign-in date, can invite a new user (e.g. a Product Lead, Viewer or Admin) by email
and copy the one-time invitation link with plain instructions, view and revoke pending
invitations, change a member's role, and remove a member (with clear confirmation and
helpful guidance if the last-admin rule blocks the action). Never shown in Sheets mode.

## Scope

Domain port (`TenantAccessRepository` or `MembersRepository`) under
`apps/editor/src/domain/`, API adapter in `apps/editor/src/infrastructure/roadmaps-api/`
wired in `composeApp` (API mode only), `apps/editor/src/features/members/`, new tenant
route under `apps/editor/src/routes/`, navigation link in the shell (API mode only),
English and Welsh copy (`copywriter`), component/page tests and an API-mode Playwright
E2E covering the full Admin-invites-Product-Lead → Product-Lead-accepts → Admin-manages
journey.

## Acceptance criteria

### S1: Non-admin members see a calm, read-only member list

**Given** a signed-in Product Lead or Viewer in API mode
**When** they open the tenant's Members page
**Then** they see every member's display name and role(s) in alphabetical order, with no
email addresses, last sign-in times, pending invitations section or admin action buttons
(ADR-019 Option 9)

### S2: Tenant Admins invite a new user and copy the one-time link

**Given** a signed-in Tenant Admin (`members:manage`) on the Members & Invitations page
**When** they open "Invite a member", enter a colleague's email address, select a role
(e.g. Product Lead, Viewer or Admin) and submit
**Then** the API creates the invitation and the UI prominently displays the one-time
invitation link with a working "Copy link" button (and a selectable read-only field
fallback), stating clearly that the link is shown once, expires in seven days, and works
only for that email address
**And** the new pending invitation appears in the Pending invitations list (showing
email, role, inviter and expiry, never the raw token again)

### S3: Tenant Admins revoke pending invitations, change roles and remove members

**Given** a Tenant Admin viewing pending invitations and current members (with email and
last sign-in)
**When** they revoke a pending invitation, change a member's role, or remove a member
(after explicit confirmation)
**Then** the API updates access immediately, the list refreshes, and a clear status
confirmation is announced accessibly
**And** if removing or demoting would leave the tenant with no Admin, the UI explains
plainly that the tenant must keep at least one Admin (and advises keeping two, ADR-019)

### S4: Loading, empty, error, expired-session and Welsh states hold

**Given** loading, zero pending invitations, network/API failure, expired session (401)
and Welsh (`cy`) locale states
**When** rendered on desktop and phone
**Then** every state renders cleanly with DHCW tokens, keyboard focus management,
zero axe violations and complete English/Welsh copy

## Open questions

- **Q2**: Should the Invite form let the Admin choose the sign-in provider, or default
  silently to the only enabled provider (Google Workspace in production / mock locally)
  until Entra arrives?
  - (a) Default silently when only one provider is enabled, showing a provider selector
    only when multiple providers are active (recommended) — keeps the form clean and
    jargon-free for Tenant Admins today while adapting automatically when Entra launches.
  - (b) Always show a provider dropdown — adds plumbing jargon before there is a choice.

## Decisions

- **D1** (owner, 2026-11-26, `STY-103` D3; settles Q1): each membership and invitation
  holds a single `NOT NULL` role in v1, so the Invite and Change Role UI uses a single-role
  picker (Admin, Product Lead, or Viewer) rather than multi-role checkboxes.

## Out of scope

- Six-monthly access review prompt and confirmation (`STY-114`).
- Approving or declining uninvited access requests (`STY-094` UI follow-on).
- Assigning Product Leads to specific roadmaps (`EPC-027`).
