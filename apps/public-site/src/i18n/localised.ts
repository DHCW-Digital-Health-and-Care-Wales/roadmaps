/**
 * Roadmap content from the sheet is language-keyed data (`Localised`), not catalogue
 * text: its Welsh is optional, and an empty Welsh value falls back to English. In
 * development each English fallback is logged once, so the missing Welsh is easy to find.
 */
import type { Localised } from "../lib/types"
import type { Language } from "./languages"

const missingWelsh = new Set<string>()

/** Content in `lang`, and the language it is actually in: English when the Welsh is empty. */
export function resolve(
  value: Localised,
  lang: Language,
): { text: string; lang: Language } {
  const requested = value[lang]
  if (requested && requested.trim() !== "") {
    return { text: requested, lang }
  }

  if (lang === "cy" && import.meta.env.DEV) {
    const english = value.en
    if (english && !missingWelsh.has(english)) {
      missingWelsh.add(english)
      console.warn(
        `[i18n] Missing Welsh translation, falling back to English: "${english}"`,
      )
    }
  }

  return { text: value.en, lang: "en" }
}

/** Content in `lang` as plain text, for an attribute, a title or sorting. */
export const localise = (value: Localised, lang: Language): string =>
  resolve(value, lang).text
