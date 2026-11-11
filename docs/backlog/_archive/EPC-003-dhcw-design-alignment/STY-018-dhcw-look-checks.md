# STY-018: Tests hold the DHCW look without screenshots

- **Status**: Done — delivered in its PR, which awaits merge; the owner replaced the screenshot comparison with structure and computed-style checks, 2026-11-10
- **Type**: Feature
- **Area**: E2E + CI/CD
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-016 (hard), STY-017 (preferred order)
- **Binding ADRs**: ADR-006, ADR-007, ADR-010
- **Suggested model**: Sonnet — Playwright specs and deterministic setup
- **Delivered**: https://github.com/collisdigital/roadmaps-editor/pull/20

## Summary

Once the DHCW look is finished, a later change to it that nobody meant to make fails a
test. The tests read each key screen's structure and the computed styles of its anchors:
the header, the primary button, links, the font and the page background, in light and
dark. They also check that every control shows DHCW's yellow keyboard-focus indicator and
that nothing scrolls sideways at phone and desktop width. Not in it: pixel or screenshot
comparison, and new screens or behaviour.

## Acceptance criteria

### S1: Key screens hold their structure

**Given** the committed aria snapshots
**When** `pnpm test:e2e` runs locally or in CI
**Then** Playwright's `toMatchAriaSnapshot` compares each screen with its snapshot:

- the start page, ready and after an error;
- the main page: roadmaps, empty, a failed load, and expired with roadmaps;
- a roadmap's detail page;
- the not-found page;
- the language menu open;
- the session warning (the `alertdialog` from STY-017).

**And** the screens are in English, with the start and main pages also in Cymraeg
**And** a deliberately changed structure updates its snapshot in the same PR
**And** time is fixed with `page.clock`, and nothing literal is asserted for the footer's
version

### S2: Anchor styles match their tokens

**Given** a screen in each theme
**When** a test reads the computed style of the header background, the primary button's
fill, a text link's colour, the body font family and the page background
**Then** each equals the resolved value of its semantic token, read from the stylesheet's
custom property and not written as a literal

### S3: Every control shows the DHCW focus indicator

**Given** the start page and the main page with roadmaps, in both themes
**When** a test tabs through every focusable element
**Then** each focused element's computed style matches one of the three DHCW focus
utilities, `focus-fill`, `focus-ring` or `focus-link`, with colours taken from the focus
tokens

### S4: Nothing scrolls sideways, and the Welsh header name fits

**Given** the start page and the main page with roadmaps
**When** the viewport is 375px and then 1280px wide
**Then** the page has no horizontal scroll
**And** in Cymraeg the header's service name is not truncated

### S5: The suite is deterministic and its update step is documented

**Given** the same commit
**When** the suite runs twice, locally and in CI
**Then** both runs pass
**And** `tests/e2e/AGENTS.md` documents how to update the aria snapshots after a
deliberate structure change

## Decisions

- **D1** (owner, 2026-11-10; analysis decision 7 revised): there is no pixel or screenshot
  comparison. Aria snapshots and computed styles replace it, because pixel baselines are
  fragile. This replaces the Summary and S1–S4 as first written (kept in git history):
  S1 is the aria snapshots, S2 the anchor styles, S3 the focus indicator (was S4), S4 the
  layout guard, and S5 determinism and the update step (was S2 and S3).
- **D2** (agent, 2026-11-10): the first draft's baselines-per-platform decision is
  deleted with the baselines.
- **D3** (agent, 2026-11-10, from STY-017): STY-017 shipped the session warning
  (`alertdialog` "Your session is about to end", reached with `page.clock`; see
  `tests/e2e/session-warning.spec.ts`), so S1's last item applies. Failures are now page
  notices at the top of `main`, not toasts.

## Starting point

Audited at `22c3336`, then re-read at `215c0c1`.

- The hermetic fixtures (`tests/e2e/fixtures/test.ts`) already fake GIS and Sheets and
  block other origins.
- STY-007's gotcha: retryable failures back off about 3 s, so failure states need
  `page.clock` fast-forwarding.
- `tests/e2e/focus-indicator.spec.ts` and `shell.spec.ts` already check some focus
  styles and the header's width with colour literals; `tokens.test.ts` and
  `contrast.test.ts` hold the tokens themselves and stay as they are.

## Delivery

### Departures

- **S1, what a snapshot covers** (agent): each screen's `main`, the language `menu`, the
  session warning's `alertdialog`, and the header and phase banner on their own. No
  footer, whose version differs from build to build. Matching is exact
  (`expect.toMatchAriaSnapshot.children: "deep-equal"` in `playwright.config.ts`), because
  Playwright's default accepts extra elements.
- **S1, base path** (agent): links are pointed at the site root just before a snapshot
  (`expectStructure`), because CI serves the app under `/roadmaps-editor/` and the `/url:`
  lines would differ. One snapshot serves a local and a CI build.
- **S1, fixed time** (agent, from review): `page.clock.install()` runs in real time, so it
  does not fix time. Only the expiry and the session-warning screens install it, to move
  the clock; the "Connected" notice, which clears after eight seconds, is held by
  hovering it (`holdConnectedNotice`). No other screen shows anything that depends on the
  time.
- **S1, the countdown** (agent): the warning is snapshotted 30 s into its two minutes, so
  its text is "1 minute and N seconds" however long the test takes; Playwright writes the
  `\d+` pattern itself and rewrites it the same way on an update.
- **S2, the font** (agent): the body's `font-family` is compared with `"Roboto Variable"`
  followed by `--nhsw-font-family-base`, since Tailwind inlines `--font-sans` and never
  emits it as a custom property. The check also covers the header's, page's and primary
  button's text colours, beside the five backgrounds and colours the scenario names.
- **S2, shell.spec.ts** (agent, from review): its navy header and yellow skip-link checks
  read `--header` and `--focus` instead of colour literals; the language and theme
  set-up in other specs uses `useLanguage` and `useTheme`.
- **S3, the existing focus spec** (agent): `focus-indicator.spec.ts` kept its targeted
  tour (skip link, logo, dismiss, menu, card, back link) but reads the yellow and the dark
  from `--focus` and `--focus-foreground` instead of colour literals, and gained the
  generic tour of every tab stop.
- **S4** (agent): built into `shell.spec.ts` rather than a new spec: its width test gains
  1280px and a start-page overflow check, and keeps the Welsh and English name checks.
- **`.prettierignore`** (agent): `tests/e2e/*-snapshots`, since Playwright writes the YAML
  in its own format and `--update-snapshots` would otherwise fail `format:check`.
- **TDD** (agent): none; Playwright specs follow working code. Discrimination was shown
  by breaking it: a removed line in a snapshot, and `focus-fill`'s bar changed in
  `globals.css`, each failed the intended test.

### Contract for dependents

- `tests/e2e/fixtures/look.ts`: `THEMES`, `useTheme(page, theme)`, `useLanguage(page,
language)`, `tokenColour(page, "--token")` (the resolved `rgb(…)` of a semantic token in
  the current theme) and `tokenValue(page, "--token")`. `connect(page, name?)` takes the
  button's text for a language other than English.
- A new screen: add a test and a snapshot to `structure.spec.ts`. A new control: the focus
  tours find it by themselves and fail until it shows a focus utility. A new anchor style:
  add it to `styles.spec.ts` with the token it should resolve to.
- The update step is in `tests/e2e/AGENTS.md` (_Look checks_).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `tests/e2e/structure.spec.ts` (every test; 20 snapshots in `structure.spec.ts-snapshots/`)                                                                                                            |
| S2       | `tests/e2e/styles.spec.ts` (both themes: header, page, primary button, font; a text link)                                                                                                             |
| S3       | `tests/e2e/focus-indicator.spec.ts` (`every control on the start page / main page shows DHCW's focus indicator`, both themes; the targeted `each kind of control shows the indicator it is meant to`) |
| S4       | `tests/e2e/shell.spec.ts` (`the service name shows untruncated and neither page scrolls sideways at Npx`, 375 to 1280, English and Cymraeg)                                                           |
| S5       | observed runs: the whole suite (108 tests) twice in a row locally, and once with `GITHUB_REPOSITORY=collisdigital/roadmaps-editor CI=true`, all green; CI's own run is pending                        |
