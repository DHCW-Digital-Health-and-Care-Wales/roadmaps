import { describe, expect, it } from "vitest"

import { supportedLanguages, type Language } from "./languages"
import { cy } from "./locales/cy"
import { en } from "./locales/en"

const catalogues: Record<Language, object> = { en, cy }
const pluralKey = /^(.+)_(zero|one|two|few|many|other)$/

/** Flattens to `[dotted key, value]` pairs. */
function entries(node: object, prefix = ""): [string, unknown][] {
  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, value]): [string, unknown][] =>
      typeof value === "object" && value !== null
        ? entries(value, `${prefix}${key}.`)
        : [[`${prefix}${key}`, value]],
  )
}

/** Keys with plural suffixes folded to their base, plus each base's categories. */
function shape(catalogue: object) {
  const keys = new Set<string>()
  const plurals = new Map<string, Set<string>>()
  for (const [key] of entries(catalogue)) {
    const match = pluralKey.exec(key)
    const base = match?.[1] ?? key
    keys.add(base)
    if (match?.[2])
      plurals.set(base, (plurals.get(base) ?? new Set()).add(match[2]))
  }
  return { keys, plurals }
}

describe("catalogues", () => {
  const english = shape(en)

  it.each(supportedLanguages)("%s has no empty values", (language) => {
    for (const [key, value] of entries(catalogues[language])) {
      expect(typeof value === "string" && value.trim() !== "", key).toBe(true)
    }
  })

  it.each(supportedLanguages)("%s has the same keys as en", (language) => {
    const { keys } = shape(catalogues[language])
    expect([...keys].sort()).toEqual([...english.keys].sort())
  })

  it.each(supportedLanguages)(
    "%s has every plural form its language uses",
    (language) => {
      const required = new Intl.PluralRules(language).resolvedOptions()
        .pluralCategories
      const { plurals } = shape(catalogues[language])
      expect([...plurals.keys()].sort()).toEqual(
        [...english.plurals.keys()].sort(),
      )
      for (const [base, categories] of plurals) {
        // `zero` is always allowed: i18next uses it for a count of 0 in any language.
        expect(
          [...categories].filter((category) => category !== "zero").sort(),
          base,
        ).toEqual(required.filter((category) => category !== "zero").sort())
      }
    },
  )
})
