import { describe, expect, it } from "vitest"

import { resolveLanguage, storeLanguagePreference } from "./language-preference"

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
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
    const storage = memoryStorage({ "roadmaps.language": "cy" })
    expect(resolveLanguage({ storage, browserLanguages: ["en-GB"] })).toBe("cy")
  })

  it("ignores an unsupported stored value", () => {
    const storage = memoryStorage({ "roadmaps.language": "fr" })
    expect(resolveLanguage({ storage, browserLanguages: ["cy"] })).toBe("cy")
  })

  it("maps any Welsh browser language to cy", () => {
    expect(
      resolveLanguage({ storage: null, browserLanguages: ["cy-GB"] }),
    ).toBe("cy")
  })

  it("uses the first supported browser language", () => {
    expect(
      resolveLanguage({
        storage: null,
        browserLanguages: ["fr-FR", "CY", "en"],
      }),
    ).toBe("cy")
  })

  it("falls back to English for unsupported browser languages", () => {
    expect(
      resolveLanguage({ storage: null, browserLanguages: ["fr-FR", "de"] }),
    ).toBe("en")
    expect(resolveLanguage({ storage: null, browserLanguages: [] })).toBe("en")
  })

  it("falls back to the browser languages when storage throws", () => {
    expect(
      resolveLanguage({
        storage: throwingStorage,
        browserLanguages: ["cy-GB"],
      }),
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
