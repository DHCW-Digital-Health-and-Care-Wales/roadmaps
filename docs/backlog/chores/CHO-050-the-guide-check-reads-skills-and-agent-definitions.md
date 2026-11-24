# CHO-050: The guide check reads skills and agent definitions

- **Status**: Proposed — from STY-101's retrospective
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
file: an `AGENTS.md` or `CLAUDE.md`, any file under `.agents/skills/` or
`.claude/agents/`, and the conventions file the app guides point to. The check that
enforces it, `build/agent-guides.test.ts` (_cites no backlog record IDs_), reads only
files named `AGENTS.md`, so a citation in a skill is caught by a reviewer or not at
all. Done: the check reads every guide file, the lines it finds cite their ADR or
state the rule, and a deliberate example of a record ID is exempt by a rule a reader
can see.

## Measurement

At commit `9bf6fbb2` plus the STY-101 retrospective's corrections, the check's pattern
over `.agents/`, `.claude/` and `apps/typescript-react-conventions.md` finds four
lines:

| Line                                                            | Hit                                                       | Verdict                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `.agents/skills/copywriter/references/patterns.md:371`          | `(DEF-015)`, the pattern's origin                         | Provenance: drop it                                                       |
| `.agents/skills/threat-review/SKILL.md:55`, `:138`              | `EPC-023`, where infrastructure controls will be recorded | Owner's call: name the controls' future home another way, or exempt epics |
| `.agents/skills/implement-story/references/pull-requests.md:21` | `STY-010` in an example PR title                          | Exempt: an example of the format                                          |

The STY-101 retrospective's corrections removed two more of the same kind
(`copywriter/SKILL.md`, `apps/typescript-react-conventions.md`); nothing failed on
them, which is what the chore would change.

## Acceptance criteria

### S1: A record ID in a skill or agent definition fails the check

A record ID added to a file under `.agents/skills/` or `.claude/agents/`, or to
`apps/typescript-react-conventions.md`, fails `pnpm repo:test` naming the file.

### S2: An example of the format stays

The example PR title in `pull-requests.md` passes, by an exemption the test states.

## Decisions
