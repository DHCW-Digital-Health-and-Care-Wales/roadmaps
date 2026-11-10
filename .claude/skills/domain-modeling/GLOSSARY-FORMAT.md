# GLOSSARY.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Roadmap**:
A named plan the app shows as a card and opens on its own page.
_Avoid_: Sheet, worksheet, project

**Connection**:
The user's grant of access to their Google account for this session.
_Avoid_: Login, sign-in, account
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.

## Repository location

Update the existing `docs/GLOSSARY.md`. It is the shared domain vocabulary
for this repository; keep the terms together there and group them under
subheadings when useful. [SKILL.md](SKILL.md) says when to update it, and
`docs/AGENTS.md` describes the documentation layout.
