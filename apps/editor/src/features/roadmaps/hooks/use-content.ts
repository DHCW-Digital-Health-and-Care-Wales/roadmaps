import { useCallback } from "react"

import type { LocalisedText } from "@/domain/roadmap/localised-text"
import { useLanguage } from "@/i18n"

import { showContent, type ShownContent } from "../shown-content"

/** Content as an element in the interface's language shows it (`showContent`). */
export function useContent(): (value: LocalisedText) => ShownContent {
  const language = useLanguage()
  return useCallback(
    (value: LocalisedText) => showContent(value, language),
    [language],
  )
}
