# Tenant Admin

- **Role**: Administrator for one tenant (an NHS Wales organisation, DHCW first), holding
  the **Admin** shipped role in the DHCW Roadmap Editor (ADR-019).
- **Status**: Accepted — derived from ADR-015, ADR-018 and ADR-019 and confirmed by owner
  answers T1–T4 on 2026-11-25. Still to check with real DHCW administrators.
- **Last updated**: 2026-11-25

Read this before designing a story, a UX prototype or copy for access management, lists,
or tenant-wide administration. Each owner answer is cited by its number under
[Owner answers](#owner-answers).

## Where this tool sits

- A Tenant Admin administers **one tenant's** people, roadmaps and shared lists inside the
  internal Roadmap Editor. Nothing one tenant holds is visible to another (ADR-015).
- They are **not** a platform operator (ADR-019): they cannot create tenants, disable a
  person across tenants, or link/remove someone else's sign-in identities.
- Typically a Tenant Admin is a dual-hatted senior Product Lead or delivery/service
  manager who also edits or steps in on roadmaps when a Product Lead is away
  (`roadmaps:edit-any`, ADR-019, T1). Tenants are advised to keep two or more Admins (one
  may lean toward portfolio/governance oversight, another toward stepping in on roadmaps;
  T1).

## Who they are

- An accountable staff member at DHCW (or, later, another NHS Wales organisation) who
  knows who currently leads which products in their organisation.
- Not a developer. They think in colleagues, roles ("Product Lead", "Admin", "Viewer")
  and products — never in database roles, OIDC subjects, token hashes or RLS policies.
- Admin work is occasional and bursty: about 15–30 minutes a month for onboarding a new
  Product Lead, updating roles, removing leavers and tidying shared lists, plus the
  six-monthly access review (T2). Every admin screen must be self-explanatory without
  memorising steps.
- Desktop-primary; a phone must still work cleanly for quick checks, revoking an
  invitation or removing a leaver urgently (T2).
- Works in English, with the interface available in English and Welsh (ADR-008).

## Goals and jobs to be done

- **Bring new people into the tenant**: invite a Product Lead, Viewer or second Admin by
  email address, copy the single-use invitation link (or a ready-to-paste message), and
  send it to them directly (email sending is deferred; ADR-018 Option 8, T3).
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
- **Failed invitation hand-offs.** While email sending is deferred, an invited colleague
  may try the wrong email address or miss the seven-day expiry unless the Admin passes
  those rules along clearly (T3).
- **Stale access after staff move within NHS Wales.** Staff who move between NHS Wales
  organisations keep their NHS Wales account (ADR-019), so nothing removes them from the
  old tenant unless an Admin does.
- **Locking the tenant out.** Removing or demoting the only Admin would require a platform
  operator to issue a replacement invitation; the UI warns and encourages keeping two
  Admins (ADR-019).
- **Accidental destructive changes.** Ending a membership or revoking an invitation needs
  clear confirmation stating what happens next (immediate effect on the next request; past
  history kept).
- **Stepping on a Product Lead's toes.** When stepping in on a roadmap with
  `roadmaps:edit-any`, the Admin risks colliding with an active lead unless they can see
  who is assigned and what draft or recent history exists first (T4).
- **Tenant-wide blast radius.** Renaming or retiring a shared family, category,
  organisation or tag (`lists:edit`), or redacting published content (`content:redact`),
  can affect many roadmaps at once; they need to see what is affected before confirming
  (T4).

## What they need from the product

Behaviours, not screens:

- Land on the Roadmap list like any other dual-hatted lead, with Members & Invitations and
  admin tools easy to reach without turning the editor into an admin console (T1).
- See all current members (name, role, email, last sign-in) and pending invitations
  (email, role, who invited, expiry) in one place.
- Invite a person in a few seconds: enter email, choose one of the shipped roles, create
  the invitation, and get a one-click copyable link as the primary action plus an optional
  ready-to-paste message (including the seven-day expiry and which email address to sign
  in with) — shown once, since the server keeps only its hash (ADR-018, T3).
- Revoke a pending invitation, change a member's role, or end a membership with clear
  confirmation and immediate feedback.
- Know plainly when an action is blocked by the last-admin rule, and why.
- Before stepping in on a roadmap or changing/retiring a shared list entry or redacting
  content, see who is assigned or how many roadmaps/items are affected (T4).
- Switch tenants cleanly if they belong to more than one organisation, always knowing
  which tenant they are acting in (ADR-018 Option 16, ADR-019 Option 14).

## Writing for them: copy and UX implications

- **Plain English and Welsh, sentence case**, matching the Product Lead voice. Speak
  "member", "invitation", "role", "Admin", "Product Lead", "Viewer" and the organisation's
  name (e.g. "DHCW"); never "tenant ID", "OIDC", "subject", "hash" or "RBAC".
- **Make the one-time link unmistakable.** Tell the Admin clearly to copy and send the
  invitation link now, that it expires in seven days, and that only the invited email
  address can use it (T3).
- **No false permanence.** Removing a member ends their access to this tenant immediately;
  it does not delete past roadmap history or affect their access to other NHS Wales
  organisations.
- **State blast radius plainly.** Before confirming a shared-list retirement or content
  redaction, say how many roadmaps or items it affects (T4).

## Out of scope for them

They never need to know, and the interface never mentions:

- Database tables, row-level security, session cookies, hashes or OIDC providers' internal
  claims.
- Creating new tenants, disabling a person platform-wide, or managing another person's
  sign-in identities (platform operator jobs, ADR-019).
- Editing role permission definitions (shipped roles only at first, ADR-019 Option 3).

## Owner answers

Given by the owner on 2026-11-25; still to be checked with real DHCW administrators.

1. **T1, who holds the role**: dual-hatted senior Product Leads or delivery/service
   managers, often with 2+ Admins per tenant (one leaning toward portfolio/governance
   oversight, another toward stepping in on roadmaps). The Roadmap list remains the shared
   home; admin tools stay easy to reach without turning the app into an admin console.
2. **T2, cadence and devices**: occasional and bursty (~15–30 minutes a month for
   onboarding, leavers and list tidy-up, plus the 6-monthly access review); desktop-primary,
   with phone supported for quick checks, revoking an invitation or removing a leaver.
3. **T3, invitation hand-off**: one-click copyable link as the primary action, plus an
   optional ready-to-paste message snippet covering the 7-day expiry and invited email
   address.
4. **T4, non-access pain points**: include stepping on a Product Lead's toes when using
   `roadmaps:edit-any` (seeing assigned leads and draft state first) and tenant-wide blast
   radius when changing/retiring shared lists or redacting published content (seeing what
   is affected before confirming).
