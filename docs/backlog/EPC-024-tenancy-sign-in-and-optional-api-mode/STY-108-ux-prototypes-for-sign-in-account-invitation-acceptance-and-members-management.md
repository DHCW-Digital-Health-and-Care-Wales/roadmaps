# STY-108: UX prototypes for sign-in, account, invitation acceptance and members management

- **Status**: Needs grilling — produces owner-selectable desktop and phone HTML
  prototypes (`ux-prototypes` skill) for the new API-mode editor screens before UI code
  is written
- **Type**: Docs
- **Area**: Docs
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-008, ADR-010, ADR-018 §Getting in, §The editor; ADR-019 §What
  members and assigned leads may do, §Keeping access current
- **Suggested model**: Opus — multi-screen UX design across desktop and phone for new
  personas (Tenant Admin, Product Lead, Viewer)

## Summary

Designs and prototypes the new editor screens introduced by the backend API before any
UI story implements them: (1) Sign-in landing and "You haven't been invited" refusal;
(2) Account menu (showing person's name, current tenant, and multi-tenant switcher) and
Account page (email, sign-in identity, "Sign out everywhere"); (3) Invitation acceptance
screen (showing tenant and inviter before posting the fragment token); and (4) Members
and invitations management screen (read-only names/roles view for Product Leads and
Viewers; full Admin management — invite user with role, one-time copyable link banner/
dialog, pending invitations with revoke, member list with email and last sign-in, role
change, member removal with last-admin guard). Uses `ux-prototypes` and the three
personas (`product-lead.md`, `tenant-admin.md`, `viewer.md`).

## Scope

One UX analysis document and self-contained desktop + phone HTML prototypes under
`docs/analysis/` (following `.agents/skills/ux-prototypes/SKILL.md`), checked with the
prototype page check, with an _Outcome_ recording the owner's chosen designs so
`STY-109`, `STY-112` and `STY-113` build straight from settled decisions. No app code.

## Acceptance criteria

### S1: Prototypes cover all four new flows on desktop and phone in DHCW style

**Given** `docs/backlog/personas/product-lead.md`, `tenant-admin.md` and `viewer.md`,
and ADR-010's DHCW design tokens
**When** the prototypes are rendered at desktop and phone widths
**Then** each of the four flows (Sign-in & uninvited; Account menu, tenant switcher &
Account page; Invitation acceptance & error states; Members & invitations for both Admin
and non-Admin members, including one-time link copy and last-admin protection) has clear
alternatives for the owner to compare, using real DHCW copy voice (English, noting Welsh
expansion room)

### S2: Navigation placement and tenant-scoped shell are settled

**Given** the existing app shell (`apps/editor/src/components/layout/app-shell.tsx`) with
sidebar navigation and header account menu
**When** the owner reviews the prototypes
**Then** it settles where **Members** (or **People**), **Account** and the **Tenant
switcher** live in the shell on desktop and phone, and how the shell looks while
unauthenticated or when a user belongs to zero/multiple tenants

### S3: Owner choices are recorded as the Outcome

**Given** the owner's selection across the prototype alternatives
**When** the analysis is finalised
**Then** its _Outcome_ records each chosen design and any copy/interaction decisions,
unblocking `STY-109`, `STY-112` and `STY-113`

## Open questions

- **Q1**: Should all four new flows be prototyped in one cohesive analysis (so the shell,
  navigation, account menu and members page fit together visually), or split into two
  separate prototype sessions (Sign-in/Account in EPC-024, Members/Invitations in
  EPC-025)?
  - (a) One cohesive prototype analysis in `STY-108` covering all four flows (recommended) —
    the shell navigation, account menu, tenant context and invitation-to-members journey
    are tightly coupled; deciding them together prevents rework between EPC-024 and
    EPC-025.
  - (b) Two smaller prototype stories (one per epic) — shorter individual reviews, risk
    of revising the shell navigation twice.

## Decisions

- **D1** (owner, 2026-11-25, EPC-024 planning Q4): add the Tenant Admin persona and
  prototype the new editor screens with `ux-prototypes` before implementing the UI
  stories.

## Out of scope

- Implementing the React screens (`STY-109`, `STY-112`, `STY-113`).
- Prototyping roadmap scratch/draft/history/Viewer-roadmap screens (`EPC-027`).
- Prototyping the 6-monthly access review flow (`STY-114`) or ask-for-access (`STY-094`).
