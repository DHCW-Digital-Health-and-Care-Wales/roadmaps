# Viewer

- **Role**: Read-only member of a tenant, holding the **Viewer** shipped role in the DHCW
  Roadmap Editor (ADR-019).
- **Status**: Accepted — derived from ADR-015, ADR-018 and ADR-019 and confirmed by owner
  answers V1–V3 on 2026-11-25. Still to check with real internal stakeholders.
- **Last updated**: 2026-11-25

Read this before designing read-only states, navigation or copy for members who cannot
edit roadmaps or manage access. Each owner answer is cited by its number under
[Owner answers](#owner-answers).

## Where this tool sits

- A Viewer is an invited internal member of **one tenant** (or more than one, switching
  between them; ADR-018, ADR-019). Nothing one tenant holds is visible to another
  (ADR-015).
- Unlike a [public reader](public-reader.md) on the public site, a Viewer sees internal
  unpublished shared drafts, version history and who leads each product inside the
  editor, without changing anything (ADR-019 Option 1).

## Who they are

- An internal colleague — programme manager, governance reviewer, communications lead,
  clinical safety officer or observing peer Product Lead — who needs visibility of
  upcoming roadmap changes and product ownership without editing them.
- Invited by a [Tenant Admin](tenant-admin.md) like any other member (ADR-018); holds no
  write permissions (ADR-019 Option 4).
- Not a developer. They think in products, drafts, published roadmaps and colleagues —
  never in roles tables, permissions catalogues or database snapshots.
- Visits occasionally and on demand — often arriving via a link shared by a Product Lead
  before a review, communications check or governance meeting (V2).
- Desktop-primary; a phone must still work cleanly for quick checks (V2).
- Works in English, with the interface available in English and Welsh (ADR-008).

## Goals and jobs to be done

- **Review unpublished drafts and cross-product plans**: read a roadmap's shared draft
  before it goes public, compare it with what is already published, and give feedback to
  its Product Lead out-of-band (V1).
- **Check who leads a product**: see the tenant's member directory (names, roles and
  roadmap assignments) to know who to contact about a roadmap (V1, ADR-019 Option 9).
- **Check version history when needed** (secondary): see past snapshots and change sets
  for governance or context (V1, ADR-019 Option 1).

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

## Pain points and risks

- **Mistaking a draft for what is live (or vice versa).** When reviewing an upcoming
  change from a shared link, it must be unmistakable whether they are looking at the
  published roadmap or an unpublished draft (V3).
- **Not knowing who to contact.** Because they cannot edit directly, they need to see who
  leads a roadmap so they can send feedback or ask an Admin to upgrade their access (V3).
- **Noisy read-only screens.** Disabled edit buttons, dead-end links or "access denied"
  banners make a legitimate read-only member feel shut out or broken (V3).

## What they need from the product

Behaviours, not screens:

- Open a shared link to a roadmap and tell at a glance what is published and what is an
  unpublished draft (V1, V3).
- Read roadmap items, product details, shared lists and version history cleanly on
  desktop and phone, without edit clutter (V2, V3).
- See who leads a roadmap and browse the member directory (names and roles) so they know
  who to message with feedback or an access request (V1, V3).
- Switch tenants cleanly if they belong to more than one organisation, always knowing
  which organisation they are viewing (ADR-018, ADR-019).

## Writing for them: copy and UX implications

- **Plain English and Welsh, sentence case**, matching the Product Lead voice. Speak
  "published", "draft", "roadmap", "Product Lead", "Admin" and "Viewer".
- **Calm, purposeful read-only views.** Hide controls a Viewer cannot use rather than
  disabling them, while the API remains the authority (ADR-019 _Consequences_, V3).
- **Never shame with "access denied"** on screens a Viewer is meant to read. When
  explaining why something is read-only, state it neutrally and name who can help.

## Out of scope for them

They never need to know, and the interface never mentions:

- Private scratch (strictly out of scope for Viewers; V3).
- Edit, publish, retire, restore or list-management controls.
- Retired roadmaps, other members' email addresses, last sign-in times, pending
  invitations or the six-monthly access review.
- Permission names, OIDC claims, session mechanics or database details.

## Owner answers

Given by the owner on 2026-11-25; still to be checked with real internal stakeholders.

1. **V1, primary jobs**: two co-primary jobs — reviewing unpublished drafts and
   cross-product plans before they go public (giving feedback out-of-band), and checking
   who leads a product; reading version history is secondary.
2. **V2, cadence and devices**: occasional and on-demand visits (often arriving via a
   shared link before a review or governance meeting); desktop-primary, with phone
   supported for quick checks.
3. **V3, pain points**: confusing published vs. unpublished draft, not knowing who leads a
   product to send feedback or ask for edit access, and noisy read-only UI (disabled
   buttons or "access denied"). Private scratch stays strictly out of scope for Viewers.
