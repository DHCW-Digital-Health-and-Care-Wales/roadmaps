# ADR-0008: Internationalisation — English and Welsh

- Status: Accepted
- Date: 2026-11-10 (amended in STY-004: switcher location, document sync, catalogue type, lint)

## Context

The UI must be available in English (`en`, default) and Welsh (`cy`). Other languages are
out of scope for now but adding one must be a data change, not a code change. Welsh has
six CLDR plural categories (zero, one, two, few, many, other), so string concatenation
and English-only pluralisation are not acceptable.

## Decision

- **Library**: `i18next` + `react-i18next`. This is a mature, widely known stack.
  Pluralisation goes through `Intl.PluralRules`, which handles `cy` correctly, and message
  keys get compile-time types. No HTTP backend: both catalogues are small and bundled.
  No `i18next-browser-languagedetector`; a few lines of our own detection is enough.
- **Location**: `src/i18n/`
  - `languages.ts`: `supportedLanguages = ['en', 'cy'] as const`, the `Language` type,
    `defaultLanguage = 'en'`, and endonyms (`English`, `Cymraeg`).
  - `locales/en.ts` is the source of truth (a nested `as const` object, keys grouped by
    feature: `common`, `layout`, `auth`, `roadmaps`, `errors`, `notFound`, `theme`,
    `language`, plus `landing`). `locales/cy.ts` is typed against the English shape
    (`Catalogue<typeof en, …>` from `catalogue.ts`, applied with `satisfies`), so a missing
    or extra key fails `pnpm typecheck`. Plural keys use each language's own CLDR
    categories: English `_one`/`_other` (plus an optional `_zero`, which i18next uses for
    0 in any language) become all six Welsh forms, and a missing Welsh form is a type
    error.
  - `create-i18n.ts`: a factory (`createI18n({ language })`) used by the composition root
    and by tests, which get a fresh isolated instance. No global side-effect import and
    no `initReactI18next`: the instance reaches React only through `I18nextProvider`.
    It also exports `syncDocumentLanguage(i18n)` for the document sync below.
  - `language-preference.ts`: resolves the language from the stored preference, then
    `navigator.languages` (any `cy-*` → `cy`), then `en`. It persists explicit choices in
    `localStorage` (non-sensitive; reads and writes wrapped in try/catch).
  - `i18next.d.ts`: `CustomTypeOptions` declaration for typed `t()` keys.
- **Document sync**: on language change, set `<html lang>` and `document.title`
  (`syncDocumentLanguage`, called once by the composition root).
- **UI**: a `LanguageSwitcher` in the header. It is an accessible Base UI/shadcn menu or
  select, shows each language's endonym with a `lang` attribute, and has a localised
  accessible label. It lives in `components/layout/language-switcher.tsx` (an app-shell
  piece, not a feature), built on the shadcn `dropdown-menu` with a radio group. Its
  accessible name is "Language English" (a visually hidden label plus the visible
  endonym), so it contains the visible text. STY-005 places it in the header.
- **Rule**: every user-facing string, including aria-labels, toasts, error copy and the
  page title, comes from the catalogues. The domain and infrastructure layers emit no
  copy. UI maps `AppError.kind` to an `errors.*` key; `en.ts` uses
  `satisfies Record<AppErrorKind, string>` (and likewise for auth statuses and codes), so a
  new kind without copy fails type checking. `eslint-plugin-i18next`'s
  `no-literal-string` (mode `jsx-only`) rejects literal JSX text and literal `aria-label`,
  `title`, `alt`, `placeholder` and `label` attributes in `src/**/*.tsx`, except tests and
  `components/ui`. Endonyms in `languages.ts` are deliberately untranslated.
- **Formatting**: any dates and numbers use `Intl` with the active language. None are
  needed yet.
- **Google UI**: the OAuth popup is rendered by Google in the user's Google account
  language. We do not control it.
- **Translation quality**: the initial Welsh strings are machine-assisted. They must be
  reviewed by a fluent Welsh speaker before a public launch, and the README tracks this.

## Consequences

- Each new string needs `en` and `cy` entries. The type system makes forgetting one a
  build failure.
- Tests render through a test i18n instance (English by default). At least one component
  test and one E2E test exercise Welsh.
