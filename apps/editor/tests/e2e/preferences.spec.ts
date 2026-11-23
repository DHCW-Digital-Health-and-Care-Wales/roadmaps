import { expect, test } from "./fixtures/test"

// The theme's and the language's choices, and their persistence across a reload, are held
// by `theme-menu-item.test.tsx` and `language-preference.test.ts`, and the key the
// no-flash script in `index.html` reads by `index-theme-script.test.ts`. What
// stays here is the browser's own language, which only a browser has.

test.describe("with a Welsh browser", () => {
  test.use({ locale: "cy-GB" })

  test("the app starts in Cymraeg", async ({ page }) => {
    await page.goto("./")

    await expect(page.locator("html")).toHaveAttribute("lang", "cy")
    await expect(page).toHaveTitle("Golygydd Mapiau Trywydd IGDC")
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Golygydd Mapiau Trywydd IGDC",
      }),
    ).toBeVisible()
    await expect(page.getByRole("status")).toHaveText("Heb gysylltu")
  })
})
