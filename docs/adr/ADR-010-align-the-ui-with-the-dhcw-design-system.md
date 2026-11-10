# ADR-010: Align the UI with the DHCW design system by porting its tokens

- Status: Accepted — owner, 2026-11-10: the analysis's decisions 1–7 (port tokens, keep
  dark mode, compact type scale, logo permitted, sidebar deferred, enforce tokens, the
  other recommendations). Partly supersedes ADR-005: its _Visual direction_ bullet only;
  the rest of ADR-005 stands.
- Date: 2026-11-10

## Context

The editor is an internal DHCW tool, but it looks like a generic SaaS app: neutral
greys, an indigo accent, Geist, and a focus ring of about 1.5:1. DHCW's design system
(Sass, Nunjucks and a compiled stylesheet, no React) is built for public services. The
options are set out in
[the alignment analysis](../analysis/dhcw-design-system-alignment.md). This replaces the
_Visual direction_ bullet of [ADR-005](ADR-005-ui-stack-shadcn-base-ui-tailwind-v4.md)
("clean SaaS, neutral palette, a single restrained accent").

## Decision

- **Port, don't load.** DHCW's token values and component patterns are re-expressed in
  our Tailwind v4 theme and our shadcn/Base UI components.
  - We never import `nhsw.css`, its Sass or its Nunjucks macros.
  - The source is pinned at a release tag (v0.1.104 at the time of writing). A Vitest
    drift test compares our copied values with the pinned source; upgrading the pin is a
    deliberate change that updates the values and the test together.
- **Two token tiers in `src/styles/globals.css`:**
  - _Primitives:_ `--nhsw-*` holds values copied from DHCW, and `--app-dark-*` holds our
    own dark-theme values. Primitives are plain custom properties, not Tailwind theme
    colours, so no utility class exists for them.
  - _Semantic tokens:_ shadcn's names plus our own (`--link`, `--focus`, `--status-*`,
    …). Each is a `var()` reference to a primitive.
  - Colour literals appear only in primitives (tested).
- **The theme is locked.** Tailwind's default colours, font sizes, shadows, fonts and
  letter-spacing are removed, so only semantic tokens generate utilities.
  - Lint (`eslint-plugin-better-tailwindcss` plus `no-restricted-syntax` blocks in
    `eslint.config.ts`) rejects:
    - unknown classes;
    - arbitrary values, in brackets or parentheses, for colour, type, radius, shadow or
      font;
    - opacity modifiers on colour utilities (`bg-foreground/20`): a tint or overlay is a
      semantic token, so the contrast test sees it;
    - `dark:` colour overrides;
    - ad-hoc focus styles;
    - design properties in inline `style` (colour, font family, size and weight, line height,
      letter-spacing, radius, shadow), while layout properties stay allowed;
    - literal colours in SVG attributes;
    - primitives referenced outside `globals.css`.
  - Class merging (`cn`) is configured with the custom text and shadow names, so it
    never drops a type size as if it were a colour (tested).
  - _Exception:_ the one colour that comes from data, a roadmap's own colour
    (ADR-009), is set only by the roadmap swatch component, through a documented lint
    exception.
- **Dark mode stays**, as our extension; DHCW has none. Its values are derived from DHCW
  colours where they pass contrast. A Vitest contrast test checks, in both themes, every
  semantic text/background pair (4.5:1) and every control boundary (`--input`) and focus
  pair (3:1). Decorative separators (`--border`, DHCW's `#d8dde0`, about 1.4:1 on white)
  are exempt, as WCAG 1.4.11 exempts them; a boundary someone needs in order to find a
  control uses `--input`.
- **Compact type scale:** DHCW's mobile sizes at every width. Body is 16/24, the h1 is
  32/38, and the smallest text is 14/20. DHCW's desktop sizes (19px body, 48px h1) are
  for public pages; a staff editor needs density.
- **Focus:** DHCW's yellow indicator everywhere, as shared utilities:
  - _fill_, for buttons and links: yellow fill, dark text, a dark bottom bar;
  - _ring_, for cards, inputs and menus: a 3px yellow outline outside a 2px dark inner
    ring.
- **Motion:** minimal, and stilled entirely under `prefers-reduced-motion`. This is
  carried over from ADR-005's superseded bullet and held by the global rule in
  `globals.css`.
- **Branding:** Roboto, the DHCW logo and icon, and DHCW names in English and Welsh
  ("Digital Health and Care Wales" / "Iechyd a Gofal Digidol Cymru"). No NHS branding.
  - The logos are used with the owner's permission, given 2026-11-10. They are not
    covered by DHCW's MIT or OGL licences; their provenance is recorded beside the
    assets.
- **Staff deviations from DHCW guidance:**
  - several fields per screen, not one question per page;
  - no full-width buttons in the header;
  - 40px default buttons with a 32px small size (WCAG 2.5.8 needs 24px);
  - no visited-link colour for in-app navigation.
- **Deferred: the dashboard shell** (navy left-hand navigation and a top bar of chips).
  Adopt it in the first record that adds a second top-level destination or the roadmap
  editor, with the roadmaps in its navigation, and amend this ADR then.
- **Rejected:**
  - loading `nhsw.css`: global element styles and a second component system;
  - compiling DHCW's Sass for its tokens: a Sass toolchain to read about forty values;
  - DHCW's desktop type scale;
  - dropping dark mode.

## Consequences

- EPC-003 delivers this. Generated shadcn components drift further from upstream:
  - each touched file notes its deviations;
  - `pnpm lint` flags any newly added component that uses default classes.
- DHCW pins need manual upgrades, and DHCW's frequent releases can leave us behind.
- The dark theme is ours to maintain and test.
- ADR-005's _Visual direction_ bullet is superseded; its stack decisions stand.
