# tests/e2e — Playwright

End-to-end tests of the production build, with Google faked (ADR-006).

- Import `test`, `expect`, `connect` and `roadmapCards` from `./fixtures/test`, never
  from `@playwright/test`, so every test gets the fakes and the hermetic guard. Import
  nothing from `src/`: tests drive the app as a user does, through roles and copy.
- `gis` (`fixtures/fake-gis.ts`) plays Google Identity Services and `sheets`
  (`fixtures/fake-sheets.ts`) the Sheets API, over the example spreadsheet in
  `tests/fixtures/sheets/`; their docblocks are the API. A list load reads `metadata`
  then `values:<first tab>`; a roadmap's items add `values:<its tab>`; a publish is one
  `batchUpdate`, recorded in `sheets.writes`, never in `reads`.
- Anything the real APIs would reject, any request to another origin, and any access
  token reaching storage, cookies, the URL or the console fail the test at teardown.
  Add a new external dependency to the fakes, never to the guard.
- Only an item with an ID can conflict: a co-lead test publishes once first
  (`publishOnce` in `fixtures/dialogs.ts`) to give every item its ID, then calls
  `sheets.coLead`.
- No sleeps. For back-off or expiry, `page.clock.install()` before `goto`, then
  fast-forward; time still runs in real time until moved. Move the clock to a session's
  end or its warning by `sessionMs()` and `SESSION_WARNING_MS` (`fixtures/fake-gis.ts`),
  never a sum written in the spec. The warning opens two minutes before a session ends
  and, being modal, hides the page from role queries: a grant shorter than about 180 s
  opens it at once.
- `page.evaluate` runs with a user gesture, so it cannot exercise the popup-gesture
  check.
- `sheets.reads`, `sheets.tokens` and `gis.tokenRequests` fill as requests arrive: await
  a state only those requests produce, or `expect.poll`, before asserting on one. Cached
  cards already on screen prove nothing.
- Navigate with relative URLs (`./`, `./#/roadmaps/producta`) so a base path only
  changes `baseURL`.
- The leave warning is a `beforeunload` dialog: `page.close({ runBeforeUnload: true })`
  raises it, and dismissing it in a `page.on("dialog")` handler keeps the page open.
- Specs assert English copy from `src/i18n/locales/en.ts`. Before pushing a change to a
  control's text or accessible name, grep `tests/e2e` for the old text and run every
  spec that reaches the control, or the whole suite when it is in the shell.

## Look checks

The DHCW look is held without screenshots: aria snapshots, computed styles and focus
tours.

- Each key screen has an aria snapshot in `structure.spec.ts-snapshots/`, matched
  exactly (`children: "deep-equal"`), so an element added or removed fails. After a
  deliberate change run `pnpm test:e2e structure.spec.ts --update-snapshots` and review
  the YAML diff. That flag never writes a _new_ snapshot: use `--update-snapshots=all`,
  check `git status` lists it, and restore the others it rewrote with
  `git checkout -- <file>`. In each snapshot it writes, an update turns a number of two
  or more digits into a pattern (`1 October 2026` to `/1 October \d+/`): put the literal
  back where the fixtures fix the value, then commit.
- CI serves under `/roadmaps-editor/`: after changing the structure snapshots, run them
  once with
  `GITHUB_REPOSITORY=DHCW-Digital-Health-and-Care-Wales/roadmaps-editor`.
- Snapshot a `main`, header, menu, dialog, form or notice, never the footer, whose
  version changes per build.
- The "Connected" notice clears itself after eight seconds: a test that snapshots or
  tabs past it calls `holdConnectedNotice(page)` right after connecting.
- Compare a computed style with the token it comes from, `tokenColour(page, "--token")`
  (`fixtures/look.ts`), never a copied colour.
- The focus tours need every tab stop to match `focus-fill`, `focus-ring` or
  `focus-link`: a new kind of control uses one of them, or the check gains a utility.
- The item dialog's tour (`focus-indicator.spec.ts`) opens each form field that opens
  on request, so its controls are toured: open a new one there too.
- A page tour names each stop by its `aria-label` or label, and fails if two share a
  name; a text field out of the Tab order fails it too, unless it is the details
  outline's (`NOT_A_STOP`). Give a new text field a label of its own.
