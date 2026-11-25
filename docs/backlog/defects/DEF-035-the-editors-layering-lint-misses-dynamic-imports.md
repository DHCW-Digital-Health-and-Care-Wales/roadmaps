# DEF-035: The editor's layering lint misses `import()` and `import("…")` types

- **Status**: Needs triage — found by STY-092 delivery
- **Severity**: Low — a layer can reach one it must not without lint saying so; no such
  import exists today
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-002
- **Suggested model**: Sonnet — a lint rule with tests

## Summary

The editor's lint holds ADR-002's layering for ordinary imports only. A feature, domain
or component file can load another layer with `import()`, or name its types with an
`import("…")` type, and lint passes. Developers would not be told; nothing changes for
users.

## Reproduce

At commit `d38185bd` on the default branch:

1. Add `apps/editor/src/features/probe.ts` holding
   `export const a = () => import("../infrastructure/google-sheets")` and
   `export type B = import("../infrastructure/google-sheets").GoogleSheetsRoadmapRepository`,
   then `export * from "../infrastructure/google-sheets"`.
2. Run ESLint on it from `apps/editor`.

**Expected**: all three lines fail, since features never import infrastructure
**Actual**: only the third fails

## Cause

Verified: `layers()` in `apps/editor/eslint.config.ts` feeds `no-restricted-imports`,
which reads static imports, re-exports and `import x = require()`, not an `import()`
expression or an `import("…")` type. Every layer block that calls it is affected
(domain, infrastructure, features, components and i18n, lib). STY-092's own boundary
for `@roadmaps/api-types` holds both forms by a rule of its own
(`apps/editor/build/api-types-lint.ts`), which a fix could generalise.

- `rg -n "layers\(" apps/editor/eslint.config.ts` — the definition and its five uses.
- `rg -n "await import\(|= import\(|typeof import\(" apps/editor/src` — one site, a
  test loading a module in its own folder.

## Acceptance criteria

### S1: A deferred import across layers fails lint

**Given** a file in a layer that must not import another
**When** it uses `import()` or an `import("…")` type naming that layer
**Then** `pnpm editor:lint` fails, naming the layering rule

## Decisions

_None yet: awaiting triage._
