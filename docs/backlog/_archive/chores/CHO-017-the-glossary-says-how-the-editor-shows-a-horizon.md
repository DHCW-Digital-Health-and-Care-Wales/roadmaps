# CHO-017: The glossary says how the editor shows a horizon

- **Status**: Done — in its PR, awaiting merge
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-011
- **Suggested model**: Haiku — one glossary entry, with the `domain-modeling` skill
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/121

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

- **D1** (owner, 2026-11-16, asked at the start of this delivery): wording (a). The
  entry reads "One of the three groups a roadmap sorts its work into, by how soon it is
  expected", then Now, Next and Later as before; its _Avoid_ line is unchanged. The
  three put to the owner, (a) recommended:
  - (a) ✅ What a horizon is, with no layout. It can't go out of date when the page
    changes; an agent who assumes Now / Next / Later means three columns is not told
    otherwise here.
  - (b) (a), and a sentence in the entry on how a roadmap's page lists its horizons.
    Lost: a layout to keep true in a vocabulary entry, which says nothing of the
    sections drawn the same way.
  - (c) (a), and the page's layout said once under **Roadmap detail**. Lost: it widens
    the chore to a second entry, with the same sentence to keep true.

## Out of scope

- How the public site lays out its horizons: that is the separate app.

## Delivery

### Departures

None.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | Read beside `roadmap-items.tsx` at `53e59b8`, which draws each placement as a heading over a list of item cards: the entry (`docs/GLOSSARY.md`, **Horizon**) names no layout, and has "column", "lane", "quarter" and "phase" only in its _Avoid_ line. The sweep of the live tree for other places that call a horizon a column found none: every other hit is the worksheet's `Horizon` column or the columns of a card grid |
