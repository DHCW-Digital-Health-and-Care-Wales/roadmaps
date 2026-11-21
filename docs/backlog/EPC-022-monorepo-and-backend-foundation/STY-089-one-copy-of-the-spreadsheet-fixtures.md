# STY-089: One copy of the spreadsheet fixtures, read by both apps

- **Status**: Placeholder — promoted once ADR-016 is accepted
- **Type**: Refactor
- **Area**: Infrastructure + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-088 (hard)
- **Binding ADRs**: ADR-016 §The public site
- **Suggested model**: Sonnet — moving fixtures and repointing tests

## Summary

The editor copies the public site's fake-data spreadsheet CSVs today. One copy replaces
both, read by the editor's Sheets adapter tests and the public site's parser tests, so a
change to the format fails both apps in the same pull request.

## Why this is a placeholder

ADR-016 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- One fixture folder, its licence and README kept; both apps' tests read it.
- The editor's copy and its provenance note go.
