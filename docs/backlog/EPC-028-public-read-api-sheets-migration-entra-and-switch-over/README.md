# EPC-028: Public read API, Sheets migration, Entra and switch-over — retiring Google Sheets

- **Status**: Needs grilling — placeholder epic opened from the owner's incremental API
  decomposition (2026-11-25); designed once EPC-026, EPC-027 and EPC-023 approach
  readiness
- **Progress**: 0 of 0 terminal; next selectable: none; blocked on: EPC-023, EPC-026,
  EPC-027
- **Binding ADRs**: ADR-002, ADR-007, ADR-015, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020

## Summary

Brings the full platform to production cut-over and retires Google Sheets. Delivers the
unauthenticated public read API (open CORS, OGL v3.0, live list names, current
publications only) and switches `apps/public-site` to read from it; has the API serve the
editor's built static files with strict document headers (ADR-020); builds the one-off
spreadsheet quarantine import tool (ADR-015); delivers the Microsoft Entra ID spike,
sign-in, guarded identity linking and Google sign-in retirement (ADR-018); and executes
the cut-over after DHCW cyber sign-off (ADR-018 _EPC-024 amendments_) and the independent
penetration test, removing the Sheets and GIS adapters and superseding the Sheets-era ADRs.

## Owner decisions waiting

- Entra ID spike outcomes: verified email claim for invitations, client authentication
  (federated credential vs certificate), and authentication context (`acrs`) for step-up
  on access changes and redaction (ADR-018)
- Cut-over dates: switching deployed editor & public site to the API, and announcing
  Google sign-in retirement after Entra linking completes
- Data protection assessment sign-off confirming retention periods (ADR-018 Option 17)

## Findings

Greenfield for the migration and cut-over steps; inputs as of 2026-11-25:

- ADR-015 requires the Sheets import to quarantine any row database constraints refuse
  (unplaced items, unknown organisation codes, Welsh tags without English) rather than
  loosening constraints, and to record the import as each tenant's first `import` change
  sets.
- ADR-017 and ADR-020 separate the public read onto its own host with open CORS, no
  cookies, OGL v3.0 attribution, and live list-name resolution.
- ADR-018 sequences Google Workspace first, Entra next (via explicit guarded identity
  linking while signed in, locking out Google once linked), then full Google retirement;
  cyber security review of `STY-102`'s threat model and an independent penetration test
  both gate production real-data cut-over.

## Design

_Candidate scope, to be grilled and split into stories when this epic is planned:_

1. **Public read API and public-site switch**: host-routed public-only read endpoints
   (current publications, live list names, OGL v3.0 notice, open CORS), plus updating
   `apps/public-site` to consume the API and `classify-changes.sh` to route
   `packages/api-types` to `site`.
2. **Same-origin static editor serving**: FastAPI serving the editor's built bundle with
   ADR-020's document headers (strict CSP, Trusted Types report-only first, HSTS,
   `frame-ancestors 'none'`, COOP, Referrer-Policy, Permissions-Policy).
3. **Spreadsheet quarantine import**: CLI importing an exported spreadsheet into a
   tenant's first `import` change sets, quarantining constraint-violating rows for owner
   remediation.
4. **Microsoft Entra ID, identity linking and Google retirement**: Entra spike, Entra OIDC
   provider, guarded `link` flow (under-10-minute session, 7-day removal hold, revoking
   other sessions, refusing Google once Entra is linked), Account page linking UI, step-up
   amendment to ADR-018, and cut-over revoking Google sessions and disabling Google sign-in.
5. **Assurance, switch-over and cleanup**: close DHCW cyber threat-model review and
   independent penetration test; switch deployed editor off GitHub Pages/Sheets; record
   superseding ADR amending ADR-002 and superseding ADR-007, ADR-009, ADR-011, ADR-012,
   ADR-013, ADR-014; remove Sheets copy, `google-sheets/`, `google-identity/` and the
   temporary build-time switch.

## Shared assumptions and contracts

Production deployment of real data requires
[EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md) (custom domain, load
balancer, Cloud Armor rate limits, private Cloud SQL, IAM jobs and log export) plus
DHCW cyber sign-off on `STY-102` and the independent penetration test (ADR-018).

## Stories

None yet: written when the epic is grilled.

## Sequencing

Follows [EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md),
[EPC-027](../EPC-027-editor-roadmap-editing-on-the-api/README.md) and
[EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md). The Entra spike can
run earlier once the NHS Wales Entra app registration lead time starts (EPC-023).

## Out of scope

- Provisioning Google Cloud infrastructure, DNS, Cloud Armor and log buckets:
  [EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md).

## Defects

None.

## Related

- [ADR-002](../../adr/ADR-002-layered-architecture-and-repository-boundary.md),
  [ADR-007](../../adr/ADR-007-github-pages-deployment.md),
  [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md),
  [ADR-017](../../adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md),
  [ADR-018](../../adr/ADR-018-sign-in-through-the-api-with-a-server-side-session.md),
  [ADR-020](../../adr/ADR-020-the-editor-and-the-api-share-one-origin.md)
- [EPC-023](../EPC-023-hosting-and-infrastructure-security/README.md),
  [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md),
  [EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md),
  [EPC-027](../EPC-027-editor-roadmap-editing-on-the-api/README.md)
- [Replacing Google Sheets](../../operations/replacing-google-sheets.md)
