# STY-013: The app uses DHCW's colours, type and focus indicator

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Refactor + Docs
- **Area**: Features/UI + Docs
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-005, ADR-008
- **Suggested model**: Opus — token design and a derived dark palette, with contrast
  judgement in both themes
- **Delivered**: _(the PR, linked once it opens)_

## Summary

Every screen takes on DHCW's colours, Roboto, its compact type scale, DHCW corner radius
and its yellow focus indicator, in light and dark. The theme changes, and components'
type and focus classes move to the new scale and utilities; their structure stays, so
the existing tests still hold. The new focus indicator also
fixes a faint focus ring that fails WCAG 1.4.11. Tests keep the copied values in step
with the pinned DHCW release and check contrast in both themes. Not in it: lint
enforcement (STY-014) and component restyling (STY-015).

## Scope

`src/styles/` (tokens, type, radius and focus utilities, tests), the font dependency,
`lib/utils` (class-merge configuration), and every type and focus class in `src/`
(`components/ui` included): headings, body and small text move to the new scale,
negative letter-spacing goes, and focus classes become the new utilities. Docs: a "Design tokens" convention in root `AGENTS.md`, a new
`src/styles/AGENTS.md`, and a README credit to DHCW.

## Acceptance criteria

### S1: The app shows DHCW colours

**Given** the main page with the example roadmaps, in the light theme
**When** it is shown
**Then** text, secondary text, links, borders, muted surfaces and the primary action use
DHCW's values (`#212b32`, `#4c6272`, `#005aa8`, `#d8dde0`, `#f0f4f5`, navy `#1b365d`)
**And** no indigo accent or neutral-grey theme value remains

### S2: Dark mode stays, derived from DHCW and contrast-tested

**Given** the user has chosen the dark theme
**When** any page is shown
**Then** it uses the dark semantic tokens
**And** in both themes every declared text pair passes 4.5:1, and every control boundary
(`--input`) and focus pair 3:1, held by a test; decorative separators (`--border`) are
exempt (ADR-010)

### S3: Roboto at the compact scale, in English and Welsh

**Given** a page in English, then in Cymraeg with text containing ŵ and ŷ
**When** it is shown at 1280px and 375px
**Then** text is Roboto, served locally, at DHCW's mobile scale at both widths (body
16/24, h1 32/38 bold, smallest 14/20)
**And** ŵ and ŷ render in Roboto, not a fallback, and headings carry no negative
letter-spacing

### S4: A visible yellow focus indicator everywhere

**Given** a keyboard user
**When** they tab to the skip link, a header control, Refresh, a roadmap card and a link
**Then** each shows a DHCW focus indicator:

- buttons and links: yellow fill, dark text and a dark bottom bar;
- cards and menus: a 3px yellow outline outside a 2px dark inner ring.

**And** it is visible in both themes and passes 3:1 against the adjacent colours

### S5: Copied values stay in step with DHCW

**Given** the pinned DHCW release
**When** the tests run
**Then** each `--nhsw-*` primitive equals its value in that release's sources
**And** editing a primitive, or a semantic token holding a literal colour instead of a
`var()` reference, fails a test

### S6: Nothing else changes

**Given** the existing unit, component and E2E suites and the axe checks
**When** they run
**Then** they pass with no change to an accessible name, role or behaviour

### S7: Merging classes keeps the type scale

**Given** a component that combines a type token with a colour or another class through
`cn`, e.g. `cn("text-body", "text-muted-foreground")` or a variant helper given a
`className`
**When** the classes are merged
**Then** both survive, and two type tokens or two shadows resolve to the last one, held
by a unit test

## Decisions

- **D1** (owner, 2026-11-10, analysis decisions 1–4): port tokens rather than loading
  DHCW's CSS; keep dark mode; use the mobile scale at every width; the logo is
  permitted (it is used in STY-016).
- **D2** (agent, 2026-11-10): the content background stays white, with `#f0f4f5` for
  muted surfaces, over DHCW's grey page background. DHCW's staff dashboard is white, and
  white suits an editor.
- **D3** (agent, 2026-11-10): pin by an exact GitHub tag devDependency, which the drift
  test reads.
  - If pnpm's frozen-lockfile, release-age or exotic-dependency policy rejects a git
    dependency, vendor the token SCSS with its commit SHA instead, and record it as a
    departure.
  - DHCW is not on the npm registry.
- **D4** (agent, 2026-11-10): `--sidebar-*` is set to DHCW navy now, although nothing
  uses it until the deferred dashboard shell. That shell then needs no token change.
- **D5** (agent, 2026-11-10): `--brand` becomes an alias of `--primary`, so no indigo
  remains (S1), and `--chart-*` is deleted because nothing uses it. STY-014 removes
  `--brand`'s uses and the alias.

## Starting point

Audited at `22c3336`.

- **Where the values are.**
  - Most come from DHCW `src/tokens/_colours.scss`.
  - The tag tints and inks are hard-coded in `src/components/content/_tag.scss`.
  - The notification colours `#004281` and `#00703c` are local to
    `src/components/callouts/_notification-banner.scss`.

  Cite the source file for each group.

- **The focus recipes** are in DHCW `src/foundations/_button-base.scss` (fill),
  `_input-base.scss` (ring) and `src/utilities/_focus-ring.scss` (link).
- **Dark values can come from DHCW.** It already holds candidates: `#0e1b2f` and
  `#1b365d` for surfaces, `#f0f4f5` for text, `#afb8bf` for muted text, and the tag
  tints for accents.
- **The current focus ring.** `ring-ring/50` sits in `button.tsx`, `badge.tsx`,
  `roadmap-card.tsx` (as `has-focus-visible:`), the header brand link and the skip link.
  The card's stretched link draws focus on the card through `has-focus-visible`; keep
  that, with `focus-ring`.
- **Font subsets.** `@fontsource-variable/roboto` covers Welsh only if the latin-ext
  subset is loaded.
- **Class merging drops custom sizes.** `@/lib/utils` re-exports the `cn` package, a
  tailwind-merge drop-in. Out of the box, `cn("text-body", "text-muted-foreground")`
  returns only `text-muted-foreground`, because it reads `text-body` as a colour.
  Configure it through its `cn/config` extension, adding the new text names to the
  font-size group and the semantic shadows to the shadow group.
- **The type migration.** Counted at `22c3336`:
  - h1s are `text-lg` (StatusPanel), `text-xl sm:text-2xl` (detail), `text-2xl`
    (roadmaps, not found) and `text-4xl sm:text-6xl` (start page);
  - `text-xs` (12px) is in `button`, `badge`, `dropdown-menu`, the roadmap card and the
    start page;
  - `tracking-tight` and `tracking-tighter` are on headings, and `tracking-widest` is
    on the menu shortcut (`ui/dropdown-menu`). All of them go, since the theme sets no
    letter-spacing;
  - arbitrary sizes: `text-[0.9375rem]` on the header name (`sm:`) and the start page,
    and `text-[0.8rem]` in `ui/button`.

  `rg -no "\btext-(xs|sm|base|lg|xl|[2-9]xl)\b|\btext-\[[^\]]+\]|\btracking-[a-z]+" src --glob '*.tsx' --glob '!*.test.*'`
  finds them all (35 default sizes, 3 arbitrary sizes and 9 tracking classes).

## Delivery

### Departures

- **D3, the pin** (agent): `dhcw-design-system` is the exact tag
  `github:DHCW-Digital-Health-and-Care-Wales/dhcw-design-system#v0.1.104`, which pnpm
  installed with the frozen lockfile and release-age policy as they are. The tag points at
  DHCW's release commit `cc48fdb` ("chore(release): v0.1.104"), not the `bc52697` the
  analysis cites; their `src/` trees are identical (`diff -r`). The lockfile pins the
  tarball by commit and integrity.
- **S5, reading the sources** (agent): Vitest empties every stylesheet it doesn't process,
  `?raw` imports included, so `vite.config.ts` lists `globals.css` and the pinned release's
  `.scss` under `test.css.include`; the tests read both as text.
- **S1, what else changed colour** (agent): the header's brand mark was a raw
  `bg-neutral-900 text-indigo-300` tile, the one indigo left on screen once `--brand` is an
  alias (D5); it now uses `bg-primary text-primary-foreground`. The favicon's indigo
  stays until STY-016 replaces the icon.
- **S4, `dark:` overrides** (agent): the button's `outline`, `ghost` and `destructive`
  variants and the badge's set `dark:` backgrounds, which sort after `focus-visible:` and
  hid the yellow fill in the dark theme (Refresh, Disconnect). They are removed, so those
  buttons use their light-theme tokens in dark too. The other `dark:` classes stay for
  STY-014.
- **S4, the recipes** (agent): `focus-fill` is DHCW's button recipe (a 2px bar); the skip
  link uses it too, until STY-016 gives it DHCW's skip-link style (a 4px bar). `focus-link`
  is defined for text links, of which the app has none yet. The global `outline-ring/50`
  is gone: anything focusable that names no utility keeps the browser's two-tone ring.
- **S3, the scale** (agent): page `h1`s are `text-heading-xl`; the status panel's title,
  an `h1` on the detail page's not-found and locked states, is `text-heading-m` at either
  level, as a 32px heading would crowd the panel. Family headings are `text-heading-s`,
  the start page's tagline `text-heading-m font-normal` (DHCW's lede). Every `text-xs`
  (12px) became `text-body-xs` (14px), DHCW's smallest; the card title drops
  `leading-snug` for the body's 24px. Headings are bold (700) from the token, so their
  `font-semibold` went.
- **S3, toasts** (agent): Sonner injects its stylesheet unlayered with its own font stack
  and 13px, which no utility can beat, so `globals.css` overrides both on its selectors.
- **S7, `cn` everywhere** (agent): the shadcn files imported the bare `cn` package, which
  is unconfigured; they now import `@/lib/utils`, and `no-restricted-imports` rejects
  `from "cn"` in `src/`, so a regenerated component fails lint until changed.
- **Test order**: the `cn` tests went red before `createCn` was configured. The token and
  contrast tests followed `globals.css`; their discrimination was shown by mutation (an
  edited primitive, a literal in a semantic token, a missing reference, a dark link of
  `#005aa8`, `--input` of `#d8dde0`, a light `--focus-foreground`), not by a first red
  run. The E2E specs followed the code.

### Contract for dependents

- Tokens (all in `globals.css`): shadcn's names plus `--link`, `--link-hover`, `--focus`,
  `--focus-foreground`, `--control-shadow` (utility `shadow-control`, DHCW's 2px button
  bar) and `--status-{neutral,info,success,warning,danger}-{bg,fg,border}` from DHCW's grey,
  blue, green, yellow and red tags (inverted in dark). `--ring` is `--focus`; `--brand` is
  `--primary` until STY-014; `--sidebar-*` is DHCW's navy navigation (D4); `--chart-*` is
  gone. `--radius` is DHCW's 4px, with shadcn's derived steps.
- Primitives are named after their DHCW source (`--nhsw-primary-text-colour`,
  `--nhsw-tag-blue-ink`); `--app-dark-*` holds three values (surface, link, destructive).
- Type: `text-heading-{xl,l,m,s,xs}` (32/38, 27/33, 22/29, 19/27, 16/24, bold) and
  `text-body` (16/24), `text-body-xs` (14/20); the body is 16/24 Roboto. `@/lib/utils`
  exports `TEXT_TOKENS`, `SHADOW_TOKENS` and `FOCUS_UTILITIES`, which `cn` merges by and
  `tokens.test.ts` holds equal to the stylesheet.
- Focus utilities are the style alone, applied with a variant: `focus-visible:focus-fill`
  (buttons, badges, header link), `has-focus-visible:focus-ring` (the card),
  `focus-visible:focus-ring` (menu items, per S4). STY-015 S6 asks for `focus-fill` on the
  menu's items; that story decides between the two.
- STY-014: the theme is not locked yet; opacity modifiers, raw palette classes and the
  remaining `dark:` overrides (card hover border, `aria-invalid`, destructive menu item,
  error-state icon, brand-mark ring) are untouched.
- E2E: `tests/e2e/typography.spec.ts` (computed sizes, rendered font via CDP) and
  `tests/e2e/focus-indicator.spec.ts` (computed focus styles, both themes).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `tokens.test.ts` (each primitive equals the pinned value; semantic tokens are `var()`s of them); after screenshots of every page, light                                                    |
| S2       | `contrast.test.ts` (30 text pairs, `--input` and the focus indicator on four surfaces, both themes); after screenshots, dark                                                               |
| S3       | `typography.spec.ts` (`text uses DHCW's compact scale at 1280px` and `375px`; `Welsh ŵ and ŷ render in Roboto, served by the app`)                                                         |
| S4       | `focus-indicator.spec.ts` (`every control shows DHCW's focus indicator`, light and dark: skip link, header link, language button, menu item, Refresh, card, Back link); `contrast.test.ts` |
| S5       | `tokens.test.ts` (`DHCW primitives (S5)`, `token tiers (ADR-010)`)                                                                                                                         |
| S6       | the existing unit, component, E2E and axe suites, unchanged and passing                                                                                                                    |
| S7       | `src/lib/utils.test.ts`                                                                                                                                                                    |
