import { describe, expect, it } from "vitest"
import { resolveLanguage, storeLanguagePreference } from "./language-preference"

const key = "dhcw-product-roadmaps-lang"

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (name: string) => data.get(name) ?? null,
    setItem: (name: string, value: string) => {
      data.set(name, value)
    },
  }
}

const throwingStorage = {
  getItem: (): string | null => {
    throw new DOMException("Blocked", "SecurityError")
  },
  setItem: () => {
    throw new DOMException("Full", "QuotaExceededError")
  },
}

describe("resolveLanguage", () => {
  it("prefers a stored choice over the browser languages", () => {
    const storage = memoryStorage({ [key]: "en" })
    expect(resolveLanguage({ storage, browserLanguages: ["cy-GB"] })).toBe("en")
  })

  it("ignores an unsupported stored value", () => {
    const storage = memoryStorage({ [key]: "fr" })
    expect(resolveLanguage({ storage, browserLanguages: ["cy"] })).toBe("cy")
  })

  it.each([
    [["cy"]],
    [["cy-GB"]],
    [["CY"]],
    // Any Welsh language counts, not only the first.
    [["en-GB", "cy"]],
  ])("starts in Welsh for %o", (browserLanguages) => {
    expect(resolveLanguage({ storage: null, browserLanguages })).toBe("cy")
  })

  it.each([[["en-GB"]], [["fr-FR", "de"]], [["cym"]], [[]]])(
    "starts in English for %o",
    (browserLanguages) => {
      expect(resolveLanguage({ storage: null, browserLanguages })).toBe("en")
    },
  )

  it("falls back to the browser languages when storage throws", () => {
    expect(
      resolveLanguage({ storage: throwingStorage, browserLanguages: ["cy"] }),
    ).toBe("cy")
  })
})

describe("storeLanguagePreference", () => {
  it("stores a choice that resolveLanguage then prefers", () => {
    const storage = memoryStorage()
    storeLanguagePreference("cy", storage)
    expect(resolveLanguage({ storage, browserLanguages: ["en"] })).toBe("cy")
  })

  it("ignores storage failures", () => {
    expect(() => {
      storeLanguagePreference("cy", throwingStorage)
    }).not.toThrow()
  })
})
