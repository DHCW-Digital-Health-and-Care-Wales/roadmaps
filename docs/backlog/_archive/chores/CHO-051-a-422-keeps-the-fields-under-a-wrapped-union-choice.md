# CHO-051: A 422 keeps the fields under a union choice that a validator wraps

- **Status**: Won't do — owner, 2026-11-25 (D2, CHO-053); archived
- **Type**: Chore
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: CHO-047 (hard)
- **Binding ADRs**: ADR-017 (_Errors_), ADR-020
- **Suggested model**: Sonnet — one branch of one walk, with its rows

## Summary

Where a field takes one of several models and one of them has a validator of its own, a
422 for that choice names only the field, not what failed under it. Nothing of the
caller's is returned. The editor could not point at the failing field of such a request.
No route takes such a union. Done: the `loc` keeps the declared names and indices under
that choice, still without any segment the schema does not give.

## Measurement

With CHO-047's change, in a test-mounted route whose field is `A | B`, where `A` has an
after `model_validator` named `ok` and an `int` field `item_count`, sending
`{"itemCount": "x"}` answers `["body", "<field>"]`. Pydantic labels the choice
`function-after[ok(), A]`; a wrap validator's label, `function-wrap[ok()]`, names no
model, and a `partial` validator's holds a memory address. `_choices`
(`apps/api/src/roadmaps_api/error_locations.py`) knows a choice by its tag or its
model's class. A match on part of a label would also keep a segment a validator wrote
itself, so only a label equal to the one Pydantic gives that choice may be kept.

## Acceptance criteria

### S1: A wrapped choice's declared fields survive

**Given** a union whose model has an after or wrap validator
**When** a field of that choice fails
**Then** the 422's `loc` names that field under the choice, and a segment a validator
writes that only resembles the choice's label is still cut

## Decisions

- **D1** (agent, 2026-11-25, CHO-047 review): declined in CHO-047 over matching
  Pydantic's labels there: it fails closed, no route has such a union, and an exact
  match needs Pydantic's own naming of each choice.
- **D2** (owner, 2026-11-25, CHO-053): Won't do.
  [CHO-053](CHO-053-a-422-trims-only-the-forbidden-key-without-walking-internals.md)
  replaces `error_locations.py`'s schema walk with trimming only the trailing key on
  `extra_forbidden`, so wrapped union choices keep their nested field locations natively.
  Reopen if the API ever reintroduces schema-walked `loc` filtering.
