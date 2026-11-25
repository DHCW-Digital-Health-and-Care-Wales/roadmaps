import { useCallback } from "react"

import type {
  ContentLanguage,
  LocalisedText,
} from "@/domain/roadmap/localised-text"
import { useLanguage } from "@/i18n"

import { showContent, showWritten, type ShownContent } from "../shown-content"

/** Content as an element in the interface's language shows it (`showContent`). */
export function useContent(): (value: LocalisedText) => ShownContent {
  const language = useLanguage()
  return useCallback(
    (value: LocalisedText) => showContent(value, language),
    [language],
  )
}

/** Text shown in one language, as an element in the interface shows it (`showWritten`). */
export function useWritten(): (
  text: string,
  written: ContentLanguage,
) => ShownContent {
  const language = useLanguage()
  return useCallback(
    (text: string, written: ContentLanguage) =>
      showWritten(text, written, language),
    [language],
  )
}
