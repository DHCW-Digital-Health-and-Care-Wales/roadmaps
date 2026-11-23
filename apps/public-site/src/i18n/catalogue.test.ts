import { createElement, Fragment, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { supportedLanguages, type Language } from "./languages"
import type { Plural } from "./plural"
import { catalogues } from "./strings"

/**
 * Every argument a catalogue function takes, as empty text, so what it renders is the
 * catalogue's own words; `hidden`, the screen-reader wrapper, returns its text.
 */
const blankArguments = new Proxy(
  {},
  { get: (_, key) => (key === "hidden" ? (text: ReactNode) => text : "") },
)

/** Counts that reach every plural form of both languages. */
const sampleCounts = [0, 1, 2, 3, 6, 7]

const text = (node: ReactNode) =>
  renderToStaticMarkup(createElement(Fragment, null, node))

const isPlural = (value: unknown): value is Plural<Language> =>
  typeof value === "function" && "language" in value

/**
 * Flattens to `[dotted key, text]` pairs: each string, each count's text without its
 * number, and each other function's own words.
 */
function entries(node: object, prefix = ""): [string, string][] {
  return Object.entries(node).flatMap(([key, value]): [string, string][] => {
    const path = `${prefix}${key}`
    if (typeof value === "string") return [[path, value]]
    if (isPlural(value)) {
      return sampleCounts.map((count) => [
        `${path}(${String(count)})`,
        value(count).replace(String(count), ""),
      ])
    }
    if (typeof value === "function") {
      const fill = value as (args: unknown) => ReactNode
      return [[path, text(fill(blankArguments))]]
    }
    return entries(value as object, `${path}.`)
  })
}

describe("catalogues", () => {
  it.each(supportedLanguages)("%s has no empty values", (language) => {
    for (const [key, value] of entries(catalogues[language])) {
      expect(value.trim(), key).not.toBe("")
    }
  })
})
