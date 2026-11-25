import type { DetailLine } from "@/domain/roadmap/item-details"
import type { ContentLanguage } from "@/domain/roadmap/localised-text"
import type { RoadmapItemDetail } from "@/domain/roadmap/roadmap-item"

import {
  showContent,
  type ShownContent,
  type ShownDetail,
  showWritten,
} from "./shown-content"

/**
 * An item's details as an element in a `language` interface shows them, each at the
 * level it was read at, English shown in place of Welsh marked (`showContent`).
 */
export function localiseDetails(
  details: readonly RoadmapItemDetail[],
  language: ContentLanguage,
): ShownDetail[] {
  return details.map((detail) =>
    shownDetail(showContent(detail.text, language), detail.level),
  )
}

/**
 * English details being edited or reviewed, as an element in a `language` interface
 * shows them, marked in the Welsh one (`showWritten`).
 */
export function showEnglishDetails(
  details: readonly DetailLine[],
  language: ContentLanguage,
): ShownDetail[] {
  return details.map(({ text, level }) =>
    shownDetail(showWritten(text, "en", language), level),
  )
}

/**
 * No `lang` key on a detail in the interface's language: an edited list is compared
 * with the details it opened on.
 */
function shownDetail({ text, lang }: ShownContent, level: number): ShownDetail {
  return lang ? { text, level, lang } : { text, level }
}
