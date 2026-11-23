/** Languages the site is in (ADR-008), Welsh first as on other bilingual Welsh public sector sites. */
export const supportedLanguages = ["cy", "en"] as const

export type Language = (typeof supportedLanguages)[number]

/**
 * The language of the site root's own page and of 404.html. English for now; to make
 * the site Welsh-first, flip this single value to "cy".
 */
export const defaultLanguage: Language = "en"

/**
 * Each language's name in that language. They are shown untranslated, so a reader can
 * find their own language whatever the page is in.
 */
export const languageEndonyms: Readonly<Record<Language, string>> = {
  cy: "Cymraeg",
  en: "English",
}

export function isLanguage(value: unknown): value is Language {
  return supportedLanguages.some((language) => language === value)
}

/** Maps a BCP 47 tag such as `cy-GB` to a supported language by its primary subtag. */
export function matchLanguage(tag: string): Language | undefined {
  const primary = tag.split("-")[0]?.toLowerCase()
  return isLanguage(primary) ? primary : undefined
}
