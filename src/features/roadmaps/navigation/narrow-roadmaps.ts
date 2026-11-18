import { type ContentLanguage, localise } from "@/domain/roadmap/localised-text"

import type { RoadmapGroup } from "../group-roadmaps"

/** Text as the search compares it: lower case, with no accents. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s/gu, " ")
}

/**
 * Typed text as the search compares it (STY-061 S2): lower case, with no accents, its
 * spaces run together and trimmed. Blank text searches for nothing.
 */
export function searchKey(text: string): string {
  return fold(text).replace(/\s+/gu, " ").trim()
}

/** Where a search falls in a text: `text.slice(start, end)` is the part found. */
export interface FoundPart {
  start: number
  end: number
}

/**
 * Where `key` (a `searchKey`) first falls in `text`, compared without case or accents, so
 * "ffon" finds "Ffôn"; `null` where it does not, or for a blank key.
 */
export function findIn(text: string, key: string): FoundPart | null {
  if (key === "") return null
  let folded = ""
  // Where in `text` each code unit of `folded` comes from, and where that character
  // ends: by code unit, as `indexOf` counts, so an emoji before a match shifts nothing.
  const starts: number[] = []
  const ends: number[] = []
  let index = 0
  for (const character of text) {
    const parts = fold(character)
    const end = index + character.length
    // An accent written apart from its letter folds to nothing: it ends that letter.
    if (parts === "" && ends.length > 0) ends[ends.length - 1] = end
    folded += parts
    starts.push(...Array<number>(parts.length).fill(index))
    ends.push(...Array<number>(parts.length).fill(end))
    index = end
  }
  const at = folded.indexOf(key)
  if (at < 0) return null
  // Indices into `folded` within its length, found above.
  const start = starts[at] ?? 0
  const end = ends[at + key.length - 1] ?? text.length
  return { start, end }
}

/**
 * The groups as a search for `key` narrows them (STY-061 S1–S4): only the roadmaps whose
 * title in `language` holds it, or whose family's name does (D2), in their groups' order,
 * and no group left with none. A roadmap with no family is found by its title alone. A
 * blank key narrows nothing.
 */
export function narrowGroups(
  groups: readonly RoadmapGroup[],
  key: string,
  language: ContentLanguage,
): readonly RoadmapGroup[] {
  if (key === "") return groups
  return groups.flatMap((group) => {
    const familyFound =
      group.family !== null &&
      findIn(localise(group.family, language), key) !== null
    const roadmaps = familyFound
      ? group.roadmaps
      : group.roadmaps.filter(
          (roadmap) => findIn(localise(roadmap.title, language), key) !== null,
        )
    return roadmaps.length > 0 ? [{ ...group, roadmaps }] : []
  })
}
