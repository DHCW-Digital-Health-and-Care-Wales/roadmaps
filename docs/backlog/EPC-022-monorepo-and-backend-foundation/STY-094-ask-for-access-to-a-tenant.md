# STY-094: Someone not yet invited asks for access, and a tenant admin approves or declines it

- **Status**: Placeholder — the owner's future story (2026-11-21); designed once ADR-018
  and ADR-019 are accepted and the invitation story exists
- **Type**: Feature
- **Area**: API + Features/UI + i18n (en + cy)
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: the invitation story (not yet written; hard)
- **Binding ADRs**: ADR-018 §Getting in, ADR-019 §Members
- **Suggested model**: Opus — an unauthenticated write path into a tenant's access

## Summary

A valid NHS Wales user (or, before Entra, a DHCW Workspace user) who signs in without an
invitation sees "You haven't been invited" and can ask for access to an organisation.
The request waits on a tenant admin's pending join requests screen; approving it
admits them as an invitation would, declining it removes it. Today such a sign-in is
refused and writes nothing (ADR-018).

## Why this is a placeholder

ADR-018 and ADR-019 are Proposed, and the invitation flow it extends is not yet
written. The owner raised it in the review of the identity ADRs (2026-11-21).

## Rough shape of the work

_Not acceptance criteria._

- What a request stores before a person exists (the identity, a name, the verified
  email, the chosen tenant), within ADR-018's rule that an uninvited sign-in leaves no
  person row; its retention, purged when declined or after a period.
- Approval as an access change set by the approving admin, with a role; the requester
  notified, or told to sign in again.
- Abuse: a cap per identity and per tenant, since anyone in the directory can ask;
  whether the list of tenants to ask is shown at all.
- The pending join requests screen, for holders of `members:manage`.
