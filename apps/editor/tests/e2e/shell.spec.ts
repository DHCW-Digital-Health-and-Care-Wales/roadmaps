import { boxOf, scrollsSideways } from "./fixtures/layout"
import { tokenColour, useLanguage } from "./fixtures/look"
import { expect, roadmapCards, test } from "./fixtures/test"

// The DHCW staff-service shell (STY-016): navy header with the logo, footer and the skip
// link. What the phase banner, the home link and the footer say, and the header's order of
// controls, are held by `app-shell.test.tsx`; this holds what a browser alone shows.

const copy = {
  en: {
    logo: "Digital Health and Care Wales",
    home: "Roadmap Editor home",
    shortHome: "Roadmaps home",
    connect: "Connect Google",
    account: "Account",
    copyright: "© Digital Health and Care Wales",
  },
  cy: {
    home: "Golygydd Mapiau Trywydd hafan",
    shortHome: "Mapiau Trywydd hafan",
    connect: "Cysylltu â Google",
  },
} as const

const en = copy.en

test.describe("header and footer", () => {
  test("a navy header shows the DHCW logo, then the language and the account menu (STY-056 S1, S2)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("./")
    const banner = page.getByRole("banner")

    await expect(banner).toHaveCSS(
      "background-color",
      await tokenColour(page, "--header"),
    )
    const logo = banner.getByRole("img", { name: en.logo })
    await expect(logo).toBeVisible()
    // The full logo is wide; the icon is square.
    const box = await boxOf(logo)
    expect(box.width).toBeGreaterThan(box.height * 2)

    // Not sticky: it scrolls away with the page (D4).
    await expect(banner).toHaveCSS("position", "static")

    // The language and the account menu alone: no chip, and no Connect or Disconnect
    // button of its own (the connection is announced only, out of sight).
    await expect(banner.getByRole("button")).toHaveCount(2)
    const status = banner.getByRole("status")
    await expect(status).toBeAttached()
    expect((await boxOf(status)).width).toBeLessThanOrEqual(1)
  })

  test("the narrow header keeps its rules at 375px (S2, D6)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto("./")
    await page
      .getByRole("main")
      .getByRole("button", { name: en.connect })
      .click()
    await expect(roadmapCards(page)).toHaveCount(3)
    const banner = page.getByRole("banner")

    // The icon, the short name and the two 32px buttons; the status is still announced.
    const icon = banner.getByRole("img", { name: en.logo })
    await expect(icon).toBeVisible()
    expect((await boxOf(icon)).width).toBeLessThan(48)
    await expect(banner.getByRole("button", { name: en.account })).toBeVisible()
    await expect(banner.getByRole("button", { name: en.connect })).toHaveCount(
      0,
    )
    await expect(banner.getByRole("status")).not.toBeEmpty()
    await expect(banner.getByRole("status")).toBeAttached()
  })

  // A width each side of each breakpoint where the header changes: 640px (`sm`: the full
  // name and logo replace the short name and icon), 768px (`md`: the language shows its
  // name, and the page its wider gutter) and 1024px (`lg`: the menu button gives way to
  // the navigation beside the page). The home link is named by the name it shows, so
  // finding it by that name at each width also holds DEF-002.
  for (const language of ["en", "cy"] as const) {
    const c = copy[language]
    for (const width of [375, 640, 768, 1024]) {
      test(`the service name shows untruncated and neither page scrolls sideways at ${String(width)}px in ${language} (S1, D6; STY-018 S4)`, async ({
        page,
      }) => {
        await useLanguage(page, language)
        await page.setViewportSize({ width, height: 800 })
        await page.goto("./")
        await expect(
          page.getByRole("main").getByRole("button", { name: c.connect }),
        ).toBeVisible()
        expect(await scrollsSideways(page)).toBe(false)
        await page
          .getByRole("main")
          .getByRole("button", { name: c.connect })
          .click()
        await expect(roadmapCards(page)).toHaveCount(3)

        const name = page
          .getByRole("banner")
          .getByRole("link", {
            name: width < 640 ? c.shortHome : c.home,
            exact: true,
          })
          .locator("span")
          .first()
        const [scrollWidth, clientWidth, lines] = await name.evaluate(
          (element) => [
            element.scrollWidth,
            element.clientWidth,
            // A flex item is one box: count its lines by its line height.
            Math.round(
              element.getBoundingClientRect().height /
                parseFloat(getComputedStyle(element).lineHeight),
            ),
          ],
        )
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
        // Beside the menu button and the two header buttons, in Cymraeg too (S4), it
        // stays on one line: the account menu gave the room back (STY-056).
        expect(lines).toBeLessThanOrEqual(1)
        expect(await scrollsSideways(page)).toBe(false)
      })
    }
  }

  test("the footer names DHCW and the version (S4)", async ({ page }) => {
    await page.goto("./")
    const footer = page.getByRole("contentinfo")

    await expect(footer).toContainText(en.copyright)
    // `dev` for a local build; the package version and short commit on CI.
    await expect(footer).toContainText(
      /Version (dev|\d+\.\d+\.\d+\+[0-9a-f]{7})$/,
    )
  })
})

test("the not-found page does not scroll sideways on a phone (S6)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto("./#/nowhere")

  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible()
  expect(await scrollsSideways(page)).toBe(false)
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
  await expect(skip).toHaveCSS(
    "background-color",
    await tokenColour(page, "--focus"),
  )

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
