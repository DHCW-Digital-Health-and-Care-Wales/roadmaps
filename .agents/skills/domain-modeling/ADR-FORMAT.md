# ADR Format

The naming, lifecycle and editing rules for `docs/adr/`. Match the shape of the
template below. The eight ADRs already there are the reference examples; read
one before writing the first of a new area.

## Naming and index

- One decision per `docs/adr/ADR-{nnn}-{kebab-title}.md`, three-digit number, with
  a `# ADR-{nnn}: {Title}` heading. The title names the decision
  ("Static deployment to GitHub Pages"), not a topic.
- Scan `docs/adr/` for the highest number and increment it; never renumber.
- Add the ADR to the table in `docs/adr/README.md` (link, title, status) in the
  same change, and keep that status in step with the file's.

## Lifecycle

Status is one of **Proposed**, **Accepted** or **Superseded by ADR-XXX**.

- A new ADR starts **Proposed** and becomes **Accepted** only on the owner's
  word (`docs/AGENTS.md`). Note which answer accepted it in the Status line.
- Implement Accepted decisions. Build on a Proposed one only when its decision
  is easily reversible and waiting would hold up the work in hand. Raise it
  for acceptance at once as an owner question, name the reliance in the
  story's Decisions and in the PR, and reverse the reliance in a follow-up if
  the owner declines. A decision that is hard to reverse (a stored data shape,
  a security boundary, a public contract, behaviour already deployed) waits for
  acceptance.
- A story that names an ADR as binding is selectable only once that ADR is
  Accepted.
- A decision that is reversed or replaced gets a new ADR. Mark the old one
  `Superseded by ADR-XXX` and keep it, number and text intact. When the
  supersession is partial, both Status lines name the sections that still
  stand.
- A Proposed ADR the owner declines is removed in the same change if nothing
  relied on it; if something did, the ADR that reverses the reliance
  supersedes it.

## Editing after acceptance

- **Amend in place** when a later story refines a decision without reversing
  it: add a `### {record ID} amendments` subsection (or a short bullet in
  Decision) naming what changed, and note it in the `Date` line, as ADR-007
  and ADR-008 do. Say which parts of the original still stand when it is not
  obvious. An amendment that overturns the decision is a successor ADR, not an
  amendment.
- Fix a typo, a broken link or a stale path in place without ceremony.
- Do not record values the code or a script already states (versions, option
  lists); name the module, test or lint rule that enforces the decision
  instead.

## Template

Keep an ADR short: one decision, the reason, the cost. Omit Context when the
decision explains itself, as ADR-005 to ADR-007 do.

```md
# ADR-{nnn}: {The decision, as a title}

- Status: Proposed
- Date: YYYY-MM-DD

## Context

{The facts and constraints that force the decision. Short: the decision must
make sense without the story that raised it.}

## Decision

{What is now true. Bullets are fine; give each rule a checkable form and name
what enforces it (a lint rule, a test, the composition root). Record the
alternatives a reader would otherwise suggest again and why they lost.}

### {record ID} amendments

{Only after acceptance, when a later story refines the decision.}

## Consequences

{The costs accepted, the follow-on work (by record ID), and the ADRs or guides
that must now change.}
```

Status values and the `Date` line follow the existing files: `- Status:
Accepted`, `- Date: 2026-11-10 (amended in {record ID}: …)`. A superseded ADR reads
`- Status: Superseded by ADR-012`; the successor's Context links back to it.

## When to offer an ADR

Record a significant technical decision, as
`.agents/skills/implement-story/SKILL.md` requires. For other decisions, all
three of these must be true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

For an optional ADR, if a decision is easy to reverse, skip it: you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

### What qualifies

- **Architectural shape.** "Dependencies point inward; only the composition root imports adapters."
- **Integration boundaries.** "The UI speaks `Roadmap` and `AppError`; Google types never leave `infrastructure/`." The explicit no-s are as valuable as the yes-s.
- **Technology choices that carry lock-in.** The router and its history mode, the UI primitive library, the auth flow, the deployment target. Not every library: just the ones that would take real work to swap out.
- **Deliberate deviations from the obvious path.** "Hash history instead of path routing, because Pages cannot rewrite URLs." Anything where a reasonable reader would assume the opposite stops the next agent from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "The OAuth origin must be listed in Google Cloud." "Access tokens live in memory only."
- **Rejected alternatives when the rejection is non-obvious.** If you considered Radix and picked Base UI, record why; otherwise someone will suggest Radix again in six months.
