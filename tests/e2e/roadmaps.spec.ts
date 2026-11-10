import { connect, expect, roadmapCards, test } from "./fixtures/test"

const VISIBLE_TITLES = ["Platform", "Mobile app", "Data & analytics"]

test("connecting shows the visible roadmaps in spreadsheet order", async ({
  page,
  gis,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)

  await expect(
    page.getByRole("heading", { level: 1, name: "Your Roadmaps" }),
  ).toBeVisible()
  // The hidden worksheet is left out; the others keep the spreadsheet's order.
  await expect(roadmapCards(page)).toHaveText(VISIBLE_TITLES)
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
  expect(sheets.tokens).toEqual([gis.latestToken])
})

test("an empty spreadsheet shows the empty state", async ({ page, sheets }) => {
  sheets.respondWith({ worksheets: [] })
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
  await expect(roadmapCards(page)).toHaveText(VISIBLE_TITLES)

  sheets.respondWith({
    worksheets: [{ sheetId: 7, title: "Data & analytics" }],
  })
  await page.getByRole("button", { name: "Refresh" }).click()

  await expect(roadmapCards(page)).toHaveText(["Data & analytics"])
  await expect(page.getByText("1 roadmap", { exact: true })).toBeVisible()
  expect(sheets.tokens).toHaveLength(2)
})

test("a card opens its roadmap, and Back returns to the list", async ({
  page,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)
  await roadmapCards(page).filter({ hasText: "Mobile app" }).click()

  await expect(page).toHaveURL(/#\/roadmaps\/42$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Mobile app" }),
  ).toBeVisible()
  await expect(page.getByText("Roadmap details are coming soon.")).toBeVisible()
  await expect(page.getByRole("main")).toBeFocused()

  await page.getByRole("link", { name: "Back to roadmaps" }).click()
  await expect(roadmapCards(page)).toHaveText(VISIBLE_TITLES)
  await expect(page.getByRole("main")).toBeFocused()
  // The detail page and the list share one cached request.
  expect(sheets.tokens).toHaveLength(1)
})

test("a deep link survives a reload", async ({ page, gis }) => {
  await page.goto("./#/roadmaps/42")
  const main = page.getByRole("main")
  await expect(
    main.getByText("Connect Google to view this roadmap."),
  ).toBeVisible()
  await connect(page)
  await expect(
    main.getByRole("heading", { level: 1, name: "Mobile app" }),
  ).toBeVisible()

  await page.reload()

  // The token lived in memory only, so the reloaded page asks to connect again.
  await expect(page).toHaveURL(/#\/roadmaps\/42$/)
  await expect(
    main.getByText("Connect Google to view this roadmap."),
  ).toBeVisible()
  await connect(page)
  await expect(
    main.getByRole("heading", { level: 1, name: "Mobile app" }),
  ).toBeVisible()
  expect(gis.tokenRequests).toHaveLength(2)
})

test("a hidden or unknown roadmap is not found", async ({ page }) => {
  await page.goto("./#/roadmaps/1834567")
  await connect(page)

  await expect(
    page.getByRole("heading", { level: 1, name: "Roadmap not found" }),
  ).toBeVisible()
})
