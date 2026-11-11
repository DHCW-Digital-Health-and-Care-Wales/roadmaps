import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  roadmapRow,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import { useTheme } from "./fixtures/look"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

const [header = []] = EXAMPLE_INDEX_ROWS

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
      await useTheme(page, theme)
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

    test("roadmaps with very light, very dark and no colours (S6)", async ({
      page,
      sheets,
    }) => {
      const row = (sheet: string, colour: string) =>
        roadmapRow({
          Sheet: sheet,
          Enabled: "Yes",
          Title: `Roadmap ${sheet}`,
          Category: "Urgent & Emergency Care",
          Family: "Colours",
          "Status label": "Beta",
          "Last updated": "2026-10-01",
          Colour: colour,
          "Service description": "What it does and who it helps.",
          "Product Lead": "Alex Jones",
        })
      sheets.spreadsheet = withRoadmapIndex([
        header,
        row("light", "#ffffff"),
        row("dark", "#000000"),
        row("none", ""),
      ])
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

    test("session warning, then a failed renewal", async ({ page, gis }) => {
      await page.clock.install()
      await page.goto("./")
      await connect(page)
      await expect(roadmapCards(page)).toHaveCount(3)
      // Two minutes before the session ends: the fake's 3599 s grant less 60 s and 120 s.
      await page.clock.fastForward((3599 - 60 - 120) * 1000)
      const warning = page.getByRole("alertdialog")
      await expect(warning).toBeVisible()
      await expectNoAxeViolations(page, theme)

      gis.respondWith({ type: "popup-blocked" })
      await warning.getByRole("button", { name: "Stay connected" }).click()
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
      await expectNoAxeViolations(page, theme)
    })

    test("connection failure callout", async ({ page, gis }) => {
      gis.respondWith({ type: "access-denied" })
      await page.goto("./")
      await connect(page)
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
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
