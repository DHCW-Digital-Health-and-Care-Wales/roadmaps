import type { DetailLine } from "@/domain/roadmap/item-details"
import {
  type ContentLanguage,
  type LocalisedText,
  resolve,
} from "@/domain/roadmap/localised-text"

/**
 * Text as an element shows it, and the `lang` the element takes, set only where the
 * text's language differs from the interface's, so a screen reader reads it in its own
 * (WCAG 2.2 SC 3.1.2, ADR-008).
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
  return showWritten(resolved.text, resolved.language, language)
}

/**
 * Text shown in one language, `written`, whatever the interface's, as an element in a
 * `language` interface shows it: a family's English or Welsh name, an organisation's
 * short name, or the English being edited or reviewed.
 */
export function showWritten(
  text: string,
  written: ContentLanguage,
  language: ContentLanguage,
): ShownContent {
  return { text, lang: written === language ? undefined : written }
}

/** Text with no `lang` of its own: interface copy, or a value in no language, as an ID. */
export function unmarked(text: string): ShownContent {
  return { text, lang: undefined }
}

/** A detail as shown: its `lang` set where it is English in a Welsh interface. */
export interface ShownDetail extends DetailLine {
  lang?: ContentLanguage | undefined
}
