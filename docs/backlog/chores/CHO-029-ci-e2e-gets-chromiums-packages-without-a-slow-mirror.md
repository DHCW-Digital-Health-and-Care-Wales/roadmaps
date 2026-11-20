# CHO-029: CI's E2E job gets Chromium's system packages without waiting on a slow apt mirror

- **Status**: Proposed — raised by STY-081's retrospective; CI's E2E job twice came within
  2 minutes of its timeout while it waited on the runner's apt mirror
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one job in `.github/workflows/ci.yml`, checked by observed
  runs
- **Delivered**: _(add on delivery)_

## Summary

On a browser cache hit, the E2E job in `.github/workflows/ci.yml` still runs
`playwright install-deps chromium`, which installs 9 packages (21.9 MB, mostly fonts) from
the runner's apt mirror (`azure.archive.ubuntu.com`). That step usually takes about 10 s.
On 2026-11-20 it took about 8 minutes in 2 of 18 successful runs, at 46 kB/s. Both were
pull request runs that the orchestrator was waiting on to merge. Each brought the job to
18 min 20 s of its 20-minute `timeout-minutes`. Playwright's own run took 9.9 minutes both
times, so a slow mirror and a few retries could fail a green head on time alone. Done:
the job no longer waits on that mirror, and a Playwright bump keeps its browser and
system packages in step.

## Measurement

At commit `d6bbc69`. The source is the E2E job's step timings in the last 40 CI runs (25
E2E jobs, from 2026-11-19 18:14 to 2026-11-20 14:48 UTC; `gh api
repos/<repo>/actions/runs/<id>/jobs`), with the job logs of PRs #206, #207 and #209:

| Area                                     | Measurement                                                                                                                                              | Verdict                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| "Install Chromium's system dependencies" | 8–19 s in 15 of 18 successful runs, 66 s once; 477 s (PR #206) and 478 s (PR #209), "Fetched 21.9 MB in 7min 48s" and "in 7min 51s", the same 9 packages | intermittent, about 1 in 9 |
| E2E job total                            | 482–703 s normally; 1100 s (18 min 20 s) in both slow runs, against `timeout-minutes: 20`                                                                | 100 s from a timeout       |
| `pnpm test:e2e` in the slow runs         | 9.9 min, 663 passed with 1 flaky in #209 (`moved-travel.spec.ts:207`, retried), 659 passed in #206                                                       | not the cause              |
| A run beside a slow one                  | PR #207's E2E job started 13:34:21, beside #206's; its install step took 13 s                                                                            | per runner, not per hour   |

## Scope

One job in `.github/workflows/ci.yml`; the implementer picks how it gets Chromium's
system packages, a technical choice, recorded as a Decision:

- (a) Run the job in Playwright's image for the pinned version
  (`mcr.microsoft.com/playwright:v<version>-<ubuntu>`), which already holds Chromium and
  its packages (recommended). This drops both install steps and the browser cache. The
  image tag repeats the `@playwright/test` version, which is bumped by hand (Dependabot
  updates only the workflow's actions), so S2 needs a check that compares the two. The
  image pull is new time before the first step, so S1 counts it.
- (b) Cache the 9 `.deb` files, keyed on the Playwright version and the runner image,
  and install them from the cache. This keeps the job on the runner. Restoring
  root-owned apt archives takes its own step.
- Not enough on its own: raising `timeout-minutes`. A slow mirror would then fail
  nothing, but the job would still wait about 8 minutes, and S1 would not hold.

## Acceptance criteria

The evidence for each is an observed CI run, recorded in Delivery.

### S1: The E2E job installs no system packages from the runner's apt mirror

**Given** a pull request run whose browser cache is warm **When** the E2E job runs **Then**
no step downloads Chromium's system packages from the runner's apt mirror, and the job's
time before `pnpm test:e2e`, an image pull included, is under 2 minutes (about 30 s
today, 8 minutes in a slow run)

### S2: A Playwright bump keeps the browser and its packages in step

**Given** a pull request that bumps `@playwright/test` **When** CI runs **Then** the E2E job
runs that version's Chromium with its system packages, or fails with a message that names
the version mismatch

## Decisions

## Out of scope

- The flaky `moved-travel.spec.ts:207` keyboard case: it passed on retry, and the timing
  above does not depend on it.
