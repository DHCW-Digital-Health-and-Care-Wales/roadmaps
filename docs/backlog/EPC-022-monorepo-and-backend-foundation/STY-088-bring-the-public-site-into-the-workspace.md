# STY-088: Bring the public site into the workspace, still published at its address

- **Status**: Placeholder — promoted once ADR-016 is accepted
- **Type**: Refactor + Docs
- **Area**: CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-087 (hard)
- **Binding ADRs**: ADR-016 §The public site, ADR-007
- **Suggested model**: Opus — a history merge and a cross-repository cut-over

## Summary

The public site's code and history move into `apps/public-site`, on the workspace's
toolchain, and `product-roadmaps` keeps publishing it at `/product-roadmaps/` from a
nightly and manual build of this repository's `main`. The public sees no change.

## Why this is a placeholder

ADR-016 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- Freeze `product-roadmaps`; merge its history as unrelated, then `git mv` into
  `apps/public-site` (merge commits allowed for that pull request only).
- pnpm, Node 26, the root Prettier style (the reformat commit in
  `.git-blame-ignore-revs`); the root `eslint.base.ts`; its CI jobs (checks, E2E,
  Lighthouse) and `check-sheet.yml`; its guide as `apps/public-site/AGENTS.md`.
- Compare the built output before and after; then `product-roadmaps`' workflow checks
  out this repository and builds the subfolder; its open Dependabot PRs closed; its
  README points here.
