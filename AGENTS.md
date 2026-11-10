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
  domain/           framework-free types & interfaces (Roadmap, RoadmapRepository, AuthClient).
                    Imports nothing from React, TanStack, Google, or infrastructure.
  features/<name>/  application state (hooks), components, pages for one feature.
                    Depends on domain + lib + components. Never on infrastructure.
  infrastructure/   adapters to the outside world (Google Sheets, Google Identity Services).
                    Depends on domain + lib. Never on React, TanStack Query, or features.
                    Only infrastructure/google-identity may use the `google` global.
  components/ui/    shadcn/ui (Base UI) generated components — keep close to upstream
  components/layout app shell pieces shared across features
  lib/              small framework-agnostic utilities (errors, cn, query client factory)
  i18n/             i18next setup, supported languages, en/cy catalogues (ADR-0008)
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
- All user-facing copy (text, aria-labels, toasts, titles) goes through i18n (`t()`), in
  English (`en`) and Welsh (`cy`) — see ADR-0008. A new key needs both languages; the type
  system enforces parity. Copy is sentence case. Domain/infrastructure emit codes, not copy.

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
6. **Screenshots (any story that changes visible UI)**: once the work is final, after the
   review fixes, capture PNG screenshots of every screen or state you built or changed.
   Use headless Playwright (Chromium is installed in `~/.cache/ms-playwright`) against
   `pnpm dev`. Fake Google with `page.route`, by serving a stub
   `https://accounts.google.com/gsi/client` and fulfilling
   `https://sheets.googleapis.com/**`; reuse `tests/e2e` fakes once they exist. Cover
   desktop (1280px) and mobile (375px), and light and dark mode where relevant. Show
   Welsh where copy changed. Save them to
   `/home/t3code/roadmaps-editor/.artifacts/screenshots/<story-id>/` with descriptive
   names, e.g. `landing-desktop-light-en.png`. `.artifacts/` is git-ignored, so add it to
   `.gitignore` if missing. Open each screenshot yourself and fix anything that looks
   wrong before reporting. List every screenshot's **absolute path** in your final reply,
   so the orchestrator can show them to the user for review. Keep capture scripts in your
   scratchpad, not in the repo, unless they are proper E2E tests.
7. Tick the story's acceptance criteria, append a Handoff log entry, update nested
   `AGENTS.md` files if you introduced a new area, and commit on the current branch with a
   conventional commit message (`feat(scope): …`). Do not push.

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
