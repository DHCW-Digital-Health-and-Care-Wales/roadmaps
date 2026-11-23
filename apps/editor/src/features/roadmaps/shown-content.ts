import {
  type ContentLanguage,
  type LocalisedText,
  resolve,
} from "@/domain/roadmap/localised-text"

/**
 * Content as an element shows it: its text in the interface's language, and the `lang`
 * the element takes, set only for English shown in place of empty Welsh, so a screen
 * reader reads it as English (WCAG 2.2 SC 3.1.2, ADR-008).
 */
export interface ShownContent {
  text: string
  lang: ContentLanguage | undefined
}

/** `value` as an element in a `language` interface shows it (`ShownContent`). */
export function showContent(
  value: LocalisedText,
  language: ContentLanguage,
): ShownContent {
  const resolved = resolve(value, language)
  return {
    text: resolved.text,
    lang: resolved.language === language ? undefined : resolved.language,
  }
}
