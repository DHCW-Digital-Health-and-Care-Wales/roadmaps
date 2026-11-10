# Authoring agent instructions

Read the `writing-for-agents` skill before changing agent guides or skills.
This policy governs `AGENTS.md` (and the `CLAUDE.md` that only imports it),
agent definitions under `.claude/agents/` and skill instructions under
`.agents/skills/`. Nothing checks it mechanically: review judges it.

Root guides are read at onboarding; nested guides and skills are read when
their scope or trigger applies. Each extra line consumes attention on every
task that loads it. They are a **rulebook, not a record of work done**, and
**editing one is rare**: most work, completed stories included, should end with
no edit here. An edit is an exception to justify, not a step in finishing.

## The test for including anything

> Could a competent agent arrive at this by reading the code, comments, docs and
> ADRs the task already takes them through?

If yes — even with some digging — leave it out. A rule written beside the code
it governs costs only the task that opens that file; in a root guide it costs
every task forever. Write only what an agent would otherwise **get wrong**,
and only when no closer home exists:

- Conventions not visible in any single file — the layer a change belongs in,
  catalogue key naming, how E2E specs reach the faked Google services
- Counterintuitive invariants — "call `connect()` straight from the click
  handler, with no `await` before it, or the popup is blocked"
- Cross-cutting constraints — "access tokens live in memory only"
- Commands with non-obvious flags, env prefixes, or preconditions
- Pointers to the authoritative document (an ADR, a skill, another guide)

A rule must also **recur**. It earns its line only when it governs ordinary
work for many of the agents its file loads for, or guards a severe,
non-obvious failure that nothing else catches. A point that matters again
only when someone touches one component, function, edge case or incident
belongs in a comment at that site, where the next agent to touch it reads it.

## What must not go in

- **Feature or status narrative.** No "X is live", "Y is still a placeholder",
  "the full detail page is a later story". That is release notes: it ages
  badly, and a later change makes it a lie in three files at once.
- **Incident post-mortems.** What one PR or review got wrong goes where it lives: a
  check, or a comment at the site. The PR body records the story.
- **Rules that hold only while one epic is in delivery**, such as an interim
  reader to avoid until a later story replaces it. They go in that epic's
  `docs/backlog/{epic}/delivery-notes.md`.
- **Story, chore and defect IDs, and provenance stamps** such as
  "(owner, 2026-11-10)". Each records a delivery or a decision's history, not
  a rule; cite the ADR behind a rule instead, and state an owner decision as
  the rule itself. A rule that makes sense only with the story open is not yet
  written well enough. The root `AGENTS.md` Handoff log is the deliberate
  exception: it is a record, and the IDs are its point. Do not copy its
  entries' content into rules elsewhere.
- **Rules a check already enforces** with a clear message — the layer
  restrictions in `eslint.config.ts`, the `i18next/no-literal-string` rule,
  the type error for a catalogue key missing in `cy`. The failure teaches the
  rule at the moment it applies.
- **Directory listings and file inventories.** `ls` produces those on demand.
  A path is worth naming only when the rule is "use this one, not a local copy".
- **Restatements of `package.json` scripts.** Document a command only when the
  invocation is not obvious from the script name.
- **Design rationale an ADR already carries.** State the rule, link the ADR. The
  argument is one file read away at the moment it is actually needed.
- **Anything already written in another `AGENTS.md`.** State it once, at the
  narrowest scope that covers it, and point at it from anywhere else.
- **API, schema, field, component or helper documentation.** The code, its
  docblocks and schemas are the contract; prose copies of them go stale
  silently.

## When to update

**Assume the answer is no.** Completing a story is not a reason to write one,
and neither is having learned something worth writing down — that belongs where
the code is.

- **No edit** — the overwhelming default: a new feature following existing
  patterns; a new route, page, component, or catalogue key; a bug fix,
  refactor, or dependency bump; anything a comment at the call site says
  better; anything an ADR or story already carries
- **Edit**: a convention changes or a new one is introduced, and it spans more
  files than a comment can reach
- **Edit**: a rule already written is now false — fix it or delete it. Removing
  a stale rule matters as much as adding a true one
- **A new line replaces or sharpens an existing one.** When nothing it
  replaces exists, its PR says why the file has to grow. A retrospective
  deletes the lines its session showed stale, wrong or ignored

## Where it goes

The narrowest scope that covers it: a rule about the E2E fakes belongs in
`tests/e2e/AGENTS.md`, not the root guide. Put a rule in the root only when it
applies across most of `src/`. Read the `AGENTS.md` along each changed path's
directory ancestry, including referenced cross-area conventions; explicit
conditional navigation avoids loading unrelated rules.

## How to write it

- Imperative, present tense: "Route every user-facing string through `t()`…",
  not "Every user-facing string is routed through `t()`…"
- One rule per bullet, one sentence where you can
- Rationale only where the rule looks wrong without it, and never more than a
  sentence
- Keep a code sample only when it is the shortest correct statement of the rule
- Write a path as plain `` `code` ``, never as a markdown link — the link form
  spells the path twice; compact pointers preserve attention
- Keep guidance runtime-neutral: name a capability ("a delegation tool that can
  start a reviewer on a named model"), not one product's tool, so it still
  holds when the runtime changes

## Length

Keep each guide and each `SKILL.md` as short as it can be while still stopping
the mistake it exists for. The root `AGENTS.md` is read on every task, so a
new line there displaces an old one: delete a stale or narrow rule, or move it
to its code site. When a new rule is needed and nothing in the file should go,
ask the owner, giving the rule and why no line can make way. A guide split
between "needed now" and "needed sometimes" belongs in a skill's
`references/` files, loaded on demand.

## Skill metadata

Use a skill directory containing `SKILL.md`, with its invocation metadata in
that file's frontmatter. Keep one authoritative skill source under
`.agents/skills/`; the `.claude/skills` link for Claude Code points to it
rather than copying it. Read the writing skill's mechanics reference for
invocation choices. Describe actual trigger branches and capability needs, and
use model identifiers only when the current runtime provides them.

## Review

No script checks these rules. A reviewer reads a changed guide, skill or agent
definition against this file: is each line a rule rather than a record, does
it recur, does it sit at the narrowest scope, and does it cite a story ID, a
provenance stamp or a path that no longer exists? Delivery narrative, size
and scope are judgement calls, so they stay the author's and the reviewer's.
