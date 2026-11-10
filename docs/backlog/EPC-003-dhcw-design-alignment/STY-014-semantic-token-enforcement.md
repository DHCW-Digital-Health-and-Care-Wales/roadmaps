# STY-014: Off-brand styling fails the build

- **Status**: Proposed — owner asked for lint rules enforcing semantic tokens, 2026-11-10
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
under any variant) is reported, while `text-primary-foreground` lints clean

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
  text. The dark `--primary` (`#32598a`) is a fill that fails 4.5:1 on navy, and no
  contrast pair tests it as text, so only lint can stop it. STY-013's first review round
  missed five such uses: `text-primary` in the `link` variants of `ui/button` and
  `ui/badge` and in `ui/empty`'s hovered link (`[&>a:hover]:text-primary`), and
  `text-brand`, its alias, in `roadmap-icon` and the start page's source icon. shadcn's
  upstream components use `text-primary` the same way, so each `shadcn add` (STY-015)
  brings it back.

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
