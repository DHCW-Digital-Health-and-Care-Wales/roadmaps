# apps/editor/tests/e2e — Playwright

End-to-end tests of the production build, with Google faked (ADR-006).

- Import `test`, `expect`, `connect` and `roadmapCards` from `./fixtures/test`, never
  from `@playwright/test`, so every test gets the fakes and the hermetic guard. Import
  nothing from `apps/editor/src/`: tests drive the app as a user does, through roles and copy.
- `gis` (`apps/editor/tests/e2e/fixtures/fake-gis.ts`) plays Google Identity Services and `sheets`
  (`apps/editor/tests/e2e/fixtures/fake-sheets.ts`) the Sheets API, over the example spreadsheet in
  the workspace root's `fixtures/sheets/`; their docblocks are the API. A list load reads `metadata`,
  then `values:<first tab>` and a `Families` or `Categories` tab's; a roadmap's items
  read all of those again, then add `values:<its tab>` (ADR-011), so a roadmap's page
  is five reads on the example spreadsheet; a publish is one `batchUpdate`, recorded
  in `sheets.writes`, never in `reads`.
- Anything the real APIs would reject, any request to another origin, and any access
  token reaching storage, cookies, the URL or the console fail the test at teardown.
  Add a new external dependency to the fakes, never to the guard.
- Only an item with an ID can conflict: a co-lead test publishes once first
  (`publishOnce` in `apps/editor/tests/e2e/fixtures/dialogs.ts`) to give every item its ID, then calls
  `sheets.coLead`.
- No sleeps. For back-off or expiry, `page.clock.install()` before `goto`, then
  fast-forward; time still runs in real time until moved, so stop a fast-forward short
  of a deadline by more than a loaded runner's steps take (seconds, not one), then move
  the rest. Move the clock to a session's end or its warning by `sessionMs()` and
  `SESSION_WARNING_MS` (`apps/editor/tests/e2e/fixtures/fake-gis.ts`), never a sum written in the spec. The
  warning opens two minutes before a session ends and, being modal, hides the page from
  role queries: a grant shorter than about 180 s opens it at once.
- `page.evaluate` runs with a user gesture, so it cannot exercise the popup-gesture
  check.
- `sheets.reads`, `sheets.tokens` and `gis.tokenRequests` fill as requests arrive: await
  a state only those requests produce, or `expect.poll`, before asserting on one. Cached
  cards already on screen prove nothing.
- Navigate with relative URLs (`./`, `./#/roadmaps/producta`) so a base path only
  changes `baseURL`.
- The leave warning is a `beforeunload` dialog: `page.close({ runBeforeUnload: true })`
  raises it, and dismissing it in a `page.on("dialog")` handler keeps the page open.
- Specs assert English copy from `apps/editor/src/i18n/locales/en.ts`. Before pushing a change to a
  control's text or accessible name, grep `apps/editor/tests/e2e` for the old text and run every
  spec that reaches the control, or the whole suite when it is in the shell.

- The header has no Connect or Disconnect button: `chooseFromAccountMenu` and
  `disconnectFromHeader` (`apps/editor/tests/e2e/fixtures/account-menu.ts`) drive its account menu. Answer the
  reconnect dialog with `reconnectDialog` and `reconnectButton` (`apps/editor/tests/e2e/fixtures/dialogs.ts`).
- At 1280px the navigation stands beside the page and its links share names with the
  list's and the cards': scope a page's own to `main`. Playwright matches a role's name
  by substring, so name "More" `exact`.
- Run a layout check with `reducedMotion: "reduce"` too: no transition runs, so a class
  a bar gains takes effect in its own frame. Measure its border box.
- What a step causes lands later, on a loaded runner much later: a popup takes focus a
  frame after it shows, and Base UI returns focus, focuses a notice or acts on a menu's
  choice only as the popup's closing animation ends. A helper that opens a popup returns
  once focus is in it (`openDialog`, `openAccountMenu`); one that closes, chooses or
  confirms returns once the popup has gone, by when what its closing causes has landed
  (`chooseFromMore`, `confirmPublish`, `escapeFrom`). A spec waits the same way before
  its next step acts, and presses Escape in a popup that holds focus with `escapeFrom`.
- Read boxes compared with each other in one `boxesOf` call, so they are of one moment.
- Redden a race by holding what its step waits for, releasing it a while later, and
  asserting once, the moment the helper returns: a closing animation paused by a style
  rule (`holdPublishDialogClosing`), a request held with `page.route`, the clock paused
  with `page.clock.pauseAt`. A delay that hopes a later step collides goes red only now
  and then.

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

- Each key screen has an aria snapshot in `structure.spec.ts-snapshots/`, matched
  exactly (`children: "deep-equal"`), so an element added or removed fails. After a
  deliberate change run `pnpm editor:test:e2e structure.spec.ts --update-snapshots` and review
  the YAML diff. That flag never writes a _new_ snapshot: use `--update-snapshots=all`,
  check `git status` lists it, and restore the others it rewrote with
  `git checkout -- <file>`. In each snapshot it writes, an update drops checks.
  `apps/editor/build/aria-snapshot-literals.test.ts` fails the patterns and `text: ""` it writes in
  place of a literal; text that is a control's only child is dropped
  (`button "Publish changes": Publish` to `button "Publish changes"`), which fails the
  next run. Put back the literal where the
  fixtures fix the value and each control's text, then commit.
- CI serves under `/roadmaps/`: after changing the structure snapshots, run them
  once with
  `GITHUB_REPOSITORY=DHCW-Digital-Health-and-Care-Wales/roadmaps`.
- Snapshot a `main`, header, menu, dialog, form or notice, never the footer, whose
  version changes per build.
- Compare a computed style with the token it comes from, `tokenColour(page, "--token")`
  (`apps/editor/tests/e2e/fixtures/look.ts`), never a copied colour.
- The focus tours need every tab stop to match `focus-fill`, `focus-ring` or
  `focus-link`: a new kind of control uses one of them, or the check gains a utility.
- The item dialog's tour (`focus-indicator.spec.ts`) opens each form field that opens
  on request, so its controls are toured: open a new one there too.
- A page tour names each stop by its `aria-label` or label, and fails if two share a
  name; a text field out of the Tab order fails it too, unless it is the details
  outline's (`NOT_A_STOP`). Give a new text field a label of its own.
