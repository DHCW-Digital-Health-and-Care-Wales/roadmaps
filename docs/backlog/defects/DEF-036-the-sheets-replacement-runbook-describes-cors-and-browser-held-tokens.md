# DEF-036: The Sheets replacement runbook still describes CORS and a browser-held token

- **Status**: Needs triage — found by STY-092 delivery
- **Severity**: Low — whoever builds the editor's API adapter from the runbook could
  start on a design the ADRs rejected
- **Area**: Docs
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-018, ADR-020
- **Suggested model**: Haiku — two steps of one runbook

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

_None yet: awaiting triage._
