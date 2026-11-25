# DEF-040: A small request can get a much larger 422, which lists every error

- **Status**: Needs triage — found by CHO-047's delivery; updated by CHO-053
- **Severity**: Low — no route takes a request model or dictionary field yet; rises to
  High once a route takes a dictionary of collections or models, where one request within
  the body limit can trigger quadratic response-size amplification
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (_CHO-053 amendments_)
- **Suggested model**: Sonnet — one handler and its rows, once the limits are chosen

## Summary

A refused request is answered with every validation error and no bound on either entry
count or `loc` length. Within the body limit, a caller can get a response several times
larger for many bad entries, hundreds of times larger for a self-referential union, or
quadratically larger (risking memory exhaustion on one request) for a dictionary of
collections or models whose caller-chosen key repeats in every error beneath it. No route
takes such a model today.

## Reproduce

1. **Unbounded error count** (at `56f318d6`, `117f7b67` and after CHO-053): on a
   test-mounted route whose body model forbids extra keys or holds itself through a
   union, send a body within the limit containing many invalid entries.
   - **Expected**: an answer of bounded size
   - **Actual**: an answer several times the request's size, and hundreds of times for a
     self-referential union
2. **Caller-chosen `loc` key amplification** (at `56f318d6` and returning with CHO-053;
   did not reproduce at `117f7b67`, where CHO-047's walker cut `loc` at the dictionary
   field): on a test-mounted route with a dictionary of collections or models, send one
   entry with a long key and many invalid items beneath it.
   - **Expected**: an answer of bounded size
   - **Actual**: an answer growing quadratically with key length × error count (hundreds
     to thousands of times the request's size within the body limit)

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
