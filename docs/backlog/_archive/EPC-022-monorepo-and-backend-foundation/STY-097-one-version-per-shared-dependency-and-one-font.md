# STY-097: One version per shared dependency, and one font

- **Status**: Done
- **Type**: Refactor
- **Area**: Features/UI + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-096 (hard)
- **Binding ADRs**: ADR-016 §Workspace tooling, §STY-095 amendments
- **Suggested model**: Sonnet — catalogue entries, one font swap and a before/after
  comparison

## Summary

Every package both apps use resolves to one version, named once in the workspace
catalogue, and both apps load the same Roboto: the variable font the editor loads,
which is about 23 KB lighter than the site's three static weights on an English page
and about 39 KB lighter on a Welsh one. The site keeps its own small router beside the
editor's TanStack Router, as a deliberate difference. A newer React or icon package can
change the published HTML, and the font can render a sub-pixel differently, so the
built output and screenshots are compared and shown to the owner before merge.

## Acceptance criteria

### S1: Each shared dependency has one version

**Given** the packages both apps declare (react, react-dom, `@types/react`,
`@types/react-dom`, vite, `@vitejs/plugin-react`, tailwindcss, `@tailwindcss/vite`,
lucide-react, zod, jsdom, `@testing-library/react`, `@axe-core/playwright`,
`@types/node` and the ESLint plugins they share)
**When** a reader opens either app's `package.json`
**Then** each is a `catalog:` entry, and the lockfile resolves one version of it for
both apps
**And** each entry takes the newer of the two apps' resolved versions, or a later one at
least a week old, except `@types/node`, which follows the workspace's Node (S5)

### S2: Both apps load the variable Roboto

**Given** a page of either app
**When** it loads
**Then** its text is set in Roboto from `@fontsource-variable/roboto`, self-hosted, and
the site no longer depends on `@fontsource/roboto`
**And** the site's privacy note on self-hosted fonts stays true

### S3: The public pages are compared before and after

**Given** the site built from the example data before and after this story
**When** the built pages, the ARIA snapshots and screenshots in English and Welsh at
desktop and phone widths are compared
**Then** every difference (an icon's SVG paths, the font's rendering) is listed in the
pull request with its cause
**And** Lighthouse passes within its budgets, with the font bytes recorded

### S4: The site's router is a recorded difference

**Given** the shared conventions file
**When** an agent compares the apps' routing
**Then** it says the site keeps its own router: a static prerendered site served per
path, where the editor's TanStack Router runs on hash history with no SSR (ADR-004)

### S5: One Node version everywhere (D6)

**Given** the workspace's Node version
**When** a reader compares `.nvmrc`, the root `engines`, CI and the catalogue's
`@types/node`
**Then** each names Node 26: `engines` accepts 26 and later only, and both apps take
`@types/node` 26 from the catalogue
**And** both apps' checks pass on it, and ADR-007, which says `engines` still accepts
22 and 24 for local development, is amended to match

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 1): split from STY-095 as one of
  three stories; the built output is compared here (S3).
- **D2** (owner, 2026-11-23, round 2): the site keeps its own router, over adopting
  TanStack Router, whose hash history cannot serve per-path prerendered pages and whose
  size would weigh on the site's 100 KB script budget. Gives S4.
- **D3** (owner, 2026-11-23, round 5, after a comparison of the two fonts): the variable
  Roboto in both apps, over static weights in both. Gives S2.
- **D4** (owner, 2026-11-23, with the order): this story changes the public site's
  pages, so the owner sees its screenshots before approving the merge (the epic's
  `delivery-notes.md`).
- **D5** (agent, 2026-11-23, from the review of this record): `@types/node` follows the
  `engines` floor, as STY-009 recorded, over the newer of the two apps' versions, which
  would type-check APIs a supported Node lacks. Gives S1's exception.
- **D6** (owner, 2026-11-23, asked on PR #268 after D5): Node 26 is the workspace's floor,
  matching `.nvmrc` and CI, over keeping 22 or raising to 24: Node 26 is LTS until
  April 2029, Node 22 reaches its end of life on 30 April 2027, and CI tests no other
  version. Changes D5: `@types/node` is 26 for both apps. Supersedes STY-009's choice of
  22 for the oldest supported runtime. Gives S5.

## Out of scope

- The site's colours, focus ring and other design tokens: STY-099.

## Delivery

### Departures

- **S1**: the catalogue also names `@fontsource-variable/roboto` (both apps now use it)
  and `eslint-plugin-i18next` (the ESLint plugin they share), beside the packages S1 lists.
  Each entry takes the newer of the two apps' versions, which was the editor's but for
  `vite` (the site's 8.3.8): react and react-dom 19.3.1, lucide-react 1.70.0,
  `@vitejs/plugin-react` 6.2.1, tailwindcss and `@tailwindcss/vite` 4.3.5, jsdom 31.0.0,
  `@axe-core/playwright` 4.14.0, zod 4.6.7, `@testing-library/react` 16.3.3 and the two
  React type packages 19.3.0; no entry needed a later version (agent).
- **S2**: the site's `--font-sans` names `"Roboto Variable"` before `Roboto` and its system
  fonts, so a page whose font fails to load falls back as before (agent).
- **S2**: a site Playwright spec, `apps/public-site/e2e/typography.spec.ts`, holds that
  the page renders in the self-hosted Roboto, ŵ and ŷ included, since only a browser
  shows which font drew a glyph; the site guide's list of what earns a spec gains
  "the fonts rendered" (agent).
- **S4**: the router difference is a section of `apps/typescript-react-conventions.md`,
  _Where the apps differ on purpose_ (agent).

### Contract for dependents

- A package both apps use is a `catalog:` entry in `pnpm-workspace.yaml`; a new one
  that both use goes there, and the lockfile then resolves it once.
- The workspace's Node is 26: the root `engines` is `>=26.0.0`, ADR-007 says so, and
  `@types/node` is 26 for both apps.
- STY-098 reads the editor's `@fontsource-variable/roboto` and the site's identical
  import; STY-099 changes the site's tokens in `apps/public-site/src/index.css`, whose
  `--font-sans` now starts with `"Roboto Variable"`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | observed: `pnpm install` on Node 26.13.1 leaves one version of each listed package in `pnpm-lock.yaml` (react 19.3.1, vite 8.3.8, lucide-react 1.70.0, tailwindcss 4.3.5, jsdom 31.0.0, `@types/node` 26.6.6, and so on), and neither app's `package.json` names one of them with a range                                                                                                                                                                                                                                                                                                                                                         |
| S2       | `apps/public-site/e2e/typography.spec.ts` (`text is the self-hosted variable Roboto, with Welsh ŵ and ŷ`), red when the font import in `main.tsx` is removed (`isCustomFont` false); observed: Lighthouse's network requests on the example data show one same-origin font file, `roboto-latin-wght-normal`, 43,457 bytes, against the three static files' 66,324 bytes before (22,867 less on an English page, and the same on the example Welsh pages, which hold no ŵ or ŷ); a Welsh page that needs latin-ext adds its variable file, 29,392 bytes, to 43,136, against 45,396 more in three static files, so 39.2 KB less                     |
| S3       | observed: the site built from the example data before and after; its HTML pages differ only in the `class` attribute of their icons (lucide 1.70 adds `lucide-home`, `lucide-layers-3`, and renames `lucide-building2` to `lucide-building-complex`), their SVG paths identical; the CSS differs by the font rules and Tailwind 4.3.5's output of the same rules; the 10 ARIA snapshots pass unchanged; `pnpm site:lighthouse` passes every assertion with 98,489 bytes of script (the site's script, 92,257, with Simple Analytics) against 100,000, 884 more than STY-096's 97,605; the pull request lists the differences with the screenshots |
| S4       | the conventions file in the diff, reviewed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S5       | observed: `pnpm typecheck`, `lint`, `format:check`, `test` (59, 320 and 3,048 tests), `build`, `pnpm site:lighthouse` and the site's E2E suite (48 passed) run on Node 26.13.1; `.nvmrc`, every `setup-node` step (`node-version-file: .nvmrc`), the root `engines` (`>=26.0.0`) and the catalogue's `@types/node` (`^26.6.6`) name Node 26                                                                                                                                                                                                                                                                                                       |
