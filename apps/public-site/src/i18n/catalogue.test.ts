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

const text = (node: ReactNode) =>
  renderToStaticMarkup(createElement(Fragment, null, node))

const isPlural = (value: unknown): value is Plural =>
  typeof value === "function" && "forms" in value

/** Flattens to `[dotted key, text]` pairs: each plural form, and each function's text. */
function entries(node: object, prefix = ""): [string, string][] {
  return Object.entries(node).flatMap(([key, value]): [string, string][] => {
    const path = `${prefix}${key}`
    if (typeof value === "string") return [[path, value]]
    if (isPlural(value)) {
      return Object.entries(value.forms).map(([category, form]) => [
        `${path}.${category}`,
        form(1).replace("1", ""),
      ])
    }
    if (typeof value === "function") {
      const fill = value as (args: unknown) => ReactNode
      return [[path, text(fill(blankArguments))]]
    }
    return entries(value as object, `${path}.`)
  })
}

/** The keys, with a plural's forms folded into it. */
const keys = (language: Language) =>
  entries(catalogues[language])
    .map(([key]) => key.replace(/\.(zero|one|two|few|many|other)$/, ""))
    .filter((key, index, all) => all.indexOf(key) === index)
    .sort()

describe("catalogues", () => {
  it.each(supportedLanguages)("%s has no empty values", (language) => {
    for (const [key, value] of entries(catalogues[language])) {
      expect(value.trim(), key).not.toBe("")
    }
  })

  it.each(supportedLanguages)("%s has the same keys as en", (language) => {
    expect(keys(language)).toEqual(keys("en"))
  })
})
