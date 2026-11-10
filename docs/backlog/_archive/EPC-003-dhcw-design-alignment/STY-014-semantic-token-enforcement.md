# STY-014: Off-brand styling fails the build

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Refactor
- **Area**: Features/UI + CI/CD
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-013 (hard)
- **Binding ADRs**: ADR-010 §"The theme is locked", ADR-005
- **Suggested model**: Opus — lint configuration against a locked Tailwind v4 theme,
  with an app-wide migration that must not change behaviour

## Summary

Any colour, text size, corner radius, shadow or focus style that isn't one of DHCW's
semantic tokens now fails `pnpm lint` or `pnpm test`, in CI and locally. Every later
change is therefore on-brand by construction, not by review. Every existing violation is
migrated, including in the generated shadcn components, so the app's look changes only
where the migration forces it. Not in it: the DHCW restyle of components (STY-015).

## Scope

The Tailwind theme in `globals.css` (lockdown), `eslint.config.ts` (a new plugin and
blocks), stylesheet-discipline tests in `src/styles/`, and class changes across `src/`,
`components/ui` included. Docs: the rules and their escape hatch in root `AGENTS.md`
and `src/styles/AGENTS.md`.

## Acceptance criteria

### S1: Only semantic utilities exist

**Given** the locked theme
**When** a component uses a Tailwind default (`bg-red-500`, `text-sm`, `shadow-md`,
`bg-black/10`, `tracking-tight`, `font-mono`)
**Then** `pnpm lint` reports it as an unknown class, naming the file and line
**And** the semantic utilities (`bg-primary`, `text-body`, `text-status-warning-fg`,
`shadow-control`) lint clean
**And** the primary fill used as a text colour (`text-primary`, `decoration-primary`,
under any variant) is reported, naming `text-link`, while `text-primary-foreground`
lints clean

### S2: Arbitrary values for design properties are rejected

**Given** a component
**When** it uses an arbitrary value, in brackets or Tailwind v4's parentheses, for
colour (`text-[#fff]`, `bg-[oklch(…)]`, `border-[color-mix(…)]`, `[color:red]`,
`bg-(--x)`, `text-(color:--x)`), type (`text-[13px]`, `text-(length:--x)`,
`leading-[…]`), radius, shadow or font
**Then** `pnpm lint` fails, with a message naming the token to use
**And** arbitrary values for layout (widths, grid templates) stay allowed

### S3: Theme and focus are never styled per component

**Given** a feature or layout component
**When** it uses a `dark:` colour override, or a focus style other than `focus-fill`,
`focus-ring` or `focus-link` (`focus-visible:ring-2`, `focus:outline-primary`)
**Then** `pnpm lint` fails

### S4: Design values can't come in through the back door

**Given** a component
**When** it:

- sets a design property in an inline `style`: colour (`color`, `background*`,
  `border*Color`, `outlineColor`, `fill`, `stroke`, `caretColor`), type (`font*`,
  `lineHeight`, `letterSpacing`), radius (`borderRadius` and its corners) or shadow
  (`boxShadow`, `textShadow`);
- puts a literal colour in an SVG `fill`, `stroke`, `color` or `stopColor` attribute;
- or references `var(--nhsw-…)` or `var(--app-dark-…)`;

**Then** `pnpm lint` fails
**And** inline `style` for layout (position, size, transform, grid placement) stays
allowed

### S5: Stylesheet discipline is tested

**Given** the source tree
**When** `pnpm test` runs
**Then** it fails if:

- a stylesheet other than `src/styles/globals.css` exists under `src/`;
- another stylesheet declares custom properties or `@theme`;
- an `@theme` colour isn't a `var()` reference to a semantic token.

### S6: The data colour is the one sanctioned exception

**Given** `RoadmapSwatch`, which shows a roadmap's own colour from the data source
(ADR-009)
**When** `pnpm lint` runs
**Then** its inline background colour passes only through one `eslint-disable` with a
reason citing ADR-010's data-colour exception
**And** the same disable anywhere else is reported by a test listing the allowed
exceptions

### S7: The app is migrated with no change in behaviour

**Given** every file in `src/`, `components/ui` included
**When** `pnpm lint`, `pnpm test`, `pnpm test:e2e` and the axe checks run
**Then** they pass with no unknown or restricted class, opacity-modified colour or
unlisted disable
**And** no accessible name, role or behaviour changes, and the `--brand` token is gone

### S8: Tints are tokens, not opacity modifiers

**Given** a component
**When** it puts an opacity modifier on a colour utility (`bg-foreground/20`,
`text-muted-foreground/60`, `ring-ring/50`, `border-foreground/10`)
**Then** `pnpm lint` fails, with a message to use or add a semantic token
**And** each tint the app needs is a semantic token with a pair in STY-013's contrast
test, and opacity on a whole element (`opacity-50` for disabled) stays allowed

## Tests

- Prove each rule with a fixture run, outside `src/` so it isn't app code: run ESLint on
  fixture files and assert the expected messages. A rule that only exists in config
  isn't evidence.
- S5 and S6 are Vitest tests beside STY-013's token tests.
- S8's fixtures include each modifier form (`/20`, `/[0.2]`, `/(--x)`).

## Decisions

- **D1** (owner, 2026-11-10, analysis decision 6): enforce semantic tokens with a locked
  theme plus lint rules, capturing every new rule.
- **D2** (agent, 2026-11-10): `eslint-plugin-better-tailwindcss`, pinned exactly, over
  hand-written `no-restricted-syntax` regexes for classes.
  - It reads the real Tailwind v4 theme from `globals.css`, so a removed utility is
    unknown wherever it appears: `className`, `cn()`, `cva()` and the variant helpers.
  - Its peers allow ESLint 10 and Tailwind ≥4.1.17 (4.11.0 at planning).
  - Its stylistic rules stay off: `prettier-plugin-tailwindcss` orders classes.
- **D3** (agent, 2026-11-10): `components/ui` is linted too, over exempting it. The
  lockdown already drops its default classes silently, so lint must catch them. Each
  touched file notes its deviations from upstream in a header comment, so a later
  `shadcn add` can be diffed.
- **D4** (agent, 2026-11-10): radius keeps shadcn's `--radius`-derived steps, over a
  DHCW-only set, so generated components stay close to upstream. Bracket radii are
  banned.
- **D5** (agent, 2026-11-10, from STY-013's delivery): STY-013 moved `--brand`'s text and
  icon uses (`roadmap-icon`, the start page's source icon) to `--link`, because the dark
  `--primary` is a fill that fails as text. Its only use left is the start page's
  `color-mix` glow, so removing `--brand` means removing or tokenising that glow.
- **D6** (agent, 2026-11-10, from STY-013's retrospective): S1 rejects the primary as
  text, with a message naming `text-link`. The theme generates `text-primary` from
  `--color-primary`, so it is not an unknown class: it needs a restricted-class rule.
  The dark `--primary` (`#32598a`) is a fill that fails 4.5:1 on navy, and no contrast
  pair tests it as text. In STY-013 a review fix made the dark primary a fill and dropped
  its text pairs, leaving five uses as text: `text-primary` in the `link` variants of
  `ui/button` and `ui/badge` and in `ui/empty`'s hovered link
  (`[&>a:hover]:text-primary`), and `text-brand`, its alias, in `roadmap-icon` and the
  start page's source icon. Only the next review round caught them. shadcn's upstream
  components use `text-primary` the same way, so each `shadcn add` (STY-015) brings it
  back.

## Starting point

Audited at `22c3336`.

- **Migration size**, in non-test `src/**/*.tsx`. STY-013 has already moved the type
  and focus classes, including the `ring-ring/50` uses the count below includes.
  - 9 default `shadow-*` uses:
    `rg -no "\bshadow-[a-z0-9]+" src --glob '*.tsx' --glob '!*.test.*'`.
  - 55 opacity-modified colour utilities, e.g. `text-muted-foreground/60` in the card,
    `text-destructive/90` in `ui/alert`, `bg-background/80` in the header, and
    `bg-input/30` and `bg-primary/80` in `ui/button`:
    `rg -no "\b(bg|text|border|ring|fill|stroke|outline|divide|from|to|via|shadow|decoration|caret|accent|placeholder)-[a-z-]+/[0-9]+" src --glob '*.tsx' --glob '!*.test.*'`.
  - 4 bracket radii in `ui/button`'s sizes (`rounded-[min(var(--radius-md),10px)]` and
    `12px`), which the radius ban rejects. Use a token step:
    `rg -no "\brounded[a-z-]*-\[[^\]]+\]" src --glob '*.tsx' --glob '!*.test.*'`.
  - `roadmap-card.test.tsx` asserts the swatch placeholder's `bg-muted-foreground/30`.
    When S8 turns it into a tint token, assert the token class and the absence of an
    inline style instead.
  - `ui/sonner.tsx` uses the marker classes `toaster` and `cn-toast`, which no stylesheet
    defines. Configure them as ignored for the unknown-class rule (or remove them, if
    STY-017 has removed Sonner).
  - `ui/sonner.tsx` sets `--normal-bg`-style custom properties inline for Sonner's
    theme. That is a mapping onto semantic tokens, not a stylesheet. Keep it, pointing at
    semantic tokens only, and say so in its header comment.
- **Raw palette classes:** 9 outside `components/ui`, in `brand-mark`,
  `connection-status` and `roadmaps-error-state`.
- **`--brand` uses:** `roadmap-icon` and `welcome-hero`; the hero also uses
  `color-mix` in a class.
- **Tailwind 4.3.5 keywords.** Check which of `bg-transparent`, `bg-current` and
  `bg-inherit` survive `--color-*: initial`. If a component needs a scrim, register a
  semantic `--overlay`.

## Delivery

### Departures

- **D2, the pin** (agent): `eslint-plugin-better-tailwindcss` is exactly `4.10.0`, not
  the `4.11.0` of planning: pnpm's release-age policy resolved 4.10.0, as 4.11.0 was a
  day old. Its peers accept ESLint 10.14 and Tailwind 4.3.5.
- **Where the rules live** (agent): the design blocks are `designTokenRules` in
  `build/design-token-lint.ts`, which `eslint.config.ts` spreads. Typed linting cannot
  lint a fixture at a virtual `src/` path (the project service rejects a file it cannot
  find), so the fixture test, `build/design-token-lint.test.ts`, runs those same blocks,
  their `files` globs included, with the TypeScript parser alone. The fixtures sit in
  `build/fixtures/design-token-lint/`, outside `src/`, and are left out of `eslint .`,
  Prettier and `tsc`. Each names the path it is linted as and marks every line it
  expects reported (`// ✗ <message>`); every other line must lint clean.
- **S1, what the lockdown removes** (agent): `--color-*`, `--font-*`, `--text-*`,
  `--leading-*`, `--tracking-*`, `--radius-*` and every shadow namespace. Font weights
  stay. `bg-transparent`, `bg-current` and `bg-inherit` survive it (fixture). The numeric
  `leading-6` survives too, so `leading-*` and `tracking-*` are restricted outright: line
  height and letter-spacing come with the type tokens.
- **S1, class maps** (agent): the plugin finds classes in `className`, `cn()`, `cva()`
  and the other helpers, but not in a plain object. Variables named `…Classes` are
  linted too, so the connection status's `dotColour` map is now `dotClasses`, as is the
  `className` a variant helper takes (`buttonVariants({ className })`).
- **S3, scope** (agent): everywhere, a ring, outline or shadow under any focus variant
  (`focus-visible:ring-2`, `group-focus:outline-x`) is rejected. Outside `components/ui`,
  an element's own focus state (`focus:`, `focus-visible:`, `focus-within:`,
  `has-focus…:`) may set no colour, decoration, font, radius or opacity either, only a
  focus utility; layout stays allowed, as the skip link moves on screen on focus.
  `components/ui` may colour a highlighted menu item (`focus:bg-accent`), which Base UI
  shows through focus, and a group's focus may restyle a child (the card's chevron).
- **S3, `dark:`** (agent): `dark:` with a colour utility, and `.dark` in an arbitrary
  variant, are rejected. `dark:hidden` stays allowed, for STY-016's logo variants.
- **S2/S4, more back doors** (agent): an arbitrary custom property in a class
  (`[--primary:red]`) is rejected. The inline-style rule also covers objects typed
  `CSSProperties`, and a custom property in a style may only be a `var(--token)`, which
  is what `ui/sonner.tsx`'s mapping onto Sonner's variables is. A `style` attribute must
  hold an object literal, perhaps cast or chosen by a condition, and no spread, so lint
  can read its properties; an SVG paint attribute may hold no colour string anywhere in
  its expression. Arbitrary gradients (`bg-linear-[…]`) and arbitrary focus variants
  (`[&:focus-visible]:bg-muted`) are rejected as well.
- **Tests are exempt** (agent): `*.test.*` and `src/test/` assert on class names and call
  `cn` with Tailwind defaults on purpose; the fixture test proves they lint clean.
- **S6, what counts** (agent): `lint-exceptions.test.ts` reports any inline directive that
  can switch off a design rule (`eslint-disable`, `-line`, `-next-line`, an `/* eslint */`
  rule override, or a blanket disable naming no rule), not only the swatch's form. It
  reads comments with ESLint's parser, so a multiline override counts in full and a
  comment-like string does not.
- **S7, the migration** (agent), each a change the lockdown or a rule forces:
  - tints became tokens: new `--primary-hover` (DHCW's button hover, `#32598a`; in dark
    the two blues swap) and `--secondary-hover` (DHCW's grey tag tint; in dark DHCW's
    mid blue) for the button and badge hovers; destructive tints became the danger status
    tokens (inverted on hover); the swatch placeholder is `bg-border` and its edge `ring-border`; the start page's
    error notice is the danger status; muted and card tints are the solid tokens; the
    roadmap icon is DHCW's blue tag (`status-info`);
  - shadows: DHCW's cards and buttons are flat, so the card, start-page chip, Connect
    button, skeleton and brand mark lose their shadows; menus take `shadow-popup`, DHCW's
    date picker dialog shadow (a new `--nhsw-*` primitive). It is not `shadow-popover`:
    the theme already makes that the popover's shadow colour;
  - the card's hover border is `border-input`, DHCW's clickable card hover (STY-013's
    open `dark:hover` hand-off); the chevron's 60% tint went;
  - the header is opaque `bg-background` with a full `border-border`, without blur;
  - raw palette: the connection dots use the status inks, the stale-data alert's icon
    `text-status-warning-fg`, the brand mark loses its ring;
  - `components/ui`: bracket radii are `rounded-md` (the same 3.2px), `aria-invalid`
    shows only the destructive border, the menu's popups are `ring-border`; each file's
    header comment lists its deviations;
  - `--brand` and the start page's glow went (D5), and with them its background grid,
    an arbitrary colour gradient. STY-016's S5 already wants both gone.
- **Formatting** (agent): `prettier-plugin-tailwindcss` sorts classes by the theme, and
  sorts unknown ones first, so the lockdown reorders three class examples in two skill
  documents (`shadcn/rules/styling.md`, `improve-codebase-architecture/HTML-REPORT.md`).
- **S5, reading stylesheets** (agent): Vitest's `css.include` now lists every stylesheet
  extension under `src/`, so a new one is read as text rather than emptied.
- **Test order**: the rules and fixtures were written together, so the fixture test did
  not go red first. Its discrimination was shown by mutation: removing the lockdown's
  colour, text and shadow resets fails the ten unknown-class lines; an `@theme` colour
  literal and stray `.css`/`.scss` stylesheets under `src/` fail the three stylesheet
  tests; a second design-rule disable, and the swatch's reason without ADR-010, fail the
  exception tests.

### Contract for dependents

- Tokens added: `--primary-hover`, `--secondary-hover` (`bg-primary-hover`,
  `bg-secondary-hover`), `--popup-shadow` (`shadow-popup`, in `SHADOW_TOKENS`). `--brand`
  and `bg-brand`/`text-brand` are gone.
- Rules: `build/design-token-lint.ts`; a new rule or exception adds fixture lines.
  `pnpm lint` reports a class with the token to use; inline styles are layout only.
- A class map is a variable named `…Classes`, or lint can't see it.
- `components/ui`: a regenerated shadcn file fails lint until its tints, shadows,
  bracket radii and `dark:` classes become tokens; record each deviation in its header.
- STY-015: the variants above are stopgaps, built on tokens, for its DHCW restyle; the
  connection dots and the roadmap icon's tag tint are the pieces S2 replaces.
- STY-016: the start page has no glow or grid left.

### Scenario evidence

| Scenario | Held by                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `build/design-token-lint.test.ts` (`feature.tsx`: `s1UnknownClasses`, `stateClasses`, `s1SemanticUtilities`, `s1PrimaryAsText`; `shared-component.tsx`) |
| S2       | the same, `s2ArbitraryValues`, layout arbitrary values clean                                                                                            |
| S3       | the same, `s3DarkAndFocus` and `shared-component.tsx`                                                                                                   |
| S4       | the same, `s4BackDoors` and `layoutStyle`, layout inline styles clean                                                                                   |
| S5       | `src/styles/stylesheets.test.ts`                                                                                                                        |
| S6       | `src/styles/lint-exceptions.test.ts`; the swatch's directive in `roadmap-swatch.tsx`                                                                    |
| S7       | `pnpm lint` clean over `src/`; unit, component, E2E (44, axe in both themes) and focus-indicator specs passing; before/after screenshots                |
| S8       | the fixture test's `s8OpacityModifiers` (`/20`, `/[0.2]`, `/(--x)`); `contrast.test.ts` pairs for each new token                                        |
