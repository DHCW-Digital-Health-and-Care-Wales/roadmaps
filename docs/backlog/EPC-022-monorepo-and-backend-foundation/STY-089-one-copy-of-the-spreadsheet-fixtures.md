# STY-089: One copy of the spreadsheet fixtures, read by both apps

- **Status**: Placeholder — ADR-016 accepted (owner, 2026-11-21); promoted once its
  acceptance criteria are written
- **Type**: Refactor
- **Area**: Infrastructure + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-088 (hard)
- **Binding ADRs**: ADR-016 §The public site
- **Suggested model**: Sonnet — moving fixtures and repointing tests

## Summary

The editor copies the public site's fake-data spreadsheet CSVs today. One copy replaces
both, read by the editor's tests and the public site's parser tests, so a change to the
format fails both apps in the same pull request.

## Why this is a placeholder

ADR-016 is accepted (2026-11-21), but the acceptance criteria are not yet written.

## Rough shape of the work

_Not acceptance criteria._

- One fixture folder, its licence and README kept; both apps' unit tests and the
  editor's E2E Sheets fake read it.
- The shared folder sits outside either app's directory, so a format change runs both
  apps' jobs (STY-087 S5).
- The editor's copied CSVs and their provenance note go; its own `Template.csv` moves
  into the shared folder or stays beside the editor's tests.
- An archived record links into the fixture folder (the EPC-002 README), and the
  Markdown link check fails on it once the folder moves, while records under
  `docs/backlog/_archive/` are never rewritten. Settle with the owner, when the
  criteria are written, whether the move changes only that link's target; find every
  such link with `rg -n '\]\([^)]*fixtures/sheets' docs/backlog/_archive docs/analysis/delivery-runs`.
