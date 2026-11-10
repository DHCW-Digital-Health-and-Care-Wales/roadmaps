# AGENTS.md — Product Roadmaps

Instructions for AI agents (and humans) working in this repository. Read this first,
then the ADRs in `docs/adr/`, `docs/GLOSSARY.md`, and the record you are working on in
`docs/backlog/`.

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
  domain/           framework-free types & interfaces (Roadmap, RoadmapRepository, AuthClient).
                    Imports nothing from React, TanStack, Google, or infrastructure.
  features/<name>/  application state (hooks), components, pages for one feature.
                    Depends on domain + lib + components. Never on infrastructure.
  infrastructure/   adapters to the outside world (Google Sheets, Google Identity Services).
                    Depends on domain + lib. Never on React, TanStack Query, or features.
                    Only infrastructure/google-identity may use the `google` global.
  components/ui/    shadcn/ui (Base UI) generated components — keep close to upstream
  components/layout app shell pieces shared across features
  components/theme  ThemeProvider, useTheme, ThemeToggle, stored preference (ADR-0005)
  lib/              small framework-agnostic utilities (errors, cn, query client factory)
  i18n/             i18next setup, supported languages, en/cy catalogues (ADR-0008)
  styles/           Tailwind v4 entry CSS + theme tokens
tests/e2e/          Playwright specs + fakes for GIS and the Sheets API
build/              build-time helpers for vite/playwright config (GitHub Pages base path)
.github/            CI/CD workflow (verify, e2e, deploy to Pages), Dependabot (ADR-0007),
                    PR template
docs/               ADRs, backlog, glossary, analyses, runbooks (docs/AGENTS.md)
.claude/            agent skills, reviewer/worker agents, session hook
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
- All user-facing copy (text, aria-labels, toasts, titles) goes through i18n (`t()`), in
  English (`en`) and Welsh (`cy`) — see ADR-0008. A new key needs both languages; the type
  system enforces parity. Copy is sentence case. Domain/infrastructure emit codes, not copy.
  `i18next/no-literal-string` rejects literal JSX text and literal `aria-label`/`title`/
  `alt`/`placeholder` attributes outside tests and `components/ui`.

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
  epic X") with `.claude/skills/implement-story/SKILL.md`, and several with
  `.claude/skills/orchestrate/SKILL.md`. Any other change that ends in a PR follows
  implement-story's steps 3–6 unasked. Read its `references/delegation.md` before
  delegating any work.
- Before a PR is raised, every change gets two independent correctness reviews
  (`code-review`: Opus and Sol, Codex `gpt-6.1-sol`) and one quality review
  (`quality-review`: Sonnet), in the rounds `delegation.md` sets.
- A PR is raised and left for the owner; babysit or merge it only when asked.
- Any change to visible UI publishes before/after screenshots
  (`references/screenshots.md`).
- Every delivery appends an entry to the Handoff log below.
- Records, ADRs and analyses follow `docs/AGENTS.md`; domain terms follow
  `docs/GLOSSARY.md`. Invoke the `copywriter` skill before writing user-facing copy.
- Skills live in `.claude/skills/`; `.agents/skills` exposes the same files to Codex. If
  a skill is missing from your runtime's catalogue, read its `SKILL.md` and follow it.
  Agent roles in `.claude/agents/` are briefs for fresh workers.
- Before editing these instructions, a skill or an agent, read
  `.claude/skills/writing-for-agents/SKILL.md` and
  `docs/operations/authoring-agent-instructions.md`.

## Handoff log

Newest last. Each entry: story id, what changed, decisions, gotchas for the next agent.

- **Backlog/ADRs (orchestrator)** — Backlog S01–S09 and ADR-0001…0008 created
  (i18n — English + Welsh — added as S04 at the user's request; later stories renumbered). Branch
  `feat/bootstrap`. Remote is `collisdigital/roadmaps-editor`, so the production origin is
  `https://collisdigital.github.io` and base path `/roadmaps-editor/`.
- **S01 Tooling foundation** — Vite 8 + React 19 SPA scaffold: strict TS, Tailwind v4,
  shadcn/ui on Base UI (Button only), TanStack Router file routes with hash history,
  ESLint flat config with ADR-0002 layer rules, Prettier, and Vitest + RTL + MSW.
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
      in `features/roadmaps/`, see ADR-0002).
    - Placeholder copy in `src/routes/index.tsx` is English only, so S04 moves it into the
      catalogues.
- **S02 Domain, errors, Google Sheets repository** — framework-free domain, `AppError`,
  and the Sheets adapter. ADR-0002 amended (optional abort `signal`, contract test).
  - Public API:
    - `@/domain/roadmap/roadmap`: `Roadmap { id; name }`.
    - `@/domain/roadmap/roadmap-repository`: `RoadmapRepository.listRoadmaps(options?:
ListRoadmapsOptions)` where `ListRoadmapsOptions = { signal?: AbortSignal }`. On abort
      it rejects with `signal.reason` (not an `AppError`); every other failure is an
      `AppError`.
    - `@/lib/errors`: `AppError(kind, { message?, retryable?, status?, cause? })` with
      `kind: AppErrorKind`, `retryable` (defaults true only for `rate-limited`/`network`),
      `status?`; `isAppError`, `toAppError(unknown)` (non-`AppError` -> `unknown`).
      `message` is developer diagnostics; UI copy must come from `kind` (ADR-0008).
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
  - Gotchas for S03 and later:
    - Inject auth as `getAccessToken: () => authClient.getAccessToken()`. It is read
      synchronously on every request, and a `null` or empty token rejects as
      `unauthenticated` without a request. S03's `AuthClient.getAccessToken()` should
      return `string | null`.
    - S06 must call `reportUnauthenticated()` on a `kind === "unauthenticated"` error.
    - S06's in-memory test double should run `describeRoadmapRepositoryContract`. It must
      honour `signal` (`signal?.throwIfAborted()`) and reject with `AppError`s. Contract
      fixture ids are numeric strings.
    - The contract helper imports `vitest`. It lives under `testing/`, so production code
      must never import it.
- **S03 Google Identity Services auth** — `AuthClient` port, GIS token-model adapter, React
  bridge and test fake. ADR-0002/0003 amended: the port lives in `domain/auth/` (infrastructure
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
  - S04 i18n: error codes needing `auth.errors.*` copy are `script-load-failed`,
    `access-denied`, `scope-not-granted`, `unknown`, `popup-closed` and `popup-blocked`. The
    statuses are `initializing`, `ready`, `connecting`, `connected`, `expired` and `error`.
    There is no prose in state.
  - S05 wiring (`app/composition.ts`):
    `createGoogleAuthClient({ clientId: config.googleClientId, scopes: [SHEETS_SCOPE],
onDisconnect: () => queryClient.removeQueries({ queryKey: authScopedQueryKey }) })`, then
    `createSheetsClient({ getAccessToken: authClient.getAccessToken })`, and
    `import.meta.hot?.dispose(() => authClient.dispose())`. Create it at startup so GIS loads
    early.
  - Gotchas:
    - Call `connect()` directly in the click handler, with no `await` before it, or the
      popup is blocked.
    - `onDisconnect` exists only on the Google client. The fake's `disconnect` does not clear
      queries, so S05's test utility must wire that itself if it tests clearing.
    - `getAccessToken()` returns `null` once `expiresAt` passes, even before the timer
      fires. The resulting `unauthenticated` error should make S06 call
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
- **S04 i18n foundation** — i18next 27.0.1 + react-i18next 18.0.1, English and Welsh
  catalogues, `LanguageSwitcher`, document sync, lint rule. ADR-0008 amended (switcher
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
  - Seeded keys for S05/S06: `common.{appName,loading,retry}`, `layout.{skipToContent,home}`,
    `landing.{tagline,source,accessNote}`, `auth.{connect,reconnect,disconnect}`,
    `auth.status.<AuthState status>`, `auth.errors.<AuthErrorCode>`,
    `auth.notifications.{connected,disconnected}` (toasts), `roadmaps.{title,description}`,
    `roadmaps.{refresh,loading,count,loadFailed}`, `roadmaps.empty.{title,description}`,
    `roadmaps.detail.{comingSoon,back,connectPrompt,notFoundTitle,notFoundDescription}`,
    `errors.<AppErrorKind>`, `notFound.{title,description,home}`, `theme.toggle`,
    `language.label`. Map codes with template keys, e.g. ``t(`errors.${error.kind}`)`` and
    ``t(`auth.status.${state.status}`)`` — `satisfies Record<…>` in `en.ts` makes a new kind
    or status without copy a type error.
  - S05 wiring: move `const i18n = createI18n({ language: resolveLanguage() })` and
    `syncDocumentLanguage(i18n)` from `src/app/main.tsx` into `app/composition.ts`; move
    `<I18nextProvider i18n={i18n}>` into `app/providers.tsx` (outermost, so toasts and the
    router see it). Move `<LanguageSwitcher />` (`@/components/layout/language-switcher`)
    from the placeholder `src/routes/index.tsx` into the header next to the theme toggle.
    If routes later set per-page titles, change `syncDocumentLanguage`, which currently
    always sets the app name.
  - Tests: `renderWithI18n(ui, { language? })` in `src/test/render-with-i18n.tsx` returns
    RTL's result plus `i18n` (fresh English instance by default; pass `language: "cy"`).
    S05's `render-with-providers` should build on `createI18n` the same way. Tests that
    call `syncDocumentLanguage` or switch language must stop syncing and restore
    `document.title`, `<html lang>` and `localStorage` in teardown.
  - Gotchas:
    - Welsh is machine-assisted ("map trywydd" = roadmap, "taenlen" = spreadsheet); a
      fluent speaker must review it before launch. S08's README should track that.
    - The switcher selects via each radio item's `onClick`, not the group's
      `onValueChange`, because Base UI does not fire that for the checked item and
      re-selecting must still persist the choice.
    - Its accessible name is "Language English": a `sr-only` label, a `{" "}` text node,
      then the endonym (`max-sm:sr-only` on mobile, so the name never changes). Keep the
      space node; without it the name is "LanguageEnglish".
    - `.ts` files are not covered by the literal-string lint rule; keep copy out of them.
- **S05 Composition root, routing, app shell, theme, auth UI** — TanStack Query 5.107.1 and
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
    hooks yet; S06 adds the `unauthenticated` → `reportUnauthenticated()` handling.
  - Auth-scoped data: `authScopedQueryKey = ["auth-scoped"]` and
    `removeAuthScopedQueries(queryClient)` in `features/auth/auth-scoped-queries.ts`. S06's
    `roadmapKeys.all` must start with `...authScopedQueryKey` so disconnect clears it.
  - Repository: `RoadmapRepositoryProvider` / `useRoadmapRepository()` in
    `features/roadmaps/roadmap-repository-context.tsx`. Test double (already done for S06):
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
  - S06 plug-in: put the list under the heading in `features/roadmaps/pages/roadmaps-page.tsx`
    (rendered by `HomePage` when connected); revisit `HomePage` for `expired` if cached cards
    should stay with a reconnect prompt. In the detail route, read `Route.useParams()` and pass
    `roadmapId` to `RoadmapDetailPage`; replace `roadmaps.detail.title` with the roadmap name.
  - Gotchas:
    - Links styled as buttons use `cn(buttonVariants())` on `<Link>` (S06: without `cn`,
      `border-transparent` beats the outline variant's border). Base UI's
      `<Button render={<Link/>} nativeButton={false}>` adds `role="button"`.
    - Sonner's store is global and replays active toasts into a new `Toaster`; `setup.ts`
      dismisses them after each test. To assert a toast did _not_ appear, flush Sonner's
      timer first (see `flushToasts` in `app/app.test.tsx`).
    - The skip link prevents default and focuses `<main>`, because hash history owns the URL
      fragment.
    - The main JS chunk is ~580 kB, above Vite's warning threshold; consider chunking in S08/S09.
      (Fixed in S09: `zod/mini` plus `react`/`vendor` chunks.)
- **S06 Roadmaps feature** — list, states and detail page; shadcn `alert`, `empty`,
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
    `StatusPanel` (Empty-based, `titleAs` h1/h2), `RoadmapIcon`, `ReconnectButton`
    (`features/auth/components`). The detail route passes `Route.useParams().roadmapId`.
  - S07 E2E hooks (stable accessible names, en): heading "Your Roadmaps"; cards are links
    named by the roadmap name inside `main`'s only `list`, `href` `#/roadmaps/<sheetId>`;
    count text "N roadmaps"; buttons "Refresh", "Retry", "Reconnect" (inside the alert;
    the header has another "Reconnect"); alert titles "Couldn't load your roadmaps",
    "Couldn't refresh your roadmaps", "Your session has expired"; empty "No roadmaps yet";
    detail h1 = roadmap name, "Roadmap not found", "Back to roadmaps". Welsh: "Eich
    Mapiau Trywydd", "Adnewyddu", "2 fap trywydd".
  - Gotchas:
    - A 5xx/network error is retried twice with back-off (~3 s) before the error shows;
      E2E should wait accordingly (or answer 403 for a fast failure).
    - Base UI's `focusableWhenDisabled` sets `data-disabled`, not `:disabled`, so
      `disabled:` styles don't apply; Refresh adds `data-disabled:opacity-50`.
    - shadcn's `Alert` forces icon colour with `*:[svg]:text-current`; override with `!`.
    - TanStack Query v5.107 deprecates `fetchQuery`; tests use `queryClient.query()`.
- **S07 Playwright E2E** — `@playwright/test` 1.64.1 (pinned exactly: it must match the
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
  - S08 CI: `pnpm install --frozen-lockfile`, then cache `~/.cache/ms-playwright` keyed on
    the `@playwright/test` version from the lockfile; on a miss run `pnpm exec playwright
install --with-deps chromium`, on a hit `pnpm exec playwright install-deps chromium`.
    `CI=true` turns on `forbidOnly`, 2 retries (trace on first retry), and the `github` +
    `list` + `html` reporters. Upload `playwright-report/` (and `test-results/` for traces
    and failure screenshots) with `if: ${{ !cancelled() }}`. The job needs no build step of
    its own: the webServer builds.
  - S08 base path: specs only navigate relative to `baseURL` (`./`, `./#/roadmaps/42`).
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
- **S08 CI/CD, Pages base path, README** — `.github/workflows/ci.yml` ("CI/CD"),
  `.github/dependabot.yml`, `build/resolve-base-path.ts`, full `README.md`. ADR-0007
  amended (see its "S08 amendments"). `.nvmrc` is now 26 (Active LTS since 2026-10-28);
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
  - S09: the README's Google Cloud steps are unverified against a live console session;
    check them while doing the manual real-GIS check. `.env.production`'s client must list
    `https://collisdigital.github.io` as an origin before the first deploy is usable.
    Pages must be enabled (Source: GitHub Actions) before the first push to `main`.
- **S09 Final verification, polish and review** — all brief §14 criteria checked with
  evidence in `docs/backlog/_archive/bootstrap/S09-final-verification.md`; whole-repo Sol review (3 findings,
  all fixed). Backlog complete: S01–S09 Done.
  - State: 264 unit/component tests, 31 E2E (also green under `/roadmaps-editor/`); build
    has no warnings. JS is 654 kB min / 214 kB gzip in `react`, `vendor` and app chunks
    (app ~48 kB), down from 717 / 234 kB with a 509 kB entry chunk.
  - Changes:
    - `zod/mini` everywhere: use `z.optional(x)`, `z._default(x, v)`,
      `x.check(z.trim(), z.regex(…))`, `z.pipe(a, z.transform(…))`. Mini loads no locale,
      so give messages explicitly.
    - `react`/`vendor` chunk groups in `vite.config.ts` (ADR-0007 S09 amendment).
    - Mobile header: `common.shortAppName`; the status badge is `max-sm:sr-only`;
      `HeaderAuthButton` shows only Disconnect below `sm`. Every signed-out view must
      therefore keep its own Connect/Reconnect.
    - `AppShell` focus: focus goes to `<main>` after in-app navigation and when the
      focused control inside `<main>` is removed.
    - `useRoadmapsProblem` ignores a leftover `unauthenticated` error once connected.
    - On session end, auth-scoped queries are cancelled, then invalidated (Sol). This
      retires the S03 "late 401 after reconnect" gotcha.
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
    1. Do the external steps in S09: OAuth origin, consent-screen name, Pages on a
       private repo, push, then a manual live sign-in.
    2. Per-view `document.title` (move title ownership out of `syncDocumentLanguage`).
    3. A CSP `<meta>` validated against a real sign-in (README lists the origins).
    4. Fluent Welsh review.
    5. Dependabot for npm (actions only today), keeping Playwright pinned exactly with
       its browser cache.
    6. Then the roadmap detail feature, which will be the first real per-sheet read.
- **Agent skills and delivery process (no record)** — `.claude/skills/` (implement-story,
  orchestrate, retro, code-review, quality-review, copywriter, domain-modeling,
  ux-prototypes, shadcn, playwright-cli, writing-for-agents, grilling, codebase-design,
  improve-codebase-architecture), `.claude/agents/`, a SessionStart hook, the PR template,
  `docs/GLOSSARY.md`, `docs/AGENTS.md`, backlog templates and the epic/archive layout.
  - Decisions: three reviewers on every PR (Opus + Sol correctness, Sonnet quality); PRs
    are left open, with babysitting and merging as separate opt-ins; guidance names
    runtime capabilities, never tools; bootstrap stories archived unchanged.
  - Gotchas:
    - `node --test <dir>` fails on Node 22; pass the glob
      (`node --test '.claude/skills/*/scripts/*.test.mjs'`).
    - `playwright-cli` is not a dependency: `pnpm dlx @playwright/cli@0.1.24`, output in
      `.artifacts/playwright-cli/`.
    - `roadmaps.title` ("Your Roadmaps") breaks the sentence-case rule and is asserted
      by E2E specs; D01 records it.
