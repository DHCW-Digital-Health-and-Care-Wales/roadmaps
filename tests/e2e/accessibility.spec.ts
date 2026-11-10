import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { connect, expect, roadmapCards, test } from "./fixtures/test"

/** WCAG 2.2 A and AA rules. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

type Theme = "light" | "dark"

async function expectNoAxeViolations(page: Page, theme: Theme) {
  const html = page.locator("html")
  await (theme === "dark"
    ? expect(html).toHaveClass(/\bdark\b/)
    : expect(html).not.toHaveClass(/\bdark\b/))
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze()
  const summary = violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(({ target }) => target.join(" ")),
  }))
  expect(summary).toEqual([])
}

// Still, so contrast is checked on settled colours rather than mid-animation.
test.use({ reducedMotion: "reduce" })

for (const theme of ["light", "dark"] satisfies Theme[]) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => {
        localStorage.setItem("roadmaps.theme", value)
      }, theme)
    })

    test("landing page", async ({ page }) => {
      await page.goto("./")
      await expect(page.getByRole("status")).toHaveText("Not connected")
      await expectNoAxeViolations(page, theme)
    })

    test("roadmaps", async ({ page }) => {
      await page.goto("./")
      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)
      await expectNoAxeViolations(page, theme)
    })

    test("roadmap detail", async ({ page }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      await expect(
        page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
      ).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("load error", async ({ page, sheets }) => {
      sheets.failWith(403)
      await page.goto("./")
      await connect(page)
      await expect(page.getByRole("alert")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })
  })
}
