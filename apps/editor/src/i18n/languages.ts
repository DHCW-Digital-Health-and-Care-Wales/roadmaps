/** Languages the UI is translated into (ADR-008). Adding one is a data change. */
export const supportedLanguages = ["en", "cy"] as const

export type Language = (typeof supportedLanguages)[number]

export const defaultLanguage: Language = "en"

/**
 * Each language's name in that language. They are shown untranslated, so a reader can
 * find their own language whatever the UI is set to.
 */
export const languageEndonyms: Readonly<Record<Language, string>> = {
  en: "English",
  cy: "Cymraeg",
}

export function isLanguage(value: unknown): value is Language {
  return supportedLanguages.some((language) => language === value)
}

/** Maps a BCP 47 tag such as `cy-GB` to a supported language by its primary subtag. */
export function matchLanguage(tag: string): Language | undefined {
  const primary = tag.split("-")[0]?.toLowerCase()
  return isLanguage(primary) ? primary : undefined
}
