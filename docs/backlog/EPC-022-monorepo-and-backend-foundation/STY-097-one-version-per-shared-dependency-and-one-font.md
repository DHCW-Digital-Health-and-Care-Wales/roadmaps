# STY-097: One version per shared dependency, and one font

- **Status**: Proposed — split from STY-095 in the owner's grilling of 2026-11-23 (D1–D4);
  fourth in the alignment sequence
- **Type**: Refactor
- **Area**: Features/UI + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
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
