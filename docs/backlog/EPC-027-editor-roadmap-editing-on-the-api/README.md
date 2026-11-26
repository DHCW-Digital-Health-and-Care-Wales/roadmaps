# EPC-027: Editor roadmap editing on the API — wiring roadmaps, drafts and role-aware editing

- **Status**: Needs grilling — placeholder epic opened from the owner's incremental API
  decomposition (2026-11-25); designed once EPC-024, EPC-025 and the first EPC-026 API
  endpoints exist
- **Progress**: 0 of 0 terminal; next selectable: none; blocked on: EPC-024 and EPC-026
- **Binding ADRs**: ADR-002, ADR-008, ADR-010, ADR-015, ADR-017, ADR-018, ADR-019

## Summary

During EPC-024 and EPC-025, the editor's optional API mode (`VITE_DATA_SOURCE=api`) runs
sign-in, account management and tenant members/invitations against the API while its stub
`ApiRoadmapRepository` rejects roadmap and list calls with a clear "not yet available"
error. This epic incrementally replaces those stub methods as
[EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md) delivers endpoints, and
introduces the new API-era editing experience: private server scratch, shared drafts,
server-side three-way conflict review, co-lead assignments, read-only Views for Viewers
and unassigned leads, admin-only Families/Categories/Organisations management, retired
roadmaps view and reinstatement (STY-048), and version history/restore. Google Sheets
stays working until
[EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md).

## Owner decisions waiting

- UX prototypes (`ux-prototypes`) for private scratch vs shared draft vs publish,
  roadmap assignments, retired roadmaps view, version history/restore and Viewer read-only
  states
- How "Save all" across roadmaps behaves (one transaction or one per roadmap; ADR-015
  Option 30)
- Whether intermediate parity stories map today's `RoadmapRepository` methods directly onto
  the API first, or move straight to the scratch/draft UI slice by slice

## Findings

Greenfield for the API-backed editor editing flows; audited on 2026-11-25:

- `apps/editor/src/domain/roadmap/roadmap-repository.ts` and the shared contract suite
  (`apps/editor/src/domain/roadmap/testing/`) govern today's Sheets-era repository.
- `docs/operations/replacing-google-sheets.md` records the adapter contract and copy
  cleanup needed once Sheets-specific wording retires.
- ADR-019 _Consequences_ notes two user-visible shifts on the API: Families/lists become
  read-only for Product Leads (`lists:edit` is Admin-only), and Viewer is a new
  read-only role.

## Design

_Candidate scope, to be grilled and split into stories when this epic is planned:_

1. **Incremental read wiring**: wire `ApiRoadmapRepository` list reads (families,
   categories, organisations, tags) and roadmap list/detail reads, removing the stub
   errors slice by slice.
2. **Role-aware read-only & admin lists UI**: Viewer read-only mode across roadmaps and
   lists; Product Lead read-only Families page; Admin management of families, categories,
   organisations and retiring/reinstating tags.
3. **Private scratch, shared draft and publishing UX**: replace browser-held pending edits
   on the API with server scratch, Save to shared draft, Save and publish, Discard draft,
   server-computed conflict resolution, and scratch expiry warnings.
4. **Assignments, retired roadmaps and history**: manage roadmap lead assignments (Admin
   and co-lead self-unassign/add rules), retired roadmaps list and reinstatement
   (`STY-048`), version history viewer and restore flow, and Admin content redaction UI.

## Shared assumptions and contracts

Follows [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)'s
build-time data-source switch (`VITE_DATA_SOURCE=sheets|api`) and tenant-scoped API calls
with flat editor routes (`ADR-019` _STY-108 amendments_; `/$tenantSlug/…` editor URLs
follow in [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)),
keeping the Sheets adapter unaffected until
[EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md).

## Stories

None yet: written when the epic is grilled.

## Sequencing

Can interleave slice by slice with
[EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md) once
[EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md) and
[EPC-025](../EPC-025-tenant-members-and-invitations/README.md) are in place.

## Out of scope

- Backend schema and endpoints:
  [EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md).
- Retiring the Google Sheets adapter and switching deployed environments:
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md).

## Defects

None.

## Related

- [ADR-002](../../adr/ADR-002-layered-architecture-and-repository-boundary.md),
  [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-019](../../adr/ADR-019-the-api-authorises-every-route-from-a-permission-catalogue-in-code.md)
- [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md),
  [EPC-025](../EPC-025-tenant-members-and-invitations/README.md),
  [EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md),
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md),
  [EPC-030](../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)
- [Replacing Google Sheets](../../operations/replacing-google-sheets.md)
- [Product Lead persona](../personas/product-lead.md),
  [Tenant Admin persona](../personas/tenant-admin.md),
  [Viewer persona](../personas/viewer.md)
