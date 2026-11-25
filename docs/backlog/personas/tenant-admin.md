# Tenant Admin

- **Role**: Administrator for one tenant (an NHS Wales organisation, DHCW first), holding
  the **Admin** shipped role in the DHCW Roadmap Editor (ADR-019).
- **Status**: Draft — derived from ADR-015, ADR-018 and ADR-019 (2026-11-25); still to
  check with real DHCW administrators.
- **Last updated**: 2026-11-25

Read this before designing a story, a UX prototype or copy for access management, lists,
or tenant-wide administration.

## Where this tool sits

- A Tenant Admin administers **one tenant's** people, roadmaps and shared lists inside the
  internal Roadmap Editor. Nothing one tenant holds is visible to another (ADR-015).
- They are **not** a platform operator (ADR-019): they cannot create tenants, disable a
  person across tenants, or link/remove someone else's sign-in identities.
- Often a Tenant Admin is also a senior Product Lead or delivery/service manager who edits
  or steps in on roadmaps when a Product Lead is away (`roadmaps:edit-any`, ADR-019).

## Who they are

- An accountable staff member at DHCW (or, later, another NHS Wales organisation) who
  knows who currently leads which products in their organisation.
- Not a developer. They think in colleagues, roles ("Product Lead", "Admin", "Viewer")
  and products — never in database roles, OIDC subjects, token hashes or RLS policies.
- Uses the editor occasionally for admin tasks (onboarding a new Product Lead, updating a
  role, removing a leaver, running the six-monthly access review, maintaining product
  families and categories), alongside occasional roadmap oversight.
- Mostly on a desktop; a phone must still work for quick checks or revoking an invitation.
- Works in English, with the interface available in English and Welsh (ADR-008).

## Goals and jobs to be done

- **Bring new people into the tenant**: invite a Product Lead, Viewer or second Admin by
  email address, copy the single-use invitation link, and send it to them directly (email
  sending is deferred; ADR-018 Option 8).
- **Keep access accurate**: see who is in the tenant, what role each person holds, when
  they last signed in, and which pending invitations have not yet been accepted; revoke an
  unredeemed invitation if sent to the wrong person or no longer needed.
- **Change roles and remove leavers**: promote or demote members between Admin, Product
  Lead and Viewer, and end a membership when someone leaves the organisation or changes
  role, without accidentally locking the tenant out (the last admin cannot be removed or
  demoted; ADR-019 Option 10).
- **Confirm access every six months**: review the member list against last sign-in dates
  and confirm or remove each member (ADR-019 Option 11).
- **Keep shared lists tidy and step in on roadmaps**: manage families, categories,
  organisations and retired tags (`lists:edit`), manage roadmap assignments
  (`assignments:manage`), edit or publish any roadmap (`roadmaps:edit-any`), and redact
  content published in error (`content:redact`).

## Pain points and risks

- **Inviting the wrong person or leaking a link.** An invitation binds to both the
  single-use link and the invited verified email (ADR-018 Option 5), so a forwarded link
  alone admits nobody, but the Admin still needs to see clearly who was invited, with what
  role, and be able to revoke it in one step.
- **Stale access after staff move within NHS Wales.** Staff who move between NHS Wales
  organisations keep their NHS Wales account (ADR-019), so nothing removes them from the
  old tenant unless an Admin does.
- **Locking the tenant out.** Removing or demoting the only Admin would require a platform
  operator to issue a replacement invitation; the UI warns and encourages keeping two
  Admins (ADR-019).
- **Accidental destructive changes.** Ending a membership or revoking an invitation needs
  clear confirmation stating what happens next (immediate effect on the next request; past
  history kept).

## What they need from the product

Behaviours, not screens:

- See all current members (name, role, email, last sign-in) and pending invitations
  (email, role, who invited, expiry) in one place.
- Invite a person in a few seconds: enter email, choose one of the shipped roles, create
  the invitation, and get a clear copyable link with plain instructions to send it — shown
  once, since the server keeps only its hash (ADR-018).
- Revoke a pending invitation, change a member's role, or end a membership with clear
  confirmation and immediate feedback.
- Know plainly when an action is blocked by the last-admin rule, and why.
- Switch tenants cleanly if they belong to more than one organisation, always knowing
  which tenant they are acting in (ADR-018 Option 16, ADR-019 Option 14).

## Writing for them: copy and UX implications

- **Plain English and Welsh, sentence case**, matching the Product Lead voice. Speak
  "member", "invitation", "role", "Admin", "Product Lead", "Viewer" and the organisation's
  name (e.g. "DHCW"); never "tenant ID", "OIDC", "subject", "hash" or "RBAC".
- **Make the one-time link unmistakable.** Tell the Admin clearly to copy and send the
  invitation link now, that it expires in seven days, and that only the invited email
  address can use it.
- **No false permanence.** Removing a member ends their access to this tenant immediately;
  it does not delete past roadmap history or affect their access to other NHS Wales
  organisations.

## Out of scope for them

They never need to know, and the interface never mentions:

- Database tables, row-level security, session cookies, hashes or OIDC providers' internal
  claims.
- Creating new tenants, disabling a person platform-wide, or managing another person's
  sign-in identities (platform operator jobs, ADR-019).
- Editing role permission definitions (shipped roles only at first, ADR-019 Option 3).
