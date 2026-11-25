# Viewer

- **Role**: Read-only member of a tenant, holding the **Viewer** shipped role in the DHCW
  Roadmap Editor (ADR-019).
- **Status**: Draft — derived from ADR-015, ADR-018 and ADR-019 (2026-11-25); still to
  check with real stakeholders.
- **Last updated**: 2026-11-25

Read this before designing read-only states, navigation or copy for members who cannot
edit roadmaps or manage access.

## Who they are

- An internal colleague (programme manager, governance reviewer, communications lead,
  clinical safety officer or peer Product Lead in an observing capacity) who needs to see
  a tenant's internal roadmaps, unpublished drafts, history and who leads each product,
  without changing anything.
- Invited by a Tenant Admin like any other member (ADR-018); holds no write permissions
  (ADR-019 Option 4).

## What they can and cannot see

- **Can see**: every current roadmap's published version, shared draft and history
  (read-only); product families, categories, tags and organisations (read-only); the
  tenant's member names, roles and who leads each roadmap (ADR-019 Option 9); and their
  own account page.
- **Cannot see**: retired roadmaps (assigned leads and Admins only; ADR-019), anyone
  else's private scratch (owner only; ADR-015), or members' email addresses, last sign-in
  times, invitations and the access review (`members:manage` only; ADR-019).
- **Cannot do**: create, edit, publish or retire roadmaps; manage lists, tags,
  assignments or members.

## UX implications

- Read-only views should feel calm and purposeful, not cluttered with disabled edit buttons
  or dead-end permission errors: controls a Viewer cannot use stay hidden or read-only,
  while the API remains the authority (ADR-019 _Consequences_).
- Interface copy never shames a Viewer with "access denied" on screens they are meant to
  read.
