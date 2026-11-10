import { createInstance, type i18n } from "i18next"

import { defaultLanguage, supportedLanguages, type Language } from "./languages"
import { cy } from "./locales/cy"
import { en } from "./locales/en"

export interface CreateI18nOptions {
  /** Defaults to English. The app passes `resolveLanguage()`. */
  language?: Language | undefined
}

/**
 * A fresh, initialised i18next instance with both catalogues bundled (ADR-008). Nothing
 * global is touched, so tests can create isolated instances.
 */
export function createI18n({
  language = defaultLanguage,
}: CreateI18nOptions = {}): i18n {
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

/**
 * Keeps `<html lang>` and the document title in step with the active language, starting
 * now. Returns a function that stops syncing.
 */
export function syncDocumentLanguage(
  instance: i18n,
  doc: Document = document,
): () => void {
  const sync = () => {
    doc.documentElement.lang = instance.resolvedLanguage ?? defaultLanguage
    doc.title = instance.t("common.appName")
  }
  sync()
  instance.on("languageChanged", sync)
  return () => {
    instance.off("languageChanged", sync)
  }
}
