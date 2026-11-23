import { createInstance, type i18n } from "i18next"
import { defaultLanguage, supportedLanguages, type Language } from "./languages"
import { cy } from "./locales/cy"
import { en } from "./locales/en"

/**
 * A fresh, initialised i18next instance in `language`, with both catalogues bundled
 * (ADR-008). Nothing global is touched, so each render and test has its own.
 */
export function createI18n({
  language = defaultLanguage,
}: { language?: Language | undefined } = {}): i18n {
  const instance = createInstance({
    lng: language,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    resources: { en: { translation: en }, cy: { translation: cy } },
    // React escapes rendered text already.
    interpolation: { escapeValue: false },
    // Resources are bundled, so initialise synchronously and never suspend.
    initAsync: false,
  })
  void instance.init()
  return instance
}
