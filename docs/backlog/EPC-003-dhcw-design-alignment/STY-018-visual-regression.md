# STY-018: Screenshot tests hold the DHCW look

- **Status**: Proposed — owner approved the recommended approach, 2026-11-10
- **Type**: Feature
- **Area**: E2E + CI/CD
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-016 (hard), STY-017 (preferred order)
- **Binding ADRs**: ADR-006, ADR-007, ADR-010
- **Suggested model**: Sonnet — Playwright configuration and deterministic captures

## Summary

Once the DHCW look is finished, screenshot tests catch any later change to it that
nobody meant to make. They cover the key screens at desktop and phone width, in light
and dark and in Welsh. A deliberate visual change updates the stored images in the same
PR, so a reviewer sees it. A keyboard-focus check also confirms that every control
shows DHCW's yellow indicator. Not in it: new screens or behaviour.

## Acceptance criteria

### S1: Key screens are compared against stored images

**Given** the stored baselines
**When** `pnpm test:e2e` runs locally or in CI
**Then** it compares each screen against its baseline:

- the start page, ready and after an error;
- the main page: roadmaps, empty, a failed load, and expired with roadmaps;
- a roadmap's detail page;
- the not-found page;
- the language menu open;
- the session warning, if STY-017 shipped it.

Each is captured at 1280px and 375px in light and dark, with the start and main pages
also in Cymraeg.
**And** a difference fails the run, and the diff images reach the CI report

### S2: Captures are deterministic

**Given** the same commit
**When** the suite runs twice, locally and in CI
**Then** the captures match:

- fonts are loaded before capture;
- animations and the caret are off;
- time is fixed with `page.clock`;
- the footer's version is masked.

### S3: A deliberate change is reviewable

**Given** a PR that changes the look on purpose
**When** its author follows the documented update step
**Then** the PR carries the new baselines, and its screenshots section shows the change

### S4: Every control shows the DHCW focus indicator

**Given** the start page and the main page with roadmaps, in both themes
**When** a test tabs through every focusable element
**Then** each focused element's computed style matches one of the three DHCW focus
utilities, held by an assertion on the focus tokens

## Decisions

- **D1** (owner, 2026-11-10, analysis decision 7): add visual regression once the look
  is finished, as recommended.
- **D2** (agent, 2026-11-10): baselines are committed beside the spec and not
  platform-suffixed, because local and CI runs are both Linux. Confirm this before
  relying on it; if they differ, generate baselines in CI only and record that as a
  departure.

## Starting point

Audited at `22c3336`.

- The hermetic fixtures (`tests/e2e/fixtures/test.ts`) already fake GIS and Sheets and
  block other origins.
- STY-007's gotcha: retryable failures back off about 3 s, so failure states need
  `page.clock` fast-forwarding.
