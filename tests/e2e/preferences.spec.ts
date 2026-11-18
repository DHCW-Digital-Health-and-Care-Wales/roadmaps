import type { Page } from "@playwright/test"

import { chooseFromAccountMenu } from "./fixtures/account-menu"
import { expect, roadmapCards, test } from "./fixtures/test"

test("the theme menu item switches to dark, and the choice persists", async ({
  page,
}) => {
  const html = page.locator("html")
  await page.goto("./")
  await expect(html).not.toHaveClass(/\bdark\b/)

  await chooseFromAccountMenu(page, "Switch to dark theme")

  await expect(html).toHaveClass(/\bdark\b/)
  await page.reload()
  await expect(html).toHaveClass(/\bdark\b/)
  await chooseFromAccountMenu(page, "Switch to light theme")
  await expect(html).not.toHaveClass(/\bdark\b/)
})

async function chooseLanguage(page: Page, current: string, next: string) {
  await page.getByRole("button", { name: current }).click()
  await page.getByRole("menuitemradio", { name: next }).click()
}

async function expectWelsh(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "cy")
  await expect(page).toHaveTitle("Golygydd Mapiau Trywydd IGDC")
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Golygydd Mapiau Trywydd IGDC",
    }),
  ).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Heb gysylltu")
}

test("switching to Cymraeg translates the app, and the choice persists", async ({
  page,
}) => {
  await page.goto("./")
  await chooseLanguage(page, "Language English", "Cymraeg")
  await expectWelsh(page)

  await page.reload()
  await expectWelsh(page)

  await page
    .getByRole("main")
    .getByRole("button", { name: "Cysylltu â Google" })
    .click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Eich mapiau trywydd" }),
  ).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(page.getByText("3 map trywydd")).toBeVisible()

  await chooseLanguage(page, "Iaith Cymraeg", "English")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(
    page.getByRole("heading", { level: 1, name: "Your roadmaps" }),
  ).toBeVisible()
})

test.describe("with a Welsh browser", () => {
  test.use({ locale: "cy-GB" })

  test("the app starts in Cymraeg", async ({ page }) => {
    await page.goto("./")
    await expectWelsh(page)
  })
})
