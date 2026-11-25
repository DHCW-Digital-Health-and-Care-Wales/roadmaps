# CHO-047: A 422 never names a key the caller chose

- **Status**: Done
- **Type**: Chore
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020 (validation errors leave out the
  submitted input)
- **Suggested model**: Sonnet — a narrow change to one handler, with its test rows
- **Delivered**: _(added once the PR exists)_

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
- **D2** (owner, 2026-11-24, STY-092 D13 and D17): STY-092 defers `extra="forbid"` on
  `ApiRequestModel` until CHO-047 and the first request-body or query-model story.
  Extends S1: because `ApiRequestModel` also backs `Annotated[Model, Query()]`
  query-parameter models, this chore's fix and test rows also cut back caller-chosen
  query keys (`["query", "<key>"]` → `["query"]`) when `extra="forbid"` is turned on for
  `ApiRequestModel` (cutting back the trailing segment on `extra_forbidden` covers body
  and query models alike).
- **D3** (agent, 2026-11-25, delivery): first built without `extra="forbid"` on
  `ApiRequestModel`, reading ADR-017's _STY-092 amendments_ as waiting for this chore
  **and** the first request-body or query-model story, and asked the owner (D4).
  Delivered ahead of any such route, as the owner's EPC-022 run queued it.
- **D4** (owner, 2026-11-25, D3's question, relayed by the orchestrating agent): "Turn it
  on now": this change turns `extra="forbid"` on for `ApiRequestModel`, ahead of that
  story. Refines D2 and STY-092 D13 and D17. Gives ADR-017 _CHO-047 amendments_.

## Delivery

### Departures

- **The fix follows the schema, not the error's type** (agent). D2's cut of the last
  segment on `extra_forbidden` is built, but it alone leaves a dictionary's key (also
  in the middle of a `loc`, as `[…, <key>, <field>]`) and whatever `loc` a validator
  raises. `apps/api/src/roadmaps_api/error_locations.py` follows each `loc` through the
  refusing route's own Pydantic core schemas and cuts it before the first segment they
  do not declare, working out each step once for all of a request's errors, whose
  number and depth the caller chooses.
- **A union's label is kept only where the schema names it** (agent): a discriminated
  union's tag, a `Tag` and a choice's model class stay, so the fields under them
  survive; Pydantic's other labels, type names such as `int` or `dict[str,int]`, are
  neither field names nor indices, so the `loc` ends at the union's field.
- **A body that is not JSON keeps its position** (agent): FastAPI's `json_invalid`
  names the character where reading failed, a number, as before.
- **STY-092 S1's ignored `snake_case` keys are now refused** (D4): the rows of
  `apps/api/tests/test_wire.py` that took an optional field's `snake_case` name as
  unknown and ignored it now answer 422.

### Contract for dependents

- `ApiRequestModel` forbids extra keys (D4), and no route takes one yet, so
  `apps/api/openapi.json` and `packages/api-types` are unchanged. `apps/api/AGENTS.md`
  (_The contract_) holds what FastAPI's handling of models asks of a route.
- A `loc` follows models, lists, sets, tuples, unions and validators around them. Any
  other shape ends it at the field that has it: a dictionary, by design, and also a
  dataclass, `TypedDict`, `NamedTuple` or `Sequence` field, which a story that needs
  their depth adds, with a row in `apps/api/tests/test_errors.py`. A parameter that is
  no model and is read by `AliasChoices` ends it at its source.
- What is spelled as the schema declares it, in its own place, stays, even where a
  validator put it there: a declared name, and a list's or a set's index, which any
  integer from zero up may be.
- The walk reads FastAPI's record of the chosen route, its private rule for a parameter
  model and each parameter's core schema; `apps/api/tests/test_errors.py` pins them.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, D2   | `apps/api/tests/test_errors.py` (`test_a_422_names_only_what_the_schema_declares`, a row per shape, bodies and query models; `test_the_walk_takes_each_shared_step_once_however_many_errors_share_it`, the work a caller can force)                                                                                                                              |
| D4       | `apps/api/tests/test_wire.py` (`test_a_request_model_refuses_what_it_does_not_declare`: unknown and `snake_case` keys of a body, a query model and a nested model); observed in a scratch app: the answers of a query model beside another query parameter, header and cookie models with and without `extra="ignore"`, and several and embedded body parameters |
