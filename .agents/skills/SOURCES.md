# Imported skills

Source: https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336

These skills and their reference files are imported from this revision and
formatted with the repository's Prettier configuration. The upstream MIT
license is preserved in `mattpocock-LICENSE`.

| Skill                           | Source directory                                   |
| ------------------------------- | -------------------------------------------------- |
| `codebase-design`               | `skills/engineering/codebase-design`               |
| `domain-modeling`               | `skills/engineering/domain-modeling`               |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` |
| `retro`                         | `skills/engineering/retro`                         |
| `writing-for-agents`            | `skills/productivity/writing-for-agents`           |
| `grilling`                      | `skills/productivity/grilling`                     |
| `wayfinder`                     | `skills/engineering/wayfinder` (at `5863806`)      |

`shadcn` and `playwright-cli` come from their tools' own distributions (the
shadcn CLI and `@playwright/cli`; revisions unrecorded). `implement-story`,
`orchestrate`, `code-review`, `quality-review`, `copywriter` and
`ux-prototypes` are this repository's own.

## Local adaptations

- `grilling` asks each round through `AskUserQuestion`, falling back to
  numbered chat questions.
- Domain modeling and architecture review use `docs/GLOSSARY.md` and the
  documentation conventions in `docs/AGENTS.md`.
- The ADR helper describes this repository's three-digit ADRs (`ADR-001`) and their
  lifecycle.
- Backlog work points to the templates and status lifecycle in
  `docs/backlog/_templates/`; their formats are not copied into skills.
- Delegating skills name the runtime capability they need (a subagent, a
  cross-provider delegate, PR notifications, a new top-level session), never a
  specific tool, with a sequential fallback where it is unavailable.
- `shadcn` and `playwright-cli` open with a local preface: this repository's
  guides and `pnpm` take precedence over the upstream examples.
- `wayfinder` tracks its maps as GitHub issues (`references/github-issues.md`
  replaces upstream's tracker setup), briefs research subagents and logic
  prototypes itself in place of upstream's `research` and `prototype` skills,
  hands UI questions to `ux-prototypes`, and ends by writing the destination
  into `docs/` records.
- `retro` keeps the upstream improvement categories inside this repository's
  delivery flow: after the primary PR is raised, on its own branch and PR.

These are owned copies: adapt them to this repository as practice shows what
works. Upstream releases are a source of ideas, merged selectively, never
copied over these files verbatim.
