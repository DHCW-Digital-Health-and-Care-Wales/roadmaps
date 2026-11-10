import type { Page } from "@playwright/test"

import {
  EXAMPLE_INDEX_ROWS,
  roadmapRow,
  withRoadmapIndex,
} from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * The example roadmaps' titles as the page lists them: grouped by family (Medicines &
 * Diagnostics, Single Record), then the roadmap with no family; Product C is not published.
 */
const EXAMPLE_TITLES = [
  "Product B roadmap",
  "Product A roadmap",
  "Product C roadmap",
]

const [HEADER = [], , PRODUCT_B = []] = EXAMPLE_INDEX_ROWS

/** A card, with what it shows besides its link: the list item of the link named `name`. */
function card(page: Page, name: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name }) })
}

test("connecting shows the roadmaps the roadmap index lists, grouped by family (S1)", async ({
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
  await expect(page.getByText("3 roadmaps, 1 not published")).toBeVisible()
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

test("cards sit under their product family, each showing the roadmap's information (S1, S2, S4)", async ({
  page,
}) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Medicines & Diagnostics",
    "Single Record",
    "No product family",
  ])
  const single = main.getByRole("list", { name: "Single Record" })
  await expect(single.getByRole("link")).toHaveCount(1)

  const productA = card(page, "Product A roadmap")
  await expect(productA).toContainText("GP & Community Services")
  await expect(productA).toContainText("Beta")
  await expect(productA).toContainText("Product lead: Alex Jones")
  await expect(productA).toContainText("Updated 1 October 2026")
  await expect(productA).not.toContainText("Not published")

  const productC = card(page, "Product C roadmap")
  await expect(productC).toContainText("Not published")
  await expect(productC).toContainText("Product lead: Sam Evans")
  // Product B has no category and no product lead: nothing is shown in their place.
  await expect(card(page, "Product B roadmap")).not.toContainText(/lead|other/i)
})

test("the cards show Welsh content and copy in Cymraeg (S5)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("roadmaps.language", "cy")
  })
  await page.goto("./")
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cysylltu â Google" })
    .click()

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Meddyginiaethau a Diagnosteg",
    "Single Record",
    "Dim teulu cynnyrch",
  ])
  await expect(main.getByText("3 map trywydd, 1 heb ei gyhoeddi")).toBeVisible()
  const productB = card(page, "Trywydd Cynnyrch B")
  await expect(productB).toContainText("Alffa")
  await expect(productB).toContainText("Diweddarwyd 15 Medi 2026")
  await expect(card(page, "Product A roadmap")).toContainText(
    "Arweinydd cynnyrch: Alex Jones",
  )
  await expect(card(page, "Product C roadmap")).toContainText("Heb ei gyhoeddi")
})

test("a language switch re-sorts the groups and titles (S8)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withRoadmapIndex([
    HEADER,
    roadmapRow({
      Sheet: "one",
      Enabled: "Yes",
      Title: "Zebra",
      Family: "Single Record",
    }),
    roadmapRow({
      Sheet: "two",
      Enabled: "Yes",
      Title: "éclair",
      Family: " single record",
    }),
    roadmapRow({
      Sheet: "three",
      Enabled: "Yes",
      Title: "Product 10 roadmap",
      Family: "Single Récord",
    }),
    roadmapRow({
      Sheet: "four",
      Enabled: "Yes",
      Title: "Alpha",
      "Title (cy)": "Ysgol",
      Family: "Alpha family",
      "Family (cy)": "Teulu Ysgol",
    }),
  ])
  await page.goto("./")
  await connect(page)

  const main = page.getByRole("main")
  // Three spellings are one family; titles sort as people read them.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Alpha family",
    "Single Record",
  ])
  await expect(
    main.getByRole("list", { name: "Single Record" }).getByRole("link"),
  ).toHaveText(["éclair", "Product 10 roadmap", "Zebra"])

  await page.getByRole("button", { name: "Language English" }).click()
  await page.getByRole("menuitemradio", { name: "Cymraeg" }).click()

  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Single Record",
    "Teulu Ysgol",
  ])
})

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test("long free text wraps within its card, with no horizontal scroll (S7)", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = withRoadmapIndex([
      HEADER,
      roadmapRow({
        Sheet: "long",
        Enabled: "No",
        Title: "A roadmap with a very long title that goes on and on and on",
        Family: "A family name that is long enough to need more than one line",
        "Status label":
          "In private beta with selected health boards and partner organisations",
        "Service description": "Words ".repeat(80),
        "Product Lead": "Alexandria Montgomery-Featherstonehaugh and Sam Evans",
      }),
      roadmapRow({
        Sheet: "unbroken",
        Enabled: "Yes",
        Title: "Unbroken",
        "Status label": "Supercalifragilisticexpialidocious".repeat(3),
      }),
    ])
    await page.goto("./")
    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(2)

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const [badge, box] = await Promise.all([
      page.getByText(/^In private beta/).boundingBox(),
      card(page, "A roadmap with a very long title").boundingBox(),
    ])
    expect(badge?.width).toBeLessThanOrEqual(box?.width ?? 0)
  })
})
