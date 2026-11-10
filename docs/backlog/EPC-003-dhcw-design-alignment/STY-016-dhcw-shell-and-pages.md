# STY-016: The shell and pages are a DHCW staff service

- **Status**: Proposed — owner gave logo permission and approved the recommended shell,
  2026-11-10
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-015 (hard)
- **Binding ADRs**: ADR-010 §"Branding", §"Deferred: the dashboard shell"; ADR-007;
  ADR-008
- **Suggested model**: Sonnet — layout and copy on settled components, with screenshots
  in both languages

## Summary

The app becomes recognisably a DHCW staff service:

- a navy DHCW header with the DHCW logo;
- a "Beta" phase banner;
- a footer naming DHCW and the app's version;
- DHCW's yellow skip link and page spacing;
- plain, left-aligned pages in place of a centred marketing hero.

The start page becomes a plain DHCW start page with its notice above the heading. The
header keeps its controls and mobile rules. The dashboard sidebar is deliberately not in
it: it waits for the roadmap editor (ADR-010).

## Scope

`components/layout` (header, shell, footer, phase banner, not-found page), the start,
roadmaps and detail page layouts, the logo assets with their provenance, the favicon,
`app/config.ts` (an optional feedback address), a build-version helper in `build/`, the
catalogues, and the E2E selectors that change. Copy is written with the `copywriter`
skill.

## Acceptance criteria

### S1: A DHCW header with the logo

**Given** any page, in English then Cymraeg
**When** it is shown at 1280px and at 375px
**Then** a navy header shows the white DHCW logo (the full logo from `sm`, the icon
below), then the service name

- the logo's alternative text is "Digital Health and Care Wales" / "Iechyd a Gofal
  Digidol Cymru";
- the home link's accessible name includes the service name.

**And** the connection status (a tag in a chip), the language switcher, the theme
toggle and the auth action follow in that order, all legible on navy with the yellow
focus indicator

### S2: The narrow header keeps its rules

**Given** a 375px viewport in Cymraeg, connected
**When** the header is shown
**Then** it shows the icon, the short name and only Disconnect, with the status visually
hidden but still announced, and nothing scrolls horizontally

### S3: A phase banner invites feedback

**Given** a feedback address is configured, then one is not
**When** any page is shown
**Then** a "Beta" tag and a sentence inviting feedback sit below the header, with a
feedback link only when an address is configured
**And** a configured address that is not `https` fails the app's configuration check

### S4: A footer names DHCW and the version

**Given** a CI build of a commit, then a local build
**When** any page is shown
**Then** the footer shows "© Digital Health and Care Wales" (Welsh: "© Iechyd a Gofal
Digidol Cymru") and the version: the package version and short commit, or "dev" for a
local build

### S5: A plain DHCW start page

**Given** the user is not connected: ready, after an auth error, after a closed or
blocked popup, and while connecting
**When** the start page is shown
**Then** any notice comes first, above the `h1`, as a DHCW callout. Below it, left
aligned:

- the `h1` with the service name;
- the tagline;
- an inset note about where roadmaps come from;
- a primary Connect button;
- the access note in small text.

**And** no gradient, background grid or centred hero layout remains

### S6: Pages use DHCW layout and spacing

**Given** the main page, a roadmap's detail page and an unknown address
**When** each is shown at 1280px and 375px
**Then** each follows DHCW's wide container (max 1200px, 16px margins on a phone and
40px from desktop) and main-wrapper spacing, left aligned

- the detail page has a DHCW back link and the roadmap's title as its `h1`;
- the not-found page offers a link home, not a button.

**And** every list, detail, error, expired and refresh state behaves as before

### S7: The DHCW skip link and favicon

**Given** a keyboard user on any page
**When** they press Tab once
**Then** a yellow DHCW skip link appears and, when activated, moves focus to the main
content without changing the address
**And** the browser tab shows the DHCW icon, legible on light and dark browser chrome

## Tests

- S1–S4 are component tests in both languages. S3's configuration check is a unit test.
  S4's version helper is unit-tested like `resolve-base-path`.
- S5–S7 run in Playwright: update the specs and the stable names in
  `tests/e2e/AGENTS.md` wherever a name changes (the home link, the not-found action).
- axe passes in both themes.

## Decisions

- **D1** (owner, 2026-11-10, analysis decision 4): permission to use the DHCW logo and
  icon. They are not covered by DHCW's MIT or OGL licences, so the assets carry a README
  recording their source, the pinned commit and this permission, and the main README
  says so.
- **D2** (owner, 2026-11-10, analysis decision 7): a "Beta" phase banner, as
  recommended. The owner can change the phase at review; it is one catalogue string.
- **D3** (owner, 2026-11-10, analysis decision 5): no sidebar.
  - `app-shell.tsx` gains a comment pointing at ADR-010's _Deferred_ section, so
    whoever adds navigation finds it.
  - The header keeps its current controls; the chips move to the dashboard top bar
    when the sidebar lands.
- **D4** (agent, 2026-11-10): a navy header in both themes, over DHCW's light compact
  header. The navy band is DHCW's most recognisable mark, and it reads the same in dark
  mode. It scrolls away rather than sticking: DHCW headers aren't sticky, and a solid
  band avoids backdrop-contrast surprises.
- **D5** (agent, 2026-11-10): the feedback address is optional configuration
  (`VITE_FEEDBACK_URL`), not hard-coded.
  - The repository may be private, and DHCW may want a form instead.
  - Unset, the banner shows without a link, so nothing blocks delivery.

## Starting point

Audited at `22c3336`.

- **Assets.** The logos are in DHCW `preview/assets/` (`dhcw-icon.svg`,
  `dhcw-icon-white.svg`, `nhsw-logo.svg` (white) and `nhsw-logo-dark.svg`), not in the
  package's published files. Copy them unmodified apart from stripping anything
  executable, and check for scripts and external references.
- **Repeated "DHCW".** The service name is "DHCW Roadmap Editor", so next to the logo it
  repeats "DHCW". Whether the header shows a shorter visible name is copy for the
  `copywriter` skill. The document title and the home link's name keep the full name.
- **Mobile rules.** S2 is STY-009's mobile header rule: every signed-out view keeps its
  own Connect or Reconnect, because the narrow header shows only Disconnect.
