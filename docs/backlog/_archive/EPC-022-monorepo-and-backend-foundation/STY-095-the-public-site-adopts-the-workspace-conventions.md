# STY-095: The public site adopts the workspace's code conventions

- **Status**: Done
- **Type**: Refactor
- **Area**: Features/UI + CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-088 (hard)
- **Binding ADRs**: ADR-016 §Workspace tooling, §Agent guides, §STY-095 amendments
- **Suggested model**: Opus — renames across the site, lint and compiler settings shared
  by both apps, and a guide lift
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/269

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
configuration file and the declaration of the virtual module the site's roadmap-data
plugin serves
**And** the history of each renamed file follows it (`git log --follow`)

### S2: One ESLint base holds what both apps check

**Given** the root `eslint.base.ts` that both apps' `eslint.config.ts` extend
**When** `pnpm lint` runs
**Then** both apps are checked with typescript-eslint's `strictTypeChecked` and
`stylisticTypeChecked`, jsx-a11y's **strict** preset, react-hooks, react-refresh,
`@eslint-react`'s type-checked preset and `eslint-config-prettier`, set once in the base
**And** each app's own config holds only its own rules: the editor's layering, token,
i18next and E2E rules; the site's Node globals for its scripts, and its
`prefer-nullish-coalescing` exception for strings, since its `||` treats an empty sheet
cell or environment variable as missing
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
  no visual alignment (the design tokens are STY-099).
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

## Delivery

### Departures

- **S1**: the site's `eslint.config.js` becomes `eslint.config.ts` with `git mv`, but
  its content is rewritten onto the base, so Git no longer pairs the two and
  `git log --follow` stops at this change for it; each of the 45 renamed source, test
  and page files keeps its history (agent).
- **S2**: the base is a function, `reactAppConfig({ tsconfigRootDir, extraHOCs }, …app
blocks)` in `eslint.base.ts`, so Prettier's block stays last after each app's own
  rules and the type-aware parser reads each app's tsconfigs. Its React presets apply to
  `src/` in both apps, where all their React code is: the site had applied react-hooks
  and react-refresh to every file, and jsx-a11y and `@eslint-react` to `.tsx` only.
  react-hooks takes `recommended-latest`, the stricter of the two apps' presets (agent).
- **S2**: besides the rules S2 names, each app keeps one more of its own: the editor's
  react-refresh allowance for TanStack Router's `createLink` (through the base's
  `extraHOCs`), and the site's react-refresh exemption for its build-time
  `src/entry-server.tsx` (agent).
- **S2**: the ESLint plugins the base imports are the root package's dev dependencies,
  at the versions the apps had, and each app drops those it no longer imports; the
  lockfile moves them without a version change, and dedupes the transitive
  `@eslint-community/eslint-utils` onto the 4.10.1 it already held (agent).
- **S2**: the editor's findings are fixed at their cause, behaviour kept: 68 refs renamed
  to end in `Ref`, three state setters renamed, `useContext` replaced by `use`, and the
  icon `publishedStateAction` returned drawn by a `PublishedStateIcon` component that
  takes the action's verb.
  Conditional rendering of a `ReactNode` prop now tests `Boolean(…)`, which renders
  nothing for `0` where it rendered "0"; no caller passes a number. Twelve findings are
  disabled on their line with a reason: focus observed bubbling up from controls inside
  a card, row or header (three), measuring layout after render (two), static or
  identity-less lists keyed by place (four), and one each for `flushSync`, a
  fire-and-forget timeout and a run-once effect. The site disables two the same way: a
  `flushSync` before measuring the new layout, and the landing page the default
  language always has (agent).
- **S3**: every TypeScript config in the workspace extends `tsconfig.base.json`, the root
  package's and each app's Node and E2E configs as well as the application configs.
  Each keeps its own target, libraries, module resolution and types, so the site keeps
  its ES2020 target. The site drops `noUncheckedSideEffectImports`, which TypeScript 6
  sets by default, and the editor's E2E config gains `allowImportingTsExtensions` from
  the base (agent).
- **S3**: where the parser and the snapshot schema leave an optional field `undefined`,
  the site's types now say so (`RoadmapItem`'s optional fields, a warning's `row`, the
  footer's `dataSlug`), so `exactOptionalPropertyTypes` holds with no change to what is
  parsed or written; an information page's paragraphs are a non-empty tuple (agent).
- **S4**: the shared file takes four rules from `apps/editor/AGENTS.md` word for word,
  one of them with the editor's E2E and route clauses left in the editor's guide; "a
  table-driven test is an `it.each`", which both apps' seams lines carried, moves there
  from both (agent).
- **S5**: the host was loaded, so the E2E suite (ARIA snapshots included) and Lighthouse
  are left to the pull request's CI, not run locally (agent).

### Contract for dependents

- A new React app's `eslint.config.ts` is `reactAppConfig({ tsconfigRootDir:
import.meta.dirname }, …its own blocks)` from the root `eslint.base.ts`; its
  tsconfigs extend the root `tsconfig.base.json`.
- The site's interface text is still `src/lib/strings.ts` rendered by `<T>`, now in
  `src/components/t.tsx`, for STY-096 to replace.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | observed: `git diff -M --name-status` against the base shows the 45 renames (similarity 73–100%), and `git log --follow` on `apps/public-site/src/app.tsx` reaches the site's first commit                            |
| S2       | observed: `pnpm lint` passes with no warnings for the root and both apps                                                                                                                                              |
| S3       | observed: `pnpm typecheck` passes for the root and both apps                                                                                                                                                          |
| S4       | the guides in the diff, reviewed                                                                                                                                                                                      |
| S5       | observed: the site built from the example data before and after; all 15 HTML, XML and JSON files match once the script's hashed name is masked, and the other assets are byte-identical; CI's E2E and Lighthouse jobs |
