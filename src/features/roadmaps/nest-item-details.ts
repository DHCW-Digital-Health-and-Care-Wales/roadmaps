import type { DetailLine } from "@/domain/roadmap/item-details"
import { type ContentLanguage, localise } from "@/domain/roadmap/localised-text"
import type { RoadmapItemDetail } from "@/domain/roadmap/roadmap-item"

/** An item's details as text in `language`, each at its level. */
export function localiseDetails(
  details: readonly RoadmapItemDetail[],
  language: ContentLanguage,
): DetailLine[] {
  return details.map(({ text, level }) => ({
    text: localise(text, language),
    level,
  }))
}

/** A detail with the entries nested under it. */
export interface NestedItemDetail<T> {
  detail: T
  children: NestedItemDetail<T>[]
}

/**
 * An item's details as a tree: each entry nests under the previous entry with a lower
 * level, however many levels deeper it is, or sits at the top when there is none.
 */
export function nestItemDetails<T extends { level: number }>(
  details: readonly T[],
): NestedItemDetail<T>[] {
  const top: NestedItemDetail<T>[] = []
  // The open ancestors of the next entry, shallowest first.
  const open: NestedItemDetail<T>[] = []
  for (const detail of details) {
    const node: NestedItemDetail<T> = { detail, children: [] }
    let parent = open.at(-1)
    while (parent && parent.detail.level >= detail.level) {
      open.pop()
      parent = open.at(-1)
    }
    const siblings = parent ? parent.children : top
    siblings.push(node)
    open.push(node)
  }
  return top
}
