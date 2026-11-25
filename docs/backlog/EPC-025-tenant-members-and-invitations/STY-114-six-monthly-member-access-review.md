# STY-114: Six-monthly member access review across the API and editor

- **Status**: Placeholder — follow-on story after the core Members & Invitations lifecycle
  (owner, 2026-11-25, EPC-025 planning Q5); promoted once `STY-111` and `STY-113` land
- **Type**: Feature
- **Area**: API + Infrastructure + Features/UI + i18n (en + cy)
- **Epic**: [EPC-025-tenant-members-and-invitations](README.md)
- **Depends on**: STY-111 (hard), STY-113 (hard)
- **Binding ADRs**: ADR-015 §History; ADR-019 §Keeping access current
- **Suggested model**: Sonnet — builds cleanly on `STY-111`'s members API and `STY-113`'s
  members page

## Summary

Implements ADR-019's six-monthly member access review so Tenant Admins catch staff who
have moved between NHS Wales organisations (keeping their NHS Wales account) and no
longer need access to this tenant. Tracks when each membership was last confirmed,
prompts Tenant Admins on the Members page when reviews are due, and lets them confirm
or remove each member — recording each confirmation as an access change set.

## Why this is a placeholder

The owner sequenced the core invitation and member management lifecycle (`STY-110`–
`STY-113`) ahead of the six-monthly access review (2026-11-25, Q5). Acceptance criteria
and UX details will be grilled once `STY-111` and `STY-113` are in place.

## Rough shape of the work

_Not acceptance criteria._

- Store `last_reviewed_at` (and reviewer person ID) on `memberships` (or derive from
  access review confirmation events) and expose review due status in `GET
/api/v1/tenants/{tenantSlug}/members` for `members:manage` callers.
- Add a `members:manage` endpoint to confirm one member's (or a batch of members')
  ongoing access, recording an access-scope `change_set`.
- On the Members page for Tenant Admins, surface a clear prompt/filter when any member
  has not been confirmed in the past six months, showing each member's last sign-in
  alongside "Confirm access" and "Remove" actions in English and Welsh.

## Decisions

- **D1** (owner, 2026-11-25, EPC-025 planning Q5): place the six-monthly access review as
  a follow-on story at the end of EPC-025 so the core invite/manage Product Lead flow
  lands across all layers first.
