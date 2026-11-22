# DEF-028: A fresh clone gets no Git hooks from `pnpm install`

- **Status**: Done
- **Severity**: Low — a developer's commits and pushes go unchecked locally until CI
  checks them; nothing reaches `main` unchecked
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-016 §Workspace tooling
- **Suggested model**: Sonnet — one install script, checked in a scratch clone
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/235

## Summary

STY-087 has `pnpm install` install the Git hooks, through lefthook's own install script.
That holds only for the first checkout on a machine: pnpm keeps the built package in its
store and restores it into later checkouts without running the script again, so a fresh
clone, or a worktree on a machine that already has one, gets no hooks. Worktrees of one
repository share their hooks, so those on a machine where the hooks were installed once
still had them. Found while checking STY-087's set-up after its merge.

## Reproduce

At commit `1e91882` on the default branch, on a machine where `pnpm install` has already
built lefthook 2.2.2 for another checkout:

1. `git clone --depth 1 --branch main https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps.git`
2. In it, with `CI` unset: `pnpm install --frozen-lockfile`

**Expected**: `.git/hooks/pre-commit` and `.git/hooks/pre-push` exist.
**Actual**: neither exists, and the install prints nothing from lefthook. `pnpm rebuild
lefthook` then installs both, so the script works when it runs.

## Cause

Verified: pnpm runs a dependency's install script when it builds the package, and its
side-effects cache restores that built package into later installs without running it.
The hooks came only from lefthook's script (`allowBuilds: lefthook: true` in
`pnpm-workspace.yaml`). A root package's own `postinstall` runs on every install that
builds `node_modules`, a fresh clone or worktree included.

- `rg -n 'lefthook' package.json pnpm-workspace.yaml` — the one install path:
  `pnpm-workspace.yaml`'s `allowBuilds`.

## Acceptance criteria

### S1: Every fresh install installs the hooks, and none in CI

**Given** a fresh clone, on a machine whose pnpm store already holds lefthook
**When** `pnpm install` runs with `CI` unset
**Then** the commit and push hooks are installed
**And** with `CI` set, none are

## Decisions

- **D1** (owner, 2026-11-22, triage of STY-087's set-up check): fix it now, in its own
  pull request, over recording it only.
- **D2** (agent, 2026-11-22, delivery): the root package's `postinstall` runs lefthook's
  own install script, which skips itself when `CI` is set, and `allowBuilds` denies the
  dependency's copy, so it runs once. Over `lefthook install` in a script of our own,
  which would need its own `CI` check.

## Delivery

### Departures

None.

### Contract for dependents

- The root `postinstall` is the one place the hooks are installed. It runs on a fresh
  install, and on an install that changes `node_modules`, not on one that finds them up
  to date; `pnpm rebuild lefthook` is not the way back now that the dependency's script
  is denied, while `node node_modules/lefthook/postinstall.js` or
  `node_modules/.bin/lefthook install` are.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `build/git-hooks.test.ts` (`installs the commit and push hooks`, `installs none in CI`), red before the root `postinstall` existed; a fresh clone of `1e91882` with this change's `package.json` and `pnpm-workspace.yaml`, installed from an empty `node_modules`, got both hooks with `CI` unset and none with `CI=true` |
