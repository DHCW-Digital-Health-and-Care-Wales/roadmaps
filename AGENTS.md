# AGENTS.md — DHCW Roadmaps

Rules for every agent in this repository. Then read `docs/GLOSSARY.md` for domain
terms, the ADRs in `docs/adr/` that bind the area you change, and the `AGENTS.md`
along the directory ancestry of each path you change and of its affected callers and
tests.

## What this is

One pnpm workspace (ADR-016) for Digital Health and Care Wales (DHCW), used only by DHCW
staff. **Product Leads** manage the **public roadmaps** of the products they lead in the
Roadmap Editor. A **separate app, the public site**, reads the same shared data source
and shows the roadmaps to the public, so what a Product Lead publishes goes public
through it. The data source's format is a contract with the public site: any change to
what is written, or how, is stated in its record and its PR (README, _What the editor
writes_).

| Area                          | Its guide                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `apps/editor/`                | `apps/editor/AGENTS.md`, every TypeScript and React convention included              |
| `docs/`                       | `docs/AGENTS.md`                                                                     |
| `.agents/skills/`, `.claude/` | The `writing-for-agents` skill and `docs/operations/authoring-agent-instructions.md` |
| Anything else                 | This file                                                                            |

## Commands

- Run the workspace's scripts from the root: a script for one app carries its prefix
  (`pnpm editor:dev`), and `lint`, `typecheck`, `test`, `build`, `format:check` and
  `test:docs` run across the workspace. Each app's guide gives its preconditions.
- Before a PR, run the checks implement-story's `references/validation.md` sets
  for the kind of change.
- In a shared checkout, or a scratch directory whose `node_modules` links to it, run
  binaries from the `node_modules/.bin/` of the package that declares them (the editor's
  in `apps/editor/`): `pnpm exec` there can reinstall and prune the shared `node_modules`.
- Stop a process by its PID or port (`fuser -k <port>/tcp`), never by a name pattern:
  worktrees share one host, and a pattern kill stops their servers too.

## Working conventions

- A `CLAUDE.md` beside each guide only imports it (`@AGENTS.md`); add one with each
  new nested guide.
- Use the existing isolated checkout and preserve unrelated work; create a worktree
  only when asked.
- Within a task's scope, prefer the cleaner structure (refactor, rename, extract) over
  the smallest diff. Leave each touched file tidier, in proportion; record any other
  actionable finding in the backlog (`docs/AGENTS.md`), since a PR note is not a record.

## Delivery

- Deliver a story, defect or chore with the `implement-story` skill, several with
  `orchestrate`; any other change that ends in a PR follows implement-story's steps 3–6.
  Read its `references/delegation.md` before delegating any work; it sets the review
  lanes and rounds each PR takes.
- Invoking `orchestrate` is the user's request for the new top-level thread it starts
  per item, overriding runtime guidance to start threads only when asked.
- A PR is raised and left for the owner; babysit it only when asked. Merge only a PR
  the owner authorised, through the owner's bypass, once _CI result_ has passed on the
  head you inspected (implement-story's `references/pr-watch.md`).
- Rulesets, branch protections and repository settings are owner steps: never change
  them.
- A change to visible UI publishes before/after screenshots (implement-story's
  `references/screenshots.md`).
- What a delivery learned goes to its narrowest home, by the ladder in
  `docs/operations/authoring-agent-instructions.md` (_Where it goes_); its history goes
  in the record's Delivery section. This file holds only rules that recur across most
  work.
- Records, ADRs and analyses follow `docs/AGENTS.md`. Before editing an agent guide, a
  skill or an agent definition, read the `writing-for-agents` skill and
  `docs/operations/authoring-agent-instructions.md`.
- Skills live in `.agents/skills/` (`.claude/skills` links to it); if your runtime's
  catalogue lacks one, read its `SKILL.md`. `.claude/agents/` holds briefs for fresh
  reviewers and workers.
