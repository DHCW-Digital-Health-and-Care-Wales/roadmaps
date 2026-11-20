# CHO-029: CI's E2E job gets Chromium's system packages without waiting on a slow apt mirror

- **Status**: Done
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one job in `.github/workflows/ci.yml`, checked by observed
  runs
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/213

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

- **D1** (owner, 2026-11-20, request): use a Playwright container for the E2E tests so
  no Chromium or system packages are installed → option (a), the job runs in Playwright's
  image. Changes: the install and cache steps go.
- **D2** (agent, 2026-11-20): the image is pinned by tag and digest, as the actions are
  pinned by SHA, and S2 is held by a step that launches Chromium and names the version
  on failure (the product-roadmaps public site's pattern), over a Vitest test comparing
  the tag with package.json. The step fails only when the image lacks the Chromium the
  installed Playwright needs, so a patch bump that keeps the browser revision does not
  force an image bump (a stale digest then passes), and an image that cannot launch it
  is caught whatever its tag says.

## Out of scope

- The flaky `moved-travel.spec.ts:207` keyboard case: it passed on retry, and the timing
  above does not depend on it.

## Delivery

### Departures

None.

### Contract for dependents

The E2E job runs in `mcr.microsoft.com/playwright:v<version>-noble@sha256:<digest>`
with `--ipc=host`, and installs no browser or system package. A Playwright bump
changes the image tag and digest in `.github/workflows/ci.yml` with the version in
`package.json` (`docker pull mcr.microsoft.com/playwright:v<version>-noble` prints
the digest); the job's _Check the container has the Playwright browser_ step fails
with that instruction when the image lacks the Chromium the installed Playwright needs. Local runs still install Chromium
(`AGENTS.md`, _Commands_).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | CI run https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/actions/runs/44772912803 (a manual run of the branch at `674d334`): the E2E job started 16:23:40 and `pnpm test:e2e` at 16:24:20, 40 s later, of which _Initialize containers_ (the image pull) took 21 s. Its steps include no apt step, no browser cache and no install of Chromium; the job took 11 min 2 s and passed. |
| S2       | The check step's script, with the repository mounted in the 1.65.0 image, exits 1 with Playwright's "Please update docker image as well" and the step's `::error::` naming v1.64.1; in the 1.64.1 image it exits 0 (local run).                                                                                                                                                                         |
