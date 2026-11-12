import type {
  ContentLanguage,
  LocalisedText,
} from "@/domain/roadmap/localised-text"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { nameKey } from "@/lib/text"

/** Roadmaps of one product family, in title order. */
export interface RoadmapGroup {
  /** Unique among the groups of one list. */
  key: string
  /** The family; `null` for the roadmaps with no family. */
  family: LocalisedText | null
  roadmaps: Roadmap[]
}

/** The key of the group for roadmaps with no family; family keys are never empty. */
const NO_FAMILY_KEY = ""

/** A family's key: its English name as names match (ADR-013), never empty. */
const familyKey = (family: LocalisedText) => nameKey(family.en) || "?"

/**
 * Arranges the roadmaps as the main page shows them (ADR-009): grouped by product
 * family, families in name order and roadmaps by title within each, then the roadmaps
 * with no family. Order is as people read `language`: accents fold in, numbers sort by
 * value. A family spelt several ways is one group, named as its first roadmap in `roadmaps`
 * spells it, with that roadmap's Welsh name or else the first one's that has one.
 * Publication does not affect order. Ties keep the order of `roadmaps`.
 */
export function groupRoadmaps(
  roadmaps: readonly Roadmap[],
  language: ContentLanguage,
): RoadmapGroup[] {
  const collator = new Intl.Collator(language, { numeric: true })
  const compare = (a: string, b: string) => collator.compare(a, b)

  const groups = new Map<string, RoadmapGroup>()
  for (const roadmap of roadmaps) {
    const key = roadmap.family ? familyKey(roadmap.family) : NO_FAMILY_KEY
    const group = groups.get(key)
    if (!group) {
      groups.set(key, { key, family: roadmap.family, roadmaps: [roadmap] })
      continue
    }
    group.roadmaps.push(roadmap)
    if (group.family?.cy === "" && roadmap.family) {
      group.family = { en: group.family.en, cy: roadmap.family.cy }
    }
  }

  const familyName = ({ family }: RoadmapGroup) =>
    family ? localise(family, language) : ""
  const noFamily = groups.get(NO_FAMILY_KEY)
  groups.delete(NO_FAMILY_KEY)

  const sorted = [...groups.values()].sort((a, b) =>
    compare(familyName(a), familyName(b)),
  )
  if (noFamily) sorted.push(noFamily)
  for (const group of sorted) {
    group.roadmaps.sort((a, b) =>
      compare(localise(a.title, language), localise(b.title, language)),
    )
  }
  return sorted
}
