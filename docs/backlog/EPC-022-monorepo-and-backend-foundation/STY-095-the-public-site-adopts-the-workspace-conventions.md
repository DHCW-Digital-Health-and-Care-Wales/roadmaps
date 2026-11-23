# STY-095: The public site adopts the workspace's code conventions

- **Status**: Proposed — split and its acceptance criteria written in the owner's
  grilling of 2026-11-23 (D2–D8); first of the alignment sequence
- **Type**: Refactor
- **Area**: Features/UI + CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-088 (hard)
- **Binding ADRs**: ADR-016 §Workspace tooling, §Agent guides, §STY-095 amendments
- **Suggested model**: Opus — renames across the site, lint and compiler settings shared
  by both apps, and a guide lift

## Summary

The public site moves onto the editor's code conventions: kebab-case file names and
named exports, one shared ESLint base and one shared TypeScript base that take the
stricter setting of each app, and the TypeScript and React conventions both apps share
in one file both apps' guides point to. The public sees no change: the built pages are
the same before and after. The site's interface text, its dependency versions and its
font are the next stories' (STY-096, STY-097); the editor's fallback-language marking is
STY-098's.

## Acceptance criteria

### S1: The site's files follow the editor's naming

**Given** the public site's source, tests and scripts
**When** a reader lists them
**Then** every file name is kebab-case (`roadmap-card.tsx`, `landing-page.tsx`,
`app.tsx`) and every module exports by name, with no default export outside a
configuration file and the module declaration Vite's JSON import needs
**And** the history of each renamed file follows it (`git log --follow`)

### S2: One ESLint base holds what both apps check

**Given** the root `eslint.base.ts` that both apps' `eslint.config.ts` extend
**When** `pnpm lint` runs
**Then** both apps are checked with typescript-eslint's `strictTypeChecked` and
`stylisticTypeChecked`, jsx-a11y's **strict** preset, react-hooks, react-refresh,
`@eslint-react`'s type-checked preset and `eslint-config-prettier`, set once in the base
**And** each app's own config holds only its own rules: the editor's layering, token,
i18next and E2E rules; the site's Node globals for its scripts
**And** the site's config is `eslint.config.ts`, as the editor's is
**And** both apps pass with no warnings, each finding fixed at its cause or disabled on
its line with a reason

### S3: One TypeScript base holds the compiler options both apps share

**Given** a root `tsconfig.base.json`
**When** `pnpm typecheck` runs
**Then** both apps' application configs extend it, and the site is checked with the
editor's settings (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `erasableSyntaxOnly` among them)
**And** both apps pass

### S4: The shared conventions live in one file both apps read

**Given** `apps/typescript-react-conventions.md`
**When** an agent works in either app
**Then** that app's `AGENTS.md` points to the file, and it holds the TypeScript and React
conventions both apps follow, lifted out of `apps/editor/AGENTS.md` with no rule
changed
**And** `apps/editor/AGENTS.md` keeps only the editor's own rules, the public site's
guide drops "keeps its own conventions", and the root `AGENTS.md` routing table names
the shared file
**And** nothing under `apps/api/` is pointed at it

### S5: The public sees no change

**Given** the site built from the example data before and after this story
**When** the built pages are compared
**Then** every prerendered page's HTML is the same apart from hashed asset names
**And** the ARIA snapshots, the E2E suite and Lighthouse pass unchanged

## Decisions

- **D1** (owner, 2026-11-22, during STY-088's delivery): "Add the alignment to the 095
  as proposed": aligning the versions of the dependencies both apps share, and the
  packages they choose separately for the same job, is this story's, beside the
  conventions, over a separate chore that would compare the built output a second time.
- **D2** (owner, 2026-11-23, grilling round 1): alignment is prioritised: this story and
  its sequence come next on the repository track, before STY-089; the API track carries
  on beside it. Scope stays as the placeholder set it, with no shared code package and
  no visual change.
- **D3** (owner, 2026-11-23, round 1): split into three stories over one: this story
  (renames, the shared bases, the guide lift), STY-096 (the interface text) and STY-097
  (dependency versions and the one choices). Amends D1: the built output is compared in
  STY-096 and STY-097, and this story shows it unchanged (S5).
- **D4** (owner, 2026-11-23, round 2): delivered strictly in sequence: STY-095, CHO-044,
  STY-096, STY-097, STY-098, each merged before the next starts.
- **D5** (owner, 2026-11-23, round 2): the ESLint base takes the stricter setting of each
  app, with the editor's compiler flags; the editor fixes what jsx-a11y strict finds.
  Gives S2, S3.
- **D6** (owner, 2026-11-23, round 2): `@eslint-react` goes into the base for both apps,
  over dropping it from the site; the editor fixes what it finds. Gives S2.
- **D7** (owner, 2026-11-23, round 4): the shared compiler options sit in a root
  `tsconfig.base.json`, beside `eslint.base.ts`. Gives S3.
- **D8** (owner, 2026-11-23, rounds 3–4): the shared conventions file is
  `apps/typescript-react-conventions.md`, outside `docs/` and not an `AGENTS.md`, so
  ancestry never loads it for `apps/api/`; each app's guide points to it. Gives S4.

## Out of scope

- The site's interface text on react-i18next: STY-096.
- One version per shared dependency, and the font: STY-097.
- One dev-ports resolver for both apps: CHO-044.
- The site's design tokens: STY-099.
