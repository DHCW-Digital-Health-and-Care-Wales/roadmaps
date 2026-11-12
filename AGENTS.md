# AGENTS.md — DHCW Roadmap Editor

Instructions for AI agents (and humans) working in this repository. Read this first,
then the ADRs in `docs/adr/`, `docs/GLOSSARY.md`, the Product Lead persona
(`docs/backlog/personas/product-lead.md`), and the record you are working on in
`docs/backlog/`.

## What this is

An internal tool for Digital Health and Care Wales (DHCW): only DHCW staff use it.
**Product Leads** use it to manage the **public roadmaps** of the products they lead, in
the Now / Next / Later format. Each **roadmap item** has a title, a description, expected
outcomes, tags and other details where they help, and fits on one card no bigger than a
phone screen. That size guides the level of detail; no limit is enforced yet. The
interface is in English and Welsh (ADR-008); Welsh roadmap content is optional for now.

The public never uses this app. A **separate app, the public site**, reads the same shared
data source and shows the roadmaps publicly, so what a Product Lead publishes here goes
public through it. The data source's format is therefore a contract with the public site:
never change what is written, or how, without saying so in the record and its PR.

Design for the Product Lead editing their roadmap (`docs/backlog/personas/product-lead.md`);
the connection to the data source is plumbing that should stay out of their way.

**Built so far** (the bootstrap epic, then EPC-002 to EPC-005): a static, frontend-only React SPA on
GitHub Pages that connects a Google account (Google Identity Services, OAuth token model),
reads the **roadmap index**, the first tab of one Google Spreadsheet, as the public site
does (ADR-009), and shows each roadmap it lists as a card with its information, grouped
by product family, and each roadmap's items on its page (EPC-004). A Product Lead
edits a roadmap's and its items' English in place and publishes (or saves) every
pending change at once; a co-lead's change to the same text is shown beside theirs,
never overwritten (EPC-005). Google Sheets is a _temporary_ data
source: it must be replaceable by a PostgreSQL-backed HTTP API without touching the
presentation layer (ADR-002).

## Layering rules (non-negotiable)

```
src/
  app/              composition root, providers, router — the ONLY place that wires
                    concrete implementations (Google adapters) to abstractions
  routes/           TanStack Router file-based route modules — thin; delegate to feature pages
  domain/           framework-free types & interfaces (Roadmap, RoadmapRepository, AuthClient).
                    Imports nothing from React, TanStack, Google, or infrastructure.
  features/<name>/  application state (hooks), components, pages for one feature.
                    Depends on domain + lib + components. Never on infrastructure.
  infrastructure/   adapters to the outside world (Google Sheets, Google Identity Services).
                    Depends on domain + lib. Never on React, TanStack Query, or features.
                    Only infrastructure/google-identity may use the `google` global.
  assets/dhcw/      the DHCW logo and icon, used with permission (provenance in its README)
  components/ui/    shadcn/ui (Base UI) generated components — keep close to upstream
  components/layout app shell pieces shared across features
  components/theme  ThemeProvider, useTheme, ThemeToggle, stored preference (ADR-005)
  lib/              small framework-agnostic utilities (errors, cn, query client factory)
  i18n/             i18next setup, supported languages, en/cy catalogues (ADR-008)
  styles/           Tailwind v4 entry CSS + theme tokens
tests/e2e/          Playwright specs + fakes for GIS and the Sheets API
tests/fixtures/     example data shared by unit and E2E tests; never live data
build/              build-time helpers for vite/playwright/eslint config (GitHub Pages base
                    path, the design-token lint rules and their fixtures)
.github/            CI/CD workflow (verify, e2e, deploy to Pages), Dependabot (ADR-007),
                    PR template
docs/               ADRs, backlog, glossary, analyses, runbooks (docs/AGENTS.md)
.agents/skills/     agent skills, for every agent runtime
.claude/            Claude reviewer/worker agents, session hook, skills symlink
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
pnpm exec playwright install --with-deps chromium   # once per @playwright/test version
pnpm test:e2e       # Playwright: builds, serves with vite preview, fakes GIS + Sheets
pnpm build && pnpm preview
actionlint          # after editing .github/workflows (not a dependency; install ad hoc)
```

## Conventions

- TypeScript strict; no `any`, no non-null assertions without a comment justifying them.
- Named exports; kebab-case file names; one concept per module.
- Components: function components, props typed inline or as `XxxProps`.
- Tests sit beside the code as `*.test.ts(x)`; E2E under `tests/e2e/`.
- Add shadcn components with the shadcn CLI (`pnpm dlx shadcn@latest add <name>`), Base UI
  flavour — never hand-roll a competing primitive or pull in Radix.
- All user-facing copy (text, aria-labels, notices, titles) goes through i18n (`t()`), in
  English (`en`) and Welsh (`cy`) — see ADR-008. A new key needs both languages; the type
  system enforces parity. Copy is sentence case. Domain/infrastructure emit codes, not copy.
  `i18next/no-literal-string` rejects literal JSX text and literal `aria-label`/`title`/
  `alt`/`placeholder` attributes outside tests and `components/ui`.
- Design tokens (ADR-010): style only with the semantic tokens of `src/styles/globals.css`.
  For focus use `focus-visible:focus-fill` (buttons, button-styled links, menu items),
  `focus-ring` (cards, inputs) or `focus-link` (text links). When no token fits, add one per
  `src/styles/AGENTS.md`, never an `eslint-disable`; read it too before touching the DHCW
  pin.

## Working conventions

- Before inspecting or changing an area, read each `AGENTS.md` along its directory
  ancestry, and those of affected callers and tests. `AGENTS.md` is the guide for every
  agent; a `CLAUDE.md` beside it only imports it (`@AGENTS.md`), so add that file with
  each new nested guide. The closest guide governs its scope; explicit user instructions
  take precedence.
- Continue within the user's authorized scope; ask only for a decision or access that
  blocks useful work.
- Use the existing isolated checkout; create a worktree only when asked, and preserve
  unrelated work. Worktrees share one host: stop a process by its PID or port, never with
  a pattern kill such as `pkill -f vite`, which also stops other worktrees' servers.
- Within a task's scope, prefer the cleaner structure (refactor, rename, extract shared
  code) over the smallest diff; effort is not a reason to choose a lesser design.
- Leave each file you touch tidier than you found it, keeping incidental repairs
  proportional and within touched files. Record any other actionable finding in the
  backlog (`docs/AGENTS.md`); a PR note alone is not a record.

## Workflow for delivery agents

- Deliver a story, defect or chore (including "implement the next logical story from
  epic X") with `.agents/skills/implement-story/SKILL.md`, and several with
  `.agents/skills/orchestrate/SKILL.md`; asking for an orchestrated delivery is asking
  for the new top-level session the skill starts at each item handoff. Any other change that ends in a PR follows
  implement-story's steps 3–6 unasked. Read its `references/delegation.md` before
  delegating any work.
- Before a PR is raised, every change gets two independent correctness reviews
  (`code-review`: Opus and Sol, Codex `gpt-6.1-sol`) and one quality review
  (`quality-review`: Sonnet), in the rounds `delegation.md` sets. A docs-only PR takes
  the correctness reviews alone; a report-only run-summary PR takes none.
- A PR is raised and left for the owner; babysit or merge it only when asked.
- Any change to visible UI publishes before/after screenshots
  (`references/screenshots.md`).
- Every delivery appends an entry to the Handoff log below.
- Records, ADRs and analyses follow `docs/AGENTS.md`; domain terms follow
  `docs/GLOSSARY.md`. Invoke the `copywriter` skill before writing user-facing copy.
- Skills live in `.agents/skills/`, which Copilot and Codex read; `.claude/skills` is a
  symlink to it for Claude Code. If a skill is missing from your runtime's catalogue,
  read its `SKILL.md` and follow it.
  Agent roles in `.claude/agents/` are briefs for fresh workers.
- Before editing these instructions, a skill or an agent, read
  `.agents/skills/writing-for-agents/SKILL.md` and
  `docs/operations/authoring-agent-instructions.md`.

## Handoff log

Newest last. Each entry: story id, what changed, decisions, gotchas for the next agent.

- **Backlog/ADRs (orchestrator)** — Backlog STY-001–STY-009 and ADR-001…008 created
  (i18n — English + Welsh — added as STY-004 at the user's request; later stories renumbered). Branch
  `feat/bootstrap`. Remote is `collisdigital/roadmaps-editor`, so the production origin is
  `https://collisdigital.github.io` and base path `/roadmaps-editor/`.
- **STY-001 Tooling foundation** — Vite 8 + React 19 SPA scaffold: strict TS, Tailwind v4,
  shadcn/ui on Base UI (Button only), TanStack Router file routes with hash history,
  ESLint flat config with ADR-002 layer rules, Prettier, and Vitest + RTL + MSW.
  - Versions (exact, from the lockfile): pnpm 12.18.0 (`packageManager`), Node
    `^22.22.2 || ^24.15.0 || >=26` (`.nvmrc` 22), react/react-dom 19.3.1, vite 8.3.6,
    @vitejs/plugin-react 6.2.1, typescript 6.0.3, typescript-eslint 8.72.1, eslint 10.14.0,
    @eslint/js 10.0.1, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-refresh 0.5.7,
    eslint-plugin-jsx-a11y-x 0.2.0, eslint-config-prettier 10.1.8, prettier 3.9.10,
    prettier-plugin-tailwindcss 0.8.1, tailwindcss and @tailwindcss/vite 4.3.5, shadcn 4.23.0
    (style `base-nova`, neutral), @base-ui/react 1.9.0, cn 0.5.2, class-variance-authority
    0.7.1, lucide-react 1.70.0, tw-animate-css 1.4.0, @fontsource-variable/geist 5.3.0,
    @tanstack/react-router 1.170.46, @tanstack/router-plugin 1.169.0, zod 4.6.7, vitest
    5.1.0, jsdom 31.0.0, msw 3.0.4, @testing-library/react 16.3.3, dom 10.4.2, user-event
    14.6.8, jest-dom 7.0.1. TanStack Query is not installed yet; add it in the story that
    first uses it.
  - Compatibility:
    - TypeScript is 6.0, not 7.0, because typescript-eslint 8.x requires
      `typescript <6.1.0`.
    - `eslint-plugin-jsx-a11y` supports only ESLint up to 9, so we use its maintained fork,
      `eslint-plugin-jsx-a11y-x`.
    - pnpm 12's release-age policy can resolve a just-published patch one version back.
      This is expected.
    - `pnpm install` may print "Agent skills awaiting approval" for TanStack packages. It
      is harmless; do not approve it.
  - Gotchas:
    - **Dev needs `.env.local`.** Run `cp .env.example .env.local`. `vite dev` does not
      load `.env.production`, and `main.tsx` imports `@/app/config`, which throws if the
      config is missing.
    - Vitest supplies placeholder env values through `test.env` in `vite.config.ts`.
    - MSW 3 uses `onUnhandledFrame`, not `onUnhandledRequest`, and imports `http` from
      `msw/http`. Tests register handlers with `server.use()` from `@/test/msw-server`;
      unhandled requests fail.
    - Tests import `describe`, `it` and `expect` from `vitest` explicitly. There are no
      globals; `setup.ts` runs RTL `cleanup` and stubs `window.scrollTo` for the router.
    - The `@/*` alias lives in both tsconfig files, because the shadcn CLI reads only the
      root one. Vite resolves it through `resolve.tsconfigPaths`.
    - shadcn's button imports `cn` from the `cn` package (upstream). `@/lib/utils`
      re-exports it.
    - The router plugin generates `src/routeTree.gen.ts` on `dev`/`build`. Commit it after
      adding routes. Files in `src/routes/` become routes, so put tests elsewhere, e.g.
      `src/app/router.test.tsx`.
    - `react-refresh/only-export-components` is off for `src/routes` and
      `src/components/ui`.
    - Layer rules are `no-restricted-imports` blocks in `eslint.config.ts`. They match both
      `@/x` and relative `../x` imports. Features must NOT import `app/` or
      `routes/` (orchestrator correction: that would be a cycle; the repository context lives
      in `features/roadmaps/`, see ADR-002).
    - Placeholder copy in `src/routes/index.tsx` is English only, so STY-004 moves it into the
      catalogues.
- **STY-002 Domain, errors, Google Sheets repository** — framework-free domain, `AppError`,
  and the Sheets adapter. ADR-002 amended (optional abort `signal`, contract test).
  - Public API:
    - `@/domain/roadmap/roadmap`: `Roadmap { id; name }`.
    - `@/domain/roadmap/roadmap-repository`: `RoadmapRepository.listRoadmaps(options?:
ListRoadmapsOptions)` where `ListRoadmapsOptions = { signal?: AbortSignal }`. On abort
      it rejects with `signal.reason` (not an `AppError`); every other failure is an
      `AppError`.
    - `@/lib/errors`: `AppError(kind, { message?, retryable?, status?, cause? })` with
      `kind: AppErrorKind`, `retryable` (defaults true only for `rate-limited`/`network`),
      `status?`; `isAppError`, `toAppError(unknown)` (non-`AppError` -> `unknown`).
      `message` is developer diagnostics; UI copy must come from `kind` (ADR-008).
    - `@/infrastructure/google-sheets` (barrel, composition root only):
      `createSheetsClient({ getAccessToken, fetch?, baseUrl? })` and
      `new GoogleSheetsRoadmapRepository({ client, spreadsheetId })`, plus the
      `AccessTokenProvider = () => string | null` type.
    - `@/domain/roadmap/testing/roadmap-repository-contract`:
      `describeRoadmapRepositoryContract(name, { withRoadmaps(roadmaps), failing() })`.
  - Decisions:
    - HTTP mapping: 401 -> `unauthenticated`, 403 -> `forbidden`, 404 -> `not-found`, 429 ->
      `rate-limited`, 5xx -> retryable `unknown`, other statuses -> non-retryable `unknown`.
      Fetch rejections and body-stream failures -> `network`; unparsable JSON ->
      `invalid-response`. Google's `error.status`/`message` goes into `AppError.message`
      only, for diagnostics.
    - Zod: `sheets` defaults to `[]`; `sheetId` must be an integer; unknown fields are
      stripped. Hidden sheets are dropped and response order is kept, with no name-based
      filtering.
    - The default `fetch` is resolved at call time, so MSW's patched global is used.
  - Gotchas for STY-003 and later:
    - Inject auth as `getAccessToken: () => authClient.getAccessToken()`. It is read
      synchronously on every request, and a `null` or empty token rejects as
      `unauthenticated` without a request. STY-003's `AuthClient.getAccessToken()` should
      return `string | null`.
    - STY-006 must call `reportUnauthenticated()` on a `kind === "unauthenticated"` error.
    - STY-006's in-memory test double should run `describeRoadmapRepositoryContract`. It must
      honour `signal` (`signal?.throwIfAborted()`) and reject with `AppError`s. Contract
      fixture ids are numeric strings.
    - The contract helper imports `vitest`. It lives under `testing/`, so production code
      must never import it.
- **STY-003 Google Identity Services auth** — `AuthClient` port, GIS token-model adapter, React
  bridge and test fake. ADR-002/003 amended: the port lives in `domain/auth/` (infrastructure
  may not import `features/`), there is one token client per attempt, and the prompt policy is
  defined.
  - Public API:
    - `@/domain/auth/auth-client`: `AuthClient { getSnapshot, subscribe, connect, disconnect,
getAccessToken(): string | null, reportUnauthenticated }`. Its members are function
      properties, safe to pass detached. Also `AuthState`, `AuthFailureCode`,
      `AuthCancellationCode` and `AuthErrorCode`.
    - `@/infrastructure/google-identity` (composition root only):
      `createGoogleAuthClient({ clientId, scopes, loadScript?, onDisconnect? })` returns a
      `GoogleAuthClient`, which is an `AuthClient` plus `dispose()`.
    - `@/infrastructure/google-sheets`: adds `SHEETS_SCOPE` (full spreadsheets scope).
    - `@/features/auth/auth-provider`: `<AuthProvider client={…}>`.
      `@/features/auth/use-auth`: `useAuth()` returns
      `{ state, connect, disconnect, reportUnauthenticated }`. The result is memoised per
      state, actions are stable, and it throws outside the provider.
    - `@/features/auth/testing/fake-auth-client` (test-only, imports vitest):
      `createFakeAuthClient(initial = { status: "ready" })`. Its spies apply happy-path
      transitions: `connect` → `connected` (1 h), `disconnect` → `ready`,
      `reportUnauthenticated` → `expired`. `setState(any)` reaches every other state, and
      `getAccessToken()` returns `FAKE_ACCESS_TOKEN` while connected.
    - `@/lib/external-store`: `createExternalStore(initial)` with `getSnapshot`, `subscribe`
      and `setSnapshot`; the snapshot identity only changes on change.
  - State machine:
    - Startup: `initializing` → `ready`, or `error(script-load-failed)`.
    - `connect()` from `ready`, `expired` or `error` → `connecting`, which ends in one of:
      - `connected { expiresAt }`;
      - `error(access-denied | scope-not-granted | unknown)`;
      - back to `ready`/`expired` with `lastError: popup-closed | popup-blocked`.
    - `connected` → `expired` when the timer fires (60 s before Google's expiry) or on
      `reportUnauthenticated()`.
    - `disconnect()` from `connecting`, `connected` or `expired` → `ready`. It revokes a held
      token, then calls `onDisconnect`.
    - From `error(script-load-failed)`, `connect()` only retries the load; the user clicks
      again once `ready`.
    - Prompt: `''` when reconnecting from `expired`, `consent` after `scope-not-granted`,
      otherwise GIS's default.
  - STY-004 i18n: error codes needing `auth.errors.*` copy are `script-load-failed`,
    `access-denied`, `scope-not-granted`, `unknown`, `popup-closed` and `popup-blocked`. The
    statuses are `initializing`, `ready`, `connecting`, `connected`, `expired` and `error`.
    There is no prose in state.
  - STY-005 wiring (`app/composition.ts`):
    `createGoogleAuthClient({ clientId: config.googleClientId, scopes: [SHEETS_SCOPE],
onDisconnect: () => queryClient.removeQueries({ queryKey: authScopedQueryKey }) })`, then
    `createSheetsClient({ getAccessToken: authClient.getAccessToken })`, and
    `import.meta.hot?.dispose(() => authClient.dispose())`. Create it at startup so GIS loads
    early.
  - Gotchas:
    - Call `connect()` directly in the click handler, with no `await` before it, or the
      popup is blocked.
    - `onDisconnect` exists only on the Google client. The fake's `disconnect` does not clear
      queries, so STY-005's test utility must wire that itself if it tests clearing.
    - `getAccessToken()` returns `null` once `expiresAt` passes, even before the timer
      fires. The resulting `unauthenticated` error should make STY-006 call
      `reportUnauthenticated()`.
    - `reportUnauthenticated()` cannot tell which token a 401 was for. A 401 from a request
      sent before a reconnect, arriving after it, would expire the new session (unlikely,
      since a reconnect takes a popup round-trip).
    - `@types/google.accounts` (0.0.18) enters only through
      `infrastructure/google-identity/gis-types.ts`. Its `TokenResponse` is wrong (every field
      required, `expires_in: string`), so responses are parsed with Zod in
      `token-response.ts`. ESLint forbids the `google` global (including `window.google`)
      everywhere else; type-only references are not linted.
    - Tests: `vi.waitFor` advances fake timers, so pin the clock afterwards with
      `vi.setSystemTime`. The loader's memo is module state, so its tests use
      `vi.resetModules()` and a dynamic import.
- **STY-004 i18n foundation** — i18next 27.0.1 + react-i18next 18.0.1, English and Welsh
  catalogues, `LanguageSwitcher`, document sync, lint rule. ADR-008 amended (switcher
  location, `syncDocumentLanguage`, `Catalogue` type, lint config).
  - Where things live (`@/i18n` barrel): `createI18n({ language? })` (fresh instance, no
    globals), `syncDocumentLanguage(i18n, doc?)` (sets `<html lang>` + `document.title` now
    and on every change; returns a stop function), `resolveLanguage()` (stored → browser
    `cy-*` → `en`), `storeLanguagePreference(lang)` (key `roadmaps.language`),
    `supportedLanguages`, `Language`, `isLanguage`, `languageEndonyms`. Catalogues:
    `src/i18n/locales/en.ts` (source of truth) and `cy.ts` (typed with `satisfies Catalogue<…>`). `t()` keys are typed by `src/i18n/i18next.d.ts`.
  - Adding a key: add it to `en.ts`, then `cy.ts` (typecheck fails until you do). Plural
    keys: `foo_one`/`foo_other` (optional `foo_zero`) in English; Welsh needs all six of
    `foo_zero/one/two/few/many/other`. Call `t("foo", { count })`; `count` is required by
    the types. Use `{{count, number}}` for locale number formatting.
  - Seeded keys for STY-005/STY-006: `common.{appName,loading,retry}`, `layout.{skipToContent,home}`,
    `landing.{tagline,source,accessNote}`, `auth.{connect,reconnect,disconnect}`,
    `auth.status.<AuthState status>`, `auth.errors.<AuthErrorCode>`,
    `auth.notifications.{connected,disconnected}` (toasts), `roadmaps.{title,description}`,
    `roadmaps.{refresh,loading,count,loadFailed}`, `roadmaps.empty.{title,description}`,
    `roadmaps.detail.{comingSoon,back,connectPrompt,notFoundTitle,notFoundDescription}`,
    `errors.<AppErrorKind>`, `notFound.{title,description,home}`, `theme.toggle`,
    `language.label`. Map codes with template keys, e.g. ``t(`errors.${error.kind}`)`` and
    ``t(`auth.status.${state.status}`)`` — `satisfies Record<…>` in `en.ts` makes a new kind
    or status without copy a type error.
  - STY-005 wiring: move `const i18n = createI18n({ language: resolveLanguage() })` and
    `syncDocumentLanguage(i18n)` from `src/app/main.tsx` into `app/composition.ts`; move
    `<I18nextProvider i18n={i18n}>` into `app/providers.tsx` (outermost, so toasts and the
    router see it). Move `<LanguageSwitcher />` (`@/components/layout/language-switcher`)
    from the placeholder `src/routes/index.tsx` into the header next to the theme toggle.
    If routes later set per-page titles, change `syncDocumentLanguage`, which currently
    always sets the app name.
  - Tests: `renderWithI18n(ui, { language? })` in `src/test/render-with-i18n.tsx` returns
    RTL's result plus `i18n` (fresh English instance by default; pass `language: "cy"`).
    STY-005's `render-with-providers` should build on `createI18n` the same way. Tests that
    call `syncDocumentLanguage` or switch language must stop syncing and restore
    `document.title`, `<html lang>` and `localStorage` in teardown.
  - Gotchas:
    - Welsh is machine-assisted ("map trywydd" = roadmap, "taenlen" = spreadsheet); a
      fluent speaker must review it before launch. STY-008's README should track that.
    - The switcher selects via each radio item's `onClick`, not the group's
      `onValueChange`, because Base UI does not fire that for the checked item and
      re-selecting must still persist the choice.
    - Its accessible name is "Language English": a `sr-only` label, a `{" "}` text node,
      then the endonym (`max-sm:sr-only` on mobile, so the name never changes). Keep the
      space node; without it the name is "LanguageEnglish".
    - `.ts` files are not covered by the literal-string lint rule; keep copy out of them.
- **STY-005 Composition root, routing, app shell, theme, auth UI** — TanStack Query 5.107.1 and
  sonner 2.0.8 added (shadcn `badge`, `sonner`; `next-themes` removed: `ui/sonner.tsx` reads
  our `useTheme`). New i18n keys: `layout.notifications`, `roadmaps.detail.title`,
  `theme.switchToDark/switchToLight` (replaced `theme.toggle`).
  - Composition: `composeApp(config?)` in `app/composition.ts` (the only importer of
    `@/infrastructure`) builds and returns `AppServices = { i18n, queryClient, authClient,
roadmapRepository }`; it also starts `syncDocumentLanguage` and wires the auth client's
    `onDisconnect` to `removeAuthScopedQueries(queryClient)`. `main.tsx` calls it, then
    `createAppRouter()` (hash history by default; `app/router.tsx`, registers the router type).
  - Provider tree (`app/providers.tsx`, `<AppProviders services>`), outermost first:
    `I18nextProvider` → `ThemeProvider` → `QueryClientProvider` → `AuthProvider` →
    `RoadmapRepositoryProvider` → children, plus `<AuthNotifications />` and `<Toaster />`.
  - Query client: `createQueryClient()` in `lib/query-client.ts` (staleTime 60 s, no refetch on
    focus, `shouldRetryQuery`: only retryable `AppError`s, at most 2 retries). No `QueryCache`
    hooks yet; STY-006 adds the `unauthenticated` → `reportUnauthenticated()` handling.
  - Auth-scoped data: `authScopedQueryKey = ["auth-scoped"]` and
    `removeAuthScopedQueries(queryClient)` in `features/auth/auth-scoped-queries.ts`. STY-006's
    `roadmapKeys.all` must start with `...authScopedQueryKey` so disconnect clears it.
  - Repository: `RoadmapRepositoryProvider` / `useRoadmapRepository()` in
    `features/roadmaps/roadmap-repository-context.tsx`. Test double (already done for STY-006):
    `createInMemoryRoadmapRepository(roadmaps | AppError)` in `features/roadmaps/testing/`,
    which runs the repository contract.
  - UI: `components/layout/{app-shell,app-header,brand-mark,not-found-page}.tsx` (the shell takes
    `headerActions`; the root route composes `ConnectionStatus`, `LanguageSwitcher`,
    `ThemeToggle`, `AuthButton`). `features/auth/components/`: `AuthButton` (Connect /
    Reconnect / Disconnect; busy but focusable while initializing/connecting),
    `ConnectionStatus` (live `role=status` badge; dot only below `sm`), `AuthNotifications`
    (toasts: connected, disconnected, OAuth failure, popup blocked; one toast id `auth`).
    `features/home/`: `HomePage` (connected → `RoadmapsPage`, otherwise `WelcomeHero`).
  - Routes: `__root.tsx` (shell + `notFoundComponent`), `index.tsx` → `HomePage`,
    `roadmaps.$roadmapId.tsx` → `RoadmapDetailPage` (placeholder; does not read the param yet).
  - Theme: `components/theme/` — light default, key `roadmaps.theme`; the inline script in
    `index.html` applies `dark` before paint (keep its key in step). `.dark` sets
    `color-scheme`. Accent token `--brand` / `text-brand` (indigo), used sparingly. A global
    `prefers-reduced-motion` rule in `globals.css` stills all animations.
  - Tests: `await renderWithProviders({ path?, history?, authState?, roadmaps?, repository?,
language? })` (`src/test/render-with-providers.tsx`) renders the real `AppProviders` and
    routes with a fake auth client (its `disconnect` clears auth-scoped queries, via the
    fake's new `onDisconnect` option), an in-memory repository and memory history. It returns
    RTL's result plus `authClient`, `queryClient`, `router`, `i18n`. Scope queries with
    `within(screen.getByRole("banner"|"main"))`, because header and hero both have "Connect
    Google".
  - STY-006 plug-in: put the list under the heading in `features/roadmaps/pages/roadmaps-page.tsx`
    (rendered by `HomePage` when connected); revisit `HomePage` for `expired` if cached cards
    should stay with a reconnect prompt. In the detail route, read `Route.useParams()` and pass
    `roadmapId` to `RoadmapDetailPage`; replace `roadmaps.detail.title` with the roadmap name.
  - Gotchas:
    - Links styled as buttons use `cn(buttonVariants())` on `<Link>` (STY-006: without `cn`,
      `border-transparent` beats the outline variant's border). Base UI's
      `<Button render={<Link/>} nativeButton={false}>` adds `role="button"`.
    - Sonner's store is global and replays active toasts into a new `Toaster`; `setup.ts`
      dismisses them after each test. To assert a toast did _not_ appear, flush Sonner's
      timer first (see `flushToasts` in `app/app.test.tsx`).
    - The skip link prevents default and focuses `<main>`, because hash history owns the URL
      fragment.
    - The main JS chunk is ~580 kB, above Vite's warning threshold; consider chunking in STY-008/STY-009.
      (Fixed in STY-009: `zod/mini` plus `react`/`vendor` chunks.)
- **STY-006 Roadmaps feature** — list, states and detail page; shadcn `alert`, `empty`,
  `skeleton` added. New i18n keys: `roadmaps.refreshFailed`,
  `roadmaps.expired.{title,description}`.
  - Hooks (`features/roadmaps/hooks/`): `roadmapKeys.all/list()` (under
    `authScopedQueryKey`) and `roadmapListQueryOptions(repository)` (passes the abort
    `signal`; `staleTime`/retries from the client defaults) in `roadmap-queries.ts`;
    `useRoadmaps()` and `useRoadmap(id)` (`select`; `data` is `null` for an unknown id) in
    `use-roadmaps.ts`, both `enabled` only while `connected`; `useRoadmapsProblem(error)`
    returns an `AppError` for an expired session (until reconnected) or the query error.
  - 401 wiring: `createQueryClient({ onUnauthenticated })` (`QueryCache.onError`), wired by
    `composeApp` to `authClient.reportUnauthenticated()`. `composeApp` also calls
    `invalidateAuthScopedQueriesOnSessionEnd(authClient, queryClient)`
    (`features/auth/auth-scoped-queries.ts`) so Reconnect always refetches.
    `renderWithProviders` wires both the same way and sets `retryDelay: 0`.
  - UI states: `/` shows `RoadmapsPage` while `connected` or `expired` (and while
    `connecting` from those). Loading → `RoadmapGridSkeleton` (`role=status`, "Loading
    roadmaps…"); empty → `RoadmapsEmptyState`; error without data →
    `RoadmapsErrorState variant="panel"` (`role=alert`, kind-specific icon, Retry only if
    retryable, Reconnect for an expired session); error or expiry with data → the same
    component as `variant="alert"` above the grid. No toasts for query errors. Refresh is
    `aria-busy` while fetching and disabled (focusable) unless connected. Shared pieces:
    `StatusPanel` (Empty-based, `titleAs` h1/h2), `ReconnectButton`
    (`features/auth/components`). The detail route passes `Route.useParams().roadmapId`.
  - STY-007 E2E hooks (stable accessible names, en): heading "Your roadmaps"; cards are links
    named by the roadmap name inside `main`'s only `list`, `href` `#/roadmaps/<sheetId>`;
    count text "N roadmaps"; buttons "Refresh", "Retry", "Reconnect" (inside the alert;
    the header has another "Reconnect"); alert titles "Couldn't load your roadmaps",
    "Couldn't refresh your roadmaps", "Your session has expired"; empty "No roadmaps yet";
    detail h1 = roadmap name, "Roadmap not found", "Back to roadmaps". Welsh: "Eich
    mapiau trywydd", "Adnewyddu", "2 fap trywydd".
  - Gotchas:
    - A 5xx/network error is retried twice with back-off (~3 s) before the error shows;
      E2E should wait accordingly (or answer 403 for a fast failure).
    - Base UI's `focusableWhenDisabled` sets `data-disabled`, not `:disabled`, so
      `disabled:` styles don't apply; Refresh adds `data-disabled:opacity-50`.
    - shadcn's `Alert` forces icon colour with `*:[svg]:text-current`; override with `!`.
    - TanStack Query v5.107 deprecates `fetchQuery`; tests use `queryClient.query()`.
- **STY-007 Playwright E2E** — `@playwright/test` 1.64.1 (pinned exactly: it must match the
  installed Chromium revision, 1248) and `@axe-core/playwright` 4.14.0. No app bugs found.
  See `tests/e2e/AGENTS.md` for the fixture API and conventions.
  - Running: `pnpm test:e2e` (`playwright.config.ts`). Its `webServer` runs
    `pnpm build && pnpm preview --port 4173 --strictPort`; locally it reuses a server already
    on 4173 (stop a stale `pnpm preview`), never on CI. 31 tests, ~13 s locally, 4 workers.
    The build reads `.env.production` (and `.env.local`, as `vite build` does); the fakes
    read the same values with Vite's `loadEnv`.
  - Specs: `landing`, `roadmaps` (order, hidden sheet, empty, Refresh, card → detail,
    deep link + reload, not found), `roadmap-errors` (5xx → Retry, 403 copy, 401 → expired →
    Reconnect, token expiry), `auth` (denied, scope not granted, 60 s grant, popup
    blocked/closed, consent re-prompt, script load failure, disconnect), `preferences`
    (theme, Cymraeg + reload, Welsh browser locale), `accessibility` (axe, WCAG 2.2 AA,
    light and dark).
  - Hermetic: a context-level guard aborts every other origin (HTTP and WebSocket) and fails
    the test; service workers are blocked; uncaught page errors fail the test. The fakes
    record misuses (wrong client ID/scope, `requestAccessToken` outside a user gesture, wrong
    path/`fields`/token on Sheets) as violations that fail the test at teardown.
  - STY-008 CI: `pnpm install --frozen-lockfile`, then cache `~/.cache/ms-playwright` keyed on
    the `@playwright/test` version from the lockfile; on a miss run `pnpm exec playwright
install --with-deps chromium`, on a hit `pnpm exec playwright install-deps chromium`.
    `CI=true` turns on `forbidOnly`, 2 retries (trace on first retry), and the `github` +
    `list` + `html` reporters. Upload `playwright-report/` (and `test-results/` for traces
    and failure screenshots) with `if: ${{ !cancelled() }}`. The job needs no build step of
    its own: the webServer builds.
  - STY-008 base path: specs only navigate relative to `baseURL` (`./`, `./#/roadmaps/42`).
    When the build gets base `/roadmaps-editor/`, set `use.baseURL` and `webServer.url`
    to `http://localhost:4173/roadmaps-editor/` from the same resolver (trailing slash
    kept), or build the E2E bundle with base `/`.
  - Gotchas:
    - `page.evaluate` runs with a user gesture, so it cannot test the popup-gesture check.
    - Retryable failures (5xx, 429, network) back off ~3 s before the error shows; use
      `page.clock.install()` before `goto` and fast-forward (see `roadmap-errors.spec.ts`).
    - Sonner toasts: assert presence in E2E; assert absence in component tests, which can
      flush Sonner's timer.
    - The header and page both have Connect/Reconnect buttons, and the header's connection
      badge is also `role=status`: scope locators to `main`/`banner`.
- **STY-008 CI/CD, Pages base path, README** — `.github/workflows/ci.yml` ("CI/CD"),
  `.github/dependabot.yml`, `build/resolve-base-path.ts`, full `README.md`. ADR-007
  amended (see its "STY-008 amendments"). `.nvmrc` is now 26 (Active LTS since 2026-10-28);
  `engines` unchanged.
  - Workflow: `verify` (typecheck, lint, format, test, build; on push to `main` also
    configure-pages → base-path guard → upload-pages-artifact) ∥ `e2e` (Playwright, browser
    cache keyed on its version, report artifact) → `deploy` (push to `main` only; just
    `deploy-pages`, no checkout/install). Permissions: top `contents: read`; `verify` +
    `pages: read`; `deploy` only `pages: write` + `id-token: write`. Actions are pinned to
    commit SHAs with the version in a comment; Dependabot bumps them monthly. The Pages
    artifact is named per attempt and passed to `deploy` via `needs.verify.outputs`.
  - Base path: `resolveBasePath(process.env)` in `vite.config.ts` **and**
    `playwright.config.ts`: `VITE_BASE_PATH` > `PAGES_CUSTOM_DOMAIN` (→ `/`) >
    `GITHUB_REPOSITORY` (`owner.github.io` repo → `/`, else `/<repo>/`) > `/`. Blank = unset.
    CI always has `GITHUB_REPOSITORY`, so CI E2E runs under `/roadmaps-editor/`; locally
    `/`. `vite preview` reads `base` from the config too, so preview a base-path build with
    the same env. No `CNAME` (ignored for Actions deployments).
  - Lint workflows with actionlint (download the release binary; not a dependency).
    Version 1.7.12 rejects `concurrency.queue`.
  - Gotchas:
    - `pkill -f "vite preview"` does not match the preview process (`vite.js preview`) and
      `pkill -f` with a pattern in your own command line kills your shell; kill by PID or
      `fuser -k 4173/tcp`.
    - Node 25+ ships without Corepack; README tells users to install pnpm globally (it
      self-switches to `packageManager`'s version).
    - Vite gives `.env.production` priority over `.env.local` for builds; local build
      overrides go in `.env.production.local`.
  - STY-009: the README's Google Cloud steps are unverified against a live console session;
    check them while doing the manual real-GIS check. `.env.production`'s client must list
    `https://collisdigital.github.io` as an origin before the first deploy is usable.
    Pages must be enabled (Source: GitHub Actions) before the first push to `main`.
- **STY-009 Final verification, polish and review** — all brief §14 criteria checked with
  evidence in `docs/backlog/_archive/EPC-001-bootstrap/STY-009-final-verification.md`; whole-repo Sol review (3 findings,
  all fixed). Backlog complete: STY-001–STY-009 Done.
  - State: 264 unit/component tests, 31 E2E (also green under `/roadmaps-editor/`); build
    has no warnings. JS is 654 kB min / 214 kB gzip in `react`, `vendor` and app chunks
    (app ~48 kB), down from 717 / 234 kB with a 509 kB entry chunk.
  - Changes:
    - `zod/mini` everywhere: use `z.optional(x)`, `z._default(x, v)`,
      `x.check(z.trim(), z.regex(…))`, `z.pipe(a, z.transform(…))`. Mini loads no locale,
      so give messages explicitly.
    - `react`/`vendor` chunk groups in `vite.config.ts` (ADR-007 STY-009 amendment).
    - Mobile header: `common.shortAppName`; the status badge is `max-sm:sr-only`;
      `HeaderAuthButton` shows only Disconnect below `sm`. Every signed-out view must
      therefore keep its own Connect/Reconnect.
    - `AppShell` focus: focus goes to `<main>` after in-app navigation and when the
      focused control inside `<main>` is removed.
    - `useRoadmapsProblem` ignores a leftover `unauthenticated` error once connected.
    - On session end, auth-scoped queries are cancelled, then invalidated (Sol). This
      retires the STY-003 "late 401 after reconnect" gotcha.
    - Stricter ESLint layer blocks: `lib/`, `components/`, `i18n/`, and no UI/copy
      packages in domain/infrastructure.
    - E2E token guard (`tests/e2e/fixtures/persistence-recorder.ts`).
  - Live GIS (dev, real Google): the popup opens `accounts.google.com` with the right
    `client_id` and `scope`. `localhost:5173` is an authorised origin.
    `https://collisdigital.github.io` and `localhost:4173` get `origin_mismatch`. The
    consent screen is branded "FHIR Host". Sign-in, token grant and a live Sheets call
    were not verified.
  - Gotchas:
    - Screenshots against `pnpm dev` can't use `tests/e2e/fixtures/test.ts`: its hermetic
      guard rejects Vite's HMR WebSocket. Use `FakeGis`/`FakeSheets` directly.
    - StrictMode in dev aborts and repeats the first fetch, consuming a queued
      `sheets.respondWith` reply. Route Sheets yourself, or use the preview build.
    - `@typescript-eslint/unbound-method` flags saved prototype methods; `Reflect.get`
      and `Reflect.apply` keep them typed without detaching.
  - Recommended next steps:
    1. Do the external steps in STY-009: OAuth origin, consent-screen name, Pages on a
       private repo, push, then a manual live sign-in.
    2. Per-view `document.title` (move title ownership out of `syncDocumentLanguage`).
    3. A CSP `<meta>` validated against a real sign-in (README lists the origins).
    4. Fluent Welsh review.
    5. Dependabot for npm (actions only today), keeping Playwright pinned exactly with
       its browser cache.
    6. Then the roadmap detail feature, which will be the first real per-sheet read.
- **Agent skills and delivery process (no record)** — `.agents/skills/` (implement-story,
  orchestrate, retro, code-review, quality-review, copywriter, domain-modeling,
  ux-prototypes, shadcn, playwright-cli, writing-for-agents, grilling, codebase-design,
  improve-codebase-architecture), `.claude/agents/`, a SessionStart hook, the PR template,
  `docs/GLOSSARY.md`, `docs/AGENTS.md`, backlog templates and the epic/archive layout.
  - Decisions: Opus + Sol correctness and Sonnet quality reviews on every PR (docs-only:
    correctness alone; report-only: none); PRs
    are left open, with babysitting and merging as separate opt-ins; guidance names
    runtime capabilities, never tools; bootstrap stories archived unchanged
    apart from their IDs. Record IDs are `EPC-`/`STY-`/`DEF-`/`CHO-` plus three digits
    (`docs/AGENTS.md`); the old `S01`–`S09` and `D01` are now `STY-001`–`STY-009` and
    `DEF-001`.
  - Gotchas:
    - `node --test <dir>` fails on Node 22; pass the glob
      (`node --test '.agents/skills/*/scripts/*.test.mjs'`).
    - `playwright-cli` is not a dependency: `pnpm dlx @playwright/cli@0.1.24`, output in
      `.artifacts/playwright-cli/`.
    - The product is the DHCW Roadmap Editor for Product Leads (see "What this is").
      `docs/backlog/personas/product-lead.md` holds the primary persona and the
      owner's answers to its assumptions; the glossary marks item terms _(planned)_. The
      product name is "DHCW Roadmap Editor" (cy "Golygydd Mapiau Trywydd IGDC").
    - DEF-001 fixed in the same PR: `roadmaps.title` is now "Your roadmaps" / "Eich mapiau
      trywydd". A product name (`common.appName`) keeps its capitals; other copy is
      sentence case.
- **EPC-002 planning (orchestrator)** — `docs/analysis/roadmaps-tab-format.md`, ADR-009
  and EPC-002 (STY-010–012): roadmaps come from the first worksheet's rows, as on DHCW's
  public site. Tests use only the example data in `tests/fixtures/sheets/` (its README) or inline rows.
- **STY-010 Roadmap domain model and roadmap index parser** — ADR-009's `Roadmap`
  (`title: LocalisedText`, `published`, `category`, `family`, `statusLabel`,
  `productLead`, `lastUpdated`, `colour`, `vision`, `serviceDescription`) replaces
  `{ id, name }`; a pure parser reads the roadmap index's rows; new `AppError` kind
  `invalid-data` with en/cy copy. Nothing visible changes: the repository still lists
  worksheets (interim, removed by STY-011).
  - Where things live: `localise`/`ContentLanguage` (`domain/roadmap/localised-text.ts`),
    `ROADMAP_CATEGORIES` (`domain/roadmap/roadmap-category.ts`), `parseRoadmapIndex`
    (`infrastructure/google-sheets/roadmap-index-parser.ts`, not in the barrel),
    `createTestRoadmap(id, title, overrides?)` (`domain/roadmap/testing/test-roadmap.ts`),
    `useLanguage()` (`@/i18n`), `parseCsv` (`tests/fixtures/sheets/parse-csv.ts`). The
    record's Delivery lists the parser's contract and problem codes.
  - Decisions: problems are `{ code, row, column, value }` with no prose, recorded only
    for rows kept; `no-published-roadmap` is not recorded when `Enabled` is missing;
    the public site's translation-quality warnings are not ported.
  - Gotchas:
    - Components show roadmap text with `localise(text, useLanguage())`, never
      `text.en`, so Welsh appears when there is one.
    - `tests/fixtures` is in `tsconfig.app.json` and Vitest's `include`, so its helpers
      are type-checked and linted with `src`. Vitest reads a fixture CSV with
      `import csv from "…/Roadmaps.csv?raw"`; Node code (the E2E fake) reads it from disk.
    - The parser expects `rows[0]` to be spreadsheet row 1; read the whole tab by title,
      not a range starting lower.
- **STY-011 Roadmap list from the roadmap index** — the repository reads the tab list,
  then the first tab's values, and lists the parsed roadmaps in row order; ids are the
  public site's slugs (`#/roadmaps/producta`). The interim worksheet mapping is gone.
  Copy changed: `roadmaps.description`, `roadmaps.empty.description`,
  `roadmaps.detail.notFoundDescription` (Welsh machine-assisted; needs fluent review).
  - Where things live: `parseSheetValues` (`sheets-schemas.ts`); the first tab and the
    quoted range in `google-sheets-roadmap-repository.ts`. The parser's `tabTitles`
    option records `missing-tab`. The record's Delivery lists the exact requests.
  - Decisions: the first tab is the lowest `index` (missing = 0), hidden or not; no tabs
    is `invalid-data` with no values read; problems stay inside the adapter.
  - Gotchas:
    - One list load is two Sheets requests, so `sheets.tokens` in E2E has two entries per
      load; assert reads with `sheets.reads`. The fake fails any read of a tab other than
      the first.
    - Encode the quoted tab title with `encodeURIComponent` as one path segment; `'` stays
      literal and is doubled inside the quotes.
    - Tests use the example roadmaps (`producta`, `productb`, `productc`); `0` is the
      unknown id.
- **STY-012 Roadmap cards show each roadmap's information, grouped by product family** —
  the main page groups roadmaps by family and each card shows the roadmap's colour swatch,
  title, category, status, summary, product lead, last-updated date and a "Not published"
  badge; the count says how many are not published. Closes EPC-002 (archived).
  - Where things live (`features/roadmaps`): `groupRoadmaps(roadmaps, language)`
    (`group-roadmaps.ts`; families and titles by `Intl.Collator(language, { numeric: true })`,
    families matched ignoring case, accents, spaces and punctuation, no-family group last),
    `RoadmapGroups`, `RoadmapCard`, `RoadmapSwatch` (only `#rrggbb` reaches a style).
    `formatCalendarDate(date, t)` (`@/i18n`) and `foldText` (`@/lib/text`, moved out of the
    parser). New copy: `roadmaps.{categories,card,noFamily,unpublishedCount,countWithUnpublished}`
    and `common.{date,months}`; the Welsh is machine-assisted and needs a fluent review.
  - Decisions: category names are the public site's, in its casing (D12); the detail page
    still shows only the title.
  - Gotchas:
    - A card is a `li` holding the link (the title alone, stretched over the card with
      `::after`) and `aria-hidden` details the link's `aria-describedby` points at. axe
      (WCAG 2.5.3) rejects a link whose name leaves out visible text, so do not put the
      details inside the link. Assert a card's content on its `li`.
    - Dates take month names from the catalogues: Playwright's Chromium has no Welsh
      `Intl` data, so `Intl.DateTimeFormat("cy")` silently gives English there.
    - i18next nesting (`$t(key, {"count": {{n}} })`) keeps each part's plural forms in one
      key; `skipOnVariables` stops a product lead's name from being read as nesting.
    - A language change re-sorts groups and titles (the collator is per language); Welsh
      names fall back to English per roadmap, so a group sorts by the name shown.
- **EPC-003 planning (orchestrator)** — `docs/analysis/dhcw-design-system-alignment.md`,
  ADR-010 (which partly supersedes ADR-005's visual direction), and EPC-003 (STY-013–018).
  The UI ports the DHCW design system's tokens and patterns, pinned at v0.1.104, onto
  shadcn/Base UI, and never loads its CSS.
  - The dashboard sidebar is deferred to the first record that adds navigation
    (ADR-010 _Deferred_).
- **STY-013 DHCW colours, type and focus** — `globals.css` rewritten in ADR-010's three
  tiers (`--nhsw-*` copied from the pinned DHCW release, `--app-dark-*`, semantic tokens),
  Roboto (`@fontsource-variable/roboto`, Geist removed), DHCW's mobile type scale as
  `text-heading-*`/`text-body*`, 4px radius, and the `focus-fill`/`focus-ring`/`focus-link`
  utilities. `dhcw-design-system` is an exact GitHub-tag devDependency read by
  `src/styles/tokens.test.ts` (drift, literal colours); `contrast.test.ts` checks both
  themes. `cn` is configured in `@/lib/utils` and lint rejects the bare package. New
  `src/styles/AGENTS.md` (tokens, pin upgrade); README Design section.
  - Decisions: the dark theme is DHCW's navies (page `#0e1b2f`, surface `#13233c`) with
    DHCW's mid blue `#32598a` as the primary fill (a pale one barely changes when it turns
    yellow on focus) and the tag palette inverted. `--primary` is a fill, never text:
    text and icons in link blue use `--link`; status tokens are DHCW's tags; the
    status panel title is `text-heading-m` at either heading level.
  - Gotchas:
    - Vitest empties stylesheets, even `?raw`, unless `test.css.include` lists them
      (`vite.config.ts`).
    - Focus utilities: see `src/styles/AGENTS.md` (a `dark:` background hides the fill).
    - Buttons transition into focus styles: read computed focus styles with
      `expect.poll` in E2E.
    - Sonner's unlayered CSS beats utilities; `globals.css` overrides its font and size.
- **STY-014 Off-brand styling fails the build** — `globals.css` locks the theme (Tailwind's
  colours, fonts, sizes, line heights, letter-spacing, radii and shadows removed), and
  `eslint-plugin-better-tailwindcss` 4.10.0 (exact) plus `no-restricted-syntax` reject
  everything else; the app, `components/ui` included, is migrated. `--brand` is gone.
  - Where things live: `designTokenRules` in `build/design-token-lint.ts` (spread by
    `eslint.config.ts`); its fixture test `build/design-token-lint.test.ts` lints
    `build/fixtures/design-token-lint/*.tsx` as the `src/` path each names, marking each
    expected report `// ✗ <message>`. `src/styles/stylesheets.test.ts` (one stylesheet,
    `@theme` colours are tokens) and `src/styles/lint-exceptions.test.ts` (the swatch's
    disable is the only one touching a design rule). New tokens `--primary-hover`,
    `--secondary-hover`, `--popup-shadow` (`shadow-popup`).
  - Decisions: tests (`*.test.*`, `src/test/`) are exempt; `components/ui` may colour a
    menu item's focus highlight, nothing else may style an element's own focus beyond the
    focus utilities and layout; `dark:hidden` stays allowed; class maps must be
    variables named `…Classes` to be linted; a `style` attribute holds an object literal
    (perhaps cast, or chosen by a condition), never a variable or spread. The record's
    Delivery lists each migrated look.
  - Gotchas:
    - A shadow token named after a colour token is a colour: `shadow-popover` sets the
      popover shadow's colour, so the popup shadow is `shadow-popup`.
    - `prettier-plugin-tailwindcss` sorts unknown classes first, so class examples for
      other projects in Markdown sort differently under the locked theme.
    - Typed linting rejects a virtual file path, which is why the fixture test runs the
      design blocks with the parser alone.
    - In a scratch directory whose `node_modules` symlinks to the checkout's, run
      binaries as `./node_modules/.bin/playwright`: `pnpm exec` there installs and prunes
      the checkout's `node_modules` through the link. The same goes for reviewers in a
      shared checkout: `pnpm exec eslint` relinks `node_modules`.
- **STY-015 Shared components look like DHCW's** — buttons, tags, notices, cards, panels
  and menus are DHCW's, on STY-013's tokens and under STY-014's lint (no new exception);
  `InsetText`, `ContextChip` and `BackLink` (`components/layout/`) are ready for STY-016's
  shell. The detail page lost `RoadmapIcon` (D4) and menu items take `focus-fill` (D5).
  - Where things live: `Button` has `default`/`secondary`/`destructive`/`ghost` at
    `default` (40px) or `sm` (32px), no `outline`/`link`/`xs`/`lg`. `Badge` is DHCW's tag
    (`neutral`/`info`/`success`/`warning`/`danger`/`outline`, `TagVariant`); a status maps
    to a variant in one typed table (`connection-status.tsx`). `Alert` is a flex row of icon,
    `AlertContent`, `AlertAction`, with `info`/`success`/`warning`/`destructive`, `role`
    (default `alert`, `note` for what a status has announced) and `AlertTitle as="h1"|"h2"`.
    The roadmaps error state is a `destructive` alert when nothing loaded, `warning` for an
    expired session or above cards.
  - Tokens: `--destructive-fill`/`-foreground`/`-hover` (the red button, the same in both
    themes; `--destructive` stays text), `shadow-control-edge`, `shadow-card-bar`.
  - Gotchas:
    - `data-disabled:` (Base UI's focusable-while-disabled) is in the button's base, so a
      caller adds nothing for it.
    - A card is still a `li` with a stretched title link and `aria-hidden` details; the
      new chevron is a decorative circle in the card's `div`, not in the link.
    - The start page's notice is `role="note"`, since the connection status already
      announces the failure.
- **STY-016 The shell and pages are a DHCW staff service** — a navy header with the DHCW logo,
  a "Beta" phase banner, a footer with the version, DHCW's container and spacing, a plain
  start page, the DHCW skip link and favicon. No lint exception, no ADR change.
  - Where things live (`components/layout`): `AppShell` (skip link, `AppHeader`, `PhaseBanner`,
    `main` in a `PageContainer`, `AppFooter`; a page renders content only; a comment points at
    ADR-010's deferred sidebar), `AppInfoProvider`/`useAppInfo` (`{ version, feedbackUrl? }`,
    built by `composeApp`, passed to tests as `renderWithProviders({ appInfo })`). The start page
    is `features/home/pages/start-page.tsx` (`StartPage`, was `WelcomeHero`). `ContextChip` and
    `BrandMark` are gone. `Button` has a `header` variant; `AuthButton` takes `variant="header"`.
  - Config and build: `VITE_FEEDBACK_URL` (optional, https only, in `app/config.ts`);
    `build/resolve-build-version.ts` (`dev` locally, `<package version>+<short sha>` when
    `GITHUB_SHA` is set) feeds `__APP_VERSION__` through `vite.config.ts`. `ci.yml` is unchanged.
  - Tokens: `--header`, `--header-foreground`, `--header-hover`, `--header-border` (navy in both
    themes). Copy: `common.headerName` ("Roadmap Editor"; the logo says DHCW), `layout.logoAlt`,
    `layout.phase.*`, `layout.footer.*`. `textLinkClasses` is the one text-link style. The Welsh
    is machine-assisted and needs a fluent review.
  - Decisions: the full logo (`nhsw-logo.svg`, the record's file) is DHCW's bilingual lockup and
    includes the NHS Wales mark; the owner kept it (D8), and ADR-010 now allows the mark inside
    DHCW's own logo only.
    The home link keeps its full accessible name; its focus is the ring, as a yellow fill would
    hide the white logo. The favicon is the white icon on a navy tile.
  - Gotchas:
    - The header's width is tight in Cymraeg from 375px to `lg`: `shell.spec.ts` checks the
      service name is not truncated at 375, 640, 768, 900 and 1024px (D6). The status chip is
      visually hidden below `lg` and the language endonym below `md` for that reason; a wider
      control or name breaks it.
    - A new top-level control for the header takes `variant="header"`; the default buttons
      are navy and vanish on the band.
    - Vitest and `vite build` read `GITHUB_SHA`: a component test must not assert a literal
      version; pass `appInfo`.
    - The logo is an imported asset (`?url` through Vite, under the base path); the favicon is
      `public/favicon.svg`, which index.html references and Vite rewrites to the base path.
- **STY-017 Failures stay on screen; a warning before the session ends** — no toasts:
  Sonner, `ui/sonner.tsx`, `AuthNotifications` and `layout.notifications` are gone (ADR-005
  amended). Connect, disconnect and renewal outcomes are one page notice above every page's
  content; two minutes before a session ends, DHCW's timeout dialog offers "Stay connected"
  (a one-click renewal, proven against the real Google in the record's D5) and "Disconnect".
  ADR-003 amended (renewal, the clock check on returning to the tab).
  - Where things live: `useAuthNotice`/`AuthNotice` (`features/auth`, composed in
    `routes/__root.tsx` above `<Outlet />`), `useSessionWarning` (`SESSION_WARNING_MS`) and
    `SessionWarning` (mounted in `AppProviders`), `AlertDialog` (`components/ui`, restyled as
    DHCW's timeout dialog on the new `--overlay` token), `formatDuration(seconds, t)`
    (`@/i18n`, `common.duration.*` plurals). Copy: `common.close`, `auth.notice.dismiss`,
    `auth.renewal.*`, `auth.sessionWarning.*`; the Welsh is machine-assisted.
  - Decisions: `connect()` from `connected` renews with `prompt: ''`, staying `connected`
    (no `connecting`, no reload) and ending in a new snapshot with a later `expiresAt` or a
    `lastError`; expiry, a 401 or Disconnect abandons a pending renewal. A failure notice is
    `role="alert"` (a closed popup and confirmations are notes) and stays until the next
    attempt or a dismissal. A confirmation clears itself after `CONFIRMATION_DWELL_MS` (8 s;
    `useNoticeDwell`, paused on hover and focus), and on the next state change or page.
    The copywriter's "Page notice" pattern is the rule for future "saved"/"published"
    confirmations.
  - Gotchas:
    - A renewal is a new `connected` snapshot: code that reacts to "became connected" must
      compare the previous status (`useAuthNotice` does), or a renewal reads as a connect.
    - The warning is modal: while it is open, role queries outside it find nothing. A test
      grant of about 180 s or less opens it at once (`tests/e2e/AGENTS.md`).
    - Component tests on Vitest fake timers cannot use `user-event`: RTL's async wrapper
      waits on a timer only Jest's fake timers run. Use `fireEvent`, render first on real
      timers (the router and queries settle on them), then `vi.useFakeTimers` and
      `advance(0)` (`session-warning.test.tsx`).
    - Base UI moves focus into the dialog on a real animation frame: `vi.waitFor` it.
- **STY-018 Tests hold the DHCW look without screenshots** — the owner dropped pixel
  baselines as fragile (D1); the look is held by aria snapshots, computed styles read
  against the tokens, focus tours and a layout guard. Closes EPC-003 (archived). No app
  code changed.
  - Where things live (`tests/e2e`): `structure.spec.ts` (+ `structure.spec.ts-snapshots/`,
    one YAML file per screen; English throughout, Cymraeg for the start and main pages and
    the connected header),
    `styles.spec.ts`, `focus-indicator.spec.ts` (tours of every tab stop, both themes),
    `shell.spec.ts` (widths 375 to 1280), `fixtures/look.ts` (`tokenColour`, `tokenValue`,
    `useTheme`, `useLanguage`). The update step is in `tests/e2e/AGENTS.md`.
  - Decisions: aria matching is exact (`children: "deep-equal"` in `playwright.config.ts`);
    footer never snapshotted (its version moves); a style test reads the token from the
    stylesheet, never a copied colour; `.prettierignore` skips the generated YAML.
  - Gotchas:
    - CI serves under `/roadmaps-editor/`, so `/url:` lines would differ: `expectStructure`
      points links at the site root before each snapshot. Run the suite once with
      `GITHUB_REPOSITORY=collisdigital/roadmaps-editor` after changing it.
    - `--font-sans` is inlined by Tailwind and not a custom property; the font check uses
      `--nhsw-font-family-base`.
    - A tab tour starts wherever focus is: after Connect it is on `<main>`, so the tour
      keeps pressing Tab past the end of the page, where focus leaves, until it has seen
      every stop. A menu opened with Enter needs its first item focused before an arrow key.
    - `page.clock.install()` runs time normally (Playwright resumes it on install), so the
      "Connected" notice still clears after eight real seconds: hover it with
      `holdConnectedNotice` in any test that snapshots or tours the main page.
- **EPC-004 planning (orchestrator)** — `docs/analysis/roadmap-tab-format.md`, ADR-011
  and EPC-004 (STY-019–021): each roadmap's items come from the tab its index
  row names, columns found by header, never position; the `Template` tab (second) is the
  public site's columns and is never read. Owner answers: all six placements shown in
  order, unplaced items shown flagged with their horizon as written, every field modelled
  and shown as plain text, organisations as standard codes. ADR-011 accepted after
  grilling (errors per roadmap, three reads per roadmap, no item identity yet).
- **STY-019 Roadmap item model and roadmap tab parser** — ADR-011's `RoadmapItem`,
  placements and organisations in `domain/roadmap/`, and a pure `parseRoadmapTab(rows)`
  (`infrastructure/google-sheets/roadmap-tab-parser.ts`, not in the barrel) returning
  items in row order plus problem codes. Nothing visible changes and nothing reads a
  roadmap's tab yet (STY-020). The glossary's item terms lost _(planned)_.
  - Where things live: `headerReader(columns, welshColumns)` and `matchKey`
    (`sheet-header.ts`) serve both parsers; `ProblemLog<Code>`/`SheetProblem<Code>`
    (`sheet-problem-log.ts`); `createTestRoadmapItem(title, overrides?)`
    (`domain/roadmap/testing/test-roadmap-item.ts`, placed `now`). The record's Delivery
    lists the problem codes.
  - Decisions: blank and unknown horizons are `missing-horizon`/`unknown-horizon`, the
    item kept with `placement: null` and `writtenHorizon` as written; a missing
    `Horizon` column records one `missing-column`, nothing per row. Horizons and
    organisations match their ids with `matchKey`, with no spelling table.
  - Gotchas:
    - A row is blank when every column the header reads (unknown ones included) is
      blank: `SheetHeader.readIndexes`. The index parser still skips on a blank `Sheet`.
    - Welsh tags and details pair with the English by position before blanks are
      dropped; a count mismatch drops all that cell's Welsh. A Welsh detail keeps a
      dash that does not nest (`-5 gradd`).
- **STY-020 The repository reads a roadmap's items** — `listRoadmapItems(roadmapId, options?)`
  on `RoadmapRepository` (ADR-002 amended): the adapter re-reads the tab list and the index, then the
  tab the roadmap's index row names, published or not, and parses it with STY-019's parser.
  `useRoadmapItems(roadmapId)` exposes it; nothing calls it yet (STY-021). Nothing visible
  changed.
  - Where things live: `RepositoryReadOptions` (was `ListRoadmapsOptions`);
    `roadmapKeys.items(id)`, `roadmapItemsQueryOptions` (`hooks/roadmap-queries.ts`),
    `useRoadmapItems` (`hooks/use-roadmap-items.ts`), `useEnabledWhileConnected`
    (`hooks/enabled-while-connected.ts`, the shared fetch-only-while-connected rule a new
    roadmap query uses too); `#readRoadmapIndex` returns
    `{ index, tabTitles }` and `#readTab(title)` does every values read.
  - Decisions: unknown id → `not-found`; tab missing (exact title match), empty or with no
    `Title` → `invalid-data`; neither retryable. The missing tab is never requested.
  - Tests: `createInMemoryRoadmapRepository(roadmaps, items?)` takes items per id, each a
    list or an `AppError` that roadmap's read rejects with; `renderWithProviders` and the
    new `renderHookWithProviders(hook, options)` take `roadmapItems`. The contract's
    `withRoadmaps(roadmaps, items?)` seeds items; the Google adapter's test writes them as
    tab rows (`tabRowsFor`).
  - Gotchas:
    - The E2E fake serves any existing tab; `sheets.reads` entries are now `metadata` or
      `values:<tab title>`, so assert a list load as `["metadata", "values:Roadmaps"]` and
      a roadmap's items as those plus `values:ProductA`. Reading a tab that does not exist
      is a violation.
    - A roadmap page costs three sequential requests once STY-021 calls the hook; a 5xx
      on any is retried twice, as the list is.
- **STY-021 A roadmap's page shows its items** — under the title (with a "Not published"
  badge and its own Refresh) come the unplaced items, flagged, then the six placements in
  the public site's order, each item as plain text in a card; loading, empty, per-roadmap
  failure and removed-roadmap states. Closes EPC-004 (archived). DEF-002 recorded.
  - Where things live (`features/roadmaps`): `groupRoadmapItems` (items keyed by
    `position` until they have identity), `nestItemDetails`, `organisationCodes` (the
    codes are not catalogue copy), `RoadmapItems`/`RoadmapItemsSkeleton`,
    `RoadmapItemCard`, `NotPublishedBadge` (key now `roadmaps.notPublished`),
    `RefreshButton` (both pages). `RoadmapsErrorState` takes `subject: "items"`. The page's
    items area is `RoadmapView`/`RoadmapItemsArea` in `roadmap-detail-page.tsx`, mounted
    only once the roadmap is listed, so an unknown id reads no items.
  - Decisions: a `not-found` items read invalidates the list in `useRoadmapItems` (D11);
    an expired session shows only the list's alert, keeping cached items; copy is
    `roadmaps.items.*` (Welsh machine-assisted; Nawr, Nesaf, Hwyrach are the public site's).
  - Gotchas:
    - Opening a roadmap from the list costs three reads (`sheets.reads` gains
      `metadata`, `values:Roadmaps`, `values:<tab>`); its Refresh re-reads list and items.
    - The title comes from the list before the items: wait for an item heading
      ("Example card with every column") before axe, a snapshot or a tour.
    - axe at 375px fails the header's home link in English (DEF-002); the phone checks
      run axe on `main` until it is fixed.
    - `detail.aria.yml` holds every Product A item: a field or copy change on a card
      rewrites it (`--update-snapshots`, then review).
- **EPC-005 planning (orchestrator)** — ADR-012 (amends ADR-002 and ADR-011), EPC-005
  (STY-022–026) and EPC-006 (STY-027, needs grilling), after grilling Q1–Q31. A thin
  slice of editing: the roadmap's and each item's English text, pending in memory until
  one all-or-nothing publish per roadmap ("Save" when not published), refused on a
  field-level conflict. Items gain an `Item ID` column, the editor's first change to the
  data source's format; the owner updates the `Template` tab and the public site's README.
  Family waits for EPC-006 (family and colour are set per roadmap but belong together).
- **STY-022 Each roadmap item keeps an identity** — `RoadmapItem.id: string | null`, read from
  an `Item ID` column; nothing visible changes and nothing is written (STY-023 writes IDs).
  - Where things live: `parseRoadmapTab` (`infrastructure/google-sheets/roadmap-tab-parser.ts`)
    now returns `{ items, rows, problems }`; `rows[i]` is `items[i]`'s spreadsheet row, for
    the adapter only. New problem code `duplicate-item-id`. `createTestRoadmapItem` has `id: null`.
  - Decisions: the column is found by header like the others and its absence is no
    problem; IDs are trimmed and compared exactly, not folded; the first kept row keeps a
    repeated ID; a row with only an ID is `missing-title`, and its ID is not counted.
  - Gotchas:
    - `Item ID` counts as a column read, so a row holding only an ID is not blank (it records
      `missing-title`); the adapter's `listRoadmapItems` still returns items alone.
    - The fixtures have no `Item ID` column; a test needing IDs writes them inline.
- **STY-024 A roadmap's page shows what the roadmap is about** — a read-only "About this
  roadmap" section between the title and the items: status label, product lead, vision and
  service description. No new read and no domain change.
  - Where things live: `RoadmapAbout` (`features/roadmaps/components/roadmap-about.tsx`),
    rendered by `RoadmapView`, so it shows exactly when the title does. Copy is
    `roadmaps.about.*`; the Welsh is machine-assisted and needs a fluent review.
  - Decisions: empty fields leave no label; none at all shows one line (STY-025's Edit
    goes in the section); `localise` per field, the lead as written; line breaks by
    `whitespace-pre-line`; no new tokens or lint exceptions.
  - Gotchas:
    - The page's first `h2` is now "About this roadmap", ahead of the placements: tests
      that list the `h2`s start with it, and `detail.aria.yml` holds the region.
    - Product B has no vision and no lead, a handy fixture for left-out fields.
- **STY-023 The repository publishes a roadmap's changes** — the app's first write to the
  shared data source: `RoadmapRepository.publishRoadmapChanges(roadmapId, changes,
options?)` re-reads the roadmap, refuses per field on a co-lead's change or a removed
  item or roadmap, and otherwise writes the changed English, an `Item ID` for every kept
  item without one or repeating another row's, and any missing column in one
  `spreadsheets.batchUpdate`. No screen
  calls it yet (STY-025). README and `docs/analysis/roadmap-tab-format.md` say exactly
  what the editor writes; the record's Delivery is the contract for STY-025/026.
  - Where things live: `RoadmapChanges`, `FieldChange`, `PublishOutcome`
    (`published`/`refused`/`roadmap-not-found`/`unconfirmed`), `FieldConflict`
    (`domain/roadmap/roadmap-changes.ts`); `planRoadmapPublish`/`heldWrites`
    (`publish-plan.ts`, the rules both repositories share), `findEditedItem`
    (`find-edited-item.ts`); `createItemId`
    (`item-id.ts`); the client's `postJson`; `usePublishRoadmapChanges(roadmapId)`
    (`features/roadmaps/hooks/`); `applyBatchUpdate` (`tests/fixtures/sheets/`, used by
    the adapter's MSW fake and the E2E fake).
  - Decisions: no write when nothing differs (so no IDs either); a blank title throws
    `AppError('unknown')`; the write takes no abort signal; a lost answer is re-read once
    (published, `network` or `unconfirmed`), finding each written item by its ID; the
    hook re-reads list and items in `onSettled`.
  - Publishing never writes `Template`: a roadmap whose `Sheet` names `Template` or the
    index is `invalid-data` (read or publish), and so is publishing when the index tab
    itself is named `Template`.
  - A mutation's 401 expires the session through the query client's new
    `MutationCache`, but only while the session it started in is current
    (`currentSession`, wired to `currentAuthSession(authClient)`): writes are never
    cancelled at session end, unlike queries, so a late 401 must not expire a newer
    session.
  - Gotchas:
    - The metadata mask now includes `gridProperties(rowCount,columnCount)`; a test
      asserting the `fields` parameter must use the new mask.
    - E2E: `sheets.writes` holds each `batchUpdate` body, separate from `sheets.reads`;
      the fake records a write to `Template`, a `(cy)` column, `Last updated` or an
      unchanged cell, a non-string value or any other method as a violation.
    - MSW's `passthrough()` sends a request to the real network: to fall through to the
      next handler return `undefined`. A `:batchUpdate` path needs a RegExp matcher.
    - `ContractWrite`/`CO_LEAD_VALUE` live in `domain/roadmap/testing/contract-write.ts`,
      free of Vitest, so the in-memory double can import them.
- **STY-025 A Product Lead edits a roadmap and publishes it** — Edit turns an item card or
  "About this roadmap" into a form; confirmed changes stay pending, tagged "Changed", until
  "Publish changes" ("Save changes" when not published) writes them after a check. Undo,
  Discard all, a leave warning, and Disconnect's keep / discard / cancel question. shadcn
  `input`, `textarea`, `label` added.
  - Where things live (`features/roadmaps/editing/`): the pure rules
    (`pending-changes.ts`: edit, undo, reconcile after a read, settle after a publish,
    apply over loaded text), the store (`pending-changes-store.ts`, one per app, in memory),
    `PendingChangesProvider` (in `AppProviders`, outside the query cache; reconciles on
    every list or items read through the query cache's events; the `beforeunload`
    listener; the Disconnect question), `usePublish`, `RoadmapPublishing` (the bar, with
    `PublishDialog`, `DiscardDialog`, `PublishOutcomeNotice`), `EditForm` (Done sends only
    changed fields), `editFormFields`, `useEditMode<T>` (holds the value the form opened
    on, the edit's base), `EditableItemCard`, `EditableRoadmapAbout`. Shared:
    `DismissibleNotice` (`components/layout`, also the auth notice; copy `common.dismiss`)
    and `InsetText`'s `tone`.
    `useRequestDisconnect()` (`features/auth/disconnect-request.ts`) is what every
    Disconnect button calls. Copy: `common.cancel`, `roadmaps.{edit,publish,disconnect,
waiting}.*`; the Welsh is machine-assisted. The record's Delivery is STY-026's contract.
  - Decisions: the form confirms with "Done" (D8); a publish is one click, never retried,
    never two at once; its outcome is a per-roadmap notice in the store, so it survives
    leaving the page; the "waiting" note is on the start page only.
  - Gotchas:
    - Accessible-name computation drops a leading space inside a `sr-only` span: put a
      `{" "}` text node before the span ("Edit Minimal card", not "EditMinimal card").
    - Base UI's dialog `finalFocus` goes to the first tabbable child of a `tabIndex=-1`
      target, so a notice lost focus to its dismiss button. `RoadmapPublishing` returns
      focus itself: `PublishDialog` takes `returnFocus={() => !ref.current}`, then the
      notice is focused in `onOpenChangeComplete(false)`.
    - A form's base is what it opened on, not the latest read: compare against
      `useEditMode`'s `opened`, never the refreshed record, or a co-lead's change is
      written back. The one exception is a field whose latest read holds what the form
      showed (the Product Lead's own publish): pass `{ shown, latest }` as `since`.
    - Playwright's `--update-snapshots` (default "changed") does not write a new aria
      snapshot file: use `--update-snapshots=all` or run once without the flag
      (`tests/e2e/AGENTS.md`), then check `git status`.
    - E2E raises the leave warning with `page.close({ runBeforeUnload: true })` and
      dismisses it in a `page.on("dialog")` handler (`tests/e2e/AGENTS.md`).
    - Disconnect's notice clears on navigation, so a test reaching the start page's
      waiting note goes "Back to roadmaps" after keeping.
    - An item card's key is not simply its ID: `useItemCardKeys`
      (`components/item-card-keys.ts`) lets an item given its first ID keep its
      positional key, so a first publish (which gives every item an ID) does not unmount
      another item's open form.
    - After an `unconfirmed` publish, `awaitingRefresh` disables Undo and Discard all and
      the notice has no dismiss until Refresh reads both list and items. The in-memory
      repository's `reread-fails` write now fails item reads as well as list reads.
- **STY-026 A co-lead's change is shown, not overwritten** — a refused publish opens a
  review above the publish bar: each field a co-lead changed shows "Your change" beside
  "Current text" with "Keep mine" / "Use theirs", and items a co-lead removed are named
  and their changes dropped; a roadmap gone from the list loses its changes and its page
  says so. Closes EPC-005 (archived). No new read or write; the data source is unchanged.
  - Where things live (`features/roadmaps/editing/`): `conflicts.ts` (`openConflicts`,
    `keepMine`, `takeTheirs`, `discardItems`, all pure), `ConflictReview`
    (`conflict-review.tsx`, rendered by `RoadmapPublishing`); the store's `refused`
    notice is `{ conflicts, removed }`, plus `removeRoadmap`, `restoreRoadmaps` and the
    snapshot's `removed` set. Copy is `roadmaps.publish.notice.refused.*` and
    `roadmaps.detail.removedDescription`; the Welsh is machine-assisted.
  - Decisions: an open conflict is derived (pending field whose base is not the co-lead's
    text), never stored, so Undo or a read closes it, and the store then drops it from
    the refusal so it cannot reopen; a refusal writes the co-lead's text into the cached
    roadmap and items before the re-read (`onRefused`); Keep mine re-bases onto their text
    (D3); Publish is disabled while a conflict is open; Refresh no longer clears a
    review, only an `unconfirmed` notice; removed items and roadmaps take no decision.
  - Gotchas:
    - Only an item with an ID can conflict: a co-lead's change to an item without one
      makes it a removed item. E2E tests publish once first (`publishOnce`) to give every
      item an ID.
    - Simulate a co-lead with `sheets.coLead(tab, key, header, value | null)` in E2E
      and `repository.coLead(edit)` on the in-memory double (`InMemoryRoadmapRepository`).
    - The review takes focus when the publish dialog closes on a refusal; after each
      decision a layout effect (`useDecisionFocus`) moves focus to the next "Keep mine",
      then to Publish; tests assert `toHaveFocus` there.
    - English field labels are bare ("Vision") while the Welsh add "(Saesneg)", so the
      review's target names differ in shape between the languages (from STY-025).
