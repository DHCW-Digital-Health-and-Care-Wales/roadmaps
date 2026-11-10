# STY-004 — Internationalisation foundation (English and Welsh)

## Goal

A typed, tested i18n foundation (ADR-0008) that every later UI story builds on. All
user-facing strings in code that already exists are moved into the catalogues.

## Scope

- Install `i18next` and `react-i18next` (current majors; verify React 19 compatibility).
- `src/i18n/` exactly as ADR-0008 describes: `languages.ts`, `locales/en.ts`,
  `locales/cy.ts` (typed against `en`), `create-i18n.ts`, `language-preference.ts`,
  `i18next.d.ts`, and a barrel if useful.
- Seed the catalogues with the copy the brief already fixes, so STY-005 and STY-006 use it rather
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
- Make i18n available to the app. If the composition root and providers from STY-005 do not
  exist yet, add a minimal `I18nextProvider` into the current provider tree, or the
  placeholder `main.tsx`, in a way STY-005 can lift into `app/composition.ts` and
  `app/providers.tsx`. Leave a clear note in the handoff.
- Move any literal user-facing strings already in the code (STY-001 placeholder page,
  STY-003 auth state messages, if any) to keys. STY-003's `AuthState` should carry error
  **codes**, not English sentences. If STY-003 put prose in state, refactor it to codes
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

- [x] No user-facing literal strings outside `src/i18n/locales/`, except
      brand-independent symbols. Deliberate exceptions: the endonyms in
      `src/i18n/languages.ts` (shown untranslated by design), and the static `<title>` and
      meta description in `index.html` (the title is replaced at runtime by
      `syncDocumentLanguage`). `i18next/no-literal-string` enforces this for JSX.
- [x] Missing a Welsh key fails `pnpm typecheck` (verified, then reverted: a missing key
      gives TS2741, an extra key TS2353, and a missing Welsh plural form such as
      `count_two` TS2741).
- [x] All checks green.

## Implementation notes

- i18next 27.0.1 and react-i18next 18.0.1 (React 19 supported: peer `react >= 18`). v27
  defaults matter: `fallbackLng` is set explicitly to `en`, and `strictInterpolationChecks`
  is on, so `t("roadmaps.count")` without `count` is a type error.
- No `initReactI18next` and no `i18next-browser-languagedetector`: the instance reaches
  React through `I18nextProvider` only.
- `LanguageSwitcher` lives in `src/components/layout/` (an app-shell piece shared across
  features; `src/i18n/` holds no React components).
- Lint: `eslint-plugin-i18next` 6.1.5 works cleanly with the flat config. Mode `jsx-only`
  with an attribute allowlist flags JSX text, `{"literal"}` children and literal
  `aria-label`/`aria-description`/`title`/`alt`/`placeholder`/`label`, while ignoring
  `className`, `role`, `lang`, `data-*` and so on. Tests and `components/ui` are exempt.
- Welsh uses "map trywydd" for roadmap and "taenlen" for spreadsheet. It is
  machine-assisted and needs review by a fluent speaker before launch (ADR-0008).

## Review notes

Sol review (Codex `gpt-6.1-sol`, high) of the working tree; both findings fixed:

1. **P2 — re-selecting the active language did not persist the choice.** If Welsh came
   from the browser, choosing "Cymraeg" returned early without storing it. Fixed: each
   radio item's `onClick` stores the choice and only calls `changeLanguage` when it
   differs (Base UI's `onValueChange` does not fire for the already-checked item). Tests
   added for re-selection and for keyboard operation.
2. **P3 — switcher tests left the Welsh document title behind.** Fixed: teardown restores
   the original title and `<html lang>`, stops syncing and clears `localStorage`.
