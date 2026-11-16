# CHO-018: The publish hook's "read back" test holds when CI is slow

- **Status**: Proposed — one flake seen; the owner decides whether it is worth chasing
- **Type**: Chore
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one test's ordering, once the cause is reproduced
- **Delivered**: _(add on delivery)_

## Summary

`src/features/roadmaps/hooks/use-publish-roadmap-changes.test.tsx` failed once in CI on a
change that does not touch it: `expect(result.current.publish.readBack()).toBe(false)`
received `true` (line 137, the test about a Refresh begun before a write lands, then the
session expiring). The failed job's rerun passed. Done: the test passes on every run
fifty runs in a row (S1), or the owner decides one flake is not worth the work.

## Measurement

On `main` at `bb046d0` plus an organisations-only change, from CI run 43951757606 (head
`1cd9d2f`) and its rerun.

| Run                                                       | Result                            |
| --------------------------------------------------------- | --------------------------------- |
| CI, head `1cd9d2f`, `Verify`                              | 1 failed of 2,177 tests: this one |
| Same job rerun                                            | passed                            |
| CI, head `cc3487d`, `Verify`                              | passed                            |
| Local, this file alone, six runs, and the full suite once | passed                            |

The test releases a held write, then waits only for the second read to start before it
sets the session to expired and awaits the publish. Whether `readBack()` is `false`
depends on the order of those steps, which a slow runner can change. The cause is not
reproduced: this is a guess from reading the test.

## Acceptance criteria

### S1: the test passes under load

**Given** the test file run fifty times, a quarter of them beside a busy process,
**Then** every run passes, **And** Delivery names the step whose order changed and what
the test now waits on.

## Decisions

## Out of scope

Other timing-based hook tests, unless the reproduction shows the same cause.
