import type { Locator, Page } from "@playwright/test"

/**
 * Presses Tab (or Shift+Tab, backwards) until `target` has focus, as a keyboard user
 * would, failing after `limit` presses, or once focus leaves the page: a target only
 * reached by going round the whole page means focus did not start where the test
 * thinks it did, as when a menu is still closing.
 *
 * Incident: in November 2026 a focus tour pressed Tab while a closing menu held focus,
 * went round the page and passed, until a new tab stop took it one press past the
 * limit. Review by February 2027.
 */
export async function tabTo(
  page: Page,
  target: Locator,
  key = "Tab",
  limit = 20,
) {
  for (let presses = 0; presses < limit; presses += 1) {
    await page.keyboard.press(key)
    const focus = await target.evaluate((element) =>
      element === document.activeElement
        ? "target"
        : document.activeElement === document.body
          ? "left"
          : "elsewhere",
    )
    if (focus === "target") return
    if (focus === "left") {
      throw new Error(
        "Tabbing left the page before reaching the target: start from a control before it",
      )
    }
  }
  throw new Error("Tabbing never reached the target")
}
