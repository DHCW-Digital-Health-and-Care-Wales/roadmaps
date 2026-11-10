import type { Locator, Page } from "@playwright/test"

import { connect, expect, roadmapCards, test } from "./fixtures/test"

// DHCW's yellow focus indicator (ADR-010). Its contrast in both themes is
// held by src/styles/contrast.test.ts; this checks each control actually shows it.
const YELLOW = "rgb(255, 235, 59)"
const DARK = "rgb(33, 43, 50)"

/** Presses Tab (or Shift+Tab, backwards) until `target` has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, key = "Tab") {
  for (let presses = 0; presses < 20; presses += 1) {
    await page.keyboard.press(key)
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return
    }
  }
  throw new Error("Tabbing never reached the target")
}

function focusStyle(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      color: style.color,
      outline: `${style.outlineColor} ${style.outlineStyle} ${style.outlineWidth}`,
      shadow: style.boxShadow,
    }
  })
}

/** Buttons and links: yellow fill, dark text, a dark bottom bar. */
async function expectFill(locator: Locator) {
  await expect(locator).toBeFocused()
  // Polled: buttons transition into the focus style.
  await expect
    .poll(() => focusStyle(locator))
    .toMatchObject({
      background: YELLOW,
      color: DARK,
      shadow: `${DARK} 0px 2px 0px 0px`,
    })
}

/** Text links: yellow fill, dark text, a 4px dark bar under every line. */
async function expectLink(locator: Locator) {
  await expect(locator).toBeFocused()
  await expect
    .poll(() => focusStyle(locator))
    .toMatchObject({
      background: YELLOW,
      color: DARK,
      shadow: `${DARK} 0px 4px 0px 0px`,
    })
}

/** Cards and toasts: a 3px yellow outline outside a 2px dark inner ring. */
async function expectRing(locator: Locator) {
  await expect
    .poll(() => focusStyle(locator))
    .toMatchObject({
      outline: `${YELLOW} solid 3px`,
      shadow: `${DARK} 0px 0px 0px 2px inset`,
    })
}

for (const theme of ["light", "dark"] as const) {
  test(`every control shows DHCW's focus indicator, ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      localStorage.setItem("roadmaps.theme", value)
    }, theme)
    await page.goto("./")
    const banner = page.getByRole("banner")
    const main = page.getByRole("main")
    await expect(
      main.getByRole("button", { name: "Connect Google" }),
    ).toBeEnabled()

    await page.keyboard.press("Tab")
    await expectFill(page.getByRole("link", { name: "Skip to main content" }))
    await tabTo(page, banner.getByRole("link"))
    await expectFill(banner.getByRole("link"))

    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(3)
    await page.mouse.move(0, 0)

    // The "Connected" toast: Alt+T moves focus to the notifications, Tab to the toast.
    const toast = page
      .getByRole("region", { name: /^Notifications/ })
      .getByRole("listitem")
    await expect(toast).toHaveText("Connected to Google")
    await page.keyboard.press("Alt+KeyT")
    await page.keyboard.press("Tab")
    await expect(toast).toBeFocused()
    await expectRing(toast)

    const language = banner.getByRole("button", { name: "Language English" })
    // Connecting moves focus to the main content; the header is behind it.
    await tabTo(page, language, "Shift+Tab")
    await expectFill(language)
    await page.keyboard.press("Enter")
    const welsh = page.getByRole("menuitemradio", { name: "Cymraeg" })
    await page.keyboard.press("ArrowDown")
    await expect(welsh).toBeFocused()
    // Menu items take the fill, as a DHCW link or button does (STY-015 D5).
    await expectFill(welsh)
    await page.keyboard.press("Escape")

    const refresh = main.getByRole("button", { name: "Refresh" })
    await tabTo(page, refresh)
    await expectFill(refresh)

    const card = page.getByRole("link", { name: "Product B roadmap" })
    await expect(roadmapCards(page).first()).toHaveText("Product B roadmap")
    await tabTo(page, card)
    // The stretched title link takes focus; the card around it draws the ring.
    await expectRing(
      page.getByRole("listitem").filter({ has: card }).locator(":scope > div"),
    )

    await page.keyboard.press("Enter")
    const back = main.getByRole("link", { name: "Back to roadmaps" })
    await tabTo(page, back)
    await expectLink(back)
  })
}
