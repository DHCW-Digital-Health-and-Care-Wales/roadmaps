# DEF-037: The editor's layering lint skips files under `src/` that are not `.ts` or `.tsx`

- **Status**: Needs triage — found by STY-092 delivery (its security review)
- **Severity**: Low — a JavaScript or `.mts` file could cross a layer unreported; the
  editor holds none today
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-002
- **Suggested model**: Sonnet — a lint rule with tests

## Summary

The editor's lint names only `.ts` and `.tsx` files in its layering rules. A `.js` file
under the editor's source is linted without them, and a `.jsx`, `.mts` or `.cts` file is
not linted at all, so any of these could import a layer it must not. Nothing changes for
users.

## Reproduce

At commit `d38185bd` on the default branch:

1. Add `apps/editor/src/features/probe.js` and `probe.mts`, each importing
   `../infrastructure/google-sheets` and exporting what it imports.
2. Run ESLint on both from `apps/editor`.

**Expected**: both fail, since features never import infrastructure, or lint refuses
the files
**Actual**: ESLint exits 0, reporting nothing for the `.js` file and only that the
`.mts` file has no configuration

## Cause

Verified: every block of `apps/editor/eslint.config.ts` that sets
`no-restricted-imports`, and `reactAppConfig` in `eslint.base.ts`, names
`**/*.{ts,tsx}`. The rules for the Google Identity global, the design tokens and
`@roadmaps/api-types` (`apps/editor/build/api-types-lint.ts`) name the same two
extensions.

- `rg -n 'ts,tsx' apps/editor/eslint.config.ts apps/editor/build eslint.base.ts` — the
  globs.
- `git ls-files apps/editor/src | grep -E '\.(js|jsx|mjs|cjs|mts|cts)$'` — no file
  today.

## Acceptance criteria

### S1: A file of another extension cannot cross a layer unreported

**Given** a JavaScript, `.jsx`, `.mts` or `.cts` file under `apps/editor/src/`
**When** `pnpm editor:lint` runs
**Then** it fails, for the layering it breaks or for the file's extension

## Decisions

_None yet: awaiting triage._
