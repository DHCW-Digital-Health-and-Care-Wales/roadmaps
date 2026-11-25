# DEF-040: A small request can get a much larger 422, which lists every error

- **Status**: Needs triage — found by CHO-047's delivery
- **Severity**: Low — no route takes a body or a query model yet; once one does, a
  caller can make the API send several times what they sent
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020
- **Suggested model**: Sonnet — one handler and its rows, once the limit is chosen

## Summary

A refused request is answered with one entry for each thing wrong with it, and nothing
limits how many, nor how long each entry's location is. Within the body limit, a caller
who sends many bad entries gets an answer several times larger than the request, and for
a body whose model holds itself, hundreds of times. Nothing calls such a route today.

## Reproduce

At commit `56f318d6` on the default branch, with a route that only a test mounts, whose
body model forbids extra keys:

1. Send, within the body limit, a body with many invalid entries.

**Expected**: an answer of bounded size
**Actual**: an answer several times the request's size, and far more than that for a
model that holds itself

## Cause

Verified: `validation_error` (`apps/api/src/roadmaps_api/errors.py`) lists all of
`exc.errors()`. Search: `rg -n 'RequestValidationError' apps/api/src` finds that one
handler. For a model that holds itself through a union of models, Pydantic's own list
of errors also doubles with each level of nesting, so the body limit alone does not
bound it. CHO-053 removed CHO-047's schema walk (leaving only the trailing-key slice on
`extra_forbidden`), so only the unbounded list of errors in `exc.errors()` remains.

## Open questions

1. Should a 422 list at most some number of errors, which changes what a refusal tells
   the editor? Recommended: yes, a small fixed number, with the first request-body
   story.
2. A limit on the errors listed bounds the answer, not what Pydantic does first for a
   model that holds itself through a union. What bounds that, such as a limit on
   nesting or discriminated unions alone, is to be settled before the first such model.
