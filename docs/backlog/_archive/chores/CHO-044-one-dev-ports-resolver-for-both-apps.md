# CHO-044: One dev-ports resolver serves both apps

- **Status**: Done
- **Type**: Refactor
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-095 (hard)
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one small module moved and two callers repointed
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/272

## Summary

Each app has its own copy of the function that reads a worktree's ports from the root
`.env.worktree`, ignoring ambient variables: the same parsing and error, differing only
in the variable names they read and the default ports without the file. A fix to one
copy misses the other. One module under the root `scripts/worktree/`, beside
`worktree.sh` that writes the file, serves both apps' Vite and Playwright configs and
the site's Lighthouse script, each naming its variables and defaults.

## Measurement

At commit `d2566963`:

| Copy                                     | Lines | Test lines | Reads                                | Defaults   |
| ---------------------------------------- | ----- | ---------- | ------------------------------------ | ---------- |
| `apps/editor/build/resolve-dev-ports.ts` | 52    | 64         | `DEV_PORT`, `PREVIEW_PORT`           | 5173, 4173 |
| `apps/public-site/scripts/dev-ports.ts`  | 47    | 43         | `SITE_DEV_PORT`, `SITE_PREVIEW_PORT` | 5174, 4174 |

Callers: each app's `vite.config.ts` and `playwright.config.ts`, and
`apps/public-site/scripts/lighthouse.ts`.

## Acceptance criteria

### S1: One resolver, each app's ports

**Given** a worktree whose `.env.worktree` names both apps' ports
**When** either app's dev server, preview, E2E suite or Lighthouse run starts
**Then** it listens on that app's ports from the file, resolved by the one module in
`scripts/worktree/`
**And** with no file, each app takes its own defaults, as today
**And** a missing or invalid port fails with the same message as today, naming the
variable

### S2: No copy remains

**Given** the change
**When** a reader searches the apps for a port resolver
**Then** neither app holds one, and the module's cases are tested once, in the root
package's suite

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 4): record the duplication as a
  chore and run it in the alignment sequence, right after STY-095, whose renames settle
  the site's script names first.

## Out of scope

- The language preference both apps resolve alike: STY-096 gives the site's copy the
  editor's shape, with no shared package (STY-096 D4).

## Delivery

### Departures

- **The module's name and shape.** `scripts/worktree/dev-ports.ts` exports
  `resolveDevPorts(app, worktreeEnvFile?)`, with the file defaulting to the repository
  root's `.env.worktree`, and two `AppPorts` values, `EDITOR_PORTS` and
  `PUBLIC_SITE_PORTS`, each naming its two variables and its defaults, so the site's
  three callers do not repeat its names. The module is beside `worktree.sh`, which
  writes those same variables. The editor's `parseWorktreePorts` is no longer exported:
  its cases run through `resolveDevPorts`. Agent, routine shape drift.
- The two apps' own tests of the resolver went with their copies.

### Contract for dependents

An app that reads another port from `.env.worktree` adds an `AppPorts` value beside the
two and has `worktree.sh` write its variables; no app holds a resolver of its own.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `scripts/worktree/dev-ports.test.ts` (defaults, each app's ports from one file, ambient variables ignored, a missing, invalid or absent port named); observed run: `resolveDevPorts` in this worktree gives 21210/21211 and 21212/21213 from `.env.worktree` |
| S2       | `rg 'resolveDevPorts\|parseWorktreePorts\|readPort' apps` finds callers only; the one test file is the root package's. The built public site (`pnpm site:build`) is byte-identical to the build before (`diff -r`)                                           |
