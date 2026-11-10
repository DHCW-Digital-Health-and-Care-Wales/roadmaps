# Epic template

- **File**: `docs/backlog/{epic}/README.md`, where `{epic}` is
  `EPC-{nnn}-{kebab-title}` (IDs as in `story.md`); its live stories beside it
  (`STY-{nnn}-{kebab-title}.md`), terminal ones in `docs/backlog/_archive/{epic}/`.
  When every row is terminal the epic's `README.md` moves to `_archive/{epic}/`
  too, and its row in `docs/backlog/README.md` points there.
- **Readers**: the owner reads the top block (to `## Owner decisions
waiting`). Agents read the rest: selection and orchestration read Stories
  and Sequencing; implementers read Design and Contracts; grilling reads
  Findings and Design.
- **An epic is an assessment before it is a plan**, and it is the home of
  what its stories share: assumptions, cross-story contracts, invariants.
  A story never restates them.
- **An epic is not a log.** Owner answers go to the owning story's Decisions;
  a design choice from an analysis goes to the analysis's _Outcome_; the epic
  links them. Delivery evidence stays in the stories.
- Keep it current: a terminal story is marked in the table in the same PR
  that archives it; a finding the work proved wrong is corrected.
- An epic in delivery may keep `delivery-notes.md` beside its `README.md`
  (see `docs/AGENTS.md`).

---

# EPC-{nnn}: <name> — <the tension, in a phrase>

- **Status**: Active | Done | Won't do — <one line>
- **Progress**: <n> of <m> terminal; next selectable: STY-{nnn}; blocked on:
  <owner decision or prerequisite>
- **Binding ADRs**: ADR-{nnn}, ADR-{nnn}

## Summary

_Five to ten lines for the owner: what is right and stays, what is wrong,
what the epic changes for the user, and what it deliberately leaves._

## Owner decisions waiting

_Every open owner question across the epic and its records, one line each,
linking the record that holds the options. "None." when empty. This is the
orchestrator's stop list._

- [STY-{nnn} Q2](STY-{nnn}-x.md#open-questions) — <question in a clause>
- [DEF-{nnn}](../defects/DEF-{nnn}-x.md) — Needs triage

## Findings

_Audited at `<sha>` on <date>. Open with a table of the screens or flows where
there is one. Each finding: the symbol or count that makes it true and the
search that reproduces it, scoped as the claim is; what it costs; its
counter-argument when it is a judgement call. Greenfield: say so and name the
precedent instead._

### F1 — <the problem in one line>

## Design

_Numbered points, each resolving a finding (cite it), then the invariants
that deliberately do not change. These bind every story._

1. <point> (F1)
2. **Unchanged:** <invariant>

## Shared assumptions and contracts

_What every story in the epic takes as settled: the layer a change lands in,
a cross-story contract on `Roadmap`, `AppError` or `AuthClient`, copy and
catalogue ownership. A story cites the item rather than copying it. Use stable
`###` headings: other records link to them._

## Stories

| ID        | Story                                        | Area        | Depends on | State      |
| --------- | -------------------------------------------- | ----------- | ---------- | ---------- |
| STY-{nnn} | [<title>](STY-{nnn}-x.md)                    | Domain      | —          |            |
| STY-{nnn} | [<title>](../_archive/{epic}/STY-{nnn}-x.md) | Features/UI | STY-{nnn}  | ✅         |
| STY-{nnn} | [<title>](../_archive/{epic}/STY-{nnn}-y.md) | Features/UI | —          | ✗ Won't do |

_State is blank for live rows, ✅ for Done, `✗ Won't do` / `✗ Superseded by
STY-{nnn}` for the others. A story's own `Depends on` is canonical; this column
mirrors its hard dependencies. Size each story for one agent in one context;
the Suggested model is in each record, not repeated here._

## Sequencing

_Hard prerequisites, preferred order, what runs in parallel, cross-epic
dependencies, and the story that must stay one change. A `mermaid` flowchart
when the graph branches wider than prose carries._

## Out of scope

_The adjacent work a reader will expect, the reason it is not here, and the
condition that would bring it back._

## Defects

_Links only, grouped by the defect's Status token; each record holds its own
triage decision._

## Related

_Analyses (with their Outcome), other epics, ADRs, guides._
