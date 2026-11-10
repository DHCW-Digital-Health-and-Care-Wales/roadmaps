import { afterEach, describe, expect, it } from "vitest"

import { createI18n, syncDocumentLanguage } from "./create-i18n"

describe("createI18n", () => {
  it("defaults to English and is ready synchronously", () => {
    const i18n = createI18n()
    expect(i18n.isInitialized).toBe(true)
    expect(i18n.resolvedLanguage).toBe("en")
    expect(i18n.t("auth.connect")).toBe("Connect Google")
  })

  it("creates isolated instances", async () => {
    const english = createI18n()
    const welsh = createI18n({ language: "cy" })
    await english.changeLanguage("cy")
    await welsh.changeLanguage("en")
    expect(english.t("auth.connect")).toBe("Cysylltu â Google")
    expect(welsh.t("auth.connect")).toBe("Connect Google")
  })

  it.each([
    [0, "Dim mapiau trywydd"],
    [1, "1 map trywydd"],
    [2, "2 fap trywydd"],
    [3, "3 map trywydd"],
    [6, "6 map trywydd"],
    [10, "10 o fapiau trywydd"],
  ])("renders the Welsh plural form for %i", (count, expected) => {
    expect(createI18n({ language: "cy" }).t("roadmaps.count", { count })).toBe(
      expected,
    )
  })

  it.each([
    [0, "No roadmaps"],
    [1, "1 roadmap"],
    [2, "2 roadmaps"],
    [1000, "1,000 roadmaps"],
  ])("renders the English plural form for %i", (count, expected) => {
    expect(createI18n().t("roadmaps.count", { count })).toBe(expected)
  })
})

describe("syncDocumentLanguage", () => {
  let stop: () => void = () => undefined

  afterEach(() => {
    stop()
    document.documentElement.lang = "en"
    document.title = ""
  })

  it("sets <html lang> and the title now and on every language change", async () => {
    const i18n = createI18n({ language: "cy" })
    stop = syncDocumentLanguage(i18n)
    expect(document.documentElement.lang).toBe("cy")
    expect(document.title).toBe("Golygydd Mapiau Trywydd IGDC")

    await i18n.changeLanguage("en")
    expect(document.documentElement.lang).toBe("en")
    expect(document.title).toBe("DHCW Roadmap Editor")
  })

  it("stops syncing once stopped", async () => {
    const i18n = createI18n()
    syncDocumentLanguage(i18n)()
    await i18n.changeLanguage("cy")
    expect(document.documentElement.lang).toBe("en")
  })
})
