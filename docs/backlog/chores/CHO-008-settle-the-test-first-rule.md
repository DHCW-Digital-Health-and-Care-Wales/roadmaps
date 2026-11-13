# CHO-008: Deliveries follow a test-first rule they can keep

- **Status**: Needs grilling — the owner decides whether to enforce, relax or keep the
  test-first rule
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — an edit to one skill step once the owner has decided
- **Delivered**: _(add on delivery)_

## Summary

implement-story step 3 asks for each behaviour's test to go red before the code that
passes it, and for any other order to be reported as a departure. Deliveries report the
departure, but it recurs: about a dozen stories wrote some unit, component or page tests
after the code, often showing afterwards that the tests discriminate. The rule is being
reported rather than kept, so the owner decides what it should be. Done: the step states
the rule the owner chose, and later deliveries keep it or report a departure from that
rule.

## Measurement

At commit `8a22019`, the Delivery sections of these archived stories record tests written
after the code: STY-014, STY-015, STY-016, STY-017, STY-018, STY-020, STY-021, STY-027,
STY-030, STY-032, STY-035 and STY-036. The search was
`rg -n -i "written after|after the code|test-first|red first|TDD" docs/backlog/_archive`;
a hit counts when it reports a behaviour test written after its code. STY-018's hits are
Playwright specs, which step 3 already allows to follow working code.

## Acceptance criteria

### S1: The step states the chosen rule

implement-story step 3 states the rule the owner chose, in one place.

## Open questions

- Enforce: should reviewers treat a missing red-first commit as a finding, or a
  check require one?
- Relax: should some kinds of change (layout, copy, review fixes) be allowed tests after
  the code, so long as they are shown to discriminate?
- Keep: is reporting the departure enough?

## Decisions
