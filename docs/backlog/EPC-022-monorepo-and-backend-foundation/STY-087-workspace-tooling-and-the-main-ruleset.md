# STY-087: Workspace tooling, CI per app and the ruleset on main

- **Status**: Placeholder — promoted once ADR-016 is accepted
- **Type**: Refactor
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-086 (hard)
- **Binding ADRs**: ADR-016 §Workspace tooling, §CI, §Who may change main, ADR-007
- **Suggested model**: Sonnet — configuration with known shapes

## Summary

The workspace gets the shared tooling ADR-016 sets for the two TypeScript apps, CI as
jobs per app, and the ruleset on `main`, so the public site's code arrives into a
protected branch. Nothing changes for Product Leads.

## Why this is a placeholder

ADR-016 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- ADR-016 _Workspace tooling_ for what exists now: catalogs, the root Prettier config,
  hooks for Prettier, ESLint and typecheck (ruff and ty join with STY-090), Dependabot
  for pnpm.
- ADR-016 _CI_: the `changes` job and fixed job names; consider one always-run gate
  job for the ruleset to require, since a job skipped because `changes` failed also
  counts as passed.
- The ruleset and `CODEOWNERS`, applied by an owner and named in the pull request as
  manual steps; ADR-007's amendment for CI per app.
