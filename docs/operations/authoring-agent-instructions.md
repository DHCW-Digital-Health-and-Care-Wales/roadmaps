# Authoring agent instructions

Read the `writing-for-agents` skill before changing agent guides or skills.
This policy governs `AGENTS.md` (and the `CLAUDE.md` that only imports it),
agent definitions under `.claude/agents/` and skill instructions under
`.agents/skills/`. `build/agent-guides.test.ts` checks the root guide's size
and that no `AGENTS.md` outside the top-level `docs/` cites a record ID; review judges the
rest.

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
  reader to avoid until a later story replaces it, or a check its reviewers
  make. They go in that epic's `docs/backlog/{epic}/delivery-notes.md`
  (`docs/AGENTS.md`).
- **A delivery's history**: what changed, its decisions, its evidence. That is
  the record's Delivery section and its PR.
- **Story, chore and defect IDs, and provenance stamps** such as
  "(owner, 2026-11-10)". Each records a delivery or a decision's history, not
  a rule; cite the ADR behind a rule instead, and state an owner decision as
  the rule itself. A rule that makes sense only with the story open is not yet
  written well enough.
- **Rules a check already enforces** with a clear message — the layer
  restrictions in `apps/editor/eslint.config.ts`, the `i18next/no-literal-string` rule,
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

This ladder is the one list of homes; skills, templates and the budget test
point here. Give a learning the first rung that holds it:

1. **A failing check** (a type, a lint rule, a test) when the slip is
   mechanical; its failure teaches the rule when it applies.
2. **A comment at the code site** when it matters to whoever touches that code.
3. **The epic's `delivery-notes.md`** when it holds only while that epic is in
   delivery (`docs/AGENTS.md`).
4. **A skill or one of its references** when it governs one workflow, such as a
   review lens or a copy rule.
5. **The `AGENTS.md` nearest the code** that covers it: a rule about the E2E
   fakes belongs in `apps/editor/tests/e2e/AGENTS.md`. The root guide takes only a rule
   that applies across most work.

Read the `AGENTS.md` along each changed path's directory ancestry, including
referenced cross-area conventions; explicit conditional navigation avoids
loading unrelated rules.

A delivery PR changes a **guide file** (an `AGENTS.md` or `CLAUDE.md`, or
any file under `.agents/skills/` or `.claude/agents/`) in two cases:

- **The owner asked for the change**: the Summary or acceptance criteria of
  the record it delivers, as they stand on the base branch, or the owner's
  own request, names it.
- **It is a correction**: the edit makes a false line true without changing
  what the line asks an agent to do, such as an example quoting copy the
  delivery renames, a name, path or command it moves, or a dead pointer. The
  PR body's Decisions lists each correction, so a reviewer can check that it
  changes no rule.

Any other guide change in a delivery is **incidental**, however its Delivery
section explains it: a rule or pattern added, removed or reworded. Only a
retrospective makes it, in its own PR, so the owner sees every change that
can alter future delivery. The delivery's handoff names, for the
retrospective to weigh, each learning for rungs 4 and 5 and each guide line
its change makes false that no correction can make true, such as a rule about
something the delivery removes.

## How to write it

- Imperative, present tense: "Route every user-facing string through `t()`…",
  not "Every user-facing string is routed through `t()`…"
- One rule per bullet, one sentence where you can
- Rationale only where the rule looks wrong without it, and never more than a
  sentence
- Keep a code sample only when it is the shortest correct statement of the rule
- Write a path from the repository root (a skill's own files from its folder, as
  `` `references/…` ``), as plain `` `code` ``, never as a markdown link — the link
  form spells the path twice; compact pointers preserve attention
- Keep guidance runtime-neutral: name a capability ("a delegation tool that can
  start a reviewer on a named model"), not one product's tool, so it still
  holds when the runtime changes

## Length

Keep each guide and each `SKILL.md` as short as it can be while still stopping
the mistake it exists for. The root `AGENTS.md` is read on every task, twice
in runtimes that also load `CLAUDE.md`, so it has a budget of 1,200 words,
enforced by `build/agent-guides.test.ts`. To make room, move a line down to its
narrowest home (_Where it goes_), or delete one only when it is stale or a no-op;
never cut a live rule to fit. When nothing can move, ask the owner, giving the
rule and why no line can make way; raising the budget is their call. Material
only some tasks need belongs behind a pointer, in a nested guide or a skill's
`references/` files.

## Skill metadata

Use a skill directory containing `SKILL.md`, with its invocation metadata in
that file's frontmatter. Keep one authoritative skill source under
`.agents/skills/`; the `.claude/skills` link for Claude Code points to it
rather than copying it. Read the writing skill's mechanics reference for
invocation choices. Describe actual trigger branches and capability needs, and
use model identifiers only when the current runtime provides them.

## Review

Beyond the test's checks, a reviewer reads a changed guide, skill or agent
definition against this file: is each line a rule rather than a record, does
it recur, does it sit at the narrowest scope, and does it cite a provenance
stamp or a path that no longer exists? Narrative and scope are judgement
calls, so they stay the author's and the reviewer's.
