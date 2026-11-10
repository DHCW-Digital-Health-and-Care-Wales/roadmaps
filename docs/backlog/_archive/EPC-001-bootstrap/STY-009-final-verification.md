# STY-009 — Whole-repo verification, polish and final review

## Goal

Prove the acceptance criteria of the original brief end-to-end and leave the repo in a
production-grade state.

## Scope

- Fresh-clone style verification: `rm -rf node_modules dist && pnpm install --frozen-lockfile`
  then every script including `pnpm test:e2e`.
- Run `pnpm dev` and drive the app with Playwright (headless) to capture screenshots of:
  landing (light + dark, desktop + 375px mobile), connected roadmap grid (faked), loading
  skeletons, error state, detail page, and the landing + grid in Welsh (check for
  overflow from longer Welsh strings). Inspect them and fix visual/UX issues.
- With the **real** GIS script (no faking), click "Connect Google" and confirm a popup to
  `accounts.google.com` opens with the correct `client_id` and `scope`. Do not attempt to
  complete auth. Report honestly what was and was not verified.
- Whole-codebase review for duplication, dead code, layering violations, naming, a11y,
  unnecessary dependencies (`pnpm why`, unused deps check e.g. `knip` run ad hoc — do not
  add it permanently unless justified).
- Final Sol review of the whole repository (not just the diff); address all findings.
- Update backlog statuses, README accuracy, AGENTS.md handoff.

## Acceptance criteria

- [x] Every item in the brief's §14 is checked off in this file with evidence (below).
- [x] Screenshots saved under `.artifacts/screenshots/STY-009/` (git-ignored, not committed).

## Orchestrator notes carried forward (from STY-005 screenshot review)

- [x] **Mobile header.** Below `sm` the header now shows the brand mark plus a short
      product name (`common.shortAppName`: "Roadmaps" / "Mapiau Trywydd"; the link's
      accessible name stays the full "Product Roadmaps home"). The connection badge is
      visually hidden there but is still a live `role=status`, so the accessible status label
      is kept and the colour-only dot is gone. `HeaderAuthButton` shows only Disconnect below
      `sm`: every signed-out view has its own Connect or Reconnect (hero, detail connect
      prompt, expired alert or panel); the not-found page links home. The language trigger is
      icon-sized there. Measured: no horizontal overflow at 375px or 320px in either language;
      at 320px the Welsh short name truncates ("Mapiau T…") when Disconnect is shown.
- [x] **~580 kB main chunk.** The cause was one undivided entry chunk plus Zod's classic
      API (~85 kB with its JSON Schema code). Now `zod/mini` (−63 kB) and Rolldown
      `codeSplitting.groups` for `react` and `vendor`, so app code (~48 kB) changes per deploy
      while React and vendor chunks stay cached. `autoCodeSplitting` was already on; the route
      chunks are small. `react-dom` is the production build (no dev code bundled). The warning
      limit is unchanged. ADR-007 has an STY-009 amendment.

  | JS (min / gzip)    | Before (d133fd2)                             | After                                                      |
  | ------------------ | -------------------------------------------- | ---------------------------------------------------------- |
  | Largest chunk      | `index` 509.1 / 159.6 kB (Vite warning)      | `vendor` 387.3 / 128.6 kB (no warning)                     |
  | Other chunks       | `auth-button` (shared) 180.7, routes 26.9 kB | `react` 218.8 / 68.3, app `index` 32.9 / 11.6, routes 14.9 |
  | Total              | 716.7 / 233.5 kB                             | 653.8 / 214.1 kB                                           |
  | Per-deploy refetch | everything                                   | ~48 kB of app JS (plus CSS 52.7 / 9.9 kB)                  |

## §14 acceptance criteria (original brief), with evidence

Commands were run from a clean state (`rm -rf node_modules dist && pnpm install
--frozen-lockfile`) on 2026-11-10, Node 22.23.3, pnpm 12.18.0.

- [x] **`pnpm install` succeeds**: `pnpm install --frozen-lockfile` completed from an
      empty `node_modules`.
- [x] **`pnpm dev` starts**: `vite` served <http://localhost:5173/> (needs `.env.local`);
      the live Google check and all screenshots ran against it.
- [x] **`pnpm build` succeeds**: no warnings (sizes above). `GITHUB_REPOSITORY=collisdigital/roadmaps-editor pnpm build` emits `/roadmaps-editor/assets/…`, and the whole E2E suite
      also passes against that base path (31/31), as CI runs it.
- [x] **`pnpm test` passes**: 264 tests in 25 files (Vitest).
- [x] **TypeScript strict passes**: `pnpm typecheck` (`tsc -b`, strict plus
      `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) is clean.
- [x] **Lint passes**: `pnpm lint` (`--max-warnings=0`) and `pnpm format:check` are clean.
- [x] **Landing page professional and responsive**: screenshots `landing-*` at 1280, 375
      and 320px, light and dark, en and cy.
- [x] **Connect Google launches Google's OAuth flow**: verified **live** (below). The
      real GIS popup opened `accounts.google.com` with the configured `client_id` and the
      `spreadsheets` scope.
- [x] **Successful authorisation enables a Sheets API request**: verified with fakes
      only. E2E `roadmaps.spec.ts` "connecting shows the visible roadmaps…" asserts that the
      granted token is the bearer of the one `spreadsheets.get` request, with the exact
      `fields` mask (`fake-sheets.ts` rejects anything else). **Live authorisation and a live
      Sheets call were not verified**: that needs a real Google sign-in.
- [x] **Worksheet names appear as cards**: E2E `roadmaps.spec.ts` (card text, in order)
      and `roadmaps-page.test.tsx`; screenshots `grid-*`.
- [x] **Hidden worksheets omitted**: `google-sheets-roadmap-repository.test.ts`, the
      shared contract, and E2E (the hidden "Archived plans" never shows; its id is "not found").
      Names are not filtered: "Template" is kept (repository test and contract fixture;
      screenshot `grid-desktop-light-en`).
- [x] **Sheet order preserved**: the contract test and E2E fixtures, whose order is
      neither alphabetical nor by id.
- [x] **Cards navigate to placeholder detail pages**: E2E "a card opens its roadmap, and
      Back returns to the list"; screenshots `detail-*`.
- [x] **Hash routing deep links**: E2E "a deep link survives a reload"
      (`#/roadmaps/42`); `app.test.tsx` hash-history tests.
- [x] **Refresh works**: E2E "Refresh loads the latest roadmaps"; unit tests for
      busy/disabled states.
- [x] **Auth errors handled gracefully**: E2E `auth.spec.ts` (denied, scope not granted,
      popup blocked/closed, script load failure, consent re-prompt, expiry) and
      `roadmap-errors.spec.ts` (5xx → Retry, 403 copy, 401 → expired → Reconnect); screenshots
      `error-*`, `expired-*`.
- [x] **Sonner not spammy**: one toast id for auth events; new test "replaces the previous
      auth toast instead of stacking them" (fails if the id is dropped); query errors never
      toast.
- [x] **GitHub Pages deployment fully configured**: `.github/workflows/ci.yml` (verify ∥
      e2e → deploy), base-path resolver and guard, README "Deploying to GitHub Pages". Not
      exercised on GitHub in this story (nothing was pushed); see "Outstanding external
      steps".
- [x] **No server-side runtime**: `dist/` is static HTML, JS, CSS, fonts and an SVG; the
      only network calls are to Google from the browser.
- [x] **No secrets exposed**: `git ls-files` grep for `GOCSPX-`, `client_secret`, `ya29.`,
      `AIza…`, private keys, `ghp_`, `refresh_token` finds only the fake
      `ya29.secret-token` in a unit test. `dist/` contains exactly one OAuth client ID
      (`581293930758-54rmui7d7256t5qri7g8lbrs70lvfuq4.apps.googleusercontent.com`) and the
      spreadsheet ID, both public by design; no sourcemaps, no test code (`e2e-token`, `msw`,
      `vitest`, fake client IDs absent). `.env.local` is git-ignored.
- [x] **Token never in localStorage or logs**: no `console.*` in production code; storage
      holds only `roadmaps.theme` and `roadmaps.language`. New E2E guard
      (`fixtures/persistence-recorder.ts`): every test fails if an issued token is written
      to storage, cookies, the URL or the console at any point. It was checked against
      planted leaks: a stored token, and a token stored then removed at once, both failed.
- [x] **React components do not depend on Google Sheets response types**: no
      `features/`, `components/`, `routes/` or `app/` file references `gis-types`,
      `sheets-schemas`, `TokenResponse` or `google.*`; ESLint layer rules enforce it, and
      were tightened in STY-009.
- [x] **Google Sheets repository is replaceable**: `describeRoadmapRepositoryContract`
      is run by both the Google adapter and the in-memory double; README "Replacing Google
      Sheets with an HTTP API" lists the steps (now including the copy that names the
      spreadsheet).
- [x] **i18n en + cy complete**: `satisfies Catalogue<…>` parity (a missing key fails
      `tsc`), `catalogue.test.ts`, Welsh component and E2E tests; Welsh screenshots show no
      overflow. Welsh still needs a fluent speaker's review (README).

## Live Google check (real GIS, no fakes)

`pnpm dev` at `http://localhost:5173`, headless Chromium, "Connect Google" clicked once
GIS had loaded; sign-in was not attempted.

- **Popup**: `https://accounts.google.com/v3/signin/identifier?…` with
  `client_id=581293930758-54rmui7d7256t5qri7g8lbrs70lvfuq4.apps.googleusercontent.com`,
  `scope=https://www.googleapis.com/auth/spreadsheets`, `response_type=token`,
  `origin=http://localhost:5173`, `prompt=select_account`, `include_granted_scopes=true`.
  Google showed its normal sign-in page: **"Sign in — to continue to FHIR Host"**. The
  consent screen of the OAuth client's Cloud project is branded "FHIR Host", not
  "Product Roadmaps" (external fix; README troubleshooting row added).
- **Origins**: `http://localhost:5173` is authorised (sign-in page). `http://localhost:4173`
  (`pnpm preview`) gets **Error 400: origin_mismatch**. The production origin
  `https://collisdigital.github.io` (the `/roadmaps-editor/` build served at that origin
  through Playwright request routing) also gets **Error 400: origin_mismatch**: it is
  **not yet** an authorised JavaScript origin.
- Not verified live: account selection, consent, token grant, the Sheets call, revoke.

## Delivery notes

- Bundle: `zod/mini` in `config.ts`, `sheets-schemas.ts`, `token-response.ts` (messages
  checked: a missing variable reads "is required → at VITE_…"); `react`/`vendor` chunk
  groups in `vite.config.ts`.
- Mobile header (above), `common.shortAppName` (en + cy).
- Focus management in `AppShell`: focus moves to `<main>` after an in-app navigation
  (StrictMode-safe, keyed on the previous pathname) and when the focused control inside
  `<main>` is removed (Connect, Reconnect, Retry). Tested in jsdom and E2E.
- Sources reviewed with three read-only audits (core layers, UI layers, tests/CI/docs)
  plus `knip` (ad hoc): no unused dependencies; three dead exports un-exported.

## Review notes

### Own audits

Fixed:

- Stale "session expired" alert (and an enabled Reconnect) stayed visible after a
  successful reconnect until the refetch finished: `useRoadmapsProblem` ignores a leftover
  `unauthenticated` error while connected (a 401 ends the session at once). Test added.
- Focus was lost to `<body>` on navigation: fixed in `AppShell` (above).
- `aria-busy="true"` on the `role=status` loading regions could suppress their
  announcement: removed (kept on buttons).
- ESLint layering gaps: domain/infrastructure now also ban `i18next`, `react-i18next`,
  `sonner`, `lucide-react`, `@base-ui/**` and `@/i18n`; new blocks keep `lib/` below
  everything and `components/`/`i18n/` below features. Checked with planted violations.
- No test proved tokens stay out of storage, URLs and logs: E2E guard added.
- Auth toast replacement was untested: test added.
- Docs: ADR-007's Decision contradicted its STY-008 amendments (who uploads, CNAME,
  base-path order); ADR-002's amendment list was incomplete; AGENTS.md step 4 was
  garbled; STY-008's stale scope and STY-005's chunk note are annotated; README gains the CSP
  note, the consent-screen-name troubleshooting row and the copy step for an API swap.
- Small: redundant `script.defer`, mixed alias/relative imports in `app/`, a garbled
  doc comment in `render-with-providers`, unused exports (`defaultTheme`, two E2E
  constants).

Not changed, with reasons:

- **Copy naming the spreadsheet** (`errors.forbidden`, `errors.not-found`, …): it is
  what users must act on today (get the spreadsheet shared). It lives only in the
  catalogues, so a data-source swap is a catalogue change; README step 5 lists the keys.
  "Your Roadmaps" and "Roadmaps available in the connected spreadsheet." are copy fixed
  by the brief (STY-004), so the sentence-case rule yields to it.
- **Per-view `document.title`**: the title always names the app. The visible `h1` and the
  new focus handling identify each view; per-view titles need `syncDocumentLanguage` to
  stop owning the title. Recommended next step, not a defect for two views.
- **`composeApp` has no unit test**: its wiring is mirrored in `renderWithProviders` and
  exercised for real by E2E (401 → expired, disconnect clears data). A unit test would
  need GIS injection into `composeApp` for no extra confidence.
- **HMR `dispose` in `composeApp`**: harmless; kept as STY-003 specified.
- **`index` in the `fields` mask**: specified by ADR-002; a few bytes.
- **`sheets-client` `retryable: status === 429 || status >= 500`**: explicit beats
  relying on the `rate-limited` default.
- **`@types/node` 22**: matches the oldest supported runtime in `engines`.
- **Duplicate toast and hero notice for a failed connect; header badge announcing state
  changes; `ReconnectButton` vs `AuthButton`**: deliberate STY-005/STY-006 behaviour (the toast
  is the app-wide channel; Reconnect keeps its label while busy); low value to change.
- **No CSP**: see README "Security and data access"; it can only be validated against a
  real sign-in.

### Sol (`gpt-6.1-sol`, reasoning high), whole repository

No Blocker or High findings. All three findings fixed:

1. **Medium: in-flight request survives session expiry.** A request made with the old
   token that succeeded after expiry cleared `isInvalidated`, so reconnecting within
   `staleTime` did not refetch; a late 401 could also expire the next session. Fixed:
   `invalidateAuthScopedQueriesOnSessionEnd` now cancels auth-scoped queries (reverting
   them, cached data kept) and then invalidates; the order matters, because the revert
   would otherwise reset the flag. Regression test "abandons a request in flight…"
   fails on the old code. This also retires STY-003's "late 401 after reconnect" gotcha.
2. **Medium: focus lost when an auth transition removes the focused control** (hero
   Connect, Reconnect in alerts). Fixed by `AppShell`'s focus rescue (a
   `MutationObserver` on `<main>`: when the focused element there is removed and focus
   fell to `<body>`, focus `<main>`). Tests: keyboard Connect from the hero, Reconnect
   from the expired alert, and the header button keeping focus as it turns into
   Disconnect; E2E asserts `<main>` is focused after connecting and navigating.
3. **Low: the token guard only checked final state, and swallowed inspection errors.**
   Fixed: `persistence-recorder.ts` records storage writes, cookie writes, history URL
   changes, frame navigations and console output for the whole test, plus a final
   snapshot; errors are no longer caught. A token written then removed fails the test.

Checks re-run after the fixes from a clean install: typecheck, lint, format, 264 unit
tests, build, 31 E2E (and 31 E2E under `/roadmaps-editor/`).

## Screenshots

`.artifacts/screenshots/STY-009/`: `landing-{desktop,mobile}-{light,dark}-en`,
`landing-{desktop,mobile}-light-cy`, `landing-narrow320-light-{en,cy}`,
`grid-desktop-{light,dark}-en`, `grid-desktop-light-en-toast`, `grid-desktop-light-cy`,
`grid-mobile-{light,dark}-en`, `grid-mobile-light-cy`, `grid-narrow320-light-{en,cy}`,
`loading-{desktop,mobile}-light-en`, `empty-desktop-light-en`,
`error-forbidden-{desktop,mobile}-light-en`, `expired-{desktop,mobile}-light-en`,
`expired-desktop-light-cy`, `detail-desktop-{light,dark}-en`, `detail-desktop-light-cy`,
`detail-mobile-light-{en,cy}`, `detail-signed-out-desktop-light-en`,
`detail-unknown-roadmap-desktop-light-en`, `not-found-{desktop,mobile}-light-en`,
`not-found-desktop-light-cy`, `language-menu-mobile-light-en`, and the live Google
checks `google-popup-live`, `google-popup-live-opener`,
`google-popup-live-preview-4173`, `google-popup-live-production-origin`.

## Outstanding external steps

1. Google Cloud, OAuth client `581293930758-…`: add `https://collisdigital.github.io` to
   Authorised JavaScript origins (verified missing), and optionally
   `http://localhost:4173`.
2. Google Auth Platform → Branding: the consent screen says "FHIR Host"; rename it to
   "Product Roadmaps" or move the client to a dedicated project. Check the Sheets API is
   enabled in that project, and that the audience (Internal, or External with test users)
   covers the people who will use the app.
3. GitHub: `collisdigital/roadmaps-editor` exists but is **private**, its `main` has only
   the initial commit, and Pages is not enabled (checked with `gh api`, 2026-11-10).
   Pages for a private repository needs a paid plan, otherwise make it public. Set
   Settings → Pages → Source to "GitHub Actions" before the first push to `main`, then
   merge `feat/bootstrap` into `main`, push, and watch CI/CD.
4. After deployment, a manual sign-in on the live site to verify consent, the Sheets
   call, Refresh, Disconnect (revoke) and expiry, which were verified only with fakes.
5. A fluent Welsh speaker reviews `src/i18n/locales/cy.ts` before a public launch.
