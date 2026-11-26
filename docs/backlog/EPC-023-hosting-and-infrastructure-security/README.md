# EPC-023: Hosting and infrastructure security — the protections that live outside the code

- **Status**: Needs grilling — a placeholder holding the infrastructure-held protections
  found while designing identity and authorisation, until the infrastructure epic is
  planned (owner, 2026-11-21)
- **Progress**: 0 of 0 terminal; next selectable: none; blocked on: EPC-024–EPC-027's API
  (and recorded DHCW cyber security Phase 1 sign-off on `STY-102` before any hosted API
  deployment or Google Workspace client, and Phase 2 sign-off before any hosted Entra
  registration or credential)
- **Binding ADRs**: ADR-015, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020, ADR-007

## Summary

EPC-022 built the monorepo and API foundation, and EPC-024–EPC-028 build the API and its
database to run locally and in CI; provisioning the environments they run in, Google Cloud
hosting and custom domains are left to this epic. This epic was opened early as a
placeholder so nothing found before then is lost. Several protections the identity and authorisation
design relies on cannot be held by application code: the editor's own domain, per-address
rate limits, private networking for the database, the provider registrations, CI's
cloud identity, who ran a platform job, and alerting on security events. Product Leads see none of this beyond a new
address for the editor. Stories are written when the epic is planned; until then the
candidate scope below is a list of findings, not a plan.

## Owner decisions waiting

- The editor's domain, and who owns its DNS
- Who in NHS Wales approves the Entra app registration, and the lead time
- Where security alerts go: DHCW's security monitoring, and who answers them
- How a hosted non-production environment authenticates (e.g. for the penetration test):
  real staff identities in a named pre-production environment holding production's
  controls (load balancer, Cloud Armor, cyber sign-off), or testing on production before
  cut-over — the local mock provider is never admitted on Cloud Run (ADR-018)

## Findings

Greenfield. The inputs, as of 2026-11-21 (ADR-015 to ADR-017 at `86afe40`; ADR-018 to
ADR-020 as accepted that day):

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
- ADR-018 (Accepted): sign-in through the API with Google, then Entra admitting any
  valid NHS Wales directory user (no app-specific Conditional Access or group
  assignment); security events to the structured log, for export; retention defaults
  run by scheduled jobs; OIDC codes in callback URLs reach request logs.
- ADR-019 (Accepted): platform operations as one-command Cloud Run jobs that only named
  principals may start, under their own service account and database role, the
  principal taken from Cloud Audit Logs.
- ADR-020 (Accepted): the editor and API on one origin in every environment, one Cloud
  Run service serving both until the domain exists, routed by host from the public
  read; the API sets the editor's document headers; rate limits at the edge.
- A Cloud Run job runs as its service account and cannot see who started it; starting
  one is logged as a Data Access write, which is off by default.
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
- **The services and the load balancer** ADR-020 describes: one Cloud Run service per
  environment for the editor and the API, and a public-only service for the public read
  until the load balancer exists; then the load balancer fronts them, names its hosts
  with no default backend, and the services' `run.app` addresses are disabled. **The public read's host** behind a CDN that caches
  current publications, purged on publish, unpublish, redaction and any change to a
  tenant's lists, so redacted content does not stay cached and a renamed family,
  category or tag goes public at once, as ADR-015 Option 2 requires (checked by renaming
  one without republishing).
- **Cloud Armor**: per-address rate limits on the API's sign-in routes and on the public
  read, with a global per-address ceiling; request logging on. Preconfigured WAF rules
  and Adaptive Protection only if they earn their cost on a JSON API at this scale; if
  adopted, evaluated in preview first, with path normalisation tested so an encoded path
  cannot dodge a rule.
- **Cloud Run ingress** limited to internal traffic and the load balancer once there is
  one; a capped instance count, so abuse costs money only up to a limit; budget alerts.
- **Egress**: the API calls only pinned provider URLs and Google Cloud; filtering by
  name needs a paid proxy, so a VPC routing only to Google's and Microsoft's ranges, or
  an accepted risk, is the proportionate choice.

### Identity providers

- **The Entra app registration in the NHS Wales directory**, single-tenant, admitting
  any valid user (no group assignment or app-specific Conditional Access, ADR-018); a
  federated credential or certificate in place of a client secret; redirect URIs only
  for real environments; an authentication context once ADR-018 is amended for step-up
  with Entra.
- **The Google OAuth client for sign-in**, Internal to DHCW's Workspace and separate
  from ADR-003's Sheets client; redirect URIs only for real environments, never
  `localhost` in production.

### The database and secrets

- **Cloud SQL on a private IP only**, SSL required, IAM database authentication so no
  database password exists, the application's and the migrations' roles as separate
  service accounts; point-in-time recovery in every environment that holds real data;
  backups in a UK location, checked at provisioning (ADR-015); a customer-managed key
  decided with the data protection assessment; Data Access audit logs on; request-log
  access restricted, since callback URLs carry OIDC codes.
- **The roles and the migration step** (STY-091 D3, D11, D24, D26, D30): EPC-023
  creates the migration and application logins (IAM principals, as above), never
  with Cloud SQL's default `cloudsqlsuperuser` role, which `/ready` refuses, and runs
  STY-091's bootstrap SQL file once to make the roles, their memberships and the
  database's ownership. Run by Cloud SQL's non-superuser administrator, the file grants
  that administrator the owner role, so its credential is the owner's: who holds it and
  what logs its use are this epic's to name. Each deploy runs `api:migrate`'s command as the
  migration login before the new version takes traffic, while the old one keeps
  serving, and `/ready` is the service's startup and readiness probe.
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
  environment whose required reviewers the ruleset's bypass cannot self-approve. Agent
  sessions hold the bypass actor's credential (STY-087 D9), so the reviewer's
  independence from it is a point for this epic's grilling.
- **Organisation policies**: no service account keys, no public IP on Cloud SQL,
  resource locations limited to the UK. Public access is granted only where it is meant
  to be (the public read, and the editor's service once it is behind the load balancer),
  by the invoker settings and ingress, not left open by default.
- **Container images**: built from a minimal base, run as a non-root user, scanned,
  with an SBOM and build provenance attested.
- **The API's image and server** (owner, 2026-11-23, STY-090 D25): the Dockerfile, the
  production server process and the hosted `Host` values arrive here, not in STY-090;
  the image carries the editor's build (ADR-020). Found in STY-090's review, not yet
  decided: on the editor's host, `/api/v1/*`, `/health` and `/ready` reach the API and
  the rest the editor's files, while the public host answers only the public routes
  (ADR-020); the `Host` that Cloud Run's probes send must pass the API's allow-list
  (STY-090 S5); the production server's own loggers follow STY-090 S7's allow-list;
  and the probes are anonymous and query the database, so either the load
  balancer routes no probe path publicly or the global per-address ceiling covers them.
  uvicorn answers a request it cannot parse (a bad header line, two `Host` headers, a
  `Content-Length` that is no number) with its own fixed `400` text, before the API's
  middleware, so without STY-090 S5's headers or a request ID: the edge refuses such
  requests, or the production server is configured to. The production image build also
  runs ADR-018's test proving the image refuses any non-HTTPS or loopback issuer and the
  local mock provider whenever `K_SERVICE`, `CLOUD_RUN_JOB` or `CLOUD_RUN_WORKER_POOL`
  is set (handed over from `STY-106`).

### Operations

- **Hosted tracing and metrics** (STY-100 D5, D6, D11 and D15, 2026-11-23 and -24): where the
  API's traces go when hosted and how they are sampled, whether to trust the load
  balancer's trace header (the API ignores inbound trace context until then), and any
  metrics, which STY-100 leaves out. Spans keep only allow-listed attribute keys
  (STY-100 S4, D15), and trace retention in the hosted backend is this epic's to set.
- **Platform jobs** (ADR-019): the right to start each limited to named principals,
  granted just in time (Privileged Access Manager, or a two-person IAM grant procedure
  for two or three operators) rather than standing; Cloud Run's Data Access audit logs
  enabled and exported with Admin Activity logs to a retention-locked bucket, so the
  job's execution ID recorded in the platform audit log joins to the principal who
  started it, shown on a real job before go-live; operators granted only the role that
  runs a job with overrides, on each job; an alert on any change to a job, since the
  deploy identity is in effect a platform operator; a written break-glass procedure.
- **Scheduled jobs**: Cloud Scheduler starts the API's purge jobs (sessions, sign-in
  transactions, invitations, ADR-018) and the scratch expiry (ADR-015).
- **Security alerting** from the API's structured security events (ADR-018) and the
  edge's logs: bursts of
  refused sign-ins, cross-tenant or policy refusals, mass session revocations, any
  platform audit entry, Cloud Armor denials, 429 spikes; routed to whoever DHCW's
  security monitoring names.
- **Two stores, two retentions**: the platform audit log stays in the database,
  append-only and never purged (ADR-015, ADR-018); the API's security events and the
  request and audit logs are exported to a log bucket with a retention lock, two years
  until the data protection assessment sets it (ADR-018).
- **The OpenTelemetry collector redacts** as a second layer behind the API's own
  redaction.
- **Mail authentication** (SPF, DKIM, DMARC) if the API comes to send invitations.
- **A `security.txt`** and a route for reporting vulnerabilities.
- **Assurance**: DHCW's cyber security and information governance sign-off; the
  independent penetration test before the deployed editor switches to the API
  (ADR-018).

## Shared assumptions and contracts

- **Precondition for any hosted deployment (ADR-018 _EPC-024 amendments_, `STY-102` D4, D8, D10, D11)**:
  - **Phase 1 (Google Workspace)**: no hosted deployment of the API in any environment
    (non-production included), and no Google Workspace OAuth client, secret or real data
    (real staff sign-ins store real personal data), may be provisioned or receive traffic
    until [docs/analysis/identity-threat-model.md](../../analysis/identity-threat-model.md)
    ([STY-102](../_archive/EPC-024-tenancy-sign-in-and-optional-api-mode/STY-102-threat-model-for-sign-in-sessions-invitations-and-linking.md))
    records **Phase 1** as `Status: Signed off` with disposition `Approved` or
    `Approved — conditions met` (open conditions remain `Pending`), the date and the
    `Reviewed revision` commit SHA, entered only by the owner (never an agent); reviewer
    names, internal ticket references and raw findings remain in DHCW's private
    governance record.
  - **Phase 2 (Entra & linking addendum)**: no Entra app registration with a hosted
    redirect URI, no hosted Entra credential, and no Entra issuer in hosted settings may
    be provisioned or configured until **Phase 2** is recorded under the same rule
    (entered only by the owner, `Status: Signed off`, `Approved` or
    `Approved — conditions met`, date and `Reviewed revision` commit SHA). The `EPC-028`
    Entra spike may run before Phase 2 only with a spike-only registration, operators'
    own accounts, and nothing persisted to a hosted database (or waits for its own
    owner-recorded cyber approval if NHS Wales requires one).
  - **Reopen rule**: any material change to a signed-off phase's flows or controls
    returns that phase to `Pending` until the owner records it as reviewed or not
    material.

## Stories

None yet: written when the epic is planned.

## Sequencing

After [EPC-022](../_archive/EPC-022-monorepo-and-backend-foundation/README.md)'s foundation
and alongside [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)–[EPC-027](../EPC-027-editor-roadmap-editing-on-the-api/README.md),
before the deployed editor switches to the API in
[EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md)
(ADR-015 _Consequences_, ADR-016). The Entra registration request and cyber security
review of `STY-102` (ADR-018 _EPC-024 amendments_) can start at once, since approvals
have their own lead time.

## Out of scope

- The API's own protections (sessions, CSRF, route policies, the invitation cap,
  security events, the editor's document headers while it serves them): ADR-018,
  ADR-019, ADR-020 and EPC-024–EPC-028's stories.
- SCIM provisioning from Entra: dropped, over-built for a handful of editors per
  tenant; the invitation is the gate and the access review (ADR-019) keeps memberships
  current. Reconsider if a
  tenant grows to hundreds of members.
- Switching the deployed editor to the API:
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md),
  which this epic enables.

## Defects

None.

## Related

- [Identity threat model](../../analysis/identity-threat-model.md)
- [Identity and authorisation analysis](../../analysis/identity-and-authorisation.md)
- [EPC-022](../_archive/EPC-022-monorepo-and-backend-foundation/README.md),
  [EPC-024](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md),
  [EPC-025](../EPC-025-tenant-members-and-invitations/README.md),
  [EPC-026](../EPC-026-roadmaps-lists-and-versioned-api/README.md),
  [EPC-027](../EPC-027-editor-roadmap-editing-on-the-api/README.md),
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md)
- [ADR-018](../../adr/ADR-018-sign-in-through-the-api-with-a-server-side-session.md),
  [ADR-019](../../adr/ADR-019-the-api-authorises-every-route-from-a-permission-catalogue-in-code.md),
  [ADR-020](../../adr/ADR-020-the-editor-and-the-api-share-one-origin.md),
  [ADR-015](../../adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md),
  [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md),
  [ADR-017](../../adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md),
  [ADR-007](../../adr/ADR-007-github-pages-deployment.md)
