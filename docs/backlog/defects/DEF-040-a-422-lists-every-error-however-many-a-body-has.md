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

1. Send a body of 90,000 unknown keys (889 KB).
2. Nest a model that holds itself 200 deep and give the deepest 5,000 unknown keys
   (47 KB).

**Expected**: an answer of bounded size
**Actual**: step 1 is answered with 4.5 MB, and step 2 with 13 MB

## Cause

Verified: `validation_error` (`apps/api/src/roadmaps_api/errors.py`) lists all of
`exc.errors()`. Search: `rg -n 'RequestValidationError' apps/api/src` finds that one
handler. CHO-047 shortens a `loc` that names a caller's key (step 1 is then 3.8 MB; step
2 barely changes, since only each error's last segment is the caller's) and adds some
work to follow each one: about 0.5 s against 0.4 s for step 1, 0.6 s against 0.2 s for
50,000 bad list entries, and 0.5 s against 0.3 s for step 2, measured on a development
machine.

## Open questions

1. Should a 422 list at most some number of errors, which changes what a refusal tells
   the editor? Recommended: yes, a small fixed number, with the first request-body
   story.
