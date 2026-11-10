# STY-007 — Playwright E2E with faked GIS and Sheets API

## Goal

Hermetic browser tests of the real production bundle, per ADR-006.

## Scope

- `@playwright/test`, `playwright.config.ts` (Chromium; `webServer` runs
  `pnpm build && pnpm preview --port 4173 --strictPort` or equivalent; `baseURL`; trace on
  first retry; CI-friendly reporter). `pnpm test:e2e` script. Vitest must not pick up
  `tests/e2e`.
- `tests/e2e/fixtures/` — a Playwright fixture that:
  - routes `https://accounts.google.com/gsi/client` to a fake script implementing
    `google.accounts.oauth2.initTokenClient` / `requestAccessToken` /
    `hasGrantedAllScopes` / `revoke`, controllable per test (grant, deny, popup closed);
  - routes `https://sheets.googleapis.com/v4/spreadsheets/**` with configurable responses
    (success list incl. a hidden sheet, empty, 403, 401, 500-then-success).
  - Asserts the Sheets request carries `Authorization: Bearer <fake token>` and the exact
    `fields` parameter.
  - Blocks any other external request (fail loudly).
- Specs: landing renders; connect -> cards shown (hidden omitted, order kept);
  card click -> detail page (deep link + reload works with hash URL); failure -> retry ->
  success; permission error copy; expired (401) -> reconnect -> success; disconnect
  clears cards; theme toggle; language switch to Cymraeg (copy and `<html lang>` change,
  choice persists across reload); basic a11y smoke (optionally `@axe-core/playwright` if
  justified).
- Ensure Playwright browsers install instructions (`pnpm exec playwright install --with-deps chromium`).

## Acceptance criteria

- [x] `pnpm test:e2e` passes locally headless with no network access to Google.
- [x] All other checks green.

## Review notes

Sol review (Codex `gpt-6.1-sol`, high) of the uncommitted change:

1. **Guard only on the page; popups, service workers and WebSockets could escape** —
   fixed. The guard is a `context.route` + `context.routeWebSocket`, and
   `serviceWorkers: "block"` is set in `playwright.config.ts`. Verified with throwaway
   specs that a `fetch`, a `window.open` popup and a `WebSocket` to other origins each fail
   the test.
2. **Disconnect test did not prove the cache was cleared** (session-end invalidation
   refetches anyway, and the hero hides cards regardless) — fixed. `FakeSheets.hold()`
   keeps the reconnect's request pending; the test asserts the loading skeleton with no
   cards, then that only the new reply's roadmap appears.
3. **No short-lived grant scenario** — fixed. The expiry test now uses a 120 s grant
   (60 s usable) and fake time, and a 60 s grant (no usable time) is in the auth failure
   table (fails as "Connection failed" with no Sheets request).
4. **STY-008's base path (`/roadmaps-editor/`) will break `baseURL`/`webServer.url`** —
   deferred to STY-008, which owns base-path resolution (it does not exist yet). Specs only
   use relative URLs (`./`, `./#/roadmaps/42`), so STY-008 changes only `baseURL` in
   `playwright.config.ts` (from the same resolver, trailing slash kept) or builds the E2E
   bundle with base `/`. Recorded in the STY-007 handoff.
5. **"No toast" assertion for a closed popup could pass vacuously** — fixed by removing
   it. Absence is asserted precisely in `src/app/app.test.tsx`, where Sonner's timer is
   flushed; E2E keeps only positive toast assertions.
6. **Browser install not documented outside the backlog** — `pnpm exec playwright install
--with-deps chromium` added to `AGENTS.md` Commands; the README is STY-008's.

Not shared with unit-test fakes: the Vitest GIS fake (`google-auth-client.test.ts`) is a
`vi.fn`-based object in jsdom, while the E2E fake is a script served into a real browser
and bridged to Node. They share nothing useful beyond the GIS type, which both take from
`@types/google.accounts`.
