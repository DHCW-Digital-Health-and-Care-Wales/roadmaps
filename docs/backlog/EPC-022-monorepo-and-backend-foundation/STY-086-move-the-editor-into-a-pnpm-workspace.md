# STY-086: Move the editor into apps/editor in one pnpm workspace

- **Status**: Proposed — acceptance criteria written from the owner's STY-086 grilling
  (2026-11-21, D1–D9)
- **Type**: Refactor + Docs
- **Area**: CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-085 (hard)
- **Binding ADRs**: ADR-016 §Layout and name, §Agent guides, ADR-007
- **Suggested model**: Opus — one mechanical change with a wide blast radius

## Summary

Today's app moves to `apps/editor` under a pnpm workspace root, and Product Leads see
no change. Code, configs, CI, guides, skills and worktree scripts move together in one
pull request, merged as a pure move followed by the fixes, so no half-moved state lands
on `main` and git follows every file. Root scripts gain an app prefix (`editor:dev`),
and the checks run across the workspace. No other editor-code pull request is open
while it is in flight, and every existing checkout is deleted after it merges.

## Scope

- **Moves to `apps/editor`**, as package `@roadmaps/editor` (D2): the app's code,
  configs, `index.html`, `public/`, `tests/`, `components.json`, `.env.example`,
  `.env.production`, and the editor's own build checks and helpers (design tokens, E2E
  lint, aria-snapshot literals, base path, build version, dev ports).
- **Stays at the root**, package `roadmaps` (D2, D4): `docs/`, `.agents/`, `.claude/`,
  `.github/`, `LICENSE`, `.nvmrc`, `skills-lock.json`, the Prettier config, the worktree
  script, and the repository's own checks (Markdown links, the agent-guide budget) with
  the small toolchain they need.
- **Guides and docs** (D6, D7): the root `AGENTS.md` and README are split; live
  records, skills and their references follow the move; archived records and delivery
  runs keep their old citations (ADR-016 _Agent guides_).
- **CI** keeps its jobs and job names, repointed. The jobs per app are STY-087's.

## Acceptance criteria

### S1: Product Leads see no change

**Given** the pull request is merged and `main` has deployed
**When** a Product Lead opens `/roadmaps/`
**Then** the editor loads, connects and publishes as before
**And** CI's E2E run served the built `apps/editor` under `/roadmaps/`, and `verify`'s
base-path guard checked the artifact uploaded from `apps/editor/dist`

### S2: Root scripts are prefixed per app, and the checks run across the workspace (D1)

**Given** a fresh clone after `pnpm install`
**When** a developer runs `pnpm editor:dev`, `editor:build`, `editor:preview` or
`editor:test:e2e` at the root
**Then** each runs the editor's script through `pnpm --filter @roadmaps/editor`
**And** `pnpm lint`, `typecheck`, `test`, `build`, `format:check` and `test:docs` run
across every workspace package, the root's own checks included, and fail if any
package fails
**And** the old unprefixed `pnpm dev` and `pnpm test:e2e` no longer exist

### S3: The repository's checks run without the editor (D4)

**Given** the root package's checks: the Markdown link check and the agent-guide budget
(`pnpm test:docs`, as CI's docs-only job runs them), and the worktree script's tests
(in the root package's `test`)
**When** they run
**Then** they run from the root package's own toolchain and scan the whole repository,
`apps/` included, with no import from `apps/editor`

### S4: A fresh worktree gets its ports and runs the editor (D5)

**Given** a new worktree created by T3 Code, which runs worktree setup
**When** the developer presses the dev-server button, or runs `pnpm editor:dev`
**Then** the editor serves on the slot's dev port, read from `.env.worktree` at the
worktree's root, and `pnpm editor:test:e2e` uses the slot's preview port
**And** setup creates `apps/editor/.env.local` from `apps/editor/.env.example`
**And** the slot registry lives under a `roadmaps` state directory (STY-085 D5)

### S5: Git follows every moved file (D3)

**Given** the merged pull request
**When** a developer runs `git log --follow` or `git blame` on any moved file
**Then** its history continues across the move
**And** `main` gains two commits from the pull request: one that only renames, and one
that holds every other change

### S6: Nothing live points at a moved path or a renamed script

**Given** the merged pull request
**When** the Markdown link check runs and the live tree is searched for root-relative
paths that moved (`src/`, `tests/`, `build/`, `public/`, `vite.config.ts`,
`playwright.config.ts`, `eslint.config.ts`, `components.json`, `.env.example`,
`.env.production`, `.env.local`) and for the scripts that were renamed (`pnpm dev`,
`pnpm preview`, `pnpm test:e2e`, and `pnpm build` where it means the editor's build)
**Then** every link resolves, every live citation of a moved path names its
`apps/editor/` path, and every live command names its prefixed script, in guides,
skills, their references, live records, ADRs, runbooks, the README, `t3.json`, the
session-start hook, the worktree script, CI and Dependabot
**And** what stays at the root keeps its root path: the Markdown link and agent-guide
checks (D4) and `.env.worktree` (D5)
**And** `docs/backlog/_archive/` and `docs/analysis/delivery-runs/` are unchanged

### S7: The guides split by area (D6)

**Given** the merged pull request
**When** an agent works on a path under `apps/editor/`
**Then** it reads the root `AGENTS.md`, which holds the rules that hold across the
repository and a routing table to each area's guide, and `apps/editor/AGENTS.md`,
which holds the editor's rules, every TypeScript and React convention included
**And** each new guide has its `CLAUDE.md` importing it, and the root guide stays within
the agent-guide check's word budget

### S8: The README splits into an overview and the editor's own (D7)

**Given** the merged pull request
**When** someone opens the repository on GitHub
**Then** the root README gives a short overview of what the repository holds, how to
start, and links to each app, and keeps the spreadsheet format, the contract both apps
read
**And** the editor's setup, architecture, testing and operations are in
`apps/editor/README.md`, and every link to a moved section points at its new home

## Decisions

- **D1** (owner, 2026-11-21, STY-086 grilling round 1): root scripts → prefixed per app
  (`editor:dev`, later `site:` and `api:`), with lint, typecheck, test, build and format
  checks running across the workspace. Over keeping today's names for the editor, which
  would leave it the odd one out for good. Shapes S2.
- **D2** (owner, 2026-11-21, round 1): package names → scoped: root `roadmaps`, then
  `@roadmaps/editor`, and later `@roadmaps/public-site` and `@roadmaps/api-types`. Over
  bare names, which read as public npm packages.
- **D3** (owner, 2026-11-21, round 1): merge → a rebase merge of two commits, a pure
  `git mv` and then the fixes, over the usual squash, so rename detection is exact. The
  first commit alone does not build; CI checks the head. Shapes S5.
- **D4** (owner, 2026-11-21, round 1): repository-wide tooling → the root package keeps
  a small toolchain and the repository's checks, over leaving them in the editor's
  package. Shapes S3.
- **D5** (owner, 2026-11-21, rounds 1–2): local files → no migration. Every existing
  checkout and worktree is deleted after this story merges, so everyone starts clean.
  `.env.worktree` stays at the root, one file per worktree for every app's ports, which
  later apps read too. The slot registry moves here, not in STY-085 (STY-085 D5). Shapes
  S4.
- **D6** (owner, 2026-11-21, round 2): the guide split → every TypeScript and React
  convention moves to `apps/editor/AGENTS.md` now, and STY-088 lifts what the public
  site shares. Over keeping general TypeScript rules at the root, where they would load
  for API sessions. Shapes S7.
- **D7** (owner, 2026-11-21, round 1): the README → a root overview that keeps the
  spreadsheet format, and an editor README for the rest. Over moving everything to the
  editor or deferring the split to STY-088. Shapes S8.
- **D8** (owner, 2026-11-21, round 1): sequencing → no other pull request that changes
  the editor's code is open while this one is in flight; new editor work branches after
  it merges. Docs-only pull requests carry on, since `docs/` does not move.
- **D9** (owner, 2026-11-21, confirmation): the Prettier config stays at the root
  (ADR-016 _Workspace tooling_), with the Tailwind plugin applied only to the editor's
  files.
- **D10** (owner, 2026-11-21, STY-088 grilling, D7 there): lifting the shared
  TypeScript conventions out of the editor's guide moves from STY-088 to STY-095, when
  the public site has adopted them. Changes D6's "STY-088 lifts".

## Starting point

Audited at `cc11e44` on 2026-11-21:

- `build/markdown-links.test.ts` and `build/agent-guides.test.ts` resolve the
  repository root as their parent directory; they scan the whole repository and move
  to the root package (D4). The rest of `build/` is the editor's.
- `.prettierrc.json` names `./src/styles/globals.css` as the Tailwind stylesheet, and
  `.prettierignore` lists editor paths; both change with the move.
- `vite.config.ts` and `playwright.config.ts` read `.env.worktree` through
  `build/resolve-dev-ports.ts`, and the worktree script writes it beside itself in the
  root (D5).
- The session-start hook prints the worktree's ports and, in a cloud session, creates
  `.env.local` from `.env.example` at the root; both paths change.
- CI's docs-only job runs `pnpm format:check` and `pnpm test:docs`; `verify` greps
  `dist/index.html` for the base path and uploads `dist`.

## Out of scope

- Shared workspace tooling (catalogs, hooks, knip), CI jobs per app, Dependabot for pnpm
  and the ruleset on `main`: STY-087.
- The public site and its guide: STY-088. Lifting shared TypeScript conventions out of
  the editor's guide: STY-095 (D10).
- Migrating existing checkouts: none, by D5.
