import type { Locator, Page } from "@playwright/test"

import { EXAMPLE_SPREADSHEET, type FakeTab } from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

const ABOUT_HEADING = "About this roadmap"

const PLACEMENT_HEADINGS = [
  "Recently delivered",
  "Now",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
]

const [, productA] = EXAMPLE_SPREADSHEET
const PRODUCT_A_ROWS = productA?.rows ?? []

/** The example spreadsheet with Product A's tab holding these rows instead. */
function withProductATab(rows: FakeTab["rows"]): FakeTab[] {
  return EXAMPLE_SPREADSHEET.map((tab) =>
    tab.title === "ProductA" ? { ...tab, rows } : tab,
  )
}

/** Product A's rows with its columns in this header order (names from its header). */
function reorderColumns(order: readonly string[]): string[][] {
  const [header = []] = PRODUCT_A_ROWS
  const indexes = order.map((name) => header.indexOf(name))
  if (indexes.includes(-1) || indexes.length !== header.length) {
    throw new Error("The order must name every column of Product A's tab")
  }
  return PRODUCT_A_ROWS.map((row) => indexes.map((index) => row[index] ?? ""))
}

/** Product A's header, then rows of `Title` and `Horizon` (the rest blank). */
function productARows(...rows: [title: string, horizon: string][]) {
  const [header = []] = PRODUCT_A_ROWS
  return [
    header,
    ...rows.map(([title, horizon]) =>
      header.map((name) =>
        name === "Title" ? title : name === "Horizon" ? horizon : "",
      ),
    ),
  ]
}

/** The item titles in the list under the placement heading `name`. */
function titlesUnder(page: Page, name: string): Locator {
  return page
    .getByRole("main")
    .getByRole("list", { name, exact: true })
    .getByRole("heading", { level: 3 })
}

/** The card of the item with this title. */
function itemCard(page: Page, title: string): Locator {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** Opens Product A from the home page, so the list is read once before its items. */
async function openProductA(page: Page) {
  await page.goto("./")
  await connect(page)
  await roadmapCards(page).filter({ hasText: "Product A roadmap" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()
}

/** What S1 and S2 describe for Product A's example tab. */
async function expectProductA(page: Page) {
  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    ABOUT_HEADING,
    ...PLACEMENT_HEADINGS,
  ])
  const about = main.getByRole("region", { name: ABOUT_HEADING })
  await expect(about.getByRole("term")).toHaveText([
    "Status",
    "Product lead",
    "Vision",
    "Service description",
  ])
  await expect(about.getByRole("definition").first()).toHaveText("Beta")
  await expect(titlesUnder(page, "Now")).toHaveText([
    "Example card with every column",
    "Minimal card",
    "Card awaiting release",
  ])
  await expect(titlesUnder(page, "Next")).toHaveText(["Card being explored"])
  await expect(titlesUnder(page, "Later")).toHaveText([
    "Discovery card",
    "Longer-term idea",
  ])
  await expect(titlesUnder(page, "Recently delivered")).toHaveText([
    "Recently shipped work",
  ])
  await expect(titlesUnder(page, "Delivered this year")).toHaveText([
    "Earlier delivery this year",
  ])
  await expect(titlesUnder(page, "Not doing")).toHaveText([
    "Something we are not doing",
  ])

  const every = itemCard(page, "Example card with every column")
  await expect(every.getByRole("term")).toHaveText([
    "Phase",
    "Description",
    "Expected outcome",
    "Tags",
    "Organisations",
    "Details",
  ])
  await expect(every.getByRole("definition")).toHaveText([
    "Beta",
    "What this work is. Keep it to a sentence or two.",
    "What changes for users when it is done.",
    "Service X, Service Y",
    "Cardiff and Vale, Swansea Bay",
    /^First bullet point/,
  ])
  await expect(
    every.getByRole("definition").last().getByRole("listitem"),
  ).toHaveText([
    /^First bullet point/,
    /^Start a line with "-" to nest it under the line above/,
    "Use two dashes to nest it again",
    "Another top-level bullet point",
  ])
  await expect(itemCard(page, "Minimal card").getByRole("term")).toHaveText([
    "Description",
  ])
}

test("a roadmap's items appear under its six placements, in order (S1, S2)", async ({
  page,
  sheets,
}) => {
  await openProductA(page)

  await expectProductA(page)
  // The title came from the list already read; the items took their own three reads.
  expect(sheets.reads).toEqual([
    "metadata",
    "values:Roadmaps",
    "metadata",
    "values:Roadmaps",
    "values:ProductA",
  ])
})

test("columns in a different order read the same (S10)", async ({
  page,
  sheets,
}) => {
  const [header = []] = PRODUCT_A_ROWS
  const middle = header.filter((name) => name !== "Title" && name !== "Horizon")
  sheets.spreadsheet = withProductATab(
    reorderColumns(["Horizon", ...middle.reverse(), "Title"]),
  )

  await openProductA(page)

  await expectProductA(page)
})

test("items with no recognised horizon are shown first, flagged (S4, S13)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withProductATab(
    productARows(
      ["Placed work", "Now"],
      ["Undecided work", ""],
      ["Work coming soon", "Soon"],
    ),
  )

  await openProductA(page)

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    ABOUT_HEADING,
    "Not on the public roadmap",
    ...PLACEMENT_HEADINGS,
  ])
  await expect(
    main.getByText(
      "These items need a horizon before the public site shows them.",
    ),
  ).toBeVisible()
  await expect(titlesUnder(page, "Not on the public roadmap")).toHaveText([
    "Undecided work",
    "Work coming soon",
  ])
  await expect(itemCard(page, "Undecided work")).toContainText("No horizon")
  await expect(itemCard(page, "Work coming soon")).toContainText(
    "Horizon “Soon” isn't recognised",
  )
  await expect(titlesUnder(page, "Now")).toHaveText(["Placed work"])
})

test("Refresh reads the roadmap and its items again (S14)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withProductATab(
    productARows(["Placed work", "Now"], ["Work coming soon", "Soon"]),
  )
  await openProductA(page)
  await expect(titlesUnder(page, "Not on the public roadmap")).toHaveText([
    "Work coming soon",
  ])

  sheets.spreadsheet = withProductATab(
    productARows(["Placed work", "Now"], ["Work coming soon", "Next"]),
  )
  await page.getByRole("main").getByRole("button", { name: "Refresh" }).click()

  await expect(titlesUnder(page, "Next")).toHaveText(["Work coming soon"])
  await expect(
    page.getByRole("heading", { name: "Not on the public roadmap" }),
  ).toBeHidden()
  // Both the list and the items are read again: 2 + 3 reads before, 2 + 3 after.
  await expect.poll(() => sheets.reads.length).toBe(10)
  expect(sheets.reads.slice(5).toSorted()).toEqual(
    [
      "metadata",
      "metadata",
      "values:ProductA",
      "values:Roadmaps",
      "values:Roadmaps",
    ].toSorted(),
  )
})

test.describe("when the items can't be read (S8)", () => {
  test("a retryable failure stays on this roadmap, with Retry", async ({
    page,
    sheets,
  }) => {
    await page.clock.install()
    await page.goto("./")
    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(3)
    // The items read and both automatic retries fail at their first request.
    sheets.failWith(500, 500, 500)
    await roadmapCards(page).filter({ hasText: "Product A roadmap" }).click()

    const panel = page.getByRole("alert").filter({
      hasText: "Couldn't load this roadmap's items",
    })
    await expect(async () => {
      await page.clock.fastForward(1_000)
      await expect(panel).toBeVisible({ timeout: 100 })
    }).toPass()
    await expect(panel).toContainText("Something went wrong. Please try again.")
    await expect(
      page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
    ).toBeVisible()

    await panel.getByRole("button", { name: "Retry" }).click()

    await expect(titlesUnder(page, "Now")).toHaveCount(3)
    await expect(panel).toBeHidden()
  })

  test("a tab with no title column is about this roadmap's items, not the list", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = withProductATab([
      ["Description", "Horizon"],
      ["Work with no title column", "Now"],
    ])
    await openProductA(page)

    const panel = page.getByRole("alert")
    await expect(panel).toContainText("Couldn't load this roadmap's items")
    await expect(panel).toContainText(
      "This roadmap's items aren't in the expected format in the spreadsheet. Ask the spreadsheet owner to check them.",
    )
    await expect(panel.getByRole("button")).toHaveCount(0)

    await page.getByRole("link", { name: "Back to roadmaps" }).click()
    await expect(roadmapCards(page)).toHaveCount(3)
    await expect(page.getByRole("alert")).toHaveCount(0)
  })
})
