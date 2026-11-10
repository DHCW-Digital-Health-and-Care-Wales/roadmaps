import { EXAMPLE_INDEX_ROWS, withRoadmapIndex } from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/** The example roadmap index's titles, in row order, published or not. */
const EXAMPLE_TITLES = [
  "Product A roadmap",
  "Product B roadmap",
  "Product C roadmap",
]

const [HEADER = [], , PRODUCT_B = []] = EXAMPLE_INDEX_ROWS

test("connecting shows the roadmaps the roadmap index lists, in its order (S1)", async ({
  page,
  gis,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)

  await expect(
    page.getByRole("heading", { level: 1, name: "Your roadmaps" }),
  ).toBeVisible()
  // Every listed roadmap, Product C (not published) too; no card for any tab.
  await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)
  await expect(page.getByText("3 roadmaps")).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Google connected")
  // Connect went with the welcome page; focus moved to the content, not the body.
  await expect(page.getByRole("main")).toBeFocused()
  expect(gis.tokenRequests).toEqual([
    {
      clientId: expect.stringMatching(/\.apps\.googleusercontent\.com$/),
      scope: "https://www.googleapis.com/auth/spreadsheets",
      prompt: undefined,
    },
  ])
  // The tab list, then the first tab's values, both with the granted token.
  expect(sheets.reads).toEqual(["metadata", "values"])
  expect(sheets.tokens).toEqual([gis.latestToken, gis.latestToken])
})

test("a roadmap index with no roadmaps shows the empty state (S5)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withRoadmapIndex([HEADER])
  await page.goto("./")
  await connect(page)

  await expect(
    page.getByRole("heading", { name: "No roadmaps yet" }),
  ).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(0)
})

test("Refresh loads the latest roadmaps", async ({ page, sheets }) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)

  sheets.spreadsheet = withRoadmapIndex([HEADER, PRODUCT_B])
  await page.getByRole("button", { name: "Refresh" }).click()

  await expect(roadmapCards(page)).toHaveText(["Product B roadmap"])
  await expect(page.getByText("1 roadmap", { exact: true })).toBeVisible()
  expect(sheets.reads).toEqual(["metadata", "values", "metadata", "values"])
})

test("a card opens the address of its public page, and Back returns to the list (S2)", async ({
  page,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)
  await roadmapCards(page).filter({ hasText: "Product A roadmap" }).click()

  await expect(page).toHaveURL(/#\/roadmaps\/producta$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()
  await expect(page.getByText("Roadmap details are coming soon.")).toBeVisible()
  await expect(page.getByRole("main")).toBeFocused()

  await page.getByRole("link", { name: "Back to roadmaps" }).click()
  await expect(roadmapCards(page)).toHaveText(EXAMPLE_TITLES)
  await expect(page.getByRole("main")).toBeFocused()
  // The detail page and the list share one cached load.
  expect(sheets.reads).toEqual(["metadata", "values"])
})

test("a deep link survives a reload (S2)", async ({ page, gis }) => {
  await page.goto("./#/roadmaps/producta")
  const main = page.getByRole("main")
  await expect(
    main.getByText("Connect Google to view this roadmap."),
  ).toBeVisible()
  await connect(page)
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()

  await page.reload()

  // The token lived in memory only, so the reloaded page asks to connect again.
  await expect(page).toHaveURL(/#\/roadmaps\/producta$/)
  await expect(
    main.getByText("Connect Google to view this roadmap."),
  ).toBeVisible()
  await connect(page)
  await expect(
    main.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()
  expect(gis.tokenRequests).toHaveLength(2)
})

test("a worksheet id is not a roadmap address (S2)", async ({ page }) => {
  await page.goto("./#/roadmaps/0")
  await connect(page)

  await expect(
    page.getByRole("heading", { level: 1, name: "Roadmap not found" }),
  ).toBeVisible()
})
