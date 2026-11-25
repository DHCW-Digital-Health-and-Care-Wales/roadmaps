# DEF-043: Unbounded collections in request models can exhaust memory during validation

- **Status**: Done
- **Severity**: Low — no route takes a request model with a collection field yet; rises to
  High once one does, especially a collection beneath a dictionary
- **Area**: API + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (_DEF-040 amendments_, _DEF-043 amendments_)
- **Suggested model**: Sonnet — native Pydantic model convention once the owner settles
  the rule
- **Delivered**: _(add on delivery)_

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

## Acceptance criteria

### S1: ADR-020, the API guide and backlog records hold the native Pydantic collection-bounds rule

**Given** `docs/adr/ADR-020-the-editor-and-the-api-share-one-origin.md`, `apps/api/AGENTS.md` and the backlog records
**When** validated by `pnpm format:check && pnpm test:docs` and the live-docs sweep
**Then** ADR-020 records `_DEF-043 amendments_` and updates _Consequences_, `apps/api/AGENTS.md` requires bounding every collection field in `ApiRequestModel` natively (`Field(max_length=…)` on `list` fields; `FailFast()` alongside `Field(max_length=…)` on `dict`, `set`, `frozenset` and variadic `tuple` fields) with no custom pre-validation framework layer, and no live document still reports DEF-043 as `Needs triage` or open.

## Decisions

- **D1** (owner, 2026-11-25, triage): Adopt Option (a) — require native Pydantic
  collection bounds (`Field(max_length=…)` on `list` fields; `FailFast()` alongside
  `Field(max_length=…)` on `dict`, `set`, `frozenset` and variadic `tuple` fields) in
  ADR-020 and `apps/api/AGENTS.md` before the first request model with a collection, with
  no custom runtime framework layer.
- **D2** (owner, 2026-11-25, review): Widen D1 to close the dictionary-key amplification
  and nested-collection findings from Round 1 review — bound every collection in
  `ApiRequestModel` (nested collection type arguments included, using concrete builtins
  `list`, `dict`, `set`, `frozenset` and variadic `tuple`, not `Sequence` or `Mapping`),
  and bound every `dict` key with `Annotated[str, StringConstraints(max_length=…)]`
  alongside `FailFast()` and `Field(max_length=…)`.

## Delivery

### Departures

None.

### Contract for dependents

- Future `ApiRequestModel` classes with collections bound every collection natively in
  Pydantic, nested collection type arguments included, using concrete builtins
  (`Field(max_length=…)` on `list`; `FailFast()` paired with `Field(max_length=…)` on
  `dict`, `set`, `frozenset` and variadic `tuple`;
  `Annotated[str, StringConstraints(max_length=…)]` on `dict` keys), as recorded in
  `apps/api/AGENTS.md` and `ADR-020` (_DEF-043 amendments_), with no custom
  pre-validation framework layer.
- `apps/api/openapi.json` and `packages/api-types` are unchanged.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `docs/adr/ADR-020-the-editor-and-the-api-share-one-origin.md` (`_DEF-043 amendments_` and _Consequences_), `apps/api/AGENTS.md`, `docs/backlog/README.md`, `docs/backlog/EPC-022-monorepo-and-backend-foundation/README.md`, `delivery-notes.md` and `DEF-040`'s relative link; verified by `pnpm format:check && pnpm test:docs`, live-docs `rg` sweep, and observed Pydantic 2.14.3 runs confirming: `Field(max_length=2)` on `list` stops at 1 `too_long` error for `len > 2` and caps failing items at 2 for `len == 2`; `FailFast()` + `Field(max_length=2)` on `dict`/`set`/`frozenset`/variadic `tuple` stops at 1 error; and `Annotated[str, StringConstraints(max_length=128)]` on `dict` keys with `FailFast()` stops a 100,000-char key with 2,000 unknown keys or invalid list items beneath it at 1 `string_too_long` error |
