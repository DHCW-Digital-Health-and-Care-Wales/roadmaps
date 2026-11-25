# apps/editor/tests/e2e — Playwright

End-to-end tests of the production build, with Google faked (ADR-006).

## Fakes and fixtures

- Import `test`, `expect`, `connect` and `roadmapCards` from
  `apps/editor/tests/e2e/fixtures/test.ts`, never from `@playwright/test`, so every test
  gets the fakes and the hermetic guard. Import nothing from `apps/editor/src/`: tests
  drive the app as a user does, through roles and copy.
- `gis` (`apps/editor/tests/e2e/fixtures/fake-gis.ts`) fakes Google Identity Services and
  `sheets` (`apps/editor/tests/e2e/fixtures/fake-sheets.ts`) the Sheets API over the
  root `fixtures/sheets/`; their docblocks are the API (writes record in `sheets.writes`,
  never `reads`).
- Anything the real APIs would reject, any request to another origin, and any access
  token reaching storage, cookies, the URL or the console fail the test at teardown.
  Extend the fakes for a new external dependency; never loosen the guard.
- Drive the header's account menu through `chooseFromAccountMenu` / `disconnectFromHeader`
  (`apps/editor/tests/e2e/fixtures/account-menu.ts`) and the reconnect dialog through
  `reconnectDialog` / `reconnectButton` (`apps/editor/tests/e2e/fixtures/dialogs.ts`);
  the header has no Connect or Disconnect button.

## Timing, layout and selectors

- No sleeps. For back-off or expiry, install `page.clock` before `goto` and fast-forward;
  time still ticks in real time until moved, so stop seconds short of a deadline before
  moving the rest. Move to session warning/end with `sessionMs()` and `SESSION_WARNING_MS`
  (`apps/editor/tests/e2e/fixtures/fake-gis.ts`), never a hardcoded sum; a grant shorter
  than ~180 s opens the modal warning immediately and hides the page from role queries.
- `sheets.reads`, `sheets.tokens` and `gis.tokenRequests` fill as requests arrive: await
  a state only those requests produce, or `expect.poll`, before asserting on one (cached
  cards already on screen prove nothing).
- Navigate with relative URLs (`./`, `./#/roadmaps/producta`) so a base path only
  changes `baseURL`. Trigger the `beforeunload` leave warning with
  `page.close({ runBeforeUnload: true })` and handle it in `page.on("dialog")`.
- Specs assert English copy from `apps/editor/src/i18n/locales/en.ts`. Before changing a
  control's text or accessible name, grep `apps/editor/tests/e2e/` for the old text and
  run every spec that reaches it (or the whole suite for shell controls).
- At 1280 px the navigation rail shares link names with cards: scope page queries to
  `main`, and pass `exact: true` for `"More"` since Playwright matches role names by
  substring.
- Run layout checks with `reducedMotion: "reduce"` too, measure border boxes, and read
  compared boxes in one `boxesOf` call (`apps/editor/tests/e2e/fixtures/layout.ts`).
- Wait for popup focus/close transitions to settle before acting next: opening helpers
  (`openDialog`, `openAccountMenu`) return once focus is inside; closing/confirming
  helpers (`refreshRoadmap`, `confirmPublish`, `escapeFrom`) return once the popup is
  gone. Press Escape inside a focused popup with `escapeFrom`.
- Redden a race deterministically by holding what a step waits for (`page.route`,
  `page.clock.pauseAt`, or a paused closing animation like `holdPublishDialogClosing`),
  releasing it, and asserting once when the helper returns — never with a hope-it-collides
  delay.

## What earns an E2E test

- Hold a journey's behaviour in a Vitest page test, and give it a spec here only for
  what jsdom cannot see (layout, reflow, computed styles, focus and its indicator,
  Base UI's timing, the built bundle's routes, `beforeunload`, the clock, the popup
  gesture, and the axe scans and aria snapshots of _Look checks_) and for one round
  trip through the fakes per kind of write, asserting no more than its page test
  cannot.
- Run a journey once. Repeat it per theme for a colour, per language where Welsh copy
  can change the layout or a structure snapshot, and per width at a width each side of
  a breakpoint where the page offers different controls; assert in a repeat only what
  can differ.
- Check a position or a size only where it is an accessibility rule, such as reflow at
  375 px, or decides what a user can see or reach.

## Look checks

The DHCW look is held without screenshots: aria snapshots, computed styles and focus
tours.

- Each key screen has an exact aria snapshot (`children: "deep-equal"`) in
  `apps/editor/tests/e2e/structure.spec.ts-snapshots/`. After a deliberate change, run
  `pnpm editor:test:e2e structure.spec.ts --update-snapshots` (or `=all` to write a new
  snapshot, restoring unrelated rewritten files with `git checkout -- <file>`) and review
  the YAML diff. Playwright's update replaces fixed literals with loose patterns (caught
  by `apps/editor/build/aria-snapshot-literals.test.ts`) and drops text that is a
  control's only child (`button "Publish changes": Publish` → `button "Publish changes"`),
  which breaks the next run — restore literals and control text before committing.
- CI serves under `/roadmaps/`: after changing structure snapshots, run them once with
  `GITHUB_REPOSITORY=DHCW-Digital-Health-and-Care-Wales/roadmaps`.
- Snapshot `main`, header, menu, dialog, form or notice, never the footer (whose version
  changes per build).
- Compare computed styles with `tokenColour(page, "--token")`
  (`apps/editor/tests/e2e/fixtures/look.ts`), never a copied colour.
- Every tab stop in `apps/editor/tests/e2e/focus-indicator.spec.ts` must match
  `focus-fill`, `focus-ring` or `focus-link` and carry a unique label; open any new
  on-request form field in the item dialog tour there too.
