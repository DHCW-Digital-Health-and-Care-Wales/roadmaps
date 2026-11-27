# STY-104: Platform operator CLI for tenants, bootstrap invitations and person control

- **Status**: Needs grilling — implements ADR-019's platform operator CLI jobs and
  definer procedures for bootstrapping tenants and managing cross-tenant person actions
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-102 (hard — threat model written first, ADR-018 _EPC-024
  amendments_), STY-103 (hard), STY-106 (hard — real `sessions` table for
  `disable-person` session revocation)
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions; ADR-018 §Getting
  in, §Linking identities and the move to Entra; ADR-019 §Platform operators
- **Suggested model**: Opus — privileged platform definer procedures, fail-closed env
  validation and platform audit logging

## Summary

Provides the platform operator CLI commands that create a tenant (with its three shipped
roles) and issue its first Admin invitation, issue a replacement Admin invitation when a
tenant's only Admin is locked out, disable a person across all tenants (revoking all of
their active sessions), and remove a sign-in identity. Each command is a single-purpose
entrypoint running under the platform database role, writes exclusively through platform
definer procedures, records its execution ID and arguments in the append-only
`platform_audit_log`, and refuses unexpected environment variables. Gives local
developers and future Cloud Run jobs the one supported way to bootstrap a tenant.

## Scope

`apps/api/src/roadmaps_api/platform/` (CLI entrypoints + platform service/repositories),
platform definer procedures (in an incremental migration), root scripts for
local running, and real-PostgreSQL integration tests running as the platform login role.
No HTTP routes and no operator web UI.

## Acceptance criteria

### S1: Create tenant and issue its first Admin invitation

**Given** a migrated database and the platform login role
**When** an operator runs the `create-tenant` command with a tenant name, slug, first
admin email, provider and execution ID
**Then** the procedure atomically creates the tenant, seeds its three shipped roles
(Admin, Product Lead, Viewer) with ADR-019's permissions, creates a single-use 256-bit
Admin invitation (storing only its SHA-256 hash, 7-day expiry) as an access change set by
the platform actor, writes a `platform_audit_log` entry, and hands back the invitation link
once via the channel settled in Q3 (printing to stdout in local mode only, never in
application structured logs or, unless explicitly accepted in Q3, Cloud Run's stdout log
stream)
**And** `roadmaps_app` cannot create a tenant or call any platform procedure

### S2: Issue a replacement Admin invitation

**Given** an existing tenant
**When** an operator runs the `invite-admin` command with the tenant slug, email,
provider and execution ID
**Then** it creates a single-use Admin invitation as an access change set, logs the
operation in `platform_audit_log`, and hands back the one-time link once via the same
channel as S1

### S3: Disable a person and remove a sign-in identity

**Given** an existing person with active sessions and one or more sign-in identities
**When** an operator runs `disable-person` or `remove-identity` with the person ID (and
identity ID) and execution ID
**Then** `disable-person` marks the person disabled, revokes every active session of that
person immediately (so subsequent requests fail 401 and callbacks refuse them), and
writes `platform_audit_log`; `remove-identity` deletes the named identity and writes
`platform_audit_log`

### S4: Fail-closed environment and argument validation

**Given** any platform operator command
**When** invoked with an unexpected environment variable set, missing required argument,
invalid email/slug, or duplicate tenant slug
**Then** it exits non-zero, writes nothing to the database, and logs only allow-listed
fields without echoing submitted values

## Open questions

- **Q1**: Should each platform command be exposed as its own console script entrypoint in
  `apps/api/pyproject.toml` (e.g. `roadmaps-create-tenant`, `roadmaps-invite-admin`,
  `roadmaps-disable-person`, `roadmaps-remove-identity`) so Cloud Run jobs bind one
  entrypoint per job as ADR-019 requires?
  - (a) Four dedicated console-script entrypoints (recommended) — matches ADR-019 ("each
    job is one command: its entrypoint is that command, so overriding its arguments at
    run time cannot run another").
  - (b) One CLI binary with subcommands — simpler locally, does not satisfy ADR-019's
    single-command entrypoint guarantee without wrapper scripts in EPC-023.
- **Q2**: How should `create-tenant` / `invite-admin` format the invitation link locally
  before a custom domain exists?
  - (a) Take the editor's base URL from a baked/configured setting (defaulting locally to
    the slot's editor URL) and output `<base>/#/invitations/accept?token=<token>`
    (matching `STY-112` Q1 — still inside the URL fragment per RFC 9110, so never sent on
    HTTP requests or `Referer`) (recommended) — copy-pasteable directly into a local
    browser.
  - (b) Output only the raw token and let operators assemble the URL — harder to use
    locally and more error-prone for operators.
- **Q3**: On Cloud Run, stdout and stderr are forwarded automatically to Cloud Logging
  (exported to a retention-locked bucket for two years), so D1 requires hosted
  `create-tenant` and `invite-admin` jobs to deliver the one-time Admin invitation link
  outside stdout and stderr (with a standing no-stdout test outside local mode). Which
  out-of-band mechanism should hosted jobs use?
  - (a) A short-lived Secret Manager secret version readable only by the job's named
    operator principals (`EPC-023` IAM) and destroyed after first read (recommended) —
    native to Google Cloud IAM and audit logging, no operator keypair management.
  - (b) Encrypt the one-time link to a recipient public key supplied by the starting
    operator so only ciphertext is emitted — avoids creating per-invitation secrets,
    requires operator public-key tooling.

## Decisions

- **D1** (owner, 2026-11-26, STY-102 review follow-up #3 / `STY-102` D15; narrows S1 and
  Q3): hosted `create-tenant` and `invite-admin` jobs deliver one-time Admin invitation
  links out of band — never to `stdout` or `stderr` outside local mode, proven by a
  standing test — keeping raw tokens out of Cloud Logging and two-year log exports
  (recorded in ADR-019 _STY-102 amendments_). The exact out-of-band mechanism stays open
  in Q3 for `STY-104` grilling.
- **D2** (owner, 2026-11-26, `STY-103` D2, D5, D6, D7, D10, D12, D13, D14, D15):
  `invitations`, `roadmaps_platform` and `roadmaps_platform_definer` exist from `STY-103`;
  `STY-104` adds its platform definers in an incremental migration, takes bilingual `name_en`
  / optional `name_cy`, seeds `tenant_scopes` and `system_key` roles, writes `actor_kind =
'platform_job'` / `actor_ref` and `issued_by_platform_execution_id`, and refuses `'local_mock'` outside local/test.
- **D3** (owner, 2026-11-27, `STY-093` grilling R2 #2a): `STY-104` reuses the canonical
  `Permission` `StrEnum` and immutable `SHIPPED_ROLES` mapping in
  `apps/api/src/roadmaps_api/authz/permissions.py` (introduced by `STY-093` or `STY-105`)
  when seeding a new tenant's three shipped roles in `create-tenant`.

## Out of scope

- Cloud Run job definitions, IAM bindings and Cloud Audit Log export (`EPC-023`).
- Redaction escalation job (`EPC-026`).
