# STY-104: Platform operator CLI for tenants, bootstrap invitations and person control

- **Status**: Needs grilling — implements ADR-019's platform operator CLI jobs and
  definer procedures for bootstrapping tenants and managing cross-tenant person actions
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: STY-103 (hard)
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions; ADR-018 §Getting
  in, §Linking identities and the move to Entra; ADR-019 §Platform operators
- **Suggested model**: Opus — privileged platform definer procedures, fail-closed env
  validation and platform audit logging

## Summary

Provides the platform operator CLI commands that create a tenant (with its three shipped
roles) and issue its first Admin invitation, issue a replacement Admin invitation when a
tenant's only Admin is locked out, disable a person across all tenants (revoking active
sessions once `STY-106` adds sessions), and remove a sign-in identity. Each command is a
single-purpose entrypoint running under the platform database role, writes exclusively
through platform definer procedures, records its execution ID and arguments in the
append-only `platform_audit_log`, and refuses unexpected environment variables. Gives
local developers and future Cloud Run jobs the one supported way to bootstrap a tenant.

## Scope

`apps/api/src/roadmaps_api/platform/` (CLI entrypoints + platform service/repositories),
platform definer procedures (in `STY-103` or an incremental migration), root scripts for
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
the platform actor, writes a `platform_audit_log` entry, and prints the invitation link
once to stdout (never logging the raw token)
**And** `roadmaps_app` cannot create a tenant or call any platform procedure

### S2: Issue a replacement Admin invitation

**Given** an existing tenant
**When** an operator runs the `invite-admin` command with the tenant slug, email,
provider and execution ID
**Then** it creates a single-use Admin invitation as an access change set, logs the
operation in `platform_audit_log`, and prints the one-time link once

### S3: Disable a person and remove a sign-in identity

**Given** an existing person with one or more sign-in identities
**When** an operator runs `disable-person` or `remove-identity` with the person ID (and
identity ID) and execution ID
**Then** `disable-person` marks the person disabled (so callbacks and sessions refuse
them) and writes `platform_audit_log`; `remove-identity` deletes the named identity and
writes `platform_audit_log`

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
- **Q2**: How should `create-tenant` / `invite-admin` format the printed invitation link
  locally before a custom domain exists?
  - (a) Take the editor's base URL from a baked/configured setting (defaulting locally to
    the slot's editor URL) and output `<base>/#/invitations/accept#<token>` (or chosen
    route from `STY-108`) (recommended) — copy-pasteable directly into a local browser.
  - (b) Print only the raw token and let operators assemble the URL — harder to use
    locally and more error-prone for operators.

## Decisions

_Recorded during grilling._

## Out of scope

- Revoking active sessions in `disable-person` is wired cleanly as a hook here and proved
  against real sessions in `STY-106` once the `sessions` table exists.
- Cloud Run job definitions, IAM bindings and Cloud Audit Log export (`EPC-023`).
- Redaction escalation job (`EPC-026`).
