import { connect, expect, test } from "./fixtures/test"
import { THEMES, tokenColour, tokenValue, useTheme } from "./fixtures/look"

// The DHCW look's anchors, in both themes (STY-018): each computed style is compared
// with the token it should come from, read from the stylesheet, so a component that
// reaches for another colour fails, and a retuned token does not. Token values
// themselves are held by src/styles/tokens.test.ts and contrast.test.ts.

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await useTheme(page, theme)
    })

    test("the start page uses the header, button, page and font tokens", async ({
      page,
    }) => {
      await page.goto("./")
      const html = page.locator("html")
      await (theme === "dark"
        ? expect(html).toHaveClass(/\bdark\b/)
        : expect(html).not.toHaveClass(/\bdark\b/))

      await expect(page.getByRole("banner")).toHaveCSS(
        "background-color",
        await tokenColour(page, "--header"),
      )
      await expect(page.getByRole("banner")).toHaveCSS(
        "color",
        await tokenColour(page, "--header-foreground"),
      )
      const body = page.locator("body")
      await expect(body).toHaveCSS(
        "background-color",
        await tokenColour(page, "--background"),
      )
      await expect(body).toHaveCSS(
        "color",
        await tokenColour(page, "--foreground"),
      )
      await expect(body).toHaveCSS(
        "font-family",
        `"Roboto Variable", ${await tokenValue(page, "--nhsw-font-family-base")}`,
      )

      const primary = page
        .getByRole("main")
        .getByRole("button", { name: "Connect Google" })
      await expect(primary).toHaveCSS(
        "background-color",
        await tokenColour(page, "--primary"),
      )
      await expect(primary).toHaveCSS(
        "color",
        await tokenColour(page, "--primary-foreground"),
      )
    })

    test("a text control uses the link token", async ({ page }) => {
      await page.goto("./#/roadmaps/producta")
      await connect(page)
      // The product details' disclosure, a text button (STY-065 S3).
      const disclosure = page
        .getByRole("main")
        .getByRole("button", { name: "Product details", exact: true })
      await expect(disclosure).toBeVisible()

      await expect(disclosure).toHaveCSS(
        "color",
        await tokenColour(page, "--link"),
      )
    })
  })
}
