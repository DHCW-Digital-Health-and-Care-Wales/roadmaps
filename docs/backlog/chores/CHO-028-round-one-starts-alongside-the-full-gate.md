# CHO-028: Whether review round 1 starts while its head's full gate runs

- **Status**: Needs grilling — raised by STY-080's retrospective; it changes when reviews
  start, the owner's to accept
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a few lines across `delegation.md` and `validation.md`,
  once the owner chooses
- **Delivered**: _(add on delivery)_

## Summary

`delegation.md` (Worker contract) has a delivery re-run the checks `validation.md` sets for
a head, and only then pin it for review, so round 1 waits for the full gate. STY-080's
delivery started round 1 about 3 minutes into a full gate on the same head, with the base
unmoved. The gate's only failures (11 E2E tests finding "Add an item" by substring) matched
a round 1 reviewer's finding and were fixed in round 1's fix commit, so starting early lost
no review and saved about 10 minutes of a 92-minute delivery. Allowing it in general has a
cost the STY-080 retrospective's review raised: a gate failure no reviewer reported starts no
re-check, so a test-only fix for it reaches the push unreviewed, and a fix made while
reviewers read the checkout changes what they read. Done: the owner has chosen whether round
1 may start alongside the gate, and on what terms, and the guides say so.

## Measurement

At `94d1e8c`, from the STY-080 run's progress log (UTC):

| Area                   | Measurement                                                                                            | Verdict                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------ |
| Gate on round 1's head | Started 12:22, finished about 12:35: typecheck, lint, format and 3034 unit tests passed; 11 E2E failed | failures already found   |
| Round 1                | Started 12:25; Opus and quality reports by 12:41, Sol's by 12:42                                       | about 10 minutes earlier |
| Other runs             | No other delivery record in `docs/analysis/delivery-runs/` reports round 1 started during its gate     | one observation          |

## Acceptance criteria

### S1: The guides say when round 1 starts

**Given** a delivery whose head has passed typecheck, lint and the unit tests, with E2E still
running **When** it is ready for round 1 **Then** `delegation.md` and `validation.md` say
the same thing about whether it starts now, and, if it does, how a gate failure is reviewed
and when its fix is made

## Open questions

- **Q1**: Should round 1 start alongside the full gate?
  - (a) No, as today: round 1 waits for the whole gate. Nothing changes; each delivery keeps
    the wait, about 10 minutes in STY-080.
  - (b) Yes, once typecheck, lint and the unit tests pass. A gate failure counts as a finding
    above P3, so its fix gets a re-check, and it is fixed only after the round's reviewers
    have reported. This saves the wait, adds a re-check whenever the gate fails, and changes
    three files (`delegation.md`, `validation.md`, implement-story step 3's Completion).

## Decisions
