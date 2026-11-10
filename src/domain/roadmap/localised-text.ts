/** A language roadmap content can be written in. */
export type ContentLanguage = "en" | "cy"

/** Content in English and Welsh (ADR-009). The Welsh is optional: `""` means none. */
export interface LocalisedText {
  en: string
  cy: string
}

/** The text in `language`, or the English when it has no Welsh. */
export function localise(
  text: LocalisedText,
  language: ContentLanguage,
): string {
  return language === "cy" && text.cy !== "" ? text.cy : text.en
}
