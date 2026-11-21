# EPC-023: Hosting and infrastructure security — the protections that live outside the code

- **Status**: Needs grilling — a placeholder holding the infrastructure-held protections
  found while designing identity and authorisation, until the infrastructure epic is
  planned (owner, 2026-11-21)
- **Progress**: 0 of 0 terminal; next selectable: none; blocked on: EPC-022's API, and
  accepting ADR-018 and ADR-019
- **Binding ADRs**: ADR-015, ADR-016, ADR-017, ADR-018, ADR-019, ADR-007

## Summary

EPC-022 builds the API and its database to run locally and in CI; provisioning the
environments they run in, Google Cloud hosting and custom domains are left to a later
epic (EPC-022 _Out of scope_). This is that epic, opened early as a placeholder so
nothing found before then is lost. Several protections the identity and authorisation
design relies on cannot be held by application code: the editor's own domain, per-address
rate limits and WAF rules, private networking for the database, the provider
registrations with Entra's Conditional Access, CI's cloud identity, who ran a platform
job, and alerting on security events. Product Leads see none of this beyond a new
address for the editor. Stories are written when the epic is planned; until then the
candidate scope below is a list of findings, not a plan.

## Owner decisions waiting

- The hosting shape: Cloud Run, with a global external Application Load Balancer once
  the editor has its domain, is assumed below, not decided
- The editor's domain, and who owns its DNS
- Who in NHS Wales approves the Entra app registration and its Conditional Access, and
  the lead time (ADR-018 _Consequences_)
- Where security alerts go: DHCW's security monitoring, and who answers them

## Findings

Greenfield. The inputs, audited at `86afe40` on 2026-11-21:

- ADR-015 binds Cloud SQL for PostgreSQL 18 in `europe-west2`, backups and
  point-in-time recovery in the UK, roles that never bypass row-level security, and
  `pgaudit` as optional; a database restore bypasses its immutability triggers.
- ADR-016 makes a custom domain for the editor a precondition of switching it to the
  API, since the shared GitHub Pages origin cannot tell the editor from the public site
  and its analytics script; GitHub Pages cannot set response headers.
- ADR-017 binds JSON logs on stdout, `/health` and `/ready`, OpenTelemetry, migrations
  as their own step under a role with DDL rights, scheduled jobs as CLI commands called
  by an external scheduler, and "abuse is met by caching and rate limiting where the API
  is hosted" for the public read.
- ADR-018 (Proposed) puts the editor and API on one origin in every environment, one
  Cloud Run service serving both until the domain exists, the public read on its own
  host; rate limits at the edge; Entra enforcing MFA and assignment; retention defaults
  run by scheduled jobs.
- ADR-019 (Proposed) makes platform operations Cloud Run jobs that only named principals
  may start, the principal taken from Cloud Audit Logs.
- A Cloud Run job runs as its service account and cannot see who started it; only
  Cloud Audit Logs record the caller.
- HSTS preload applies only to a registrable domain, not a subdomain of a shared one;
  `Clear-Site-Data: "cookies"` clears every site on the registrable domain.

## Design

_Written when the epic is planned. Candidate scope, grouped by where each protection
lives:_

### The edge

- **The editor's custom domain**, with a Google-managed certificate, TLS 1.2 or later
  under a modern SSL policy, HTTP redirected to HTTPS, and HSTS; preload only if the
  domain is a registrable one of the editor's own. DNS ownership named, with CAA records
  and DNSSEC.
- **One origin for the editor and the API** (ADR-018): one Cloud Run service per
  environment serving both, fronted by the load balancer once the domain exists; then
  the service's default `run.app` address is disabled. **The public read on its own
  host**, behind a CDN that caches current publications, purged on publish, unpublish
  and redaction, so redacted content does not stay cached.
- **The editor's document headers**: set by the API while it serves the editor (ADR-018);
  a strict CSP, with Trusted Types trialled report-only first, `frame-ancestors 'none'`,
  HSTS, a cross-origin opener policy, a referrer policy and a permissions policy.
- **Cloud Armor**: per-address rate limits on the API's sign-in routes and on the public
  read, with a global per-address ceiling; preconfigured WAF rules evaluated in preview
  before they enforce, with path normalisation tested so an encoded path cannot dodge a
  rule; request logging on. Adaptive Protection only if its tier is worth the cost at
  this scale.
- **Cloud Run ingress** limited to internal traffic and the load balancer once there is
  one; a capped instance count, so abuse costs money only up to a limit; budget alerts.
- **Egress** limited to what the API calls: the providers' discovery, key and token
  endpoints, and Google Cloud's own services.

### Identity providers

- **The Entra app registration in the NHS Wales directory**, single-tenant: assignment
  required to a group of the app's users; Conditional Access requiring MFA, and
  phishing-resistant methods for tenant admins; an authentication context for access
  changes and redaction (ADR-018); a federated credential or certificate in place of a
  client secret; redirect URIs only for real environments.
- **The Google OAuth client for sign-in**, Internal to DHCW's Workspace and separate
  from ADR-003's Sheets client; redirect URIs only for real environments, never
  `localhost` in production.

### The database and secrets

- **Cloud SQL on a private IP only**, SSL required, IAM database authentication so no
  database password exists, the application's and the migrations' roles as separate
  service accounts; point-in-time recovery in every environment that holds real data;
  backups in a UK location, checked at provisioning (ADR-015); a customer-managed key
  decided with the data protection assessment; Data Access audit logs on.
- **A restore drill**, run and recorded before go-live and after any change to backups,
  since a restore bypasses the history's immutability triggers.
- **Secret Manager** for the Google client secret and any Entra certificate, read by the
  API's service account only, with rotation documented and Data Access audit logs on.

### Projects, CI and deployment

- **Separate Google Cloud projects for production and non-production**, with no real
  personal data outside production.
- **Workload Identity Federation** for GitHub Actions, its trust conditioned on the
  repository, the ref and the GitHub environment, written in code, never left as a
  manual step; no service account keys.
- **Separate identities for planning and applying infrastructure**, each with
  least-privilege custom roles; production deploys through a protected GitHub
  environment whose required reviewers the ruleset's bypass cannot self-approve.
- **Organisation policies**: no service account keys, no public IP on Cloud SQL,
  resource locations limited to the UK. Public access is granted only where it is meant
  to be (the public read, and the editor's service once it is behind the load balancer),
  by the invoker settings and ingress, not left open by default.
- **Container images**: built from a minimal base, run as a non-root user, scanned,
  with an SBOM and build provenance attested.

### Operations

- **Platform jobs** (ADR-019): the right to start each limited to named principals,
  granted just in time (Privileged Access Manager) rather than standing; Admin Activity
  audit logs exported to a retention-locked bucket, so the job's execution ID recorded
  in the platform audit log joins to the principal who started it; a written break-glass
  procedure.
- **Scheduled jobs**: Cloud Scheduler starts the API's purge jobs (sessions, sign-in
  transactions, invitations, ADR-018) and the scratch expiry (ADR-015).
- **Security alerting** from the API's structured events and the edge's logs: bursts of
  refused sign-ins, cross-tenant or policy refusals, mass session revocations, any
  platform audit entry, Cloud Armor denials, 429 spikes; routed to whoever DHCW's
  security monitoring names.
- **Retention**: security events exported to a log bucket with a retention lock, for the
  period the data protection assessment sets.
- **The OpenTelemetry collector redacts** as a second layer behind the API's own
  redaction.
- **Mail authentication** (SPF, DKIM, DMARC) if the API comes to send invitations.
- **A `security.txt`** and a route for reporting vulnerabilities.
- **Assurance**: DHCW's cyber security and information governance sign-off; the
  independent penetration test before the deployed editor switches to the API
  (ADR-018).

## Shared assumptions and contracts

None yet.

## Stories

None yet: written when the epic is planned.

## Sequencing

After EPC-022's API runs locally and in CI, and before the deployed editor switches to
the API (ADR-015 _Consequences_, ADR-016). The Entra registration request can start at
once, since its approval has its own lead time.

## Out of scope

- The API's own protections (sessions, CSRF, route policies, the invitation cap,
  security events, the editor's document headers while it serves them): ADR-018,
  ADR-019 and EPC-022's stories.
- SCIM provisioning from Entra: over-built for a handful of editors per tenant; group
  assignment and the access review (ADR-019) keep access current. Reconsider if a
  tenant grows to hundreds of members.
- Switching the deployed editor to the API: its own later epic, which this one enables.

## Defects

None.

## Related

- [Identity and authorisation analysis](../../analysis/identity-and-authorisation.md)
- [EPC-022](../EPC-022-monorepo-and-backend-foundation/README.md)
- [ADR-018](../../adr/ADR-018-sign-in-through-the-api-with-a-server-side-session.md),
  [ADR-019](../../adr/ADR-019-the-api-authorises-every-route-from-a-permission-catalogue-in-code.md),
  [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md),
  [ADR-017](../../adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md),
  [ADR-007](../../adr/ADR-007-github-pages-deployment.md)
