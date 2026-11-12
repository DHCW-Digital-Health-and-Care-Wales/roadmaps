import type { Category } from "../category"
import type { Family } from "../family"
import type { Roadmap } from "../roadmap"

/**
 * The families these roadmaps are linked to, in the order first linked (test code only):
 * each named and coloured as its first roadmap shows it.
 */
export function familiesOf(roadmaps: readonly Roadmap[]): Family[] {
  const families = new Map<string, Family>()
  for (const { familyId, family, colour } of roadmaps) {
    if (familyId === null || families.has(familyId)) continue
    if (family === null || colour === null) {
      throw new Error(
        `A roadmap linked to ${familyId} needs its family's name and colour`,
      )
    }
    families.set(familyId, { id: familyId, name: family, colour })
  }
  return [...families.values()]
}

/** The categories these roadmaps are linked to, in the order first linked (test code only). */
export function categoriesOf(roadmaps: readonly Roadmap[]): Category[] {
  const categories = new Map<string, Category>()
  for (const { categoryId, category } of roadmaps) {
    if (categoryId === null || categories.has(categoryId)) continue
    if (category === null) {
      throw new Error(
        `A roadmap linked to ${categoryId} needs its category's name`,
      )
    }
    categories.set(categoryId, { id: categoryId, name: category })
  }
  return [...categories.values()]
}
