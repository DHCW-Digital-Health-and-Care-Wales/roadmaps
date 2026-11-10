# STY-016: The shell and pages are a DHCW staff service

- **Status**: Done — delivered in its PR, which awaits merge
- **Type**: Feature + Copy
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-015 (hard)
- **Binding ADRs**: ADR-010 §"Branding", §"Deferred: the dashboard shell"; ADR-007;
  ADR-008
- **Suggested model**: Sonnet — layout and copy on settled components, with screenshots
  in both languages
- **Delivered**: https://github.com/collisdigital/roadmaps-editor/pull/18

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
- **D6** (agent, 2026-11-10, from STY-015's retrospective): S2's short name shows
  untruncated. STY-015's 40px buttons cut "Mapiau Trywydd" to "Mapiau Tryw…" at 375px
  (fixed by keeping the header's buttons 32px), and the icon takes more width. jsdom does
  no layout, so this check runs in Playwright at 375px in Cymraeg while connected: the
  brand's `scrollWidth` does not exceed its `clientWidth`.

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
  Below `sm` the header's buttons stay 32px (`header-auth-button`, `language-switcher`,
  `theme-toggle`) so the short name fits (D6).
- **D7** (agent, 2026-11-10, copy): the header's visible name beside the logo is
  "Roadmap Editor" / "Golygydd Mapiau Trywydd" (`common.headerName`), since the logo already
  says DHCW/IGDC. Below `sm` the short names stay ("Roadmaps" / "Mapiau Trywydd"). The home
  link's accessible name, the document title and the start page's `h1` keep the full
  "DHCW Roadmap Editor" / "Golygydd Mapiau Trywydd IGDC", so the name always includes the
  service name. The footer's "dev" is the spec's word for a local build.
- **D8** (owner, 2026-11-10, at PR review): keep DHCW's bilingual lockup (`nhsw-logo.svg`)
  as the full logo, NHS Wales mark included. ADR-010's "No NHS branding" is amended to
  allow the mark inside DHCW's own logo only.

## Delivery

### Departures

- **S1, which logo is "full"** (agent; settled by the owner as D8): the record names
  `nhsw-logo.svg` as the full logo. It is DHCW's bilingual lockup, which carries the "GIG
  Cymru NHS Wales" mark beside the DHCW wordmark, while ADR-010 said "no NHS branding".
  The record's file is used unchanged, and the owner kept it at review.
- **S1, the picture** (agent): the logo is one `<picture>` (the full logo `source` from
  40rem, the icon as the `img`), so assistive technology meets one image named for the
  organisation, not two. The home link keeps `aria-label` "DHCW Roadmap Editor home", which
  overrides the image's name inside the link; the alt text is the image's own name.
- **S1, the controls** (agent): the navy band needs its own button look, so `Button` gains
  `header` (transparent, white text, the chips' border, a lighter hover), used by the
  language and theme buttons and the header's auth action (`AuthButton variant="header"`).
  The home link takes `focus-ring` rather than `focus-fill`: a yellow fill would hide the
  white logo. The status chip wraps the tag in a bordered box. Review found the full logo, the
  service name and every control do not fit between 640px and 900px (in Cymraeg the name
  was cut to nothing at 640px), so the chip is visually hidden below `lg` and the language
  button shows only its icon below `md` (both stay announced: a live `status`, and the
  accessible name "Language English"). `shell.spec.ts` checks the name untruncated from
  375px to 1024px.
- **S1, shared link style** (agent): `textLinkClasses` (`components/layout`) is the one text
  link style, used by the back link, the not-found link and the banner's feedback link.
- **S3** (agent): the feedback address travels as `AppInfo` (`components/layout/app-info`,
  built by `composeApp` from `config.feedbackUrl` and `__APP_VERSION__`, supplied by
  `AppProviders`), so the layout components stay below `app/`. The link opens in a new tab
  (leaving the app would end the in-memory session) and says so to screen readers.
- **S4, the version** (agent): `build/resolve-build-version.ts` returns `dev` without
  `GITHUB_SHA`, else `<package version>+<short sha>`; `vite.config.ts` defines
  `__APP_VERSION__` from it. `ci.yml` needs no change: Actions already sets `GITHUB_SHA`.
- **S5** (agent): the start page is now `StartPage` (`features/home/pages/start-page.tsx`)
  in place of `WelcomeHero`, and the lock icon on the access note is gone. `ContextChip`
  (STY-015) lost its only user to the inset note, so it is deleted with its test, as is the
  hand-drawn `BrandMark`.
- **S6** (agent): `AppShell` owns DHCW's container (`PageContainer`: 1200px, 16px margins,
  40px from `md`) and main-wrapper spacing (24px, 32px from `sm`, above; 32px below), so
  pages render content only. The not-found page is left aligned with a text link.
- **S7** (agent): the favicon is the DHCW icon in white on a navy tile, so it reads on light
  and dark browser chrome; the skip link is DHCW's yellow with bold text, at the container's
  left edge.
- **D6** (agent): the first run of the 375px Cymraeg check failed (the short name needed 8px
  more): the home link's `-ml-1` (aligning the logo with the page edge) and tighter gaps
  below `sm` fix it. Tests came after the code, as the checks are of layout and copy.

### Contract for dependents

- A page renders its content only; `AppShell` supplies the container, spacing, banner and
  footer. A signed-out view keeps its own Connect or Reconnect (the narrow header shows
  only Disconnect).
- Tokens added: `--header`, `--header-foreground`, `--header-hover`, `--header-border`
  (and their utilities), with pairs in `contrast.test.ts`. No lint exception was added.
- `AppInfo` (`useAppInfo()`) carries the version and the feedback address; tests pass it to
  `renderWithProviders({ appInfo })`. `VITE_FEEDBACK_URL` is optional and must be `https`.
- STY-017's failures use `Alert` above the page's `h1`, as the start page's notice does.
  STY-018's baselines capture this shell.
- The logo assets and the favicon are described in `src/assets/dhcw/README.md`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `layout/app-shell.test.tsx` (logo alt, home link name, control order, both languages); `shell.spec.ts` (navy, logo, order); axe in both themes            |
| S2       | `shell.spec.ts`: at 375px in Cymraeg, connected, the icon, the short name untruncated and only Disconnect, the status attached, no horizontal scroll (D6) |
| S3       | `app-shell.test.tsx` (link only with an address, new tab); `config.test.ts` (https only); `shell.spec.ts` (banner, no link when unset)                    |
| S4       | `build/resolve-build-version.test.ts`; `app-shell.test.tsx`; `shell.spec.ts` (footer); a CI-style build showed `0.0.0+0123456` in the bundle              |
| S5       | `home/pages/start-page.test.tsx` (every signed-out state, both languages: notice first, inset note, no hero)                                              |
| S6       | `shell.spec.ts` (left edges at 80px/16px and a 1200px container; no overflow); `app.test.tsx` (not-found link, not a button)                              |
| S7       | `shell.spec.ts` (skip link, favicon); `focus-indicator.spec.ts` (the home link's ring)                                                                    |
