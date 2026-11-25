# DEF-040: A small request can get a much larger 422, which lists every error

- **Status**: Done
- **Severity**: Low — no route takes a request model or dictionary field yet; rises to
  High once a route takes a dictionary of collections or models, where one request within
  the body limit can trigger quadratic response-size amplification
- **Area**: API + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (_CHO-053 amendments_, _DEF-040 amendments_)
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

## Acceptance criteria

### S1: A 422 caps `params.errors` at 25 entries and sets `truncated` only when more exist

**Given** a route taking an `ApiRequestModel` body
**When** a request fails validation with 25 or fewer errors
**Then** the 422 `params` is `{"errors": [...]}` listing all of them with no `truncated` key
**And** when a request fails validation with more than 25 errors, `params.errors` lists the first 25 entries and `params.truncated` is `true`, implemented in plain Python on `exc.errors()` with no schema walking or private framework internals.

### S2: A 422 truncates string `loc` segments past 128 characters while keeping `extra_forbidden` trimming

**Given** a route taking an `ApiRequestModel` body with dictionary and nested fields
**When** validation fails with a string `loc` segment of 128 characters or fewer
**Then** that segment is returned unchanged
**And** when a remaining string `loc` segment exceeds 128 characters, it is truncated to its first 127 characters plus `"…"`, while `extra_forbidden` still trims its trailing unknown key and non-string segments (such as list indices) stay intact, bounding quadratic dictionary-key amplification.

### S3: ADR-020, the API guide and backlog records hold the settled rule

**Given** `docs/adr/ADR-020-the-editor-and-the-api-share-one-origin.md`, `apps/api/AGENTS.md` and the backlog records
**When** validated by `pnpm format:check && pnpm test:docs` and the live-docs sweep
**Then** ADR-020 records `_DEF-040 amendments_` and updates _Consequences_, `apps/api/AGENTS.md` forbids undiscriminated recursive unions in `ApiRequestModel` (use discriminated unions, and add an explicit depth validator only if a recursive request model is ever introduced), and no live document still reports DEF-040 as `Needs triage` or open.

## Decisions

- **D1** (owner, 2026-11-25, triage and grilling): `Proposed` — fix now with plain Python
  on `exc.errors()` (no custom framework layer, no schema walking, no private
  FastAPI/Pydantic internals). Cap `params.errors` at 25 entries, and include
  `"truncated": true` in `params` only when `len(exc.errors()) > 25` (leaving normal 1–25
  error 422s as `{"errors": [...]}`).
- **D2** (owner, 2026-11-25, grilling): Truncate any string `loc` segment longer than 128
  characters to its first 127 characters + `"…"` (keeping CHO-053's `extra_forbidden`
  trailing-key trim).
- **D3** (owner, 2026-11-25, grilling): Stay native to Pydantic for
  recursive/undiscriminated unions — no custom pre-parse JSON depth walker. Record a rule
  in `apps/api/AGENTS.md` forbidding undiscriminated recursive unions in
  `ApiRequestModel` (use discriminated unions, and add an explicit depth validator only if
  a recursive request model is ever introduced). Amend
  `docs/adr/ADR-020-the-editor-and-the-api-share-one-origin.md` (_Consequences_ and 422
  rule) to reflect the cap and segment truncation.

## Delivery

### Departures

None.

### Contract for dependents

- `validation_error` (`apps/api/src/roadmaps_api/errors.py`) returns at most 25 entries in
  `params.errors`, adds `"truncated": true` to `params` only when
  `len(exc.errors()) > 25`, trims the trailing unknown key on `extra_forbidden`, and
  truncates any remaining string `loc` segment longer than 128 characters to its first 127
  characters plus `"…"` (ADR-020 _DEF-040 amendments_).
- Because the cap slices `exc.errors()` after Pydantic validates the body, it bounds the
  422 response rather than Pydantic's validation memory on an unbounded collection; that
  residual risk is recorded as
  [DEF-043](../../defects/DEF-043-unbounded-collections-in-request-models-can-exhaust-memory-during-validation.md)
  (`Needs triage`) for the owner before the first request model with a collection field
  (and noted in `EPC-022/delivery-notes.md`).
- `apps/api/AGENTS.md` requires discriminated unions for recursive shapes in
  `ApiRequestModel` (never undiscriminated recursive unions) and an explicit depth
  validator if a recursive request model is ever introduced.
- `apps/api/openapi.json` and `packages/api-types` are unchanged.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/api/tests/test_errors.py` (`test_a_422_caps_listed_errors_and_marks_truncation_only_past_the_cap` at 25 and 26 errors; `test_a_422_bounds_the_response_for_a_long_dictionary_key_with_many_errors`). Test-first: the 26-error and dictionary-response tests failed red before `errors.py` capped `exc.errors()`                                                             |
| S2       | `apps/api/tests/test_errors.py` (`test_a_422_truncates_long_string_loc_segments` at 128 chars, 129 chars, long dict key + `extra_forbidden` + int index, and long trailing `extra_forbidden`; `test_a_422_bounds_the_response_for_a_long_dictionary_key_with_many_errors`). Test-first: the 129-char and 200-char dict-key rows failed red before `errors.py` truncated `loc`     |
| S3       | `docs/adr/ADR-020-the-editor-and-the-api-share-one-origin.md` (`_DEF-040 amendments_` and _Consequences_), `apps/api/AGENTS.md`, `docs/backlog/README.md`, `docs/backlog/EPC-022-monorepo-and-backend-foundation/README.md`, `delivery-notes.md`, `CHO-054`, `DEF-043` and `CHO-053`'s relative links; verified by `pnpm format:check && pnpm test:docs` and live-docs `rg` sweep |
