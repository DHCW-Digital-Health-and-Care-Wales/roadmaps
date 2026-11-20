# CHO-030: E2E flakes of one kind are found by an audit and a stress run, not one CI failure at a time

- **Status**: Needs grilling — raised on the owner's question after STY-081's retrospective
  (DEF-024); it adds a check and a guide rule, the owner's to accept
- **Type**: Chore
- **Area**: E2E + Docs
- **Epic**: standalone
- **Depends on**: none (DEF-024 fixes `publishOnce`; this chore is the rest of its kind)
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a search over `tests/e2e`, a stress script run, and one
  guide line, once the owner chooses
- **Delivered**: _(add on delivery)_

## Summary

Tests that check focus or state before the UI has settled, or that only fail on a busy
host, have been found and fixed one CI failure at a time: DEF-013 (a dialog's opening
focus), DEF-016 (the item dialog's focus tour), DEF-021 (a header's frame of wrong width),
DEF-022 (page tests on a busy host), CHO-018 (a publish hook test) and now DEF-024
(`publishOnce` returns before the publish notice takes focus). Each costs a failed run, a
retry and a retrospective, and `side-panel.spec.ts:256` (session warning) has flaked twice
with no record. Done: the owner has chosen whether to look for the rest of the kind on
purpose, and the E2E guide and the check say so.

## Measurement

Not measured yet: measuring is the first step. At the delivery's commit, run these and
judge each hit by whether the next assertion can run before the thing it needs has
finished (a notice taking focus, an animation ending, a menu opening):

| Area              | Search or run                                                                                           | How to judge a hit                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Shared helpers    | read each export of `tests/e2e/fixtures/` that triggers a close, publish or navigation                  | it returns before the focus or notice its action causes has arrived        |
| Focus right after | `rg -n -B3 "\.focus\(\)\|toBeFocused" tests/e2e`                                                        | the line before is a click, keypress or helper that moves focus on its own |
| Load              | `playwright test --repeat-each=20 --workers=12` per spec on an 8-core host, as DEF-024's Reproduce does | any failure that `--workers=4` does not show                               |

## Acceptance criteria

### S1: The audit and the stress run have been done once

**Given** the default branch **When** the three searches above are run and each hit judged
**Then** each flake they find is fixed in its helper, or recorded as a defect, and the
Delivery lists what was searched and found

### S2: The E2E guide names the rule

**Given** `tests/e2e/AGENTS.md` **When** an agent writes a helper that closes a dialog or
publishes **Then** it says the helper returns only once the focus or notice its action
causes has arrived

## Open questions

- **Q1**: Is a stress run part of delivering a test change, or a one-off?
  - (a) One-off, with the guide rule (recommended): the audit finds the existing cases and
    the rule stops new helpers adding more.
  - (b) A script (`pnpm test:e2e:stress`) a delivery runs on the specs it touched. It
    catches new cases before CI, and adds a command and minutes to every test change.

## Decisions

## Out of scope

DEF-024's own fix to `publishOnce`, and the CI runner's package mirror (CHO-029).

## Delivery _(add on delivery; as in `story.md`)_
