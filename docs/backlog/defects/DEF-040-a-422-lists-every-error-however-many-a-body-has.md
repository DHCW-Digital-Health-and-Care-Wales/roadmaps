# DEF-040: A small request can get a much larger 422, which lists every error

- **Status**: Needs triage — found by CHO-047's delivery; updated by CHO-053
- **Severity**: Low today (no route takes a request model or dictionary field yet); High
  once a route takes a dictionary of collections or models, where one request within the
  body limit can trigger quadratic response-size amplification and exhaust process memory
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (_CHO-053 amendments_)
- **Suggested model**: Sonnet — one handler and its rows, once the limits are chosen

## Summary

A refused request is answered with one entry for each thing wrong with it, and nothing
limits how many entries are listed or how long each entry's `loc` is. Within the body
limit, a caller can trigger a response far larger than the request: several times larger
for many invalid entries, hundreds of times for a model holding itself through a union,
and quadratically larger (exhausting memory on one request) for a dictionary of
collections or models whose caller-chosen key repeats in every error beneath it. Nothing
calls such a route today.

## Reproduce

At commit `117f7b67` (and `56f318d6`) on the default branch, with a route that only a test
mounts, whose body model forbids extra keys or holds a dictionary of collections:

1. Send, within the body limit, a body with many invalid entries (or a dictionary entry
   whose key is long and whose value contains many invalid items).

**Expected**: an answer of bounded size
**Actual**: an answer orders of magnitude larger than the request

## Cause

Verified: `validation_error` (`apps/api/src/roadmaps_api/errors.py`) lists all of
`exc.errors()` without capping either the error count or the length of each `loc`. Search:
`rg -n 'RequestValidationError' apps/api/src` finds that one handler. Two compounding
causes apply:

1. **Unbounded error count**: Pydantic emits every error, and for a model that holds
   itself through a union of models, its error list also doubles with each level of
   nesting, so the body limit alone does not bound it.
2. **Unbounded caller-chosen `loc` segments**: CHO-053 removed CHO-047's schema walk
   (leaving only the trailing-key slice on `extra_forbidden`), so a dictionary field
   passes its caller-chosen key through in `loc`, repeating it in every error beneath it.
   Capping the error count alone still allows response size to grow with `N × key length`.

## Open questions

1. Should a 422 cap both the number of listed errors and each `loc`'s serialized length
   (or omit/truncate long segments), which changes what a refusal tells a developer or
   client? Recommended: yes, a small fixed cap on listed errors and a byte/character bound
   per `loc` segment before the first request-body story with a dictionary field (and
   ideally with the first request-body story).
2. A limit on the errors listed bounds the answer, not what Pydantic does first for a
   model that holds itself through a union. What bounds that, such as a limit on
   nesting or discriminated unions alone, is to be settled before the first such model.
