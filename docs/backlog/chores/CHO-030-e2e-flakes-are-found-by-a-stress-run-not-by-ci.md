# CHO-030: E2E flakes of one kind are found by an audit and a stress run, not one CI failure at a time

- **Status**: Needs grilling — raised on the owner's question after STY-081's retrospective
  (DEF-024); it adds a guide rule and, if the owner chooses (Q1 b), a stress script
- **Type**: Chore
- **Area**: E2E + Docs
- **Epic**: standalone
- **Depends on**: none; DEF-024 (Needs triage) fixes `publishOnce` first, and until it
  does the audit counts that flake as known
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a search over `tests/e2e`, a stress script run, and one
  guide line, once the owner chooses
- **Delivered**: _(add on delivery)_

## Summary

E2E tests that act before the UI has settled have been found one CI failure at a time.
Two are confirmed: DEF-016 (the item dialog's focus tour counted a focus guard, found in
local runs) and DEF-024 (`publishOnce` returns before the publish notice takes focus;
cause suspected, not proven). The same kind has shown in component tests (DEF-013 a
dialog's opening focus; DEF-022 and CHO-018 under load or a clock tick, neither seen in CI)
and `side-panel.spec.ts:256` (session warning) was seen to flake twice in CI, with no
record. DEF-021 was a real layout defect, not a test. Each flake costs a failed run, a
retry and a retrospective. Done: the owner has chosen whether to look for the rest of the
E2E kind on purpose, and the E2E guide says how a helper must settle. Component tests are
out of scope here (Out of scope).

## Measurement

Not measured yet: measuring is the first step. At the delivery's commit, run these and
judge each hit by whether the next assertion can run before the thing it needs has
finished (a notice taking focus, an animation ending, a menu opening):

| Area              | Search or run                                                                                                                                                                                    | How to judge a hit                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Shared helpers    | read each export of `tests/e2e/fixtures/` that triggers a close, publish or navigation                                                                                                           | it returns before the focus or notice its action causes has arrived        |
| Focus right after | `rg -n -B3 -e '\.focus\(\)' -e toBeFocused tests/e2e`                                                                                                                                            | the line before is a click, keypress or helper that moves focus on its own |
| Load              | `./node_modules/.bin/playwright test <spec> --repeat-each=20 --workers=12` per spec on an 8-core host (DEF-024's Reproduce used 40 repeats of one case); about 47 specs, so time it on one first | any failure that `--workers=4` does not show                               |

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

DEF-024's own fix to `publishOnce`, the CI runner's package mirror (CHO-029), and Vitest
component tests (DEF-013, DEF-022, CHO-018 were their own cases).

## Delivery _(add on delivery; as in `story.md`)_
