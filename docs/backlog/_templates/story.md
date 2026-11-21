# Story template

- **File**: `docs/backlog/{epic}/STY-{nnn}-{kebab-title}.md`, beside its epic's
  `README.md`. A story always belongs to an epic; a single story is a
  one-story epic. On a terminal status (Done, Won't do, Superseded) move it to
  `docs/backlog/_archive/{epic}/`.
- **ID**: `STY-{nnn}` story, `DEF-{nnn}` defect (`defect.md`), `CHO-{nnn}` chore
  (`chore.md`), `EPC-{nnn}` epic (`epic.md`): three digits, one series per
  prefix across the whole backlog. Scenarios (`S1`) and decisions (`D1`) are
  numbered within their record, so they never look like a record ID.
  Take the next free number across the live tree, `_archive/` and open PRs'
  files, since a PR's title may not name its records:
  `gh pr list --state open --limit 200 --json files --jq '.[].files[].path'`.
  Never reuse an ID or delete a record.
- **Readers**: the owner reads only the top block, and selection reads it for
  every candidate story. It holds the fixed metadata fields, one line each
  (Status is a token plus a note of at most one sentence, about 25 words), then
  a Summary of at most about 100 words, and nothing else before Acceptance
  criteria. Everything below is for agents: grilling, selection,
  implementation, review, the next story and the retro.
- **Write only what the code cannot tell the next agent.** Requirements,
  owner decisions, departures and the contract a dependent relies on cannot be
  inferred. A plan, a file inventory or a restated guide can, and goes stale:
  leave it out. Area guides (`AGENTS.md` along the changed paths) are found by
  the directory ancestry, not listed here.
- **Never rewrite the claim.** Acceptance criteria keep their wording; a
  change of mind is a Decisions entry that names the scenario it changes, and
  a build that differs is a Departures entry.
- **Statuses**: see `status-lifecycle.md`. The first word of Status is a
  fixed token; anything after the em dash is a one-line note.
- **A Placeholder** has the top block, then `## Why this is a placeholder`
  (the decision or trigger that promotes it) and `## Rough shape of the work`,
  labelled as not acceptance criteria.
- **A legacy record** (the bootstrap stories in `_archive/EPC-001-bootstrap/`) keeps
  its Goal, Scope, Tests, Acceptance criteria, Decisions and review notes; read
  Scope and Acceptance criteria as the claim, and Decisions and review notes as
  Decisions plus Delivery.

Italics are instructions; delete them as you fill each section. Omit a section
marked _(optional)_ when it would be empty.

---

# STY-{nnn}: <the outcome, in the reader's language>

- **Status**: Proposed — <one line: what is left, who decided what, or what
  promotes it>
- **Type**: Feature | Refactor | Copy | Docs (`+` to combine)
- **Area**: Domain | Infrastructure | Features/UI | Routing | i18n (en + cy) |
  E2E | CI/CD | API | Docs (`+` to combine)
- **Epic**: <epic folder, e.g. EPC-002-roadmap-detail>
- **Depends on**: STY-{nnn} (hard, must be on the default branch), STY-{nnn}
  (preferred order) | none
- **Binding ADRs**: ADR-{nnn} §<section>, ADR-{nnn} | none
- **Suggested model**: Opus | Sonnet | Haiku — <the reason, in a clause>
- **Delivered**: <PR URL>
  _(add on delivery)_

## Summary

_At most about 100 words the owner can read cold: what the user gets and why
now; the one thing that is deliberately not in it; any decision still waiting
on the owner. No file names._

## Scope _(optional)_

_The boundary in behaviour and layers, a few lines: what the story builds and
which layers it touches (`domain/`, `infrastructure/`, `features/`, `routes/`,
`i18n/`). Not a file list._

## Acceptance criteria

_One scenario per observable behaviour, numbered S1, S2… and never renumbered.
Cover refusal, loading, empty, error and expired-session states and Welsh
where they exist. A scenario added by an owner decision carries its source in
the heading._

### S1: <what it proves>

**Given** <the state that matters>
**When** <the single action>
**Then** <what the user or caller observes>
**And** <further consequence, or what stays unchanged>

## Tests _(optional)_

_Only when the level matters: which scenarios need a component test, an MSW
integration test or Playwright against the fake GIS and Sheets, and why a
lower level would not hold them. Evidence goes in Delivery._

## Open questions _(while Needs grilling; delete once answered)_

_One entry per decision only the owner can make, in the grilling skill's
shape so an agent can put it straight to the owner: the question, a short
example of who sees what, then 2 to 4 options, recommended first, each saying
what the build does now and what choosing it adds, removes or moves._

- **Q1**: <question>
  - (a) <option> (recommended) — <consequence>
  - (b) <option> — <consequence>

## Decisions

_The record of every answer that shaped this story, newest last. One entry
each, at most five lines. Owner decisions cite their source (grilling round
and question, PR comment, analysis). Agent decisions are only the ones a
reviewer or the next story would otherwise re-open, with the alternative
rejected. Assumptions shared by the epic live in the epic._

- **D1** (owner, 2026-11-10, grilling Q1): <question in a clause> →
  <answer>. Changes: S4, adds S9. <Where the work went, if moved.>
- **D2** (agent, 2026-11-10): <choice> over <alternative>, because <reason>.

## Starting point _(optional)_

_Only facts that took investigation and that the implementer would otherwise
re-derive wrongly: a hidden caller, a contract that looks different from what
it is, a measurement. Name the commit (`audited at abc1234`). Do not list
entry points an `rg` finds. A guess about what the real Google does is an Open
question for the owner, since delivery has only the fakes: check it by hand on
a test spreadsheet (`docs/operations/google-cloud-setup.md`) and record the
result here, or accept a build that holds either way and a chore for the
check._

## Out of scope _(optional)_

_What a reader would expect here and will not find, each with where it lives
(record ID) or the condition that would bring it in._

## Delivery _(add on delivery)_

_Written by the delivering agent before the PR is reviewed; read by the
reviewer, the next story and the retro. Verification commands and counts
belong in the PR, not here. A gotcha the epic's next story will hit goes in its
`delivery-notes.md` (`docs/AGENTS.md`)._

### Departures

_Every place the build differs from a scenario or a Decision: the scenario,
what was built instead, why, and who agreed (owner with source, or agent for
routine name or path drift). Write "None." when there are none._

### Contract for dependents

_What a later story, defect or ADR will build on and cannot read off the
diff quickly: hook and component props, `AppError` kinds handled, catalogue
keys added, E2E hooks (accessible names), an interim state left on purpose and
the record that resolves it, callers deliberately left for a named record.
Omit when the change has no dependents._

### Scenario evidence

| Scenario | Held by                                    |
| -------- | ------------------------------------------ |
| S1, S3   | `path/to/file.test.tsx` (`test name`)      |
| S7       | `tests/e2e/roadmaps.spec.ts` (`test name`) |
| S9       | observed run: <what was run and seen>      |
