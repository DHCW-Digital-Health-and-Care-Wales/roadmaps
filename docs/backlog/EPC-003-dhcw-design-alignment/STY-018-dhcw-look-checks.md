# STY-018: Tests hold the DHCW look without screenshots

- **Status**: In progress — feat/sty-018-dhcw-look-checks; the owner replaced the screenshot comparison with structure and computed-style checks, 2026-11-10
- **Type**: Feature
- **Area**: E2E + CI/CD
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-016 (hard), STY-017 (preferred order)
- **Binding ADRs**: ADR-006, ADR-007, ADR-010
- **Suggested model**: Sonnet — Playwright specs and deterministic setup

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
