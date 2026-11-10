---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing docs/GLOSSARY.md, or recording or editing an ADR.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the _active_ discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely _reading_ `docs/GLOSSARY.md` for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## Repository records

Read `docs/AGENTS.md` before creating or changing documentation. The shared
vocabulary is `docs/GLOSSARY.md`; decisions live in
`docs/adr/ADR-{nnn}-{kebab-title}.md`. Read the Accepted ADRs for the area before
proposing a change. Use [ADR-FORMAT.md](ADR-FORMAT.md) for this repository's
ADR shape and lifecycle.

When a decision leads to backlog work, start from the template for the
record's type in `docs/backlog/_templates/`. Those templates own the naming,
metadata, section order, ID allocation and lifecycle; `docs/AGENTS.md` owns the
locations. Record each owner answer in the record's Decisions, and
implementation departures in its Delivery, rather than rewriting its claim.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `docs/GLOSSARY.md`, call it out immediately. "Your glossary defines 'connection' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'sheet': do you mean the Roadmap or the worksheet it is stored in? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts: a hidden worksheet, an expired token, a roadmap renamed while the page is open.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code treats an expired session as signed out, but you just said cached roadmaps stay visible. Which is right?"

### Update the glossary inline

When a term is resolved, update `docs/GLOSSARY.md` right there. Don't batch these up: capture them as they happen. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

`docs/GLOSSARY.md` should be totally devoid of implementation details. Do not treat `docs/GLOSSARY.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Record significant technical decisions as `.agents/skills/implement-story/SKILL.md` requires.
For other decisions, only offer an ADR when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the optional ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
