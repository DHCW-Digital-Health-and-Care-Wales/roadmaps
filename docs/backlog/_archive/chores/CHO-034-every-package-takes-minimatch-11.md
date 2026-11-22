# CHO-034: Every package takes minimatch 11, so the dependency audit finds nothing to ignore

- **Status**: Done
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none; CHO-031 adds the audit and ignores this advisory in
  `osv-scanner.toml`, and this chore removes the ignore entry. If CHO-031 has not
  landed, it is fixed all the same and observed with OSV-Scanner run by hand
- **Binding ADRs**: none
- **Suggested model**: Opus — a dependency change across the lint tooling and a runtime
  package, with a pnpm override if upstream has not moved
- **Delivered**: _(add on delivery)_

## Summary

GHSA-g3hv-75wg-m249 (medium) is a denial of service in minimatch 7 to 11.0.0, through
crafted glob patterns. The workspace resolves minimatch 10.2.6 under ESLint,
typescript-eslint, eslint-plugin-jsx-a11y-x and shadcn's ts-morph. The patterns they
match come only from the repository's own configuration, so nothing here is known to
reach it, but Dependabot holds an open alert, and the dependency audit passes only
because it ignores the advisory. Done means no package resolves minimatch below 11.0.1,
the ignore entry is gone, and the audit passes.

## Measurement

At commit `d004aa4`, 2026-11-22 (`pnpm why minimatch -r`, the npm registry):

| Dependent of minimatch 10.2.6               | Newest release (published)            | Its minimatch                                           | Verdict         |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------- | --------------- |
| `@eslint/config-array` 0.23.5, under eslint | eslint 10.15.0 (2026-11-13)           | `^11.0.5`                                               | bump            |
| `@typescript-eslint/typescript-estree`      | typescript-eslint 8.73.0 (2026-11-16) | `^11.0.1`                                               | bump            |
| `eslint-plugin-jsx-a11y-x` 0.2.0            | 0.2.0, the installed one              | `^10.2.5`                                               | no upstream fix |
| `@ts-morph/common` 0.27.0, under shadcn     | shadcn 4.23.0, the installed one      | `^10` through ts-morph 26 (ts-morph 28 takes `^11.0.1`) | no upstream fix |

Each bump must also be at least a week old, or pnpm's `minimumReleaseAge` (CHO-031)
refuses it. The advisory's first patched version is 11.0.1.

## Acceptance criteria

### S1: No package resolves a vulnerable minimatch

`pnpm why minimatch -r` lists no version below 11.0.1. Where a dependent has no release
on minimatch 11, a pnpm override (`pnpm-workspace.yaml`) raises it, with a comment
naming the dependent and when to drop the override, and that dependent's use still
works: `pnpm lint` for the ESLint plugins, `shadcn` for the components it adds.

### S2: The audit passes without ignoring it

The GHSA-g3hv-75wg-m249 entry is removed from `osv-scanner.toml` (the file goes if it
is then empty), OSV-Scanner over every lockfile finds nothing, and Dependabot's alert
for it closes.

## Decisions

- **D1** (owner, 2026-11-22, CHO-031 delivery): record the advisory in the backlog and
  fix it in its own thread now, rather than accept it in `osv-scanner.toml` until
  2027-01-15 or leave the audit failing.

## Delivery

### Departures

- S1: typescript-eslint also takes a pnpm override, though 8.73.0 takes minimatch 11:
  published 2026-11-16, it is under the week CHO-031's `minimumReleaseAge` (10080
  minutes) asks for, so the catalog stays on ^8.72.1 and an override raises
  `@typescript-eslint/typescript-estree`'s minimatch until the catalog moves (agent).
  ESLint's bump to 10.15.0 (2026-11-13) clears the week, so it carries no override.
- S2: CHO-031 has not landed, so `osv-scanner.toml` does not exist on `main` and there
  is no entry to remove; the audit is observed with OSV-Scanner run by hand, as the
  record's Depends on allows (agent).

### Contract for dependents

- CHO-031, if it lands after this chore, drops its GHSA-g3hv-75wg-m249 entry from
  `osv-scanner.toml` (and the file, if that leaves it empty).
- `pnpm-workspace.yaml`'s new `overrides` block sits where CHO-031's branch adds
  `minimumReleaseAge`, after `catalog:`; whichever lands second keeps both blocks.
- `pnpm-workspace.yaml` gains `overrides`, each with the condition that drops it. The
  typescript-eslint one goes when its catalog entry reaches ^8.73.0, which Dependabot's
  monthly pnpm update proposes.
- The lockfile was resolved with `minimumReleaseAge` 10080, so every version this
  chore adds is at least a week old and CHO-031's setting accepts it.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | observed run: `pnpm why minimatch -r` lists only minimatch 11.0.8; `pnpm lint` passes; `shadcn add card --dry-run --view` gives the same file as on the base                   |
| S2       | observed run: OSV-Scanner v2.7.1 over the base lockfile reports GHSA-g3hv-75wg-m249 (minimatch 10.2.6) and over the head's finds nothing; the Dependabot alert closes on merge |
