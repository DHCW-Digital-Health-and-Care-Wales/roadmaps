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
  of `tests/fixtures/sheets/` (cards "Product B roadmap", "Product A roadmap", "Product C
  roadmap", the order the page groups them in); assign `withRoadmapIndex(rows)` to change the
  list, building rows from `EXAMPLE_INDEX_ROWS` or `roadmapRow({ Sheet, Title, … })` (cells by
  header name). `sheets.failWith(...statuses)` fails the next requests,
  either read. `sheets.reads` lists the reads (`metadata`, `values`) and `sheets.tokens`
  each request's bearer token, so one load is two entries; `sheets.hold()` keeps replies
  pending until its returned `release()` is called.
- `roadmapCards(page)` is every card's link, across the family groups (several lists). A
  link holds only the title, so `toHaveText([...])` checks order and count, and a card's other
  content is asserted on its list item (`getByRole("listitem").filter({ has: link })`, with
  `link` a page-level `getByRole("link", { name })`: `roadmapCards` starts at `main`, which
  is not inside the item, so it matches nothing there).
- Anything the real APIs would reject, any request to another origin, and any issued
  access token written to storage, cookies, the URL or the console at any point
  (`fixtures/persistence-recorder.ts`) fail the test at teardown. Add a new external
  dependency to the fakes, not to the guard.
- No sleeps. For back-off or expiry, `page.clock.install()` before `goto`, then
  fast-forward. The session warning opens two minutes before a session's end (Google's
  `expires_in` less 60 s) and, being modal, hides the rest of the page from role
  queries: a grant shorter than about 180 s opens it at once.
- `sheets.reads`, `sheets.tokens` and `gis.tokenRequests` fill as requests arrive: before a
  plain `expect` on one, await a state only those requests produce, or `expect.poll` it. A
  state already on screen before them, such as cached cards, proves nothing.
- Navigate with relative URLs (`./`, `./#/roadmaps/producta`) so a base path only changes
  `baseURL`.
- Specs assert English copy from `src/i18n/locales/en.ts`. Before pushing a change to a
  control's text or accessible name, grep `tests/e2e` for the old text and run every spec
  that reaches the control, or the whole suite when the control is in the shell.

## Look checks

The DHCW look is held without screenshots, so there is no pixel baseline to regenerate.

- Each key screen is compared with an aria snapshot in `structure.spec.ts-snapshots/`, and
  matching is exact (`children: "deep-equal"` in `playwright.config.ts`): an element
  added to or removed from a screen fails. After changing a screen's structure on
  purpose, run `pnpm test:e2e structure.spec.ts --update-snapshots`, which rewrites only
  the snapshots that differ (`=all` rewrites every one), then review the YAML diff and
  commit it with the change.
- Snapshot a `main`, header, menu or dialog, never the footer, whose version differs from
  build to build. Playwright writes a regex where a number moves, such as the session
  warning's countdown.
- `page.clock.install()` does not stop time: it runs in real time until moved. The
  "Connected" notice clears itself after eight seconds, so a test that snapshots or tabs
  past it calls `holdConnectedNotice(page)` right after connecting.
- Compare a computed style with the semantic token it should come from, read by
  `tokenColour(page, "--token")` (`fixtures/look.ts`), never a copied colour.
- The focus tours press Tab through every tab stop and need each to match `focus-fill`,
  `focus-ring` or `focus-link`: a new kind of control uses one of them, or the check gains
  a utility.
