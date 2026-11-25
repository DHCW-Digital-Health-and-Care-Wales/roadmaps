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
- **D3** (agent, 2026-11-25, this delivery): delivered ahead of the first route that
  takes the caller's keys, since the owner's run of EPC-022 queued every unblocked item,
  with routes only tests mount holding S1. `extra="forbid"` stays off
  `ApiRequestModel`: ADR-017's _STY-092 amendments_ say it waits for this chore **and**
  the first request-body or query-model story, which does not exist yet. That story
  turns it on (EPC-022 _The API's conventions_); D2's rows hold its refusals now, on
  test models that forbid extra keys. Open owner question: should this chore have
  turned it on? ADR-017's same amendment also says optional fields ignore `snake_case`
  "until `extra="forbid"` lands with CHO-047", which only the owner's word amends.

## Delivery

### Departures

- **The fix follows the schema, not the error's type** (agent). D2's cut of the last
  segment on `extra_forbidden` is built, but it alone leaves a dictionary's key (also
  in the middle of a `loc`, as `[…, <key>, <field>]`) and whatever `loc` a validator
  raises. `apps/api/src/roadmaps_api/error_locations.py` follows each `loc` through the
  refusing route's own Pydantic core schemas and cuts it before the first segment they
  do not declare.
- **A union's label is kept only where the schema names it** (agent): a discriminated
  union's tag, a `Tag` and a choice's model class stay, so the fields under them
  survive; Pydantic's other labels, type names such as `int` or `dict[str,int]`, are
  neither field names nor indices, so the `loc` ends at the union's field.
- **A body that is not JSON keeps its position** (agent): FastAPI's `json_invalid`
  names the character where reading failed, a number, as before.

### Contract for dependents

- A `loc` follows models, lists, sets, tuples, unions and validators around them. Any
  other shape ends it at the field that has it: a dictionary, by design, and also a
  dataclass, `TypedDict`, `NamedTuple` or `Sequence` field, which a story that needs
  their depth adds, with a row in `apps/api/tests/test_errors.py`.
- A segment spelled as a name the schema declares, in that name's own place, stays,
  even where a validator put it there.
- The walk reads FastAPI's record of the chosen route and each parameter's core schema,
  neither a documented interface; `apps/api/tests/test_errors.py` pins both.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, D2   | `apps/api/tests/test_errors.py` (`test_a_422_names_only_what_the_schema_declares`, a row per shape, bodies and query models). Red before the change: 26 rows echoed the key or a type label. The rows for a validator's text under a tuple and under bare `Json`, and for a 200-deep body, were each red against an earlier draft, which answered 500. Rows added after their code were shown red by breaking each condition of the walk, one at a time |
