/** A language roadmap content can be written in. */
export type ContentLanguage = "en" | "cy"

/** Content in English and Welsh (ADR-009). The Welsh is optional: `""` means none. */
export interface LocalisedText {
  en: string
  cy: string
}

/** Content as shown in a language, and the language it is written in. */
export interface ResolvedText {
  text: string
  language: ContentLanguage
}

/** The text in `language`, or the English, said to be English, when it has no Welsh. */
export function resolve(
  text: LocalisedText,
  language: ContentLanguage,
): ResolvedText {
  return language === "cy" && text.cy !== ""
    ? { text: text.cy, language: "cy" }
    : { text: text.en, language: "en" }
}

/** The text in `language`, or the English when it has no Welsh: for an attribute or sorting. */
export function localise(
  text: LocalisedText,
  language: ContentLanguage,
): string {
  return resolve(text, language).text
}
