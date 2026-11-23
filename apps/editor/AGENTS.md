# AGENTS.md — the Roadmap Editor

Rules for work under `apps/editor/`, beside the root `AGENTS.md`. Paths are from the
repository root.

## What this is

An internal tool for Digital Health and Care Wales (DHCW), used only by DHCW staff.
**Product Leads** manage the **public roadmaps** of the products they lead, in the
Now / Next / Later format: each **roadmap item** has a title, a description, expected
outcomes, tags and other details, and fits on one card no bigger than a phone screen.
Design for the Product Lead editing their roadmap
(`docs/backlog/personas/product-lead.md`); the connection to the data source is
plumbing that stays out of their way. The interface is in English and Welsh (ADR-008).

It is a static, frontend-only React SPA on GitHub Pages. It connects a Google account
(Google Identity Services, token model), reads and writes one Google Spreadsheet, and
treats Google Sheets as a _temporary_ data source: a PostgreSQL-backed HTTP API must be
able to replace it without touching the presentation layer (ADR-002).
The spreadsheet format it reads and writes, the contract with the public site, is the root
README's _Spreadsheet format_.

## Layering (ADR-002)

Under `apps/editor/src/`:

- `domain/` is framework-free: types and the `RoadmapRepository` and `AuthClient`
  ports.
- `infrastructure/` holds the adapters (Google Sheets, Google Identity Services); it
  depends on `domain` and `lib` only.
- `features/<name>/` holds one feature's hooks, components and pages; it never imports
  `infrastructure`, `app` or `routes`.
- `app/` is the composition root, the only place that wires concrete adapters to the
  ports; `routes/` stay thin and delegate to feature pages.
- `apps/editor/eslint.config.ts` enforces these imports; its message names the rule.

Rules no lint catches:

- UI code speaks `Roadmap`, `RoadmapItem` and `AppError`, never spreadsheets, sheets,
  tabs, cell ranges or Google response types.
- HTTP lives in `infrastructure/`; components and hooks call the repository.
- Parse untrusted external data with Zod (`zod/mini`) at the infrastructure boundary.
- Access tokens live in memory only: never in storage, URLs or logs.
- Prefer deleting code to adding abstraction. Only the repository and auth boundaries
  are sanctioned abstractions "for the future".

## Commands

`apps/editor/package.json` lists the scripts. The ones with preconditions:

- `pnpm editor:dev` needs `apps/editor/.env.local`
  (`cp apps/editor/.env.example apps/editor/.env.local`); a local _build_ override goes
  in `apps/editor/.env.production.local`, since builds prefer `.env.production`.
- `pnpm editor:test:e2e` builds and serves on port 4173, reusing a server already there
  locally; install the browser once per Playwright version with
  `pnpm --filter @roadmaps/editor exec playwright install --with-deps chromium`. A
  parallel worktree has its own dev and E2E ports (`pnpm worktree:info`).

## Conventions

Follow `apps/typescript-react-conventions.md`, the TypeScript and React conventions both
apps share, and these, the editor's own:

- E2E lives in `apps/editor/tests/e2e/`. Every file in `apps/editor/src/routes/` becomes
  a route, so route tests live elsewhere; commit the generated
  `apps/editor/src/routeTree.gen.ts` when routes change.
- The seams of the root guide's test rule, lowest first: a domain or editing-state
  function, a component, a page, the app. A rule every repository adapter must honour
  keeps all its cases in the repository contract (ADR-002), whatever a domain test also
  holds. What earns a Playwright spec is `apps/editor/tests/e2e/AGENTS.md` (_What earns
  an E2E test_).
- Add shadcn components with the shadcn CLI, Base UI flavour; never Radix or a
  hand-rolled competing primitive.
- Route every user-facing string (text, aria-labels, notices, titles) through `t()`, in
  English and Welsh (ADR-008); invoke the `copywriter` skill before writing copy.
  Domain and infrastructure emit codes, never copy.
- Style only with the semantic tokens of `apps/editor/src/styles/globals.css`
  (ADR-010), and read `apps/editor/src/styles/AGENTS.md` before adding a token. Focus is
  `focus-visible:focus-fill` (buttons, button-styled links, menu items), `focus-ring`
  (cards, inputs) or `focus-link` (text links).
- Call the auth client's `connect()` synchronously inside the click handler, with no
  `await` before it, or the browser blocks Google's popup (ADR-003).
