# STY-108: UX prototypes for sign-in, account, invitation acceptance and members management

- **Status**: Done — Phase-1 prototypes and Phase-2 owner Outcome (1A, 2B, 3B, 4A)
  recorded and carried into `STY-109` (D9, D10, D11)
- **Type**: Docs
- **Area**: Docs
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](../../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)
- **Depends on**: — (D10 amended D3 on 2026-11-26 so `STY-108` runs ahead of `STY-107`
  against the planned `/me` shape and refusal codes in `ADR-018`, `ADR-019`, `STY-106`,
  `STY-107` and `STY-109`)
- **Binding ADRs**: ADR-008, ADR-010, ADR-018 §Getting in, §The editor, §STY-108
  amendments; ADR-019 §What members and assigned leads may do, §Enforcement
- **Suggested model**: Opus — app shell and sign-in/account UX design across desktop,
  folded rail and phone (including Welsh 375px width check)

## Summary

Designs and prototypes the major editor UX shifts between today's Google Sheets app shell
and the API backend just-in-time before `STY-109` implements them (D2–D9): (1) the
authenticated API-mode app shell, named person identity, active organisation context
(single-tenant DHCW UI, leaving clean room for `EPC-030`'s future tenant switcher),
`AccountMenu` (retaining Theme and Edit surface) and the future sidebar utility slot
beside Families; (2) Sign-in landing, refusal screens ("You haven't been invited",
disabled/failed sign-in) and the zero-membership "No organisation access" screen in a
clean header-only shell; (3) the Account page (display name, sign-in identity, tenant
membership and role, "Sign out everywhere", with room for `EPC-028` identity linking); and
(4) adapted API-mode session expiry and re-sign-in states (`STY-109` S4). Uses
`ux-prototypes` and the three accepted editor personas (`product-lead.md`,
`tenant-admin.md`, `viewer.md`). Invitation acceptance (`STY-112`) and Members &
invitations (`STY-113`) are prototyped just-in-time after those stories are grilled;
multi-tenant switching and joining UX is deferred to
[EPC-030](../../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md).

## Scope

One UX analysis document and one self-contained assembled HTML page of static desktop
(1280px) + phone (375px) frames under `docs/analysis/` (following
`.agents/skills/ux-prototypes/SKILL.md`), checked with the prototype page check, with an
_Outcome_ recording the owner's chosen designs so `STY-109` builds straight from settled
decisions. Delivered via a single two-phase PR (D9). No app code.

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

## Decisions

- **D1** (owner, 2026-11-25, EPC-024 planning Q4): add the Tenant Admin persona and
  prototype the new editor screens with `ux-prototypes` before implementing the UI
  stories.
- **D2** (owner, 2026-11-26, grilling R2 #1a; settles Q1 and narrows S1–S3): adopt
  **just-in-time UX prototyping** per UI story (after each story is grilled so its rules
  narrow the UX). `STY-108` covers only the Sheets → API app shell shift and `STY-109`;
  Invitation acceptance (`STY-112`) and Members & invitations (`STY-113`) are removed from
  `STY-108` and each gets its own lightweight just-in-time `ux-prototypes` step right
  after it is grilled (recorded on `EPC-025`, `STY-112` and `STY-113`).
- **D3** (owner, 2026-11-26, grilling R2 #2b + R3 #1a): `STY-108` depends on `STY-107`
  (hard) so it runs truly just-in-time right before `STY-109`, once `STY-106` (`/me` and
  refusal codes) and `STY-107` (reshaped `AuthClient` and API mode) have landed.
- **D4** (owner, 2026-11-26, grilling R2 #5 + R3 #2b + review follow-up #1a, #2a; refines
  S1–S2; amends ADR-018): the backend stays multi-tenant from the start (`STY-103`–`STY-106`,
  `STY-110`, `STY-111`, using `/api/v1/tenants/{tenantSlug}/…` per `STY-105` D2) and
  API-mode editor routes carry `/$tenantSlug/…` from day one (`STY-109` D3, preserving
  ADR-019 Option 14), while the UI assumes each member belongs to one tenant (e.g. `dhcw`,
  with `/` redirecting to `/#/$tenantSlug/`). Multi-tenant switching, multi-tenant `/`
  landing/picker and joining a second tenant in the UI are deferred to a new placeholder
  epic,
  [EPC-030](../../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md).
  `STY-108` omits the tenant switcher while leaving clean room for it in the shell and
  Account menu.
- **D5** (owner, 2026-11-26, grilling R2 #3a; refines S1): produce one assembled HTML
  page of static **frames** (1280px desktop + 375px phone) across four EPC-024 journeys:
  1. **Authenticated shell, identity & organisation context** (desktop 1280px, folded
     rail, phone 375px): **3 structural alternatives**.
  2. **Sign-in, refusal & zero-membership landing**: **2 alternatives** replacing
     `StartPage`'s Google Sheets copy.
  3. **Account page** (display name, sign-in identity, tenant membership & role, "Sign
     out everywhere", with room for `EPC-028` identity linking): **2 alternatives**.
  4. **API-mode session expiry & re-sign-in** (`STY-109` S4): **1 focused adaptation
     artboard** covering the 2-minute idle warning ("Stay signed in"), absolute-expiry /
     401 new-tab "Sign in again", and the tab-focus "different person signed in — unsaved
     edits discarded" notice (adapting today's `SessionWarning`, `ReconnectDialog` and
     `AuthNotice`).
- **D6** (owner, 2026-11-26, grilling R2 #4a; refines S2 and settles `STY-109` Q2a): a
  signed-in user with zero active memberships sees a calm **"No organisation access"**
  screen with Sign out and a link to Account; all unauthenticated, refusal and
  zero-membership screens use a **clean header-only shell** (DHCW navy header + language
  switcher, plus Account/Sign out when signed in with zero memberships; no sidebar or
  search).
- **D7** (owner, 2026-11-26, grilling R2 #6a; refines S1–S2): keep the 375px phone header
  trigger compact (icon-only or initials so the Welsh service name stays on one line per
  `tests/e2e/shell.spec.ts`), keep **Theme** and **Edit surface** inside `AccountMenu` as
  in Sheets mode, and include **one Welsh (`cy`) 375px width-check frame** for the
  tightest shell header moment (reusing `apps/editor/src/i18n/locales/cy.ts` strings plus
  marked draft Welsh per `ux-prototypes` §4).
- **D8** (owner, 2026-11-26, grilling R2 #7a; refines S2): draw the authenticated shell
  frames around a realistic roadmap list canvas (matching today's app visual density
  rather than `STY-107`'s temporary "not yet available" stub error panel) and show where
  a future tenant utility link (such as `EPC-025`'s Members) sits beside `Families,
categories and organisations` in the sidebar, without designing any `EPC-025` screen.
- **D9** (owner, 2026-11-26, grilling R2 #8a; refines S3): deliver `STY-108` through a
  **single two-phase PR** — the delivery agent opens the PR with the prototypes, analysis
  and _Decisions needed_ table (leaving `STY-108` live); once the owner reviews the HTML
  page and replies with selections, the _Outcome_ is recorded, `STY-109` is updated with
  the chosen design references, and `STY-108` is marked `Done` and archived on that same
  PR before merge.
- **D10** (owner, 2026-11-26; amends D3): run `STY-108` ahead of `STY-107`, removing the
  hard `STY-107` prerequisite; draw the prototypes against the current editor screens and
  the planned `/me` shape and refusal codes in `ADR-018`, `ADR-019`, `STY-106`, `STY-107`
  and `STY-109`, flagging any unsettled `/me` or refusal-code details in _Decisions
  needed_.
- **D11** (owner, 2026-11-27, Phase-2 selection; settles S3): owner selected Journey 1 as
  recommended (**Design 1A** — header `AccountMenu` + quiet sidebar org band, icon-only
  375px phone account trigger, future `Members` slot reserved beneath `Families,
categories and organisations` for `STY-113`), Journey 2 **Design 2B** (centred
  single-column card in a clean header-only shell, with dedicated refusal screen for
  `not_invited`/`person_disabled` and inline `AuthNotice` for `sign_in_failed`), Journey 3
  **Design 3B** (stacked DHCW section cards inside the full authenticated shell for
  active-org members, with per-identity email in `Sign-in methods` and one-line role
  summary), and Journey 4 as recommended (**Design 4A**). Recorded in
  `api-sign-in-and-account-ux-analysis.md` (_Outcome_), `STY-109` D6, and `STY-113` D3;
  omitting `Members` in `STY-109` (#9a) follows _Decisions needed_ #9(a) and `STY-109`
  Out of scope. Remaining undrawn sub-decisions (#7–#8 sign-out pending edits and new-tab
  return UX; #11 `STY-106`/`STY-107` wire names and `prompt=select_account`) carried into
  `STY-109` (`Q4`–`Q5`) and `STY-106` (`Q3`) grilling.

## Out of scope

- Implementing the React screens (`STY-109`).
- Just-in-time UX prototypes for Invitation acceptance (`STY-112`) and Members &
  invitations (`STY-113`): done in `EPC-025` right after each story is grilled (D2).
- Multi-tenant switcher, multi-tenant `/` landing/picker and joining a second tenant in
  the UI:
  [EPC-030](../../EPC-030-multi-tenant-organisation-switching-and-onboarding-ux/README.md)
  (D4).
- Prototyping roadmap scratch/draft/history/Viewer-roadmap screens (`EPC-027`).
- Prototyping the 6-monthly access review flow (`STY-114`) or ask-for-access (`STY-094`).

## Delivery

Phase 1 (prototypes and analysis) and Phase 2 (owner Outcome recorded in
`docs/analysis/api-sign-in-and-account-ux-analysis.md`, carried into `STY-109` D6 and
`Q4`–`Q5`, `STY-113` D3, and `STY-106` `Q3`, and `STY-108` archived as Done) completed
per D9.

### Departures

- **D10 (owner, 2026-11-26)**: ran `STY-108` ahead of `STY-107`, relaxing D3's hard
  `STY-107` dependency. Designs ground against the planned `/me` shape and refusal codes
  in `ADR-018`, `ADR-019`, `STY-106`, `STY-107` and `STY-109`; unsettled wire details are
  carried into `STY-106` (`Q3`) and `STY-109` (`Q3`).
- **S1–S3 scope narrowed by owner decisions D2, D4–D9 (2026-11-26)**: prototypes cover
  the Sheets → API app shell shift and `STY-109` across four journeys (3 + 2 + 2 + 1
  designs); Invitation acceptance (`STY-112`), Members & invitations (`STY-113`) and the
  multi-tenant switcher (`EPC-030`) are excluded as decided in D2 and D4.
- **Branch rename (owner, 2026-11-27)**: the Phase-1 PR (#334) was closed by GitHub when
  its branch was renamed from `t3/sty-108-ux-prototypes-sign-in-members` to
  `docs/sty-108-ux-prototypes-sign-in-members`; the completed two-phase delivery lands on
  the replacement PR from that renamed branch.

### Contract for dependents

- `docs/analysis/api-sign-in-and-account-ux-analysis.md` (_Outcome_) and
  `docs/analysis/api-sign-in-and-account-ux-analysis/api-sign-in-and-account-ux-prototypes.html`
  settle the four designs for `STY-109` (`D6`): **1A** (authenticated shell, header
  `AccountMenu`, quiet sidebar org band folded to `DHCW` rail chip, icon-only 375px phone
  trigger), **2B** (centred single-column card in clean header-only shell for Sign-in,
  refusals and zero-membership), **3B** (stacked DHCW section cards on `/account` with
  per-identity email in `Sign-in methods` and room for `EPC-028` Entra linking), and
  **4A** (idle warning, pre-absolute-limit warning, post-expiry new-tab re-sign-in and
  cross-person discard notice).
- `EPC-025` (`STY-113`) places **Members** directly beneath `Families, categories and
organisations` in the sidebar and phone navigation drawer (omitted in `STY-109`).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `docs/analysis/api-sign-in-and-account-ux-analysis/api-sign-in-and-account-ux-prototypes.html` (8 designs across 4 journeys, 25 desktop 1280px + phone 375px artboards including 3 Welsh 375px checks and 3 open phone navigation drawers); observed run of `check-page.mjs` passed (phone scroll width 375px, 0 errors) and every artboard screenshot inspected |
| S2       | `docs/analysis/api-sign-in-and-account-ux-analysis.md` (Journeys 1–3, _Outcome_) and frames `d1`–`d7` (open sidebar, 64px folded rail, 375px phone en/cy, header-only unauth/refusal/zero-membership shell, future `Members` slot beside Families)                                                                                                               |
| S3       | `docs/analysis/api-sign-in-and-account-ux-analysis.md` (_Outcome_), `STY-108` D11, `STY-109` D6 & `Q4`–`Q5`, `STY-113` D3, and `STY-106` `Q3`                                                                                                                                                                                                                    |
