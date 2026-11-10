# AGENTS.md — Product Roadmaps

Instructions for AI agents (and humans) working in this repository. Read this first,
then the ADRs in `docs/adr/` and the story you are working on in `docs/backlog/`.

## What this is

A static, frontend-only React SPA ("Product Roadmaps") hosted on GitHub Pages. Users
connect a Google account via Google Identity Services (OAuth token model); the app reads
worksheet **metadata** from one Google Spreadsheet and shows each visible worksheet as a
roadmap card. Google Sheets is a _temporary_ data source: it must be replaceable by a
PostgreSQL-backed HTTP API without touching the presentation layer (see ADR-0002).

## Layering rules (non-negotiable)

```
src/
  app/              composition root, providers, router — the ONLY place that wires
                    concrete implementations (Google adapters) to abstractions
  routes/           TanStack Router file-based route modules — thin; delegate to feature pages
  domain/           framework-free types & interfaces (Roadmap, RoadmapRepository).
                    Imports nothing from React, TanStack, Google, or infrastructure.
  features/<name>/  application state (hooks), components, pages for one feature.
                    Depends on domain + lib + components. Never on infrastructure.
  infrastructure/   adapters to the outside world (Google Sheets, Google Identity Services).
                    Depends on domain + lib. Never on React, TanStack Query, or features.
  components/ui/    shadcn/ui (Base UI) generated components — keep close to upstream
  components/layout app shell pieces shared across features
  lib/              small framework-agnostic utilities (errors, cn, query client factory)
  styles/           Tailwind v4 entry CSS + theme tokens
tests/e2e/          Playwright specs + fakes for GIS and the Sheets API
```

- UI code must never mention spreadsheets, sheets, worksheets, cell ranges, or Google
  response types. It speaks `Roadmap` and `AppError`.
- No `fetch()` in components or hooks; HTTP lives in `infrastructure/`.
- Access tokens live in memory only. Never write them to storage, URLs, or logs.
- Untrusted external data is parsed with Zod at the infrastructure boundary.
- Prefer deleting code over adding abstraction. Only the repository and auth boundaries
  are sanctioned "for the future" abstractions.

## Commands

```
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:5173
pnpm typecheck
pnpm lint
pnpm format:check   # pnpm format to fix
pnpm test           # Vitest unit + component (no network, no Google)
pnpm test:e2e       # Playwright, fully mocked GIS + Sheets
pnpm build && pnpm preview
```

## Conventions

- TypeScript strict; no `any`, no non-null assertions without a comment justifying them.
- Named exports; kebab-case file names; one concept per module.
- Components: function components, props typed inline or as `XxxProps`.
- Tests sit beside the code as `*.test.ts(x)`; E2E under `tests/e2e/`.
- Add shadcn components with the shadcn CLI (`pnpm dlx shadcn@latest add <name>`), Base UI
  flavour — never hand-roll a competing primitive or pull in Radix.
- User-facing copy is sentence case, plain English (en-GB spelling is fine in docs).

## Workflow for delivery agents

1. Read `AGENTS.md`, relevant ADRs, your story, and the **Handoff log** below.
2. Implement the story's scope only. If you must deviate from an ADR, update or supersede
   the ADR in the same change and say why.
3. Use subagents where helpful (Haiku for mechanical edits, Sonnet for medium work).
4. Before finishing: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`
   (plus `pnpm test:e2e` once it exists) must all pass.
5. Get a code review from a **Sol** reviewer (Codex `gpt-6.1-sol`) via `delegate_task`
   (role `review`, mode `wait`, shared checkout). Address every comment — fix it, or record
   a reasoned rebuttal in the story file. Re-run the checks.
6. Tick the story's acceptance criteria, append a Handoff log entry, update nested
   `AGENTS.md` files if you introduced a new area, and commit on the current branch with a
   conventional commit message (`feat(scope): …`). Do not push.

## Handoff log

Newest last. Each entry: story id, what changed, decisions, gotchas for the next agent.

- **Backlog/ADRs (orchestrator)** — Backlog S01–S08 and ADR-0001…0007 created. Branch
  `feat/bootstrap`. Remote is `collisdigital/roadmaps-editor`, so the production origin is
  `https://collisdigital.github.io` and base path `/roadmaps-editor/`.
