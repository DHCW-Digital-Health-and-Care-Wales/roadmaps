import type { Page } from "@playwright/test"

export type Theme = "light" | "dark"
export const THEMES = ["light", "dark"] as const satisfies readonly Theme[]

export type Language = "en" | "cy"

/** Starts the page in `theme`, as if the user had chosen it earlier. */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((value) => {
    localStorage.setItem("roadmaps.theme", value)
  }, theme)
}

/** Starts the page opening its forms as dialogs, as if the user had chosen it earlier (STY-083). */
export async function useDialog(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("roadmaps.edit.surface", "dialog")
  })
}

/** Starts the page in `language`, as if the user had chosen it earlier. */
export async function useLanguage(page: Page, language: Language) {
  await page.addInitScript((value) => {
    localStorage.setItem("roadmaps.language", value)
  }, language)
}

/**
 * The colour a semantic token such as `--header` resolves to in the page's current
 * theme, written as the browser computes colours (`rgb(…)`), so it compares with a
 * computed style. Read from the stylesheet's custom property: a style assertion holds
 * the token, never a copy of its value.
 */
export function tokenColour(page: Page, token: `--${string}`): Promise<string> {
  return page.evaluate((name) => {
    const root = document.documentElement
    if (!getComputedStyle(root).getPropertyValue(name).trim()) {
      throw new Error(`${name} is not defined on the page`)
    }
    // A probe resolves `var()` and any colour function to the used value.
    const probe = document.createElement("span")
    probe.style.color = `var(${name})`
    root.append(probe)
    const colour = getComputedStyle(probe).color
    probe.remove()
    return colour
  }, token)
}

/** The raw value of a custom property on the page, e.g. a font stack. */
export function tokenValue(page: Page, token: `--${string}`): Promise<string> {
  return page.evaluate((name) => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    if (!value) throw new Error(`${name} is not defined on the page`)
    return value
  }, token)
}
