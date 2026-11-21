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
ADR-008 and the copywriter skill, and a shared ESLint base. The conventions both apps
then share move out of the editor's guide. The public sees no change.

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
- The built output compared before and after, as STY-088 S2 does.
