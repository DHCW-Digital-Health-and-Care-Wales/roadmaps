import type { Locator, Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  roadmapRow,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

// DHCW's mobile type scale at every width (ADR-010).
const WIDTHS = [1280, 375] as const

/** The computed type of an element, as `size/line-height weight letter-spacing`. */
function typeOf(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return `${style.fontSize}/${style.lineHeight} ${style.fontWeight} ${style.letterSpacing}`
  })
}

/** The fonts Chromium actually rendered an element's text with. */
async function renderedFonts(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("DOM.enable")
  await cdp.send("CSS.enable")
  const { root } = await cdp.send("DOM.getDocument")
  const { nodeId } = await cdp.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  })
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
  await cdp.detach()
  return fonts.map(({ familyName, isCustomFont }) => ({
    familyName,
    isCustomFont,
  }))
}

for (const width of WIDTHS) {
  test(`text uses DHCW's compact scale at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("./")
    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(3)
    const main = page.getByRole("main")

    await expect(main.getByRole("heading", { level: 1 })).toHaveText(
      "Your roadmaps",
    )
    expect(await typeOf(main.getByRole("heading", { level: 1 }))).toBe(
      "32px/38px 700 normal",
    )
    expect(
      await typeOf(main.getByText("Every roadmap, published or not.")),
    ).toBe("16px/24px 400 normal")
    expect(await typeOf(main.getByText("3 roadmaps, 1 not published"))).toBe(
      "14px/20px 400 normal",
    )
    for (const heading of await main.getByRole("heading").all()) {
      expect(
        await heading.evaluate((h) => getComputedStyle(h).letterSpacing),
      ).toBe("normal")
    }
    const family = await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).fontFamily)
    expect(family).toMatch(/^"Roboto Variable", Roboto, Arial, sans-serif$/)
  })
}

test("Welsh ŵ and ŷ render in Roboto, served by the app", async ({
  page,
  sheets,
}) => {
  const title = "Trywydd ŵyn a ŷd"
  sheets.spreadsheet = withRoadmapIndex([
    ...EXAMPLE_INDEX_ROWS,
    roadmapRow({
      Sheet: "ProductD",
      Enabled: "Yes",
      Title: "Product D roadmap",
      "Title (cy)": title,
    }),
  ])
  const fontRequests: string[] = []
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url())
  })
  await page.addInitScript(() => {
    localStorage.setItem("roadmaps.language", "cy")
  })

  await page.goto("./")
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cysylltu â Google" })
    .click()
  await expect(roadmapCards(page).filter({ hasText: title })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const fonts = await renderedFonts(page, `a[title="${title}"]`)
  expect(fonts.length).toBeGreaterThan(0)
  for (const font of fonts) {
    expect(font).toEqual({ familyName: "Roboto", isCustomFont: true })
  }
  // The latin-ext subset carries ŵ (U+0175) and ŷ (U+0177); every font is local.
  expect(fontRequests.some((url) => url.includes("latin-ext"))).toBe(true)
  const origin = new URL(page.url()).origin
  expect(fontRequests.every((url) => new URL(url).origin === origin)).toBe(true)
})
