# CHO-048: The story template and two review skills weigh code about code

- **Status**: Done
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — three short edits, written with the `writing-for-agents`
  skill
- **Delivered**: _(add on delivery)_

## Summary

STY-090 delivered more tests and hand-written guards than its product code needed, and
no rule spoke where each choice was made: its criteria required standing tests of a
third-party linter, its middleware rebuilt a body limit the framework ships, and its log
rule was decided without weighing what an operator could no longer diagnose. Done: the
story template and two review skills each gain or sharpen one rule, so the next
grilling and the next review ask the question. The root `AGENTS.md` does not change.

## Measurement

At commit `17bcb6e8`:

| Area                    | Measurement                                                                         | Verdict                                    |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| Criteria                | STY-090 S8 required planted-violation tests of import-linter; four were written     | No rule applies while criteria are written |
| Review of a dependency  | `BodyLimit` (44 lines and its branch tests) beside Starlette's own body limit       | No review lens names a rebuilt dependency  |
| Review of a control     | STY-090 D30 dropped every exception message; its record names no operating cost     | Proportionality counts only a build's cost |
| Rules that already hold | quality-review's _Meta code_, threat-review's filter, a finding's realistic trigger | Left as they are                           |

Each gap recurs: every API story writes criteria for a configured tool, adds middleware
or takes a security finding.

## Acceptance criteria

### S1: A story's criteria prove a configured tool once

**Given** `docs/backlog/_templates/story.md`
**When** an agent writes a scenario that a tool the repository only configures (a
linter's contract, say) fails a violation
**Then** the template tells it to hold the tool's own behaviour by one observed run of a
planted violation, recorded in Scenario evidence, and to keep a standing test for a
check the repository wrote and for the repository's wiring of a control an ADR relies
on (STY-101 D16)

### S2: A rebuilt dependency is a quality finding

**Given** the `quality-review` skill
**When** a change hand-writes what an installed dependency provides
**Then** the skill names it a finding unless the site states what the dependency cannot
do, and its _Meta code_ bullet also names a standing test of a tool the repository did
not write, the wiring of a control an ADR relies on excepted (STY-101 D16)

### S3: A control's operating cost counts

**Given** the `threat-review` skill's _Proportionality_ lens
**When** a reviewer weighs a control or proposes a fix
**Then** its cost includes the code the repository must then own and what an operator
can no longer see or diagnose, not only the cost of building it (STY-101 D16)

### S4: Each edit follows the authoring policy

**Given** the three edits
**When** they are read against `docs/operations/authoring-agent-instructions.md`
**Then** each replaces or sharpens an existing line or the PR says why its file grows,
none cites a record ID or an incident, and the root `AGENTS.md` is unchanged

## Decisions

- **D1** (owner, 2026-11-24, STY-101 grilling round 2): the three edits are made, in a
  chore of their own delivered before STY-101, over a scenario of STY-101 or its
  retrospective, so the grillings of STY-091 to STY-093 and STY-100's delivery run
  under them.
- **D2** (agent, 2026-11-24): no ratio or line-count gate and no root `AGENTS.md` line,
  since each rule governs one workflow and a gate on proportions is more code about
  code.
- **D3** (agent, 2026-11-24, security review): a tool's own behaviour is proved once,
  but the repository's wiring of a control an ADR relies on (which hosts, which limit,
  which order) keeps its standing test, so the new rule retires no test of a guard.
  Changes S1, S2.

## Out of scope

- STY-090's own instances, which STY-101 removes.

## Delivery

### Departures

None.

### Contract for dependents

STY-101's criteria and review, and the grillings of STY-091 to STY-093, run under the
three rules: the story template's _Acceptance criteria_ note (S1), `quality-review`'s
_Reimplementation_ and _Meta code_ bullets (S2) and `threat-review`'s _Proportionality_
lens (S3). The template note and the _Meta code_ bullet keep the wiring of an ADR's
control under a standing test (D3).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `docs/backlog/_templates/story.md`: one sentence in the _Acceptance criteria_ note, with the D3 exception (observed read of the diff)                                                                                         |
| S2       | `.agents/skills/quality-review/SKILL.md`: a clause each in _Reimplementation_ and _Meta code_ (observed read of the diff)                                                                                                     |
| S3       | `.agents/skills/threat-review/SKILL.md`: the _Proportionality_ lens counts owned code and lost diagnosability (observed read of the diff)                                                                                     |
| S4       | the diff's three guide files each sharpen an existing line or bullet, the story template's note by one sentence (the PR says why it grows); no record ID or incident in the guide text; root `AGENTS.md` absent from the diff |
