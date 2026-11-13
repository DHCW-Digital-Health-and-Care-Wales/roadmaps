# CHO-003: "Make it match" refuses a change to the row's own copied cells

- **Status**: Proposed — found delivering STY-030; the owner may want to pay the cost
- **Type**: Refactor
- **Area**: Domain + Infrastructure
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-013, ADR-012
- **Suggested model**: Sonnet — a field on `Roadmap` and its parser
- **Delivered**: _(add on delivery)_

## Summary

STY-030 S4 says "Make it match" writes nothing if the row's copied cells changed since
the page loaded. A `Roadmap` carries the lists' values (what is shown), not the row's own
`Family`, `Family (cy)`, `Colour` and `Category` cells, so a co-lead's edit to one of them
that leaves the row out of step is not seen, and "Make it match" overwrites it with the
list's value. Done looks like: `Roadmap` carries the row's own copied cells, the plan
compares them, and the contract and adapter tests cover it.

## Measurement

At commit `7f8d9e0`: `planListMatch` compares the family and category as shown, and
whether the roadmap is published. A scratch test through the real parser (Sol's review of
STY-030) showed two rows with different copied `Colour` cells give equal `Roadmap`s.
Cost: a new field on `Roadmap`, which every fixture and `toStrictEqual` contract
comparison carries.

## Acceptance criteria

### S1: A change to a copied cell refuses the write

**Given** a roadmap flagged out of step whose `Colour` cell reads `#325083`
**When** a co-lead changes it to `#ff0000` and the Product Lead chooses "Make it match"
**Then** nothing is written and the roadmap is shown as it now is

## Decisions

## Out of scope

- Any change to what the editor writes.
