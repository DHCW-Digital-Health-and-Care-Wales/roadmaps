import type { DetailLine } from "@/domain/roadmap/item-details"
import { type ContentLanguage, localise } from "@/domain/roadmap/localised-text"
import type { RoadmapItemDetail } from "@/domain/roadmap/roadmap-item"

/** An item's details as text in `language`, each at the level it was read at. */
export function localiseDetails(
  details: readonly RoadmapItemDetail[],
  language: ContentLanguage,
): DetailLine[] {
  return details.map(({ text, level }) => ({
    text: localise(text, language),
    level,
  }))
}
