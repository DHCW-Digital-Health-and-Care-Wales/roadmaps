# STY-092: The OpenAPI contract and the editor's generated schemas

- **Status**: Placeholder — promoted once ADR-017 is accepted
- **Type**: Feature
- **Area**: Infrastructure + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard)
- **Binding ADRs**: ADR-017 §The contract with the editor, §Errors, ADR-016, ADR-008
- **Suggested model**: Sonnet — generation and drift checks with known tools

## Summary

The API's OpenAPI document is committed and checked for drift, and
`packages/api-types` generates the editor's types and `zod/mini` schemas from it. A
check keeps the API's error codes and the editor's English and Welsh catalogue in step.

## Why this is a placeholder

ADR-017 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- A command writes the document; CI fails on drift.
- `packages/api-types` with Hey API's openapi-ts (`zod/mini`); knip arrives with it.
- The code–catalogue parity check; the editor's import rules let `infrastructure/`
  import the package.
