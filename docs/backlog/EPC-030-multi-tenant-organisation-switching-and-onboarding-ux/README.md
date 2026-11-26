# EPC-030: Multi-tenant organisation switching and onboarding UX — supporting members across NHS Wales organisations

- **Status**: Needs grilling — placeholder epic opened from `STY-108` grilling (owner,
  2026-11-26); designed once additional NHS Wales organisations onboard (alongside or
  after `EPC-028` Entra ID)
- **Progress**: 0 of 0 terminal; next selectable: none; blocked on: EPC-024, EPC-025 and
  multi-organisation onboarding readiness (Entra ID in EPC-028)
- **Binding ADRs**: ADR-004, ADR-008, ADR-010, ADR-015, ADR-018, ADR-019

## Summary

The PostgreSQL schema, row-level security, sessions, HTTP API (`/api/v1/tenants/{tenantSlug}/…`,
`STY-105` D2) and API-mode editor URLs (`/$tenantSlug/…`, `STY-109` D3, ADR-019 Option 14)
to be delivered by `EPC-024`, `EPC-025` and `EPC-026` are multi-tenant from day one, and
`/me` returns every active membership a person holds. While Google Workspace admits DHCW
accounts only (ADR-018 Option 3), `EPC-024`–`EPC-027` keep the editor UI minimal and
single-tenant (showing the active organisation such as DHCW with no tenant switcher, and
`/` redirecting to `/#/$tenantSlug/`). This epic delivers the multi-tenant editor UX once
additional NHS Wales organisations onboard: the Account menu tenant switcher (ADR-018
Option 16), multi-tenant `/` landing or organisation picker, multi-tenant memberships
display on the Account page, and joining a second tenant in the UI, each preceded by
just-in-time `ux-prototypes`.

## Owner decisions waiting

- Multi-tenant `/` landing behaviour (auto-land in last-used organisation vs dedicated
  "Choose an organisation" picker screen)
- Joining a second tenant via an invitation link when already signed into another tenant
- Just-in-time `ux-prototypes` for the tenant switcher, multi-tenant landing and
  multi-tenant Account page membership list

## Findings

Greenfield for multi-tenant editor UX; opened from `STY-108` grilling on 2026-11-26:

- ADR-015, ADR-018 and ADR-019 make the database, API and tenant-prefixed editor URLs
  multi-tenant from the start, with `/me` returning a person's active memberships in
  deterministic order (`STY-106` D2) and every tenant API route naming its tenant slug
  (`STY-105` D2).
- Under ADR-018 Option 3, Google Workspace admits DHCW accounts only, so additional NHS
  Wales organisations onboard once Entra ID lands (`EPC-028`).
- `STY-108` D4 deferred the multi-tenant switcher, multi-tenant `/` landing/picker and
  joining-a-second-tenant UI here so `EPC-024` and `EPC-025` ship a focused single-tenant
  DHCW UI while `STY-108`'s shell designs leave clean room for the switcher later.

## Design

_Candidate scope, to be grilled and split into stories (with just-in-time `ux-prototypes`
before each UI story) when this epic is planned:_

1. **Tenant switcher & multi-tenant landing**: add the Account menu / shell tenant
   switcher (shown only when a member holds two or more active memberships, ADR-018 Option
   16, switching `/$tenantSlug/…` URLs cleanly), multi-tenant `/` landing/picker, and
   multi-tenant memberships list on the Account page.
2. **Joining a second organisation in the UI**: invitation acceptance and post-redemption
   landing when an existing member joins an additional NHS Wales tenant (landing directly
   in the newly joined `/#/$tenantSlug/`).

## Shared assumptions and contracts

Builds on the multi-tenant API and `/$tenantSlug/…` URL contracts to be delivered by
[EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md) (`STY-103`–`STY-107`,
`STY-109`) and [EPC-025](../EPC-025-tenant-members-and-invitations/README.md) (`STY-110`–
`STY-113`), requiring no schema, API or URL breaking changes.

## Stories

None yet: written when the epic is grilled.

## Sequencing

Follows [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md) and
[EPC-025](../EPC-025-tenant-members-and-invitations/README.md); prioritised alongside or
after Entra ID onboarding in
[EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md).

## Out of scope

- Backend multi-tenancy, PostgreSQL RLS, tenant-scoped API routes and `/$tenantSlug/…`
  editor routes (to be delivered by `EPC-024`, `EPC-025` and `EPC-026`).
- Entra ID provider registration and identity linking:
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md).

## Defects

None.

## Related

- [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-018](../../adr/ADR-018-sign-in-through-the-api-with-a-server-side-session.md),
  [ADR-019](../../adr/ADR-019-the-api-authorises-every-route-from-a-permission-catalogue-in-code.md)
- [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md),
  [EPC-025](../EPC-025-tenant-members-and-invitations/README.md),
  [EPC-027](../EPC-027-editor-roadmap-editing-on-the-api/README.md),
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md)
- [STY-108](../EPC-024-tenancy-sign-in-and-optional-api-mode/STY-108-ux-prototypes-for-sign-in-account-invitation-acceptance-and-members-management.md),
  [STY-109](../EPC-024-tenancy-sign-in-and-optional-api-mode/STY-109-editor-sign-in-session-expiry-tenant-switcher-and-account-page-on-the-api.md)
- [Product Lead persona](../personas/product-lead.md),
  [Tenant Admin persona](../personas/tenant-admin.md),
  [Viewer persona](../personas/viewer.md)
