# DEF-043: Unbounded collections in request models can exhaust memory during validation

- **Status**: Needs triage — found by DEF-040 security review
- **Severity**: Low — no route takes a request model with a collection field yet; rises to
  High once one does, especially a collection beneath a dictionary
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (_DEF-040 amendments_)
- **Suggested model**: Sonnet — native Pydantic model convention once the owner settles
  the rule

## Summary

DEF-040 caps a 422 response's `params.errors` at 25 entries and truncates string `loc`
segments past 128 characters, which bounds the response sent back to the caller. Because
`validation_error` slices `exc.errors()` after Pydantic finishes validating the body,
Pydantic still materialises every validation error in memory first. On a future request
model with an unbounded collection — above all a collection nested beneath a dictionary
whose key repeats in every error — a single request within the 1 MiB body limit can
trigger large peak memory growth before the 25-entry cap runs. No route takes a request
model today.

## Reproduce

At commit `15cc3e93` (Pydantic 2.14.3, `pydantic-core` 2.50.4):

1. Mount a test route taking an `ApiRequestModel` with a dictionary mapping keys to a
   collection of models (for example `dict[str, list[Leaf]]` or `dict[str, dict[str, Leaf]]`).
2. Post a request well under the 1 MiB body limit containing one long key and thousands
   of invalid items beneath it.

- **Expected**: validation fails with bounded memory as well as a bounded 422 response
- **Actual**: the 422 response is bounded (25 entries, truncated key), but peak RSS grows
  with key length × invalid item count during Pydantic validation before the handler runs

## Cause

Verified: `validation_error` (`apps/api/src/roadmaps_api/errors.py`) runs after FastAPI
and Pydantic have built the full `RequestValidationError` error list. On Pydantic 2.14.3,
bounding only a dictionary key's length does not stop Pydantic validating every item
beneath it; `Field(max_length=…)` stops a `list` one item past the limit (returning one
`too_long` error), whereas `dict`, `set`, `frozenset` and variadic `tuple[T, ...]`
validate every invalid item unless paired with `FailFast()` (Pydantic v2.8+) or a
before-validator checking `len()`.

- `rg -n 'RequestValidationError' apps/api/src` — 1 site:
  `apps/api/src/roadmaps_api/errors.py:118` (runs post-validation).

## Open questions

1. Before the first route adds an `ApiRequestModel` with a collection field, should the
   API require native Pydantic collection bounds (`max_length` on `list` fields;
   `FailFast()` or a length before-validator on `dict`, `set`, `frozenset` and variadic
   `tuple` fields, especially beneath dictionaries), or accept pre-handler validation
   memory as a named residual risk?
   - (a) Adopt the native Pydantic rule (`max_length` on lists; `FailFast()` alongside
     `max_length` on dicts, sets, frozensets and variadic tuples) in ADR-020 and
     `apps/api/AGENTS.md` before the first request model with a collection (recommended) —
     no custom framework layer, bounds validation work natively.
   - (b) Accept pre-handler validation memory on unbounded collections as a named residual
     risk in ADR-020 and close `Won't fix`, reopening if a route exposes an unbounded
     collection to untrusted callers.
