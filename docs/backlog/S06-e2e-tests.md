# S06 — Playwright E2E with faked GIS and Sheets API

## Goal

Hermetic browser tests of the real production bundle, per ADR-0006.

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
  clears cards; theme toggle; basic a11y smoke (optionally `@axe-core/playwright` if
  justified).
- Ensure Playwright browsers install instructions (`pnpm exec playwright install --with-deps chromium`).

## Acceptance criteria

- [ ] `pnpm test:e2e` passes locally headless with no network access to Google.
- [ ] All other checks green.
