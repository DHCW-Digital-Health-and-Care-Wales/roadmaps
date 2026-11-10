import { describe, expect, it } from "vitest"

import css from "./globals.css?raw"
import { readStylesheet } from "./testing/stylesheet"

/**
 * Every stylesheet under `src/`, as text. `vite.config.ts` lists these extensions under
 * `test.css.include`, or Vitest would read each as empty.
 */
const stylesheets = import.meta.glob<string>(
  "/src/**/*.{css,scss,sass,less,styl,stylus,pcss,postcss}",
  { query: "?raw", import: "default", eager: true },
)

const GLOBALS = "/src/styles/globals.css"

describe("stylesheet discipline (ADR-010)", () => {
  it("keeps the whole theme in globals.css, the only stylesheet", () => {
    expect(Object.keys(stylesheets)).toEqual([GLOBALS])
    expect(stylesheets[GLOBALS]).toBe(css)
  })

  it("declares custom properties and @theme nowhere else", () => {
    const others = Object.entries(stylesheets)
      .filter(([path]) => path !== GLOBALS)
      .filter(([, text]) => /--[\w-]+\s*:|@theme\b/.test(text))
      .map(([path]) => path)
    expect(others).toEqual([])
  })

  it("makes every @theme colour a var() of a semantic token", () => {
    const { declarations } = readStylesheet(css)
    const semantic = new Set(
      declarations
        .filter((d) => d.block === ":root" || d.block === ".dark")
        .filter((d) => !/^--(nhsw|app-dark)-/.test(d.name))
        .map((d) => d.name),
    )
    const colours = declarations.filter(
      (d) => d.block.startsWith("@theme") && d.name.startsWith("--color-"),
    )
    expect(colours.length).toBeGreaterThan(40)
    const offTheme = colours
      .filter((d) => {
        const token = /^var\((--[\w-]+)\)$/.exec(d.value)?.[1]
        return token === undefined || !semantic.has(token)
      })
      .map((d) => `${d.name}: ${d.value}`)
    expect(offTheme).toEqual([])
  })
})
