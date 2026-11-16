# CHO-017: The glossary says how the editor shows a horizon

- **Status**: Proposed — a wording for the owner to choose
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-011
- **Suggested model**: Haiku — one glossary entry, with the `domain-modeling` skill
- **Delivered**: _(add on delivery)_

## Summary

`docs/GLOSSARY.md` defines a horizon as "one of a roadmap's three columns", and lists
"Column" under the same entry's _Avoid_. The editor draws no columns: a roadmap's page
stacks its placements as sections, each a grid of item cards, one to three across. An
agent that reads the glossary before the code draws three columns side by side. Done
looks like: the entry says what a horizon is without saying how it is laid out, or says
it as the editor lays it out, and no longer uses a word it tells readers to avoid.

## Measurement

At commit `69ff0d1`: `docs/GLOSSARY.md` line 50 reads "One of a roadmap's three
columns". `src/features/roadmaps/components/roadmap-items.tsx` draws each placement as
a section holding a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` list. Of four agents
who drew a roadmap's page from the repository in one day, one drew Now, Next and Later
as three columns, and one reported it would have, had it not captured the running app
first.

## Acceptance criteria

### S1: The entry does not misdraw the page

**Given** the glossary's entry for Horizon
**When** it is read beside a roadmap's page in the editor
**Then** nothing in the entry describes a layout the page does not have, and the entry
uses none of its own _Avoid_ words

## Decisions

## Out of scope

- How the public site lays out its horizons: that is the separate app.
