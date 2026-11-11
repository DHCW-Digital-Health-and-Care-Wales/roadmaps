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

/**
 * Keeps the "Connected" notice on screen by hovering it. It clears itself after eight
 * seconds (`CONFIRMATION_DWELL_MS`) unless the pointer is over it or focus is inside, and
 * `page.clock` does not stop that: an installed clock still runs in real time. Call it
 * straight after connecting, before a snapshot or a tour that includes the notice.
 */
export async function holdConnectedNotice(page: Page) {
  await page.getByRole("main").getByRole("note").hover()
}
