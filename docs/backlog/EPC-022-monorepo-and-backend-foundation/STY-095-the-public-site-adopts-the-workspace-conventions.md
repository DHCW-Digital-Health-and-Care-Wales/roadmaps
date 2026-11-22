# STY-095: The public site adopts the workspace's code conventions

- **Status**: Placeholder — scoped in the owner's STY-088 grilling (2026-11-21); promoted
  once its acceptance criteria are written after STY-088
- **Type**: Refactor
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-088 (hard)
- **Binding ADRs**: ADR-008, ADR-016 §Workspace tooling, §Agent guides
- **Suggested model**: Opus — renames, a string migration and a guide lift across two
  apps

## Summary

After the import, the public site keeps its own conventions: PascalCase component
files and interface text in `strings.ts`, rendered with `<T>`. This story moves it onto
the editor's: kebab-case files, react-i18next with English and Welsh catalogues under
ADR-008 and the copywriter skill, and a shared ESLint base, with the dependencies both
apps use on one version each and one choice where they do the same job differently.
The conventions both apps then share move out of the editor's guide. The public sees no
change.

## Why this is a placeholder

The owner chose convergence in a follow-up story (STY-088 D2); its acceptance criteria
are written once STY-088 shows what the imported site holds.

## Rough shape of the work

_Not acceptance criteria._

- Kebab-case file names and named exports; `strings.ts` and `<T>` replaced by
  react-i18next catalogues, prerendered in both languages, with the Welsh unchanged.
- The root `eslint.base.ts` for the settings both React apps share (ADR-016 _Workspace
  tooling_, _STY-088 amendments_).
- The TypeScript and React conventions both apps share lift out of
  `apps/editor/AGENTS.md` (STY-086 D6) to where both apps' sessions read them.
- **One version per shared dependency** (D1): each package both apps use (react,
  react-dom, `@types/react`, `@types/react-dom`, vite, `@vitejs/plugin-react`,
  tailwindcss, `@tailwindcss/vite`, lucide-react, zod, jsdom, `@testing-library/react`,
  `@axe-core/playwright`, the ESLint plugins and `@types/node`) becomes a `catalog:`
  entry in `pnpm-workspace.yaml`, as ESLint, TypeScript, Vitest and Playwright already
  are. STY-088 kept the versions npm had resolved for the site, so its output could be
  compared like for like; at its delivery the site resolved react and react-dom 19.3.0,
  lucide-react 1.35.0, tailwindcss 4.3.3, jsdom 30 and `@types/node` 24 where the editor
  has 19.3.1, 1.70.0, 4.3.5, 31 and the catalog's 22.
- **One choice where the apps do the same job differently** (D1): the Roboto font
  (`@fontsource/roboto`, static weights, in the site against
  `@fontsource-variable/roboto` in the editor), within the site's Lighthouse size
  budgets; the React lint rules (`@eslint-react/eslint-plugin` in the site alone), with
  the shared ESLint base; and whether the site's own router stays beside the editor's
  TanStack Router, as a static prerendered site may warrant.
- The built output compared before and after, as STY-088 S2 does: a newer lucide-react
  or React can change the published HTML (an icon's SVG paths), and such a change is
  shown and accepted, not silent.

## Decisions

- **D1** (owner, 2026-11-22, during STY-088's delivery): "Add the alignment to the 095
  as proposed": aligning the versions of the dependencies both apps share, and the
  packages they choose separately for the same job, is this story's, beside the
  conventions, over a separate chore that would compare the built output a second time.
