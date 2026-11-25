# STY-110: Invitation create, list, revoke, lookup and OIDC redemption API

- **Status**: Needs grilling — delivers ADR-018's single-use invitation lifecycle in the
  API, connecting Tenant Admin invitations and `STY-104` bootstrap invitations to OIDC
  redemption
- **Type**: Feature
- **Area**: API + Infrastructure
- **Epic**: [EPC-025-tenant-members-and-invitations](README.md)
- **Depends on**: STY-093 (hard — seeder harness extended with invitation factories),
  STY-102 (hard — threat model written first, ADR-018 _EPC-024 amendments_), STY-104
  (hard), STY-106 (hard)
- **Binding ADRs**: ADR-015 §People, access and permissions, §History, §ADR-018 and
  ADR-019 amendments; ADR-017 §Errors, §The contract with the editor; ADR-018 §Getting
  in, §Records and retention; ADR-019 §What members and assigned leads may do,
  §Enforcement
- **Suggested model**: Opus — atomic definer-function redemption, hash-only token
  handling, cross-tenant security and access change sets

## Summary

Adds the complete invitation API so Tenant Admins (`members:manage`) can create
invitations for Product Leads, Viewers or Admins (receiving the one-time token/link once
to copy and send), list pending invitations, and revoke unredeemed invitations — and so
any invited person (whether invited by a Tenant Admin or by `STY-104`'s platform
operator CLI) can preview who invited them to which tenant and redeem the invitation
through OIDC sign-in (`purpose=redeem`). Redemption matches the verified email
case-folded, consumes the token atomically through a dedicated definer function, creates
the person/identity/membership (or adds the membership to an existing person) and records
an access change set. Also extends the retention purge CLI to purge spent/expired
invitations after 90 days.

## Scope

API routes, services, repositories and definer functions for invitation lookup (by token
hash), atomic redemption (`purpose=redeem` in OIDC start + callback), tenant-admin
create/list/revoke, retention purge CLI extension, seeder factories (`STY-093`), OpenAPI
and `packages/api-types` regeneration, and `api-error.ts` mappings. No editor screens
yet (`STY-112`, `STY-113`).

## Acceptance criteria

### S1: Tenant Admins create, list and revoke invitations as access change sets

**Given** a Tenant Admin holding `members:manage` in tenant T
**When** they create an invitation naming an email address, provider and shipped role(s),
list pending invitations, or revoke a pending invitation
**Then** creating generates a 256-bit random token, stores only its SHA-256 hash with a
7-day expiry, records an access change set (with idempotency), and returns the raw token
(or full link) **once** in the initial creation response only (never in list responses,
logs, or any database column — an idempotent retry with the same key, tenant, person and
request hash writes nothing and returns the invitation metadata **without** the raw token,
so an Admin whose initial response was lost revokes and re-issues; an integration test
replays a create and scans database tables to prove the raw token is never stored)
**And** revoking marks the invitation revoked as an access change set so it can never be
redeemed
**And** callers without `members:manage` receive 403; non-members receive 404 (proved by
the generated role-by-route matrix and cross-tenant sweep)

### S2: Invitation lookup previews tenant and inviter without revealing status details

**Given** a raw invitation token posted in a JSON body (never in a URL query string,
keeping it out of request logs)
**When** the editor calls the public lookup endpoint
**Then** for a valid, pending, unexpired invitation whose tenant, roles and inviter's
`members:manage` right (or platform issuer) still hold, it returns the tenant's name,
the inviter's display name (or platform label), the offered role names, provider and
expiry — never the invited email address or internal IDs beyond what redemption needs
**And** for an unknown, redeemed, revoked, expired or invalidated token, it refuses with
one uniform error code (`invitation.unavailable`)

### S3: Atomic OIDC redemption binds verified email and consumes the token once

**Given** an accepted invitation submitted to `POST /api/v1/auth/sign-in` with
`purpose=redeem`
**When** the user completes the OIDC callback for the provider the invitation names
**Then** the API verifies the provider's verified email matches the invited address
case-folded, ignores any pre-existing session cookie, and invokes the dedicated redemption
definer function which locks the invitation row, re-checks expiry/revocation/inviter
authority/tenant/roles, consumes the token atomically, creates the person and identity
(or reuses the existing person if that `(issuer, subject)` already exists), creates the
membership and role rows, records the access change set (and `platform_audit_log` if a
person was created), and starts a fresh session
**And** concurrent or repeated redemptions of the same token succeed at most once; an
unavailable or invalidated invitation (redeemed, revoked, expired, inviter lost
`members:manage`, tenant or role gone), wrong provider or disabled person writes nothing
and refuses with one uniform code (`invitation.unavailable`), and a verified-email
mismatch likewise writes nothing, leaves the invitation redeemable, never leaks the
expected email address, and refuses with the code chosen in Q3

### S4: Retention purge CLI removes spent and expired invitations after 90 days

**Given** invitations redeemed, revoked or expired more than 90 days ago
**When** the retention purge CLI runs
**Then** it purges them through the dedicated definer function while leaving recent and
active invitations untouched

## Open questions

- **Q1**: What happens if a Tenant Admin invites an email address that already has a
  pending unexpired invitation in the same tenant?
  - (a) Refuse with a clear conflict error (`invitation.already_pending`) and prompt the
    Admin to revoke the existing invitation first if they want to change its role or
    re-issue a fresh link (recommended) — explicit, prevents silent invalidation of a link
    already sent to a colleague.
  - (b) Automatically revoke the older pending invitation and issue a new one — faster
    resend flow, surprises a colleague who clicks the first link.
- **Q2**: Does the create-invitation request accept a single `roleId` or a bounded
  `roleIds` list (following ADR-020 _DEF-043 amendments_)?
  - (a) Bounded `roleIds` list (`Field(min_length=1, max_length=10)`) (recommended) —
    aligns with ADR-018 ("the roles") and `STY-103` Q2's `membership_roles` join table.
  - (b) Single `roleId` for now — avoids a collection field until custom roles exist.
- **Q3**: Should a verified-email mismatch during OIDC redemption return the same
  `invitation.unavailable` code as every other refusal, or a separate
  `invitation.email_mismatch` code (never naming the expected email) so `STY-112` can tell
  a user who signed into the wrong account to retry with their invited address?
  - (a) Separate `invitation.email_mismatch` code (never echoing the expected address)
    (recommended) — the user already passed OIDC with a valid DHCW/NHS account and held
    the 256-bit link, so telling them to sign in with the invited account avoids false
    "link expired" confusion without leaking the target email.
  - (b) Use the same `invitation.unavailable` code for email mismatch too — reveals zero
    information about whether a link is still active, at the cost of a vaguer error for
    multi-account users (`STY-112` S3 then shows one uniform message).

## Decisions

- **D1** (agent, 2026-11-25, from Fable 5.2 security review — to confirm when grilling
  `STY-110`): an idempotent retry of invitation creation returns the invitation metadata
  without the raw token (narrowing ADR-015's "returns its first result" for this write
  and recording an ADR-015 amendment if confirmed), rather than storing raw tokens or
  cached response bodies in PostgreSQL, which would break ADR-018's hash-only storage
  invariant.

## Out of scope

- Editor invitation acceptance page (`STY-112`) and Admin invitations management UI
  (`STY-113`).
- Sending invitation emails from the API (deferred; ADR-018 Option 8).
- Uninvited access requests (`STY-094`).
