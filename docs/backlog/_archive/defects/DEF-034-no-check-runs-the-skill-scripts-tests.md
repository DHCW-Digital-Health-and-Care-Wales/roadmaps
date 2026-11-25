# DEF-034: No check runs the skill scripts' tests

- **Status**: Done — found by STY-091's retrospective review
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

- **D1** (owner, 2026-11-25, triage of STY-091's retrospective finding): fix; triaged
  `Proposed`.
- **D2** (agent, 2026-11-25): a step of CI's Repository job, over a Vitest include or a
  job of its own. That job runs on every run and _CI result_ needs it, so no path filter
  has to know what the suites read, which includes the editor's styles and its Playwright.
  The browser is the runner's Chrome, which `chromium.mjs` takes from
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, so the job installs none. It follows the
  runner image, not the pinned Playwright revision.

## Delivery

### Departures

None.

### Contract for dependents

A skill test that needs a browser launches it through the UX prototypes'
`launchChromium` (`chromium.mjs`), or runs a script that does: the Repository job has no
Playwright browser of its own, only the Chrome its step names. CI runs the files matching
`.agents/skills/*/scripts/*.test.mjs`; a suite elsewhere or under another suffix is not
run.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | observed runs, by manual dispatch: [with one skill test made to fail](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/runs/45619686972) on a scratch branch, since deleted, _Test the skills' scripts_ failed naming that test (72 passed, 1 failed) and _CI result_ failed on `repository: failure`; [on the delivery branch](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/runs/45618156568) the step passed with 72 tests and _CI result_ passed. The Repository job has no `if:` or `needs`, so a pull request runs it too |
