# tests/e2e — Playwright

End-to-end tests of the production build, with Google faked (ADR-0006). Run with
`pnpm test:e2e`; install the browser once with
`pnpm exec playwright install --with-deps chromium`.

- Import `test`, `expect`, `connect` and `roadmapCards` from `./fixtures/test`, never from
  `@playwright/test`, so every test gets the fakes and the hermetic guard. Do not import
  from `src/`: tests drive the app as a user does, through accessible roles and copy.
- `gis` (`fixtures/fake-gis.ts`) serves the GIS script and plays Google's side:
  `gis.respondWith(...outcomes)` queues `grant` (optional `expiresIn`, `scope`),
  `access-denied`, `popup-closed` or `popup-blocked`; requests are granted once the queue
  is empty. Grants issue `e2e-token-1`, `e2e-token-2`, … Inspect `gis.tokenRequests`
  (`clientId`, `scope`, `prompt`) and `gis.revokedTokens`. `gis.scriptAvailable = false`
  makes the script fail to load.
- `sheets` (`fixtures/fake-sheets.ts`) answers `spreadsheets.get`:
  `sheets.respondWith(...replies)` queues `{ worksheets }` or `{ status }`; the default
  is four worksheets, one hidden ("Platform", "Mobile app", "Data & analytics" visible, in
  that order). `sheets.tokens` lists each request's bearer token; `sheets.hold()` keeps
  replies pending until its returned `release()` is called.
- Anything the real APIs would reject, any request to another origin, and any issued
  access token written to storage, cookies, the URL or the console at any point
  (`fixtures/persistence-recorder.ts`) fail the test at teardown. Add a new external
  dependency to the fakes, not to the guard.
- No sleeps. For back-off or expiry, `page.clock.install()` before `goto`, then
  fast-forward. Navigate with relative URLs (`./`, `./#/roadmaps/42`) so a base path
  only changes `baseURL`.
