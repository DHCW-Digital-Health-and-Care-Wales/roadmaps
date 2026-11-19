# STY-074: The same motion when adding, removing and discarding items

- **Status**: Needs grilling — an idea the owner recorded on 2026-11-19, to judge once
  STY-072's slide is in use
- **Type**: Feature
- **Area**: Features/UI
- **Epic**: [EPC-018-seeing-where-a-moved-item-went](README.md)
- **Depends on**: STY-072 (hard: its transition)
- **Binding ADRs**: ADR-002, ADR-010
- **Suggested model**: Sonnet — STY-072's transition, from more controls

## Summary

STY-072 makes a moved item travel. The same transition could show an item added
easing in where it lands, a removed item leaving and the others closing up, "Discard
all" putting every item back, and a compact row opening. Whether any of these is worth
the motion is for the owner, once the slide has been seen in use.

## Open questions

- **Q1**: Which of these take the motion? Example: Sam removes a new item; today the
  others close up at once, with it they glide up.
  - (a) None, until Product Leads ask (recommended) — closes this record as Won't do.
  - (b) Removing and "Discard all" — the two that move several items at once.
  - (c) All four — every change to the items area moves.

## Decisions

- **D1** (owner, 2026-11-19, grilling round 4 Q4): recorded as one idea, not
  committed work.
