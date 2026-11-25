# CHO-053: A 422 trims only the forbidden key without walking FastAPI or Pydantic internals

- **Status**: Done
- **Type**: Chore + Refactor
- **Area**: API + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: CHO-047 (hard)
- **Binding ADRs**: ADR-017 (_Errors_, _CHO-047 amendments_), ADR-020 (_CHO-053 amendments_)
- **Suggested model**: Sonnet — narrow simplification of one handler, its tests and records
- **Delivered**: _(added once the PR exists)_

## Summary

CHO-047 added a 225-line runtime schema walker coupled to private FastAPI and Pydantic
internals to strip caller-chosen keys anywhere in a 422's `loc`. A 422 is JSON carrying
ADR-020's response headers, so reflecting a caller's own dictionary key poses no
script-execution or cross-user risk; meanwhile the walker adds upgrade fragility and
truncates nested locations on shapes it omits (CHO-051). Done: `validation_error` keeps
Pydantic's `{loc, type}` and trims only the trailing key on `extra_forbidden`,
`error_locations.py` and `fastapi_scope.py` are deleted, `ApiRequestModel` keeps
`extra="forbid"`, ADR-020 records the clarified rule, and CHO-051 is closed `Won't do`.

## Measurement

At commit `117f7b67` (`origin/main`):

| Area                                           | Measurement                                                                                                                                                                             | Verdict                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/roadmaps_api/error_locations.py` | 225 lines reading private FastAPI interfaces (`_compat.ModelField`, `_get_param_model`, `_type_adapter.core_schema`, `effective_route_context`) and walking Pydantic `CoreSchema` dicts | Replace with trailing-key slice on `extra_forbidden`                                                             |
| `apps/api/src/roadmaps_api/fastapi_scope.py`   | 15 lines extracted solely to share `effective_route_context` with `error_locations.py`                                                                                                  | Inline back into `access_log.py`                                                                                 |
| `apps/api/tests/test_errors.py`                | 560 lines total, 422 lines from line 139 for 422 locations and walker memoization                                                                                                       | Replace with focused tests for `extra_forbidden` trimming, wrapped union choices and dictionary-key pass-through |
| `docs/backlog/chores/CHO-051-*.md`             | Open chore solely to work around `_choices` truncating wrapped union choices                                                                                                            | Close as `Won't do`                                                                                              |
| `apps/api/src/roadmaps_api/wire.py`            | `ApiRequestModel` sets `extra="forbid"` (1 line, native Pydantic)                                                                                                                       | Keep                                                                                                             |

## Acceptance criteria

### S1: `extra_forbidden` trims the caller's key and other errors keep Pydantic's `loc` and `type`

**Given** routes taking `ApiRequestModel` bodies (nested models, lists, discriminated unions and a union choice wrapped by a `model_validator`) and `Annotated[Model, Query()]` query models
**When** a request sends an unknown key (including a `snake_case` key) or an invalid field value
**Then** every `extra_forbidden` error's `loc` omits its trailing key without echoing that key, every other error keeps Pydantic's `loc` and `type` (including nested fields under a wrapped union choice), and no submitted value or error message appears in the response

### S2: No FastAPI or Pydantic schema-walker internals remain in error handling

**Given** `apps/api/src/roadmaps_api/`
**When** `validation_error` formats a `RequestValidationError`
**Then** `error_locations.py` and `fastapi_scope.py` are removed, `errors.py` uses no private FastAPI or Pydantic schema internals, `access_log.py` reads `effective_route_context` directly, and `ApiRequestModel` still refuses extra keys

### S3: ADRs and backlog records match the settled rule

**Given** ADR-020, CHO-051, DEF-040, `EPC-022/README.md`, `EPC-022/delivery-notes.md` and `docs/backlog/README.md`
**When** validated by `pnpm test:docs` and the live-docs sweep
**Then** ADR-020 holds `_CHO-053 amendments_`, CHO-051 is archived as `Won't do`, and no live document claims `error_locations.py` walks Pydantic schemas

## Decisions

- **D1** (owner, 2026-11-25, review of PR #308): chose Option A — keep `{loc, type}` in
  422 responses (useful for developer and AI-agent debugging) and keep `extra="forbid"` on
  `ApiRequestModel`, replace `error_locations.py` with trimming the trailing segment on
  `extra_forbidden`, amend ADR-020 to clarify what "without the submitted input" means for
  422s, and close CHO-051 as `Won't do`.

## Out of scope

- Triaging [DEF-040](../../defects/DEF-040-a-422-lists-every-error-however-many-a-body-has.md)
  (capping the number of errors listed and each `loc`'s length in a 422): stays
  `Needs triage` for the owner, updated to reflect both unbounded error count and
  caller-chosen dictionary keys.
- Splitting `ApiRequestModel` into separate body and query/header bases.

## Delivery

### Departures

None.

### Contract for dependents

- `validation_error` (`apps/api/src/roadmaps_api/errors.py`) returns
  `{"loc": ..., "type": ...}` for each entry of `exc.errors()`, slicing `loc[:-1]` when
  `type == "extra_forbidden"` and passing Pydantic's `loc` through otherwise (ADR-020
  _CHO-053 amendments_).
- `ApiRequestModel` still sets `extra="forbid"` (ADR-017 _CHO-047 amendments_), so its
  docstring in `apps/api/src/roadmaps_api/wire.py` still governs how routes declare query,
  header, cookie and body models.
- Before any request model takes a dictionary field, triage
  [DEF-040](../../defects/DEF-040-a-422-lists-every-error-however-many-a-body-has.md)
  (recorded in `EPC-022/delivery-notes.md` and ADR-020 _CHO-053 amendments_).
- `apps/api/openapi.json` and `packages/api-types` are unchanged.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/api/tests/test_errors.py` (`test_a_422_trims_forbidden_keys_and_keeps_locations`, `test_a_422_keeps_nested_fields_under_a_wrapped_union_choice`, `test_a_422_passes_through_a_dictionary_key_without_its_value`, `test_a_refusal_is_the_envelope_without_the_input`); `apps/api/tests/test_wire.py` (`test_a_request_model_refuses_what_it_does_not_declare`). Test-first: the wrapped-union-choice case failed red against `error_locations.py` (`['body', 'wrapped']` instead of keeping the nested `itemCount` location) before the change |
| S2       | Deleted `apps/api/src/roadmaps_api/error_locations.py` and `apps/api/src/roadmaps_api/fastapi_scope.py`; `apps/api/src/roadmaps_api/errors.py` trims `loc[:-1]` on `extra_forbidden` with no private FastAPI or Pydantic schema imports; `apps/api/src/roadmaps_api/access_log.py` reads `effective_route_context` directly (held by `apps/api/tests/test_logs.py`); `apps/api/src/roadmaps_api/wire.py` keeps `extra="forbid"`                                                                                                                     |
| S3       | `docs/adr/ADR-020-the-editor-and-the-api-share-one-origin.md` (`_CHO-053 amendments_`), archived `CHO-051` (`Won't do`), updated `DEF-040`, `EPC-022/README.md`, `EPC-022/delivery-notes.md`, `CHO-047`'s relative link to `CHO-051`, and `docs/backlog/README.md`; live-docs `rg` sweep found no stale schema-walker claims                                                                                                                                                                                                                        |
