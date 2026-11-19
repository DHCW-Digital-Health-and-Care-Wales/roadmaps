# DEF-022: The slowest page tests time out when the host is busy

- **Status**: Needs triage — found by the STY-073 retro
- **Severity**: Low — a full unit run fails on a change that does not touch these
  tests, and costs a rerun; no user is affected
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — three tests' timings, and either a faster setup or a
  budget that fits them
- **Delivered**: _(add on delivery)_

## Summary

The three slowest component tests in the unit suite take 3.2 to 3.5 seconds of their
5-second budget in a full run on an idle host. When the host is busy (load 15 to 20 on
8 cores), they go over it and fail as timeouts. Each passes when its file runs alone.
This happened in two deliveries in a row, on changes that did not touch them, and each
cost a rerun of the suite. CI has not shown it.

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

**Expected**: the suite passes on a busy host.
**Actual**: under load 15 or more, two of these three time out.

## Cause

Suspected, not verified. These tests drive the whole roadmap page with
`userEvent`, many steps per test. Vitest's default budget of 5,000 ms (no
`testTimeout` in `vite.config.ts`'s `test` block) leaves them less than half their
own time to spare. 41 tests take over 2 seconds in the idle run and 14 over 2.5, so the
next slowest are near the same edge.

## Acceptance criteria

### S1: the slowest page tests pass on a busy host

**Given** the unit suite run in full beside a busy process (load 15 or more on
8 cores), three times,
**Then** every run passes, **And** Delivery says what made the tests faster or gave
them the budget they need, and why that budget is not hiding a slow page.

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
