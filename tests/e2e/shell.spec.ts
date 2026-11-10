import type { Page } from "@playwright/test"

import { useLanguage } from "./fixtures/look"
import { expect, roadmapCards, test } from "./fixtures/test"

// The DHCW staff-service shell (STY-016): navy header with the logo, phase banner, footer,
// DHCW's container and the skip link.

const NAVY = "rgb(27, 54, 93)"
const YELLOW = "rgb(255, 235, 59)"

const copy = {
  en: {
    logo: "Digital Health and Care Wales",
    home: "DHCW Roadmap Editor home",
    connect: "Connect Google",
    disconnect: "Disconnect",
    copyright: "© Digital Health and Care Wales",
  },
  cy: {
    logo: "Iechyd a Gofal Digidol Cymru",
    home: "Hafan Golygydd Mapiau Trywydd IGDC",
    connect: "Cysylltu â Google",
    disconnect: "Datgysylltu",
    copyright: "© Iechyd a Gofal Digidol Cymru",
  },
} as const

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )

for (const language of ["en", "cy"] as const) {
  const c = copy[language]

  test.describe(`header and footer in ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await useLanguage(page, language)
    })

    test("a navy header shows the DHCW logo, then the controls in order (S1)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto("./")
      const banner = page.getByRole("banner")

      await expect(banner).toHaveCSS("background-color", NAVY)
      const logo = banner.getByRole("img", { name: c.logo })
      await expect(logo).toBeVisible()
      // The full logo is wide; the icon is square.
      const box = await logo.boundingBox()
      expect(box?.width ?? 0).toBeGreaterThan((box?.height ?? 0) * 2)
      await expect(banner.getByRole("link", { name: c.home })).toBeVisible()

      // Not sticky: it scrolls away with the page (D4).
      await expect(banner).toHaveCSS("position", "static")

      // Left to right: the home link, the status chip, then the three buttons.
      const xs = await Promise.all(
        [
          banner.getByRole("link", { name: c.home }),
          banner.getByRole("status"),
          ...[0, 1, 2].map((index) => banner.getByRole("button").nth(index)),
        ].map(async (locator) => (await locator.boundingBox())?.x ?? NaN),
      )
      expect(xs).toEqual([...xs].sort((a, b) => a - b))
      expect(new Set(xs).size).toBe(5)
    })

    test("the narrow header keeps its rules at 375px (S2, D6)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto("./")
      await page
        .getByRole("main")
        .getByRole("button", { name: c.connect })
        .click()
      await expect(roadmapCards(page)).toHaveCount(3)
      const banner = page.getByRole("banner")

      // The icon, the short name and only Disconnect; the status is still announced.
      const icon = banner.getByRole("img", { name: c.logo })
      await expect(icon).toBeVisible()
      expect((await icon.boundingBox())?.width ?? 0).toBeLessThan(48)
      await expect(
        banner.getByRole("button", { name: c.disconnect }),
      ).toBeVisible()
      await expect(banner.getByRole("button", { name: c.connect })).toBeHidden()
      await expect(banner.getByRole("status")).not.toBeEmpty()
      await expect(banner.getByRole("status")).toBeAttached()
    })

    for (const width of [375, 640, 768, 900, 1024, 1280]) {
      test(`the service name shows untruncated and neither page scrolls sideways at ${String(width)}px (S1, D6; STY-018 S4)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.goto("./")
        await expect(
          page.getByRole("main").getByRole("button", { name: c.connect }),
        ).toBeVisible()
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
        await page
          .getByRole("main")
          .getByRole("button", { name: c.connect })
          .click()
        await expect(roadmapCards(page)).toHaveCount(3)

        const name = page
          .getByRole("banner")
          .getByRole("link", { name: c.home })
          .locator("span")
          .first()
        const [scrollWidth, clientWidth] = await name.evaluate((element) => [
          element.scrollWidth,
          element.clientWidth,
        ])
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
      })
    }

    test("the footer names DHCW and the version (S4)", async ({ page }) => {
      await page.goto("./")
      const footer = page.getByRole("contentinfo")

      await expect(footer).toContainText(c.copyright)
      // `dev` for a local build; the package version and short commit on CI.
      await expect(footer).toContainText(
        language === "en"
          ? /Version (dev|\d+\.\d+\.\d+\+[0-9a-f]{7})$/
          : /Fersiwn (dev|\d+\.\d+\.\d+\+[0-9a-f]{7})$/,
      )
    })
  })
}

test("a phase banner names the phase, with no feedback link when none is set (S3)", async ({
  page,
}) => {
  await page.goto("./")

  const banner = page.getByRole("banner")
  const beta = page.getByText("Beta", { exact: true })
  await expect(beta).toBeVisible()
  await expect(
    page.getByText(
      "This is a new service. Your feedback will help us improve it.",
    ),
  ).toBeVisible()
  // Below the header, above the main content.
  const [headerBox, betaBox, mainBox] = await Promise.all([
    banner.boundingBox(),
    beta.boundingBox(),
    page.getByRole("main").boundingBox(),
  ])
  expect(betaBox?.y ?? 0).toBeGreaterThanOrEqual(
    (headerBox?.y ?? 0) + (headerBox?.height ?? 0),
  )
  expect(betaBox?.y ?? 0).toBeLessThan(mainBox?.y ?? 0)
  // The build has no VITE_FEEDBACK_URL in the committed config.
  await expect(page.getByRole("link", { name: /Give feedback/ })).toHaveCount(0)
})

test.describe("DHCW's container and spacing (S6)", () => {
  for (const [width, left] of [
    [1280, 80],
    [375, 16],
  ] as const) {
    test(`pages are left aligned at ${String(left)}px from the edge at ${String(width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto("./")
      const h1 = page.getByRole("heading", { level: 1 })
      expect((await h1.boundingBox())?.x).toBe(left)

      await page
        .getByRole("main")
        .getByRole("button", { name: "Connect Google" })
        .click()
      await expect(roadmapCards(page)).toHaveCount(3)
      expect((await h1.boundingBox())?.x).toBe(left)

      await roadmapCards(page).first().click()
      await expect(h1).toHaveText("Product B roadmap")
      expect((await h1.boundingBox())?.x).toBe(left)
      const back = page.getByRole("link", { name: "Back to roadmaps" })
      expect((await back.boundingBox())?.x).toBe(left)

      await page.goto("./#/nowhere")
      await expect(h1).toHaveText("Page not found")
      expect((await h1.boundingBox())?.x).toBe(left)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    })
  }

  test("the container stops at 1200px on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 })
    await page.goto("./")

    // (1920 - 1200) / 2 margin, plus 40px of padding.
    expect(
      (await page.getByRole("heading", { level: 1 }).boundingBox())?.x,
    ).toBe(400)
  })
})

test("a DHCW skip link appears on the first Tab and moves focus to the content (S7)", async ({
  page,
}) => {
  await page.goto("./#/nowhere")
  const skip = page.getByRole("link", { name: "Skip to main content" })
  await expect(skip).not.toBeInViewport()

  await page.keyboard.press("Tab")
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await expect(skip).toHaveCSS("background-color", YELLOW)

  await page.keyboard.press("Enter")
  await expect(page.getByRole("main")).toBeFocused()
  expect(new URL(page.url()).hash).toBe("#/nowhere")
})

test("the browser tab shows the DHCW icon (S7)", async ({ page }) => {
  await page.goto("./")

  const href = await page
    .locator('link[rel="icon"]')
    .evaluate((link) => (link as HTMLLinkElement).href)
  const response = await page.request.get(href)
  expect(response.ok()).toBe(true)
  expect(response.headers()["content-type"]).toContain("image/svg+xml")
  const svg = await response.text()
  // The DHCW icon in white on a navy tile: it reads on light and dark browser chrome.
  expect(svg).toContain('fill="#1b365d"')
  expect(svg).toContain('fill="#ffffff"')
})
