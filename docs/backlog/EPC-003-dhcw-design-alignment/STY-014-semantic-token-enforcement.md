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

### S2: Bracket values for design properties are rejected

**Given** a component
**When** it uses a bracket value for colour (`text-[#fff]`, `bg-[oklch(…)]`,
`border-[color-mix(…)]`, `[color:red]`), type (`text-[13px]`, `leading-[…]`), radius,
shadow or font
**Then** `pnpm lint` fails, with a message naming the token to use
**And** bracket values for layout (widths, grid templates) stay allowed

### S3: Theme and focus are never styled per component

**Given** a feature or layout component
**When** it uses a `dark:` colour override, or a focus style other than `focus-fill`,
`focus-ring` or `focus-link` (`focus-visible:ring-2`, `focus:outline-primary`)
**Then** `pnpm lint` fails

### S4: Colour can't come in through the back door

**Given** a component
**When** it sets a colour property in an inline `style` (`color`, `background*`,
`border*Color`, `outlineColor`, `fill`, `stroke`, `boxShadow`, `caretColor`), puts a
literal colour in an SVG `fill`, `stroke`, `color` or `stopColor` attribute, or
references `var(--nhsw-…)` or `var(--app-dark-…)`
**Then** `pnpm lint` fails
**And** inline `style` for layout stays allowed

### S5: Stylesheet discipline is tested

**Given** the source tree
**When** `pnpm test` runs
**Then** it fails if:

- a stylesheet other than `src/styles/globals.css` exists under `src/`;
- another file declares custom properties or `@theme`;
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
**Then** they pass with no unknown or restricted class and no unlisted disable
**And** no accessible name, role or behaviour changes, and the `--brand` token is gone

## Tests

- Prove each rule with a fixture run, outside `src/` so it isn't app code: run ESLint on
  fixture files and assert the expected messages. A rule that only exists in config
  isn't evidence.
- S5 and S6 are Vitest tests beside STY-013's token tests.

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

## Starting point

Audited at `22c3336`.

- **Migration size.** 35 default `text-*` sizes and 10 default `shadow-*` uses in
  non-test `src/**/*.tsx`. Count them with
  `rg -no "\btext-(xs|sm|base|lg|xl|[2-9]xl)\b" src --glob '*.tsx' --glob '!*.test.*'`.
- **Raw palette classes:** 9 outside `components/ui`, in `brand-mark`,
  `connection-status` and `roadmaps-error-state`.
- **`--brand` uses:** `roadmap-icon` and `welcome-hero`; the hero also uses
  `color-mix` in a class.
- **No `text-xs` after the lockdown.** DHCW's smallest size is 14px, so 12px text
  disappears. `text-xs` is used in `button`, `badge` and `dropdown-menu` (ui), the
  roadmap card's metadata and the start page. Map them to `text-body-xs`.
- **Tailwind 4.3.5 keywords.** Check which of `bg-transparent`, `bg-current` and
  `bg-inherit` survive `--color-*: initial`. If a component needs a scrim, register a
  semantic `--overlay`.
