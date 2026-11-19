# DEF-022: Page tests time out when the host is busy

- **Status**: Done
- **Severity**: Low — a full unit run fails on a change that does not touch the
  failing tests, and costs a rerun; no user is affected
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — the page tests' timings under load, and either faster
  setups or budgets (the test's and Testing Library's waits) that fit them
- **Delivered**: _(add on delivery)_

## Summary

Page and navigation component tests fail when the host is busy, and pass when their
files run alone. The three slowest take 3.2 to 3.5 seconds of their 5-second budget in
a full run on an idle host. At load 15 to 20 on 8 cores, two of them went over it, in
two deliveries in a row, on changes that edited none of these tests. Each delivery had
to rerun the failed files alone, and one also repeated its whole gate. With two full
runs at once, about a hundred tests fail. CI has not shown it.

## Reproduce

Seen in full gate runs on two delivery branches. Neither changed these files:

| Run                     | Host load | Timed out at 5 s                                             |
| ----------------------- | --------- | ------------------------------------------------------------ |
| STY-075, head `b2ebd40` | 20        | `changed-roadmaps-only` S1; `roadmap-detail-page-moving` S1  |
| STY-073, head `dd6b054` | 15        | `changed-roadmaps-only` S1; `roadmap-detail-page-editing` S1 |

At `b00765a` on the default branch, `./node_modules/.bin/vitest run --reporter=json`
on an idle host (load 1.9 before the run) passed 2,996 of 2,996. The slowest tests took:

| Test                                                                                                              | Took     |
| ----------------------------------------------------------------------------------------------------------------- | -------- |
| `changed-roadmaps-only.test.tsx`, "shows only the roadmaps with changes, empties the search and keeps focus" (S1) | 3,515 ms |
| `roadmap-detail-page-moving.test.tsx`, "shows items moved into one placement in the order they were moved" (S1)   | 3,437 ms |
| `roadmap-detail-page-editing.test.tsx`, "opens the item dialog prefilled with the item's English" (S1)            | 3,158 ms |

With only their three files run, at load 2.7, they took 2,225 ms, 1,702 ms and
1,591 ms.

To reproduce at `b00765a`, run the suite twice at once on 8 cores:

1. `./node_modules/.bin/vitest run --reporter=json --outputFile=a.json &`
2. `./node_modules/.bin/vitest run --reporter=json --outputFile=b.json`

**Expected**: both runs pass 2,996 of 2,996.
**Actual**: run on a host already at load 8.7 from other work, load peaked at 31.
The runs failed 100 and 106 tests, in 16 and 17 files, all of them page and
navigation component tests. 68 and 65 failed on the 5 s test budget. Most of the
rest failed a Testing Library `findBy` wait (1 s by default), such as "Unable to
find role="heading" and name "A item"". Under the gates' load of 15 to 20, only
two tests timed out each time.

## Cause

Suspected, not verified. These tests drive the whole roadmap page with
`userEvent`, many steps per test. Vitest's default budget of 5,000 ms (no
`testTimeout` in `vite.config.ts`'s `test` block) leaves them 1.5 to 1.8 s to
spare. 41 tests take over 2 seconds in the idle run and 14 over 2.5, so the
next slowest are near the same edge. Under heavier load, Testing Library's 1 s `findBy`
waits give out too, many of them in other files (`unpublished-changes`,
`navigation-families`).

## Acceptance criteria

### S1: the page tests pass on a busy host

**Given** the unit suite run in full on 8 cores otherwise idle (load under 2), three
times, each beside a second full run as in Reproduce,
**Then** every run passes, **And** Delivery says what made the tests faster or gave
them the budget they need, and why that budget is not hiding a slow page.

## Decisions

- **D1** (owner, 2026-11-19, triage): fix it; the owner's request to fix DEF-022
  took it out of Needs triage.

## Delivery

The tests now run in less time and have a budget that fits a busy host:

- **Faster: routes load with the router under Vitest.** `vite.config.ts` turns off the
  TanStack Router plugin's `autoCodeSplitting` when `VITEST` is set. With it on, each
  route's page loaded lazily on first render, so the first page test of every file paid
  0.4 to 0.7 s to load modules inside its budget: run alone, S1 of
  `roadmap-detail-page-editing` fell from 1,847 to 1,119 ms and S1 of
  `roadmap-detail-page-moving` from 1,555 to 810 ms. In a full run on an idle host
  (load 1.9), the slowest page test fell from 3,515 to 2,913 ms, tests over 2 s from 41
  to 16 and over 2.5 s from 14 to 4. The build still splits routes.
- **Budget: 15 s per test, 3 s per Testing Library wait.** `testTimeout: 15_000` in
  `vite.config.ts`, and `configure({ asyncUtilTimeout: 3_000 })` in
  `src/test/setup.ts`. Beside a second full run, the slowest page test took 6.4 s and
  `findBy` waits passed within 3 s.

**Why the budget hides no slow page.** A page test's time is jsdom running React and
`userEvent`, and it moves with the host's load, not with the page: the same test took
2.2 s alone, 2.9 to 3.5 s in a full run and 6.4 s beside a second one, on the same
code. A 5 s budget never measured the page's speed; it tripped on load. The budget is a
hang detector, and a hang still fails, at 15 s. No test expects a `findBy` or `waitFor`
to give out, so the longer wait slows only a test that is already failing.

### Departures

- **Cause confirmed** (agent): the Cause above was suspected. The first page test of
  each file also paid for lazy route loading (above); the rest is jsdom time that
  follows the host's load.

- **No screenshots** (agent): the fix changes test configuration only; no screen
  changes.
- **The suite has 3,018 tests, not the record's 2,996** (agent): stories merged since
  `b00765a` added them.
- **Red shown on the base, not by a new test** (agent): the defect is a run under load,
  which no unit test can hold. Its red is the Reproduce run on the base, below.

### Contract for dependents

A unit or component test has 15 s, and a `findBy` or `waitFor` 3 s unless it sets its
own. Route components load eagerly under Vitest, so a test cannot see a route's
lazy-loading (pending) state; none does today, and the E2E suite runs the split build.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | At base `02e8e41`, two full `vitest run`s at once (load 5.6 before, peak 20) failed 13 and 2 of 3,018: 12 `findBy` waits and 3 test timeouts. With the fix, three times from load under 2 (1.98, 1.94, 1.81), each beside a second full run, peak load 20.9 to 21.0: all six runs passed 3,018 of 3,018. Their slowest page tests took 5.5 to 6.4 s (`changed-roadmaps-only` S1), with `roadmap-detail-page-moving` and `-adding` at 5.1 to 5.4 s; `scripts/worktree/worktree.test.ts`'s slowest test, at about 20 s, sets its own budget. |
