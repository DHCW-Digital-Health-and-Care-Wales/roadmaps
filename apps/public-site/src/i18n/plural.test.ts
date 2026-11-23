import { describe, expect, it } from "vitest"

import { supportedLanguages } from "./languages"
import { pluralCategories } from "./plural"
import { catalogues } from "./strings"

describe("plural", () => {
  it.each(supportedLanguages)(
    "asks %s for every plural form its language uses",
    (language) => {
      const { pluralCategories: used } = new Intl.PluralRules(
        language,
      ).resolvedOptions()
      expect([...pluralCategories[language]].sort()).toEqual([...used].sort())
    },
  )

  it.each([
    [0, "0 trywydd", "Dangos 0 eitem gudd"],
    [1, "1 trywydd", "Dangos 1 eitem gudd"],
    [2, "2 drywydd", "Dangos 2 eitem gudd"],
    [3, "3 thrywydd", "Dangos 3 eitem gudd"],
    [6, "6 thrywydd", "Dangos 6 eitem gudd"],
    [7, "7 trywydd", "Dangos 7 eitem gudd"],
  ])("gives the Welsh plural form for %i", (count, roadmaps, hidden) => {
    const { landing, roadmap } = catalogues.cy
    expect(landing.roadmapCount(count)).toBe(roadmaps)
    expect(roadmap.showHiddenItems(count)).toBe(hidden)
  })

  it.each([
    [1, "1 roadmap", "Show 1 hidden item"],
    [2, "2 roadmaps", "Show 2 hidden items"],
  ])("gives the English plural form for %i", (count, roadmaps, hidden) => {
    const { landing, roadmap } = catalogues.en
    expect(landing.roadmapCount(count)).toBe(roadmaps)
    expect(roadmap.showHiddenItems(count)).toBe(hidden)
  })
})
