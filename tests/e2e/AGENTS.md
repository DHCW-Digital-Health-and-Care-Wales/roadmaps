# tests/e2e — Playwright

End-to-end tests of the production build, with Google faked (ADR-006). Run with
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
- `sheets` (`fixtures/fake-sheets.ts`) answers the two reads of a list load: the tab list
  (`spreadsheets.get`) and the first tab's values; reading any other tab is a violation.
  `sheets.spreadsheet` holds its tabs, by default `EXAMPLE_SPREADSHEET`, the example CSVs
  of `tests/fixtures/sheets/` (cards "Product A roadmap", "Product B roadmap", "Product C
  roadmap"); assign `withRoadmapIndex(rows)` to change the list, building rows from
  `EXAMPLE_INDEX_ROWS` or inline. `sheets.failWith(...statuses)` fails the next requests,
  either read. `sheets.reads` lists the reads (`metadata`, `values`) and `sheets.tokens`
  each request's bearer token, so one load is two entries; `sheets.hold()` keeps replies
  pending until its returned `release()` is called.
- Anything the real APIs would reject, any request to another origin, and any issued
  access token written to storage, cookies, the URL or the console at any point
  (`fixtures/persistence-recorder.ts`) fail the test at teardown. Add a new external
  dependency to the fakes, not to the guard.
- No sleeps. For back-off or expiry, `page.clock.install()` before `goto`, then
  fast-forward. The recorders (`sheets.reads`, `sheets.tokens`, `gis.tokenRequests`) fill as
  requests arrive: before a plain `expect` on one, await a state only those requests
  produce, or `expect.poll` it. Cards still on screen from the cache prove nothing. Navigate with relative URLs (`./`, `./#/roadmaps/producta`) so a base path
  only changes `baseURL`.
- Specs assert English copy from `src/i18n/locales/en.ts`. Before pushing a change to a
  control's text or accessible name, grep `tests/e2e` for the old text and run every spec
  that reaches the control, or the whole suite when the control is in the shell.
