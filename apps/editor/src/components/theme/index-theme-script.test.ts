import { describe, expect, it } from "vitest"

import indexHtml from "../../../index.html?raw"

import { applyTheme, THEME_STORAGE_KEY } from "./theme-preference"

/**
 * `index.html` applies the stored theme before first paint, from its own inline script
 * (no bundle has loaded yet), so a Product Lead who chose dark never sees the page flash
 * light. The script cannot import the key or the class the app uses, so it repeats them;
 * a rename on one side fails here, not in a browser nobody watches.
 */
describe("index.html's no-flash theme script", () => {
  const script =
    new DOMParser()
      .parseFromString(indexHtml, "text/html")
      .querySelector("script:not([src])")?.textContent ?? ""

  it("reads the key the app stores the theme under, for dark", () => {
    expect(script).toContain(
      `localStorage.getItem("${THEME_STORAGE_KEY}") === "dark"`,
    )
  })

  it("adds the class the app's dark theme adds", () => {
    const doc = document.implementation.createHTMLDocument()
    applyTheme("dark", doc)

    expect([...doc.documentElement.classList]).toEqual(["dark"])
    expect(script).toContain('document.documentElement.classList.add("dark")')
  })
})
