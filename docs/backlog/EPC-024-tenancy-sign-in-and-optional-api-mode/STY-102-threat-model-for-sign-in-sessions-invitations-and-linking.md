# STY-102: Threat model for sign-in, sessions, invitations and linking

- **Status**: Needs grilling — first identity record per ADR-018; written early so DHCW
  cyber security can review while local/dev work proceeds (ADR-018 _EPC-024 amendments_)
- **Type**: Docs
- **Area**: Docs
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions; ADR-018 §Assurance,
  §EPC-024 amendments; ADR-019 §Enforcement; ADR-020
- **Suggested model**: Opus — security threat modelling across OIDC, cookies, RLS,
  invitations and future Entra linking

## Summary

Produces the threat model for sign-in, server-side sessions, single-use invitations,
cross-tenant isolation and future identity linking, written in a form DHCW's cyber
security team can review and sign off. Covers the Google Workspace and local mock OIDC
flows, the `__Host-` `SameSite=Strict` session cookie, same-origin CSRF protection,
definer-function privilege boundaries, shared workstations, and accepted residual risks
from ADR-018. Does not build application code; per ADR-018 _EPC-024 amendments_, local
identity implementation may proceed in parallel while cyber sign-off gates deployment and
real data.

## Scope

One reviewable threat model document under `docs/analysis/` (and links from ADR-018 /
EPC-023 / EPC-024). Maps each threat to its control (code, database or EPC-023
infrastructure), its test or check, or its explicitly accepted residual risk.

## Acceptance criteria

### S1: Architecture and trust boundaries are mapped

**Given** the accepted designs in ADR-015, ADR-017, ADR-018, ADR-019 and ADR-020
**When** a cyber security reviewer reads the threat model
**Then** it shows the components, data flows, trust boundaries and privilege roles
(browser, edge/load balancer, FastAPI API, OIDC providers, PostgreSQL roles and definer
functions, platform CLI jobs) in clear diagrams and prose

### S2: Every identity flow is analysed against standard threat classes

**Given** the sign-in (`sign-in`, `redeem`, `link`), callback, session lifecycle,
invitation creation/revocation/redemption, sign-out and tenant-scoped request flows
**When** the threat model enumerates threats (including RFC 9700 / RFC 10017 / OWASP ASVS
5.0 V3, V6, V7, V8, V10: mix-up, login CSRF, open redirect, session fixation, shared
workstation walk-up, token/link leakage via logs or `Referer`, nOAuth email takeover,
cross-tenant leakage, definer-function privilege escalation, mock-provider exposure in
production)
**Then** every threat names its control, the layer enforcing it (code, DB or EPC-023
infrastructure), the story or check that proves it, and any residual risk

### S3: Accepted risks, open cyber questions and the sign-off gate are explicit

**Given** the risks accepted in ADR-018 _Consequences_ and any new gaps found during
modelling
**When** the reviewer reaches the end of the document
**Then** every accepted risk is listed with owner sign-off status, every new finding that
requires a code or infrastructure change is recorded as an actionable backlog item or open
question, and the document includes an explicit **Cyber security sign-off** record
(reviewer, date, findings, disposition, initially **Pending**) cited by `EPC-023` and
`EPC-028` so a `Done` `STY-102` draft is never mistaken for completed cyber sign-off

## Open questions

- **Q1**: What structure does DHCW's cyber security team prefer for the threat model?
  - (a) STRIDE-by-flow Markdown document under `docs/analysis/identity-threat-model.md`
    with Mermaid data-flow diagrams, threat/control matrix, residual-risk register and
    sign-off checklist (recommended) — self-contained in git, easy to export or review in
    PRs and meetings.
  - (b) A DHCW-specific template or external format (please share template or required
    headings) — matches internal governance paperwork directly if one is mandated.
- **Q2**: Once DHCW cyber security completes its review, should the sign-off outcome be
  recorded in-place inside `docs/analysis/identity-threat-model.md` (with a follow-on PR
  creating records for any findings) or tracked as a separate backlog chore blocking
  `EPC-023`'s first deploy?
  - (a) Record the outcome in `docs/analysis/identity-threat-model.md`'s Sign-off section
    and cite it from `EPC-023`'s deploy precondition (recommended) — keeps the threat model
    and its approval in one authoritative document.
  - (b) Open a dedicated sign-off chore in `EPC-023` that closes only when cyber signs
    off — makes the wait visible in `docs/backlog/README.md` as an open record.

## Decisions

- **D1** (owner, 2026-11-25, EPC-024 planning Q2): write the threat model first, but
  allow local/dev identity implementation (`STY-106`, `STY-110`, etc.) to proceed in
  parallel while cyber security sign-off gates deployment and real data (recorded in
  ADR-018 _EPC-024 amendments_).

## Out of scope

- Implementing identity code (`STY-106`, `STY-110`) or penetration testing (`EPC-028`).
- Threat modelling roadmap editing, redaction and public-site caching (revisited in
  EPC-026 and EPC-028).
