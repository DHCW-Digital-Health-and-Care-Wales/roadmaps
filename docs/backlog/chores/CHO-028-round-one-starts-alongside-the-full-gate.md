# CHO-028: Whether review round 1 starts while its head's full gate runs

- **Status**: Needs grilling — raised by STY-080's retrospective; it changes when reviews
  start, the owner's to accept
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a few lines across `delegation.md`, `validation.md` and
  implement-story step 3's Completion, once the owner chooses
- **Delivered**: _(add on delivery)_

## Summary

Round 1 waits for its head's full gate (`delegation.md`, Worker contract). STY-080's
delivery started it about 3 minutes into that gate instead; the gate's only failures
matched a round 1 finding, so nothing was lost and about 10 minutes were saved. As a
rule it has a cost: a gate failure no reviewer reported starts no re-check, so a
test-only fix for it reaches the push unreviewed, and a fix made while reviewers read
the checkout changes what they read. STY-081's delivery did the same 36 seconds into its
gate, though its brief pointed it at `delegation.md`'s timing; the gate passed. Done: the
owner has chosen whether round 1 may start alongside the gate, and on what terms, and the
guides say so.

## Measurement

From the quick add orchestrated run's progress log and handoffs, outside the repository
(UTC). STY-080's gate and round 1 ran on branch head `8882bd6`, squashed into `94d1e8c`;
STY-081's on `beb0c3b`, squashed into `d6bbc69`:

| Area                   | Measurement                                                                                            | Verdict                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------ |
| Gate on round 1's head | Started 12:22, finished about 12:35: typecheck, lint, format and 3034 unit tests passed; 11 E2E failed | failures already found   |
| Round 1                | Started 12:25; Opus and quality reports by 12:41, Sol's by 12:42                                       | about 10 minutes earlier |
| STY-081 gate           | Started 14:22:11, finished about 14:32: all green (3055 unit, 664 E2E)                                 | nothing to find          |
| STY-081 round 1        | Started 14:22:47, before the unit tests (156 s) had finished; all three reports by 14:29               | about 10 minutes earlier |
| STY-081 fixes          | Made after the gate ended, at 14:32, as `validation.md` sets for a background suite                    | rule held                |
| Other runs             | No delivery record in `docs/analysis/delivery-runs/` reports round 1 started during its gate           | two observations         |

## Acceptance criteria

### S1: The guides say when round 1 starts

**Given** a delivery whose head has passed typecheck, lint and the unit tests, with E2E still
running **When** it is ready for round 1 **Then** `delegation.md` and `validation.md` say
the same thing about whether it starts now, and, if it does, how a gate failure is reviewed
and when its fix is made

## Open questions

- **Q1**: Should round 1 start alongside the full gate?
  - (a) No, as today (recommended): round 1 waits for the whole gate, and `delegation.md`'s
    Worker contract names the full gate, since two deliveries in a row started round 1
    during it. Each delivery keeps the wait, about 10 minutes in STY-080 and STY-081.
    Two observations, neither with a gate failure that no reviewer found, are too few to
    change when reviews start (`orchestrate`'s run-summary reference, _Evaluate after
    real use_).
  - (b) Yes, once typecheck, lint and the unit tests pass. A gate failure counts as a finding
    above P3, so its fix gets a re-check, and it is fixed only after the round's reviewers
    have reported. This saves the wait, adds a re-check whenever the gate fails, and changes
    three files (`delegation.md`, `validation.md`, implement-story step 3's Completion).

## Decisions
