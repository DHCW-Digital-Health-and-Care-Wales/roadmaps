# CHO-047: A 422 never names a key the caller chose

- **Status**: Proposed — a residual STY-090's security review found, left for the first
  route whose body can carry keys of the caller's choosing
- **Type**: Chore
- **Area**: Infrastructure
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (validation errors leave out the
  submitted input)
- **Suggested model**: Sonnet — a narrow change to one handler, with its test rows

## Summary

The API's 422 (`request.invalid`) lists each error's `loc` and `type`, never its input or
message (`apps/api/src/roadmaps_api/errors.py`, `validation_error`). A `loc` names the
field that failed, which is the schema's own name, except where the caller chose the
key: a model that forbids extra keys answers an unknown key with
`{"loc": ["body", "<their key>"], "type": "extra_forbidden"}`, and a field typed as a
dictionary names the failing entry's key. The caller gets back only what they sent, as
JSON under `nosniff` and `default-src 'none'`, so no script runs; but it is submitted
input in a refusal, against ADR-020. Done: a `loc` keeps only the segments the schema
declares (field names and list indices), cut back to the parent where the caller chose
the key, with a row for each case in `apps/api/tests/test_errors.py`.

## Measurement

At commit `594752fa` (STY-090's branch): no route takes a model that forbids extra keys
or has a dictionary field, so nothing triggers it; the security review reproduced both
cases with routes added to `create_app` in a scratch script. Search for the trigger with
`rg -n 'extra="forbid"|dict\[str' apps/api/src`.

## Acceptance criteria

### S1: A refusal names only the schema's fields

**Given** a route whose body model forbids extra keys, and one with a dictionary field
**When** a caller sends an unknown key, or a dictionary entry whose value fails
**Then** the 422's `params.errors[].loc` names the body or the dictionary field, never
the caller's key, with its `type` unchanged

## Decisions

- **D1** (agent, 2026-11-24, STY-090's security review): recorded as a chore rather than
  fixed in STY-090, since no route reaches it yet and the fix wants the first such model
  to test against.
