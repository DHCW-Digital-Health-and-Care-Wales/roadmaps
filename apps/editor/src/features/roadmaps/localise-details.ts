import type { ContentLanguage } from "@/domain/roadmap/localised-text"
import type { RoadmapItemDetail } from "@/domain/roadmap/roadmap-item"

import { showContent, type ShownDetail } from "./shown-content"

/**
 * An item's details as an element in a `language` interface shows them, each at the
 * level it was read at, English shown in place of Welsh marked (`showContent`).
 */
export function localiseDetails(
  details: readonly RoadmapItemDetail[],
  language: ContentLanguage,
): ShownDetail[] {
  return details.map((detail) => {
    // No `lang` key on a detail in the interface's language: an edited list is compared
    // with the details it opened on.
    const { text, lang } = showContent(detail.text, language)
    return lang
      ? { text, level: detail.level, lang }
      : { text, level: detail.level }
  })
}
