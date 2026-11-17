import type { Locator, Page } from "@playwright/test"

/**
 * Presses Tab (or Shift+Tab, backwards) until `target` has focus, as a keyboard user
 * would, failing after `limit` presses.
 */
export async function tabTo(
  page: Page,
  target: Locator,
  key = "Tab",
  limit = 20,
) {
  for (let presses = 0; presses < limit; presses += 1) {
    await page.keyboard.press(key)
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return
    }
  }
  throw new Error("Tabbing never reached the target")
}
