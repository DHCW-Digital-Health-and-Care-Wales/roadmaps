# DEF-022: Page tests time out when the host is busy

- **Status**: Needs triage — found by the STY-073 retro
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

## Delivery _(add on delivery; as in `story.md`)_
