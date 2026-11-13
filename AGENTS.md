# AGENTS.md — DHCW Roadmap Editor

Rules for every agent in this repository. Then read `docs/GLOSSARY.md` for domain
terms, the ADRs in `docs/adr/` that bind the area you change, and the `AGENTS.md`
along the directory ancestry of each path you change and of its affected callers and
tests.

## What this is

An internal tool for Digital Health and Care Wales (DHCW), used only by DHCW staff.
**Product Leads** manage the **public roadmaps** of the products they lead, in the
Now / Next / Later format: each **roadmap item** has a title, a description, expected
outcomes, tags and other details, and fits on one card no bigger than a phone screen.
Design for the Product Lead editing their roadmap
(`docs/backlog/personas/product-lead.md`); the connection to the data source is
plumbing that stays out of their way. The interface is in English and Welsh (ADR-008).

A **separate app, the public site**, reads the same shared data source and shows the
roadmaps to the public, so what a Product Lead publishes here goes public through it.
The data source's format is a contract with the public site: any change to what is
written, or how, is stated in its record and its PR (README, _What the editor writes_).

It is a static, frontend-only React SPA on GitHub Pages. It connects a Google account
(Google Identity Services, token model), reads and writes one Google Spreadsheet, and
treats Google Sheets as a _temporary_ data source: a PostgreSQL-backed HTTP API must be
able to replace it without touching the presentation layer (ADR-002).

## Layering (ADR-002)

- `domain/` is framework-free: types and the `RoadmapRepository` and `AuthClient`
  ports.
- `infrastructure/` holds the adapters (Google Sheets, Google Identity Services); it
  depends on `domain` and `lib` only.
- `features/<name>/` holds one feature's hooks, components and pages; it never imports
  `infrastructure`, `app` or `routes`.
- `app/` is the composition root, the only place that wires concrete adapters to the
  ports; `routes/` stay thin and delegate to feature pages.
- `eslint.config.ts` enforces these imports; its message names the rule.

Rules no lint catches:

- UI code speaks `Roadmap`, `RoadmapItem` and `AppError`, never spreadsheets, sheets,
  tabs, cell ranges or Google response types.
- HTTP lives in `infrastructure/`; components and hooks call the repository.
- Parse untrusted external data with Zod (`zod/mini`) at the infrastructure boundary.
- Access tokens live in memory only: never in storage, URLs or logs.
- Prefer deleting code to adding abstraction. Only the repository and auth boundaries
  are sanctioned abstractions "for the future".

## Commands

`package.json` lists the scripts. The ones with preconditions:

- `pnpm dev` needs `.env.local` (`cp .env.example .env.local`); a local _build_ override
  goes in `.env.production.local`, since builds prefer `.env.production`.
- `pnpm test:e2e` builds and serves on port 4173, reusing a server already there
  locally; install the browser once per Playwright version with
  `pnpm exec playwright install --with-deps chromium`.
- Before a PR, run the checks implement-story's `references/validation.md` sets
  for the kind of change.
- In a shared checkout, or a scratch directory whose `node_modules` links to it, run
  binaries as `./node_modules/.bin/<tool>`: `pnpm exec` there can reinstall and prune
  the shared `node_modules`.
- Stop a process by its PID or port (`fuser -k 4173/tcp`), never by a name pattern:
  worktrees share one host, and a pattern kill stops their servers too.

## Conventions

- TypeScript strict: no `any`; a non-null assertion carries a comment justifying it.
- Named exports, kebab-case file names, one concept per module, function components.
- Tests sit beside the code as `*.test.ts(x)`; E2E lives in `tests/e2e/`. Every file in
  `src/routes/` becomes a route, so route tests live elsewhere; commit the generated
  `src/routeTree.gen.ts` when routes change.
- Add shadcn components with the shadcn CLI, Base UI flavour; never Radix or a
  hand-rolled competing primitive.
- Route every user-facing string (text, aria-labels, notices, titles) through `t()`, in
  English and Welsh (ADR-008); invoke the `copywriter` skill before writing copy.
  Domain and infrastructure emit codes, never copy.
- Put a `{" "}` text node before a `sr-only` span that continues a visible name: name
  computation drops a leading space inside the span ("Edit Minimal card").
- Style only with the semantic tokens of `src/styles/globals.css` (ADR-010), and read
  `src/styles/AGENTS.md` before adding a token. Focus is `focus-visible:focus-fill`
  (buttons, button-styled links, menu items), `focus-ring` (cards, inputs) or
  `focus-link` (text links).
- Call the auth client's `connect()` synchronously inside the click handler, with no
  `await` before it, or the browser blocks Google's popup (ADR-003).

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
- A PR is raised and left for the owner; babysit or merge it only when asked.
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
