import { expect, test, type Page } from "@playwright/test"

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

test("text is the self-hosted variable Roboto, with Welsh ŵ and ŷ", async ({
  page,
}) => {
  const fontRequests: string[] = []
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url())
  })
  await page.goto("cy/")
  // The example data has no ŵ or ŷ (U+0175, U+0177), which only the latin-ext subset
  // carries, so add them to the page.
  await page.evaluate(() => {
    const probe = document.createElement("p")
    probe.id = "welsh-probe"
    probe.textContent = "ŵyn a ŷd"
    document.querySelector("main")?.append(probe)
  })
  await page.evaluate(() => document.fonts.ready)

  for (const selector of ["h1", "#welsh-probe"]) {
    const fonts = await renderedFonts(page, selector)
    expect(fonts.length).toBeGreaterThan(0)
    for (const font of fonts) {
      expect(font).toEqual({ familyName: "Roboto", isCustomFont: true })
    }
  }
  expect(fontRequests.some((url) => url.includes("latin-ext"))).toBe(true)
  const origin = new URL(page.url()).origin
  expect(fontRequests.every((url) => new URL(url).origin === origin)).toBe(true)
})
