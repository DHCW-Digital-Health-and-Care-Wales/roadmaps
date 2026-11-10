# Documentation

Requirements, analyses, decisions and runbooks live here; rules about code
live in the `AGENTS.md` beside that code. Never start a backlog, chore list,
spec or plan outside `docs/`.

## Layout

| Path                  | What goes in it                                                              |
| --------------------- | ---------------------------------------------------------------------------- |
| `GLOSSARY.md`         | The domain vocabulary (`.agents/skills/domain-modeling/GLOSSARY-FORMAT.md`)  |
| `adr/`                | One decision per `NNNN-kebab-title.md`, indexed in `adr/README.md`           |
| `backlog/README.md`   | The index: epics with status, then standalone chores and defects             |
| `backlog/<epic>/`     | An epic's `README.md` and its live stories `S<nn>-<kebab-title>.md`          |
| `backlog/chores/`     | Live chores `C<nn>-…`: work with no user-facing change                       |
| `backlog/defects/`    | Live defects `D<nn>-…`                                                       |
| `backlog/_archive/`   | Terminal records, mirroring the live tree (`<epic>/`, `chores/`, `defects/`) |
| `backlog/_templates/` | Templates for every record type, and the status lifecycle                    |
| `analysis/`           | Investigations written to reach a decision; `delivery-runs/` has run notes   |
| `operations/`         | Runbooks and authoring policy for what a person or agent does by hand        |

Put nothing else in the root of `docs/`. IDs are one series per prefix across
the whole backlog: take the next free number across the live tree, `_archive/`
and open PRs' files
(`gh pr list --state open --limit 200 --json files --jq '.[].files[].path'`).

## Stories, chores, defects and epics

- Start from the template for the record's type in `docs/backlog/_templates/`.
  With `status-lifecycle.md` they own the file naming, metadata, section order
  and lifecycle, including what Done means and that a record is never rewritten
  or deleted. Keep the section order, so an agent can reach a section without
  reading the whole file.
- A record in a terminal status (Done, Won't fix, Won't do, Superseded) moves to
  `_archive/` in the same change that sets it, and its row in the epic or index
  is marked, not deleted. An epic whose rows are all terminal moves too.
- A record that departs from its claim says so in Delivery; an owner's change
  of mind is a Decisions entry. Never reword the Acceptance criteria.
- After any record change (an owner's answer, a moved obligation, a new or
  edited scenario), `grep` its IDs and terms across the epic, stories,
  analyses and glossary, and fix every statement it makes false, including a
  claim that a field or stored state exists without naming the record that
  provides it. Search the status words as well, with their inflections
  (`rg -n -i 'undecided|no selection|still open|stay(s)? open|remain(s)? open|wait(s)? for|awaiting|unselected|not selected|not yet' docs`,
  leaving `_archive/` alone; triage the hits), since a decision leaves
  "waits for" and "undecided" claims in intros and gate paragraphs. An answer
  that changes another record's contract goes into that record's Decisions,
  not only the one it was raised in.
- A defect found while delivering anything is recorded in its own file in
  `backlog/defects/` with Status `Needs triage`, listed under Defects in
  `backlog/README.md` (and in its epic's `## Defects`, if it belongs to one).
  Where the right outcome is a product choice rather than a fault against a
  written scenario, its Open questions say so. The owner triages it before
  anyone works on it.
- A finding a delivery declines to fix, where the owner may later pay the cost,
  becomes a chore with Status `Proposed`. An improvement idea nobody has
  accepted becomes a record with Status `Needs grilling`.
- An epic in delivery may keep `delivery-notes.md` beside its `README.md` for
  rules and gotchas that hold only until it is delivered. It moves to
  `_archive/` with the epic; a note that proves repo-wide moves to its guide
  or code site.
- The bootstrap stories in `_archive/bootstrap/` predate the templates and keep
  their legacy format.

## Analyses

An analysis decides nothing. It ends with options, a recommendation and a
_Decisions needed_ table; the decisions go to an ADR or a story, and the
analysis gains an _Outcome_ section saying where. A delivery run summary under
`analysis/delivery-runs/` follows that folder's `_template.md` instead.

## ADRs

- Follow `.agents/skills/domain-modeling/ADR-FORMAT.md` for an ADR's naming,
  shape, status lifecycle, supersession, in-place amendment and when a
  Proposed one may be built on.
- Record an ADR as Accepted only on the owner's word: match each decision to an
  answer the owner gave, or to a question the owner explicitly left to the
  agent, and write the ADR from those answers only. Ask the owner about the
  rest.
