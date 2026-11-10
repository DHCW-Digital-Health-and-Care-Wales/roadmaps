import { expect, test } from "./fixtures/test"

test("the landing page introduces the app and offers to connect", async ({
  page,
  sheets,
}) => {
  await page.goto("./")

  await expect(page).toHaveTitle("Product Roadmaps")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(
    page.getByRole("heading", { level: 1, name: "Product Roadmaps" }),
  ).toBeVisible()
  await expect(
    page.getByText("Your roadmaps are currently sourced from Google Sheets."),
  ).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Not connected")
  await expect(
    page.getByRole("main").getByRole("button", { name: "Connect Google" }),
  ).toBeEnabled()
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Connect Google" }),
  ).toBeEnabled()
  expect(sheets.tokens).toEqual([])
})

test("an unknown page offers a way home", async ({ page }) => {
  await page.goto("./#/nowhere")

  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible()
  await page.getByRole("link", { name: "Go to the home page" }).click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product Roadmaps" }),
  ).toBeVisible()
})
