# S04 — Internationalisation foundation (English and Welsh)

## Goal

A typed, tested i18n foundation (ADR-0008) that every later UI story builds on. All
user-facing strings in code that already exists are moved into the catalogues.

## Scope

- Install `i18next` and `react-i18next` (current majors; verify React 19 compatibility).
- `src/i18n/` exactly as ADR-0008 describes: `languages.ts`, `locales/en.ts`,
  `locales/cy.ts` (typed against `en`), `create-i18n.ts`, `language-preference.ts`,
  `i18next.d.ts`, and a barrel if useful.
- Seed the catalogues with the copy the brief already fixes, so S05 and S06 use it rather
  than inventing keys ad hoc:
  - "Product Roadmaps"
  - "A simple way to explore and manage your product roadmaps."
  - an explanation that roadmaps are sourced from Google Sheets
  - "Connect Google", "Disconnect", "Reconnect"
  - connection statuses: "Not connected", "Connecting…", "Google connected", "Session expired"
  - "Your Roadmaps", "Roadmaps available in the connected spreadsheet."
  - "Refresh", "Retry"
  - the empty state
  - "Roadmap details are coming soon."
  - not-found copy
  - error copy for every `AppError.kind`
  - toggle-theme and language labels

  Include at least one pluralised key, such as a roadmap count like "3 roadmaps", with
  Welsh plural forms, to prove plurals end to end. Welsh must be good-quality Welsh with
  correct mutations, e.g. "Cysylltu â Google".

- `LanguageSwitcher` component. Choose and document its location: `src/i18n/` is
  infrastructure-like, so a component probably belongs in `components/layout/` or
  `features/i18n/components/`. Add the shadcn Base UI component it needs via the CLI. It
  persists the choice, changes the language without a reload, and updates `<html lang>`
  and `document.title`.
- Make i18n available to the app. If the composition root and providers from S05 do not
  exist yet, add a minimal `I18nextProvider` into the current provider tree, or the
  placeholder `main.tsx`, in a way S05 can lift into `app/composition.ts` and
  `app/providers.tsx`. Leave a clear note in the handoff.
- Move any literal user-facing strings already in the code (S01 placeholder page,
  S03 auth state messages, if any) to keys. S03's `AuthState` should carry error
  **codes**, not English sentences. If S03 put prose in state, refactor it to codes
  mapped to `auth.errors.*` keys.
- Test support: extend or provide the shared test render utility, or a
  `createTestI18n()`, so component tests get an English instance by default and can opt
  into Welsh.
- Lint: add a no-literal-strings-in-JSX rule (e.g. `eslint-plugin-i18next`) if it works
  cleanly with the flat config and isn't noisy. Otherwise document why it was not added.
- Update `AGENTS.md` conventions: all copy goes through i18n, and a new key needs both
  `en` and `cy`.

## Tests

- Language resolution: stored preference wins; `cy-GB` browser → `cy`; unsupported →
  `en`; storage throwing → falls back gracefully.
- Catalogue parity is guaranteed at compile time. A runtime test also asserts that the
  `en` and `cy` key sets are equal and that no value is empty.
- Welsh plural forms render correctly for representative counts
  (0, 1, 2, 3, 6, 10).
- `LanguageSwitcher` switches the rendered text and `<html lang>`, and persists the choice.

## Acceptance criteria

- [ ] No user-facing literal strings outside `src/i18n/locales/`, except
      brand-independent symbols.
- [ ] Missing a Welsh key fails `pnpm typecheck` (verify, then revert).
- [ ] All checks green.
