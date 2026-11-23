import { describe, expect, it } from "vitest"
import { createI18n } from "./create-i18n"

describe("createI18n", () => {
  it("is in the language asked for, and ready at once", () => {
    const welsh = createI18n({ language: "cy" })
    expect(welsh.isInitialized).toBe(true)
    expect(welsh.t("site.backToTop")).toBe("Nôl i’r brig")
    expect(createI18n().t("site.backToTop")).toBe("Back to top")
  })

  it.each([
    [0, "0 trywydd", "Dangos 0 eitem gudd"],
    [1, "1 trywydd", "Dangos 1 eitem gudd"],
    [2, "2 drywydd", "Dangos 2 eitem gudd"],
    [3, "3 thrywydd", "Dangos 3 eitem gudd"],
    [6, "6 thrywydd", "Dangos 6 eitem gudd"],
    [7, "7 trywydd", "Dangos 7 eitem gudd"],
  ])("gives the Welsh plural form for %i", (count, roadmaps, hidden) => {
    const { t } = createI18n({ language: "cy" })
    expect(t("landing.roadmapCount", { count })).toBe(roadmaps)
    expect(t("roadmap.showHiddenItems", { count })).toBe(hidden)
  })

  it.each([
    [1, "1 roadmap", "Show 1 hidden item"],
    [2, "2 roadmaps", "Show 2 hidden items"],
  ])("gives the English plural form for %i", (count, roadmaps, hidden) => {
    const { t } = createI18n({ language: "en" })
    expect(t("landing.roadmapCount", { count })).toBe(roadmaps)
    expect(t("roadmap.showHiddenItems", { count })).toBe(hidden)
  })
})
