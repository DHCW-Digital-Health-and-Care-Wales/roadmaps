# CHO-023: A layout question can be prototyped in the app's own code

- **Status**: Needs grilling — raised by STY-065's retrospective from one delivery; the
  owner has not asked for it
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a skill edit, read against `writing-for-agents`
- **Delivered**: _(add on delivery)_

## Summary

The `ux-prototypes` skill offers two shapes, static frames and a working component, and
ends in an analysis and a PR. For STY-065 the owner asked for one prototype and
screenshots to iterate on, so it was built in the app's own code instead, captured with
Google faked at 375px, 820px and 1280px, and never drawn as frames. The owner settled
it in three rounds of screenshots, and the delivery started from that code. The frames
route had drawn the same area a day earlier (design G, four critique rounds); built, the
owner called the result a jumble. One delivery is thin evidence, so this asks whether
the skill should offer the shape, and when.

## Measurement

At commit `1af519f`, from the STY-065 session of 2026-11-18:

| Area                                | Measurement                                                               | Verdict                      |
| ----------------------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| Prototype in the app's code         | first screenshots within half an hour; three owner rounds; one PR, merged | settled the layout           |
| Frames for the same area (EPC-013)  | seven designs over four critique rounds, then three stories               | built, the owner reopened it |
| What the code prototype left undone | every unit and E2E test of the old header: 128 unit and 69 E2E failures   | paid in the delivery         |

## Acceptance criteria

### S1: The skill says when a prototype is built in the app's code

**Given** an owner's question about where things sit on an existing screen
**When** an agent reads `ux-prototypes`
**Then** it can tell whether to draw frames or to change the screen's own code and
capture it, and what that prototype must not be mistaken for: it is uncommitted, its
tests are not updated, and a record and a delivery still follow

## Open questions

- **Q1**: Should `ux-prototypes` offer a third shape, a prototype in the app's own code?
  For example, an owner asks to tidy one screen and wants screenshots, not a comparison
  of three designs.
  - (a) Yes, for one design of an existing screen (recommended) — the skill today sends
    that request to frames and an analysis; this adds a short path: change the screen's
    code uncommitted, capture it at the three widths, iterate, then write the record.
  - (b) No, keep frames as the only way to show a screen — nothing changes; an agent
    asked for screenshots departs from the skill, as STY-065's did.
  - (c) Only on the owner's explicit request — the skill names the shape but never
    chooses it itself.

## Decisions

None yet.
