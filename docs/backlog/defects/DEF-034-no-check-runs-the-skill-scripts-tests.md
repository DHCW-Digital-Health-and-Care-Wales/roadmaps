# DEF-034: No check runs the skill scripts' tests

- **Status**: Needs triage — found by STY-091's retrospective review
- **Severity**: Low — a change that breaks a skill's script can merge with every check
  green; only an agent following `validation.md` runs those tests
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one CI step or one Vitest include, and its regression
- **Delivered**: _(add on delivery)_

## Summary

Some skills ship scripts with their own `node --test` suites: the retrospective's session
timeline and the UX prototypes' page tools. CI, the git hooks and the root test run never
run those suites, so a change that breaks one passes every check. Only the validation
reference's _Rules, skills, agents, hooks_ row asks an agent to run a changed skill's tests, and a
review fix made after the gate can skip it. The workaround is to run them by hand.

## Reproduce

At commit `d38185bd` on the default branch:

1. List the root Vitest run's files: `node_modules/.bin/vitest list --filesOnly`.
2. List the skills' test files: `ls .agents/skills/*/scripts/*.test.mjs`.
3. Search CI and the hooks for a run of them: `rg -n 'node --test|\.agents' .github/workflows lefthook.yml package.json`.

**Expected**: each skill test file is run by CI (and so gates a merge).
**Actual**: the root run lists only `build/` and `scripts/` tests (8 files); the four skill
test files (`retro/scripts/session-timeline.test.mjs` and three under
`ux-prototypes/scripts/`) appear in no workflow, hook or script.

## Cause

Verified: the root `vitest.config.ts` includes only `build/**/*.test.ts` and
`scripts/**/*.test.ts`, and the skill suites are `node --test` files (`.test.mjs`) that no
workflow step runs.

- `ls .agents/skills/*/scripts/*.test.mjs` — 4 files: `retro/scripts/session-timeline.test.mjs`,
  `ux-prototypes/scripts/assemble.test.mjs`, `ux-prototypes/scripts/check-page.test.mjs`,
  `ux-prototypes/scripts/component-page.test.mjs`
- `rg -n 'node --test' .github lefthook.yml package.json` — 0 sites

## Acceptance criteria

### S1: CI runs every skill script's tests

**Given** a skill script test under `.agents/skills/*/scripts/` that fails
**When** CI runs on a pull request that changes it
**Then** a required check fails, naming the failing test

## Decisions
