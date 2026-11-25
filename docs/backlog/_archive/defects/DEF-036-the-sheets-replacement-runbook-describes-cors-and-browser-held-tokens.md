# DEF-036: The Sheets replacement runbook still describes CORS and a browser-held token

- **Status**: Done
- **Severity**: Low — whoever builds the editor's API adapter from the runbook could
  start on a design the ADRs rejected
- **Area**: Docs
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-018, ADR-020
- **Suggested model**: Haiku — two steps of one runbook
- **Delivered**: _(add on delivery)_

## Summary

The runbook for replacing Google Sheets was written before the sign-in and origin
decisions. It offers to pass the Google access token to the API, and asks the API to
allow CORS from the Pages origin with an `Authorization` header. The accepted decisions
give a server-side session and one origin with no CORS.

## Reproduce

At commit `d38185bd` on the default branch:

1. Read steps 4 and 7 of `docs/operations/replacing-google-sheets.md`.
2. Read ADR-018 and ADR-020.

**Expected**: the runbook's steps follow the accepted decisions
**Actual**: step 4 offers passing `getAccessToken` to the API's repository, and step 7
asks for CORS from the Pages origin with the `Authorization` header

## Cause

Verified: the steps predate ADR-018 and ADR-020, which amended neither.

- `rg -n -i "cors|getAccessToken|access tokens" docs/operations/replacing-google-sheets.md`
  — steps 4 and 7.

## Acceptance criteria

### S1: The runbook follows ADR-018 and ADR-020

**Given** the runbook
**When** its configuration, wiring and deploy steps are read
**Then** they describe signing in through the API with its session, on the editor's own
origin with no CORS header

## Decisions

- **D1** (owner, 2026-11-25, triage of STY-092 delivery): `Proposed` (fix). The
  runbook's steps 4 and 7 are corrected to follow ADR-018 and ADR-020.

## Delivery

### Departures

None. Steps 3, 4 and 7 are corrected in place, with the wording the two ADRs give. The runbook's opening line now excepts the sign-in flow that ADR-018 reshapes.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | Steps 4 and 7 read against ADR-018 (sign-in through the API, `HttpOnly` session cookie, reshaped `AuthClient`) and ADR-020 (one origin, no CORS). `rg -n -i "cors\|getAccessToken\|access token\|authorization\|bearer\|pages origin\|browser-held" docs/operations/replacing-google-sheets.md` now matches only the corrected text, which states that no access token leaves the `AuthClient` port and that no `Authorization` header is sent. Step 3 no longer names an API address setting, as ADR-020 puts the API on the editor's origin. Step 4 also carries ADR-018's session controls and its threat-model gate; step 7 carries the deploy preconditions (ADR-016, ADR-018, ADR-020). Security re-check at c5ae5caa raised nothing above P3. `pnpm format:check && pnpm test:docs`: formatting clean; 148 tests passed (`build/markdown-links.test.ts`, `build/agent-guides.test.ts`). |
