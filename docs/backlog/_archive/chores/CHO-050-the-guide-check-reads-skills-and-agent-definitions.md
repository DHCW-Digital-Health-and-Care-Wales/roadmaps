# CHO-050: The guide check reads skills and agent definitions

- **Status**: Done
- **Type**: Chore
- **Area**: Docs + CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one test's file list, three lines reworded and an
  exemption for an example
- **Delivered**: _(add on delivery)_

## Summary

`docs/operations/authoring-agent-instructions.md` bars record IDs from every guide
file: an `AGENTS.md` or `CLAUDE.md`, and any file under `.agents/skills/` or
`.claude/agents/`; by extension the bar covers `apps/typescript-react-conventions.md`,
which the app guides tell every agent to follow. The check that enforces it,
`build/agent-guides.test.ts` (_cites no backlog record IDs_), reads only files named
`AGENTS.md`, so a citation in a skill is caught by a reviewer or not at all. Done: the check reads every guide file, the lines it finds cite their ADR or
state the rule, and a deliberate example of a record ID is exempt by a rule a reader
can see.

## Measurement

At commit `9bf6fbb2`, the check's pattern over `.agents/`, `.claude/` and
`apps/typescript-react-conventions.md` finds six lines. The STY-101 retrospective
corrects two italic citations of an ADR's amendment section, in
`.agents/skills/copywriter/SKILL.md` and `apps/typescript-react-conventions.md`, on
which nothing failed. The rest:

| Line                                                            | Hit                                                       | Verdict                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `.agents/skills/copywriter/references/patterns.md:371`          | `(DEF-015)`, the pattern's origin                         | Provenance: drop it                                                       |
| `.agents/skills/threat-review/SKILL.md:55`, `:138`              | `EPC-023`, where infrastructure controls will be recorded | Owner's call: name the controls' future home another way, or exempt epics |
| `.agents/skills/implement-story/references/pull-requests.md:21` | `STY-010` in an example PR title                          | Exempt: an example of the format                                          |

S1 extends the policy's stated scope to the conventions file; the delivery adds it to
the policy's list too.

## Acceptance criteria

### S1: A record ID in a skill or agent definition fails the check

A record ID added to a file under `.agents/skills/` or `.claude/agents/`, or to
`apps/typescript-react-conventions.md`, fails `pnpm repo:test` naming the file.

### S2: An example of the format stays

The example PR title in `pull-requests.md` passes, by an exemption the test states.

## Decisions

- **D1** (owner, 2026-11-24, delivery thread, on EPC-023 in the threat-review skill):
  "Epics shouldn't appear in SKILLS etc." → name the controls' future home another way;
  epics are not exempt. Changes: the threat-review fix of the Measurement's verdict.
- **D2** (agent, 2026-11-24): the example exemption is a per-file list of the IDs a file
  may show (`FORMAT_EXAMPLES`), over a marker comment in the guide or a whole-file
  exemption, so a reader sees it beside the pattern and a second ID in the same file still
  fails. A test fails when the example goes, so the list cannot outlive it.
- **D3** (agent, 2026-11-24): the check reads every file under `.agents/skills/` and
  `.claude/agents/` except images, as the policy says "any file", and a `CLAUDE.md` beside
  a guide, over only Markdown, so a script or a config added there is covered too.

## Delivery

### Departures

- The Measurement counted six lines at `9bf6fbb2`; two were the italic citations
  `c8e70325` (#296) corrected. Re-measured at `c8e70325` with the check's own pattern:
  four lines, the three rows of the table below it. Agent, routine drift.
- The EPC-023 rows read "name the controls' future home another way"; the skill now says
  "the protections they leave to the infrastructure" (ADR-018 to ADR-020 name them) at the
  first line and drops the ID at the second (D1).

### Contract for dependents

A new guide file under `.agents/skills/` or `.claude/agents/`, or a record ID in one,
fails `pnpm repo:test` naming the file. A deliberate example of the ID format goes in
`FORMAT_EXAMPLES` in `build/agent-guides.test.ts`. The policy's list names
`apps/typescript-react-conventions.md`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `build/agent-guides.test.ts` (_reads the guide file %s_ for a skill, a reference, an agent definition and the conventions file; _cites no backlog record IDs_). Observed red before the fixes: it failed on `patterns.md` and `threat-review/SKILL.md`, naming each; the directory list cut to `.agents/skills` fails the agent-definition case |
| S2       | `build/agent-guides.test.ts` (_cites no backlog record IDs_ passes `pull-requests.md` by `FORMAT_EXAMPLES`; _still shows its format example_ fails if the example goes; the example's ID changed fails both)                                                                                                                                    |
