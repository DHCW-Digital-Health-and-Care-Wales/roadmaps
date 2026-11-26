# STY-102: Threat model for sign-in, sessions, invitations and linking

- **Status**: Done — public-safe STRIDE threat model drafted at
  [identity-threat-model.md](../../../analysis/identity-threat-model.md); owner-only
  Phase 1 and Phase 2 cyber sign-off is tracked in its §7
- **Type**: Docs
- **Area**: Docs
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](../../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-015 §Tenancy, §People, access and permissions; ADR-018 §Assurance,
  §EPC-024 amendments; ADR-019 §Platform operators, §Enforcement; ADR-020
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
(entered only by the owner — never an agent — citing DHCW cyber security's own reference
such as a ticket or signed document, reviewer, date, findings and disposition, initially
**Pending**) cited by `EPC-023` and `EPC-028` so a `Done` `STY-102` draft is never
mistaken for completed cyber sign-off

## Decisions

- **D1** (owner, 2026-11-25, EPC-024 planning Q2): write the threat model first, but
  allow local/dev identity implementation (`STY-106`, `STY-110`, etc.) to proceed in
  parallel while cyber security sign-off gates deployment and real data (recorded in
  ADR-018 _EPC-024 amendments_).
- **D2** (owner, 2026-11-25, STY-102 grilling R1 #1a): use a STRIDE-by-flow Markdown
  document at `docs/analysis/identity-threat-model.md` with Mermaid data-flow diagrams,
  a threat/control matrix, a residual-risk register and a sign-off section.
- **D3** (owner, 2026-11-25, STY-102 grilling R1 #2a): write the document to be
  self-contained in prose — summarising each control, trust boundary and ADR decision
  inline alongside relative links as citations — so a cyber reviewer reading an export
  without GitHub repo access can review it standalone.
- **D4** (owner, 2026-11-25, STY-102 grilling R1 #4a): analyse Microsoft Entra ID and
  the `link` flow now against ADR-018, explicitly flagging the three Entra spike unknowns
  (verified email claim, federated credential vs certificate, `acrs` step-up) as
  `Pending Entra spike`, and split the sign-off record into **Phase 1 (Google Workspace
  deployment — gates `EPC-023`)** and **Phase 2 (Entra & linking addendum — gates
  `EPC-028` Entra enablement)**.
- **D5** (owner, 2026-11-25, STY-102 grilling R1 #5a): explicitly include the platform
  operator CLI flows (`create-tenant`, bootstrap/replacement admin invitation,
  `disable-person`, `remove-identity`, IAM override guard and Cloud Audit Log
  attribution) in S2's flow-by-flow analysis alongside browser/API identity flows.
- **D6** (owner, 2026-11-25, STY-102 grilling R1 #6a): record the cyber security
  sign-off outcome in-place inside `docs/analysis/identity-threat-model.md`'s Sign-off
  section (entered only by the owner), cited by `EPC-023` and `EPC-028`.
- **D7** (owner, 2026-11-25, STY-102 grilling R2 #1a, #2a): public-repo hygiene —
  two-layer split. `docs/analysis/identity-threat-model.md` is a **public-safe** design
  threat model covering architecture, trust boundaries, flows, standard threat classes,
  mitigating controls, tests/checks and only the high-level accepted residual risks
  already public in ADR-018. Threat rows carry **disposition only** (`Mitigated`,
  `Accepted residual risk`, `Pending Entra spike`) — no `High`/`Medium`/`Low` or numeric
  severity/exploitability ratings, no unfixed/exploitable gaps, no internal WAF or
  rate-limit thresholds, and no reviewer PII. Unfixed gaps, formal risk scoring, cyber
  review findings and internal ticket references stay in DHCW's private governance space.
- **D8** (owner, 2026-11-25, STY-102 grilling R2 #3a): sanitise S3's public Cyber
  security sign-off record — record only **Phase** (`Phase 1: Google Workspace` /
  `Phase 2: Entra & linking`), **Status** (`Pending` / `Signed off`), **Date** and
  **Disposition** (`Approved` / `Approved — conditions met`), entered only by the owner;
  reviewer names, internal ticket references and raw findings remain in DHCW's private
  governance record.
- **D9** (owner, 2026-11-25, STY-102 grilling R2 #4a): private-first gap reporting — if
  the `STY-102` delivery agent discovers any unmitigated security gap in the ADRs or
  unstarted stories while modelling, it must stop and report the finding to the owner in
  chat before writing it to any tracked file or opening a PR, so the owner decides
  whether to tighten a story requirement directly (without advertising an open
  vulnerability in the public repo), track it privately or accept it.
- **D10** (owner, 2026-11-25, STY-102 review follow-up #1a; amends ADR-018
  _EPC-024 amendments_ and clarifies D4): **Phase 1 (Google Workspace)** gates any
  hosted API deployment and the **Google Workspace** client/secret only; **Phase 2
  (Entra & linking addendum)**, recorded by the owner under the same rule, gates any
  Entra registration with a hosted redirect URI, any hosted Entra credential, and any
  Entra issuer in hosted settings. The `EPC-028` Entra spike is permitted before Phase 2
  only with a spike-only registration, operators' own accounts, and nothing persisted to
  a hosted database (or waits for its own owner-recorded cyber approval if NHS Wales
  requires one).
- **D11** (owner, 2026-11-25, STY-102 review follow-up #2a; refines D8 and overrides
  S3's sign-off fields): keep D8's privacy (no reviewer names, internal ticket
  references or raw findings in the public repo), add **Reviewed revision** (the git
  commit SHA of `docs/analysis/identity-threat-model.md` that cyber reviewed, matching
  DHCW's private governance record), state that any material change to a signed-off
  phase's flows or controls returns that phase to `Pending` until the owner records it
  as reviewed or not material, and have `EPC-023` and `EPC-028` explicitly require
  `Status: Signed off` with disposition `Approved` or `Approved — conditions met`
  (outstanding conditions stay `Pending`).
- **D12** (owner, 2026-11-25, STY-102 review follow-up #3a; refines D7 and D9, and
  overrides S2's control/residual-risk wording and S3's public backlog-filing clause for
  unfixed security gaps): public dispositions in `docs/analysis/identity-threat-model.md`
  are `Mitigated` (verified by test/check), `Mitigated by design` (control designed,
  implementing story not yet Done), `Accepted residual risk` (only risks recorded in
  ADR-018; any newly accepted risk amends ADR-018 first), `Pending Entra spike`, and
  `Under review` (neutral marker for a privately tracked item, with no vulnerability
  detail). Extend D9's private-first gap rule to reviewers and every public PR surface
  (PR body, Review record, review threads, commit messages and Delivery sections),
  record it in `EPC-024/delivery-notes.md` and `EPC-028`'s contract, and have
  `docs/analysis/identity-threat-model.md` state its own public-safe rules.
- **D13** (owner, 2026-11-26, STY-102 review follow-up #1; settles `STY-103` Q4 and
  extends `STY-103` S4): every `SECURITY DEFINER` routine on ADR-015's closed list —
  ADR-018 auth/purge (`roadmaps_auth_definer`), change-set commit/sign-off and the
  future redaction procedure (`roadmaps_history_definer`, `EPC-026`), and ADR-019
  platform procedures (`roadmaps_platform_definer`) — is owned by a dedicated no-login
  definer role owning only its routines and holding no `CREATE` on any database or
  schema once migration completes, rather than `roadmaps_owner`. Recorded in ADR-015
  _STY-102 amendments_ and `STY-103` D1.
- **D14** (owner, 2026-11-26, STY-102 review follow-up #2): record bounded post-theft
  session cookie replay (no IP/UA binding; bounded by 60 m idle / 10 h absolute timeout
  and "Sign out everywhere") as an accepted residual risk in ADR-018 _Consequences_, and
  record operator `invite-admin` abuse as bounded by detective controls (JIT/two-person
  IAM, permanent `platform_audit_log` joined to Cloud Audit Logs, tenant access change
  sets, and mandatory alerting on platform audit entries in `EPC-023`) in ADR-019
  _STY-102 amendments_, with matching rows in `docs/analysis/identity-threat-model.md`.
- **D15** (owner, 2026-11-26, STY-102 review follow-up #3; settles `STY-104` Q3
  direction): hosted `create-tenant` and `invite-admin` Cloud Run jobs deliver one-time
  Admin invitation links out of band — never to `stdout` or `stderr` outside local mode,
  proven by a standing test — with the exact out-of-band mechanism chosen when `STY-104`
  is grilled. Recorded in `STY-104` D1 and ADR-019 _STY-102 amendments_.
- **D16** (owner, 2026-11-26, STY-102 review follow-up #4): list unlocked-device walk-up,
  OIDC `code`/`state` in callback URLs, and Phase 1 Google Workspace outage explicitly in
  ADR-018 _Consequences_ so the ADR and threat-model register match 1-to-1, and record
  the operational assumption that the editor is an office/backend tool where current
  evidence assumes each user has their own corporate device rather than shared clinical
  workstations (revisited if later user research changes that; existing defences stay as
  defence-in-depth).
- **D17** (owner, 2026-11-26, STY-102 review follow-up #5; confirms `STY-110` D1): an
  idempotent retry of invitation creation returns the invitation metadata without the raw
  token (rare scenario; Admin revokes and reissues), preserving ADR-018's hash-only
  storage invariant. Recorded in `STY-110` D1 and ADR-015 _STY-102 amendments_.

## Out of scope

- Implementing identity code (`STY-106`, `STY-110`) or penetration testing (`EPC-028`).
- Threat modelling roadmap editing, redaction and public-site caching (revisited in
  EPC-026 and EPC-028).

## Delivery

### Departures

None beyond owner decisions D4, D7, D8, D10, D11 and D12 already recorded above (public
dispositions limited to five neutral values with no severity/exploitability ratings,
sanitised owner-only two-phase sign-off table with `Reviewed revision` commit SHA and no
reviewer PII or internal ticket references, and private-first gap reporting without filing
unfixed security gaps in public backlog records).

### Contract for dependents

- [docs/analysis/identity-threat-model.md](../../../analysis/identity-threat-model.md) is
  the canonical public-safe design threat model cited by `ADR-018`, `EPC-023`, `EPC-024`
  and `EPC-028`.
- `STY-102` reaching `Done` unblocks local/development implementation of `STY-104`,
  `STY-106` and `STY-110` (once grilled and their other prerequisites land); it is
  **never** cyber security sign-off.
- `EPC-023` and `EPC-028` remain gated on owner-recorded `Status: Signed off` (`Approved`
  or `Approved — conditions met`, with `Date` and `Reviewed revision`) in section 7 of
  `docs/analysis/identity-threat-model.md` for **Phase 1: Google Workspace** (before any
  hosted API deployment or Google Workspace client/secret/real data) and **Phase 2: Entra
  & linking** (before any hosted Entra registration, credential or issuer; subject to
  D10's Entra spike boundary).
- Later identity stories (`STY-103`–`STY-114`, `EPC-023`, `EPC-028`) promote matching
  threat rows (`TM-01`–`TM-63`) from `Mitigated by design` to `Mitigated` with their test
  citations when delivered, never edit the owner-only sign-off table, and follow D7/D9/D12
  public-repo hygiene (`EPC-024/delivery-notes.md`).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `docs/analysis/identity-threat-model.md` §1–§3: inline ADR summaries, assets/actors tables, Mermaid architecture and trust-boundary diagram (TB1–TB6), PostgreSQL role & closed `SECURITY DEFINER` privilege table, and three Mermaid sequence/flow diagrams (Flows A–C)                                                                                                                                    |
| S2       | `docs/analysis/identity-threat-model.md` §4: 63 STRIDE-by-flow entries (`TM-01`–`TM-63`) across all 7 flows (including Phase 2 Entra/linking and D5 platform operator CLI flows), mapping RFC 9700 / RFC 10017 / OWASP ASVS 5.0 controls, enforcing layers, proofs and public-safe dispositions                                                                                                             |
| S3       | `docs/analysis/identity-threat-model.md` §5–§7: ADR-018 accepted residual-risk register (`RR-01`–`RR-09`, 1-to-1 with ADR-018 _Consequences_), three `Pending Entra spike` items with spike boundary, unstarted story design questions, and owner-only two-phase **Cyber security sign-off** table, linked from `ADR-018`, `EPC-023`, `EPC-024`, `EPC-028` and `docs/operations/replacing-google-sheets.md` |
