# STY-087: Workspace tooling, CI per app and the ruleset on main

- **Status**: Placeholder — promoted once ADR-016 is accepted
- **Type**: Refactor
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-086 (hard)
- **Binding ADRs**: ADR-016 §Workspace tooling, §CI, §Who may change main, ADR-007
- **Suggested model**: Sonnet — configuration with known shapes

## Summary

The workspace gets its shared tooling: version catalogs, one Prettier config, commit and
push hooks, CI as jobs per app with workflow linting, and Dependabot for pnpm. `main`
gets the ruleset copied from `product-roadmaps`, with required checks and signed
commits, so the public site's code arrives into a protected branch.

## Why this is a placeholder

ADR-016 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- pnpm `catalog:` entries; strict resolution; root `.prettierrc.json`.
- Husky and lint-staged (commit: Prettier, ESLint; push: typecheck).
- `ci.yml`: a `changes` job by path, fixed job names, actionlint and zizmor.
- Dependabot for pnpm beside GitHub Actions, grouped monthly.
- The ruleset and `CODEOWNERS` (an owner applies them), named in the PR as manual steps.
