# ADR-019: The API authorises every route by a declared policy, from a permission catalogue in code and three shipped roles

- Status: Proposed — drafted from the owner's answers in the identity and authorisation
  grilling (2026-11-21), for the owner's acceptance; the options chosen are marked ✅.
- Date: 2026-11-21

## Context

ADR-015 holds who may do what in the database and has the API check it on every
request, while row-level security isolates tenants (Option 20). It fixes the outline:
a fixed permission catalogue in the application, bundled into roles each tenant defines,
with room for a direct grant later (Option 19); editing a roadmap needs an assignment to
it (Option 13), except for admins, who edit every roadmap (Option 23); an admin assigns
leads, or an assigned lead adds co-leads (Option 16); any Product Lead adds a roadmap
and is assigned to it (Option 17); the Product Lead role holds `roadmaps:create` and
`tags:edit`, and every other permission is admin-only by default (Option 22); platform
operators create tenants (Option 21). It left the catalogue, the roles and how the API
enforces them to this ADR (Option 35). Who a person is, and their session, are ADR-018's.
The analysis behind both is
[identity and authorisation](../analysis/identity-and-authorisation.md).

## Decision

### The catalogue and the shipped roles

- **The permission catalogue is a typed enumeration in the API's code.** A tenant's
  roles name permissions, validated against the catalogue when written and at start-up;
  an unknown name fails closed and is logged, never silently ignored.

  | Permission           | Allows                                                                 |
  | -------------------- | ---------------------------------------------------------------------- |
  | `roadmaps:create`    | adding a roadmap, which assigns its adder to it                        |
  | `roadmaps:publish`   | publishing and unpublishing a roadmap the holder may edit              |
  | `tags:edit`          | adding a tag and renaming one                                          |
  | `lists:edit`         | families, categories and organisations; retiring and reinstating a tag |
  | `members:manage`     | inviting, ending a membership, changing roles, the access review       |
  | `assignments:manage` | assigning and unassigning anyone on any roadmap                        |
  | `content:redact`     | redaction (ADR-015 Options 9, 34; the database checks it too)          |
  | `tenant:settings`    | the tenant's name and public address                                   |

- **Three shipped roles** (Options 4, 5):
  - **Admin**: every permission, and edits every roadmap without an assignment.
  - **Product Lead**: `roadmaps:create`, `roadmaps:publish` and `tags:edit`.
  - **Viewer**: no permission.
- **Tenants cannot edit roles yet** (Option 3): every tenant gets the shipped roles; the
  schema already holds roles as rows naming permissions, so a role editor (and a
  `roles:manage` permission) arrives when a tenant needs one, as ADR-015 Option 19
  allows.

### What every member, and every assigned lead, may do

- **Every member reads everything in their tenant** (Option 1): every roadmap, its
  published version, its shared draft and its history, read-only. A scratch stays its
  owner's alone (ADR-015).
- **An assigned lead, or an admin, edits a roadmap**: the scratch, saving, discarding
  and restoring a past version (ADR-015 Options 3, 13, 23).
- **Publishing and unpublishing need `roadmaps:publish` and the right to edit that
  roadmap** (Option 2): any assigned Product Lead publishes, as today. Publishing stays
  its own permission and its own change set, so a later approval step (a second person
  approving a publish) is a role change and a new rule, not a rework.
- **An assigned lead, or an admin, retires and reinstates a roadmap** (Option 6);
  retired roadmaps are seen by their leads and the tenant's admins (ADR-015 Option 33).
- **Assignments** (Option 7): an admin assigns or unassigns anyone; an assigned lead
  adds a co-lead from the tenant's members (ADR-015 Option 16) and may unassign
  themselves, even as the last lead, after which only admins edit that roadmap; a lead
  cannot unassign another lead.
- **Lists are the admins'** (Option 8): families, categories and organisations need
  `lists:edit`, as does retiring or reinstating a tag; a Product Lead adds and renames
  tags (`tags:edit`) and chooses a roadmap's family and category. On the API, the
  Families page is read-only for a Product Lead.
- **Members** (Option 9): every member sees the members' names, their roles and who
  leads which roadmap; email addresses, last sign-in, invitations and the access review
  need `members:manage`.

### Keeping access current

- **A tenant keeps at least one admin** (Option 10): the API refuses to end the last
  admin's membership or remove their role, checked under the access scope's lock. If the
  only admin's account is gone, a platform operator job appoints the replacement the
  tenant names, recorded in the platform audit log. Tenants are advised to keep two.
- **An access review every six months** (Option 11): the members page shows each
  member's last sign-in; admins are prompted to confirm or remove each member, and each
  confirmation is an access change set. People who move between NHS Wales organisations
  keep their Entra account, so nothing else ends an old membership.

### Platform operators

- **Platform operations are CLI commands run as Cloud Run jobs that only named Google
  Cloud principals may start** (Option 12): creating a tenant and its first admin,
  appointing a replacement admin, disabling a person (sign-in refused, sessions revoked
  across every tenant), removing an identity (ADR-018) and redaction escalations.
- **Who ran a job is taken from Cloud Audit Logs**, not typed on the command line: the
  platform audit log records the job's execution ID, which joins to the audit log entry
  naming the principal that started it, kept in a retention-locked log bucket (EPC-023).
- **No operator web surface and no impersonation**, not even read-only: support works
  from what the person shares on screen. An operator holds no tenant access unless
  invited like anyone else.

### Enforcement

- **Every route declares exactly one policy**: public, signed in (a person, no tenant),
  or a named permission in a named tenant (Option 13). A custom route class refuses to
  register a route without one, so the app refuses to start; the default is deny. The
  public routes are a reviewed list in code.
- **Every tenant route names its tenant** in the request (Option 14): the editor's
  address carries it, and one dependency checks it against the person's membership and
  sets it for the transaction (ADR-017). A tenant held in the session is rejected: a
  switch in one tab would silently retarget another, and new items could land in the
  wrong tenant.
- **Object-level checks live in services**: an edit checks the assignment (or the admin
  role) on the roadmap named. Row-level security isolates tenants beneath the
  repositories' tenant filter. An ID from another tenant answers 404, never 403, so
  existence does not leak.
- **Tests prove it**:
  - every route has a policy, and the public list matches the reviewed list;
  - a role-by-route matrix, generated from the catalogue and the shipped roles: each
    role, a member with no role, a non-member and an anonymous caller against every
    route's expected answer;
  - a cross-tenant sweep: every tenant route called with another tenant's IDs answers
    404 and changes nothing;
  - an unassigned lead is refused every edit route, and a Viewer every write;
  - the last admin cannot be removed;
  - every table has row-level security enabled and forced, with a policy; the
    application's role does not bypass it, owns nothing, and cannot change the platform
    audit log or history.
- **Lint**: permission names are referenced only through the enumeration, never as
  string literals outside it (a test over the API's source, beside ADR-017's ruff and
  import-linter).

## Consequences

- **The Families page changes for Product Leads** when the editor switches to the API:
  today any connected lead manages families and categories; then it is read-only for
  them, and admins manage the lists.
- **A Viewer is a new kind of user** the editor has not had: everything is read-only
  for them, and the editor's switch-over epic designs that.
- **The editor's interface shows permissions as hints only**; the API decides.
- **ADR-015 is amended** when this is accepted: Option 16 gains "a lead may unassign
  themselves, even as the last lead"; the last-admin rule and the access review join
  _People, access and permissions_.
- **Follow-on work**: EPC-022's schema story for people, memberships, roles and
  assignments with the enforcement suite above; the editor's new editing model (a later
  epic) builds the screens for members, assignments, the access review and the Viewer.

## Options (owner's choice marked ✅, 2026-11-21)

1. **Who reads** — ✅ every member reads every roadmap, draft and history. Lost: drafts
   to assignees only (harder co-ordination across products); assigned roadmaps only.
2. **Publishing** — ✅ any assigned lead, as today, keeping room for a second person to
   approve later. Lost: an admin-only publish permission; a two-person rule now.
3. **Editable roles** — ✅ the shipped roles only at first. Lost: a role editor before
   anyone needs one.
4. **A read-only role** — ✅ Viewer. Lost: making onlookers Product Leads.
5. **Product Lead** — ✅ `roadmaps:create` and `tags:edit` (ADR-015 Option 22), plus
   `roadmaps:publish` (Option 2).
6. **Retiring a roadmap** — ✅ assigned leads and admins. Lost: admins only; leads
   retire and admins reinstate.
7. **Unassigning** — ✅ a lead unassigns themselves, even as the last; an admin
   unassigns anyone. Lost: any lead removing any co-lead (a lead could lock a co-lead
   out); admins only.
8. **Lists** — ✅ admin-only, the Families page read-only for leads (ADR-015 Option
   22); `tags:edit` adds and renames, retiring a tag is an admin's. Lost: leads editing
   families and categories, as today; leads retiring tags; leads only adding tags.
9. **The member list** — ✅ names and roles to all, the rest to admins. Lost: admins
   only, with leads picking co-leads by exact search.
10. **The last admin** — ✅ a guard, and an operator job appoints a replacement. Lost:
    requiring two admins.
11. **Movers** — ✅ last sign-in shown and a six-monthly review. Lost: memberships
    lapsing when unused (surprises occasional editors); last sign-in only.
12. **Platform operators** — ✅ IAM-gated jobs, no web surface, no impersonation. Lost:
    an operator website (a public route to the most privileged actions); a read-only
    "view as" (breaks need-to-know).
13. **Proving every route is authorised** — ✅ fail-closed route declarations and
    generated tests. Lost: per-route guards and spot tests.
14. **Which tenant a request is for** — ✅ every request names it. Lost: held in the
    session.
