import type { Locator, Page } from "@playwright/test"

import {
  addItemButtons,
  editRoadmapButton,
  openEditRoadmapDialog,
} from "./fixtures/dialogs"
import {
  EXAMPLE_SPREADSHEET,
  withTabItems,
  withTabRows,
} from "./fixtures/fake-sheets"
import { THEMES, tokenColour, useLanguage, useTheme } from "./fixtures/look"
import {
  aboutDisclosure,
  goToList,
  openAbout,
  refreshRoadmap,
  roadmapFacts,
} from "./fixtures/roadmap-page"
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

/** Product A's rows with its columns in this header order (names from its header). */
function reorderColumns(order: readonly string[]): string[][] {
  const [header = []] = PRODUCT_A_ROWS
  const indexes = order.map((name) => header.indexOf(name))
  if (indexes.includes(-1) || indexes.length !== header.length) {
    throw new Error("The order must name every column of Product A's tab")
  }
  return PRODUCT_A_ROWS.map((row) => indexes.map((index) => row[index] ?? ""))
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
  await expect(roadmapFacts(page).getByRole("listitem")).toHaveText([
    "Status: Beta",
    "Product lead: Alex Jones",
    "Updated 1 October 2026",
  ])
  const about = await openAbout(page)
  await expect(about.getByRole("term")).toHaveText([
    "Vision",
    "Service description",
    "Family",
    "Category",
  ])
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
  sheets.spreadsheet = withTabRows(
    "ProductA",
    reorderColumns(["Horizon", ...middle.reverse(), "Title"]),
  )

  await openProductA(page)

  await expectProductA(page)
})

test("items with no recognised horizon are shown first, flagged (S4, S13)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withTabItems(
    "ProductA",
    ["Placed work", "Now"],
    ["Undecided work", ""],
    ["Work coming soon", "Soon"],
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
  sheets.spreadsheet = withTabItems(
    "ProductA",
    ["Placed work", "Now"],
    ["Work coming soon", "Soon"],
  )
  await openProductA(page)
  await expect(titlesUnder(page, "Not on the public roadmap")).toHaveText([
    "Work coming soon",
  ])

  sheets.spreadsheet = withTabItems(
    "ProductA",
    ["Placed work", "Now"],
    ["Work coming soon", "Next"],
  )
  await refreshRoadmap(page)

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
    sheets.spreadsheet = withTabRows("ProductA", [
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

    await goToList(page)
    await expect(roadmapCards(page)).toHaveCount(3)
    await expect(page.getByRole("alert")).toHaveCount(0)
  })
})

test("About holds “Changed” beside its disclosure, closed or open, and “Undo changes” once open, which returns focus to Edit (STY-042 S1, STY-059 S5)", async ({
  page,
}) => {
  await openProductA(page)

  // Once, not per theme: the edit is made in the roadmap dialog (STY-043).
  const dialog = await openEditRoadmapDialog(page)
  await dialog.getByRole("textbox", { name: "Product lead" }).fill("Sam Evans")
  await dialog.getByRole("button", { name: "Done" }).click()
  const closed = page
    .getByRole("main")
    .getByRole("region", { name: ABOUT_HEADING })
  await expect(closed.getByText("Changed", { exact: true })).toBeVisible()
  await expect(
    closed.getByRole("button", { name: `Undo changes ${ABOUT_HEADING}` }),
  ).toHaveCount(0)
  const about = await openAbout(page)
  await expect(about.getByText("Changed", { exact: true })).toBeVisible()
  await about
    .getByRole("button", { name: `Undo changes ${ABOUT_HEADING}` })
    .click()
  await expect(about.getByText("Changed", { exact: true })).toBeHidden()
  await expect(editRoadmapButton(page)).toBeFocused()
})

for (const theme of THEMES) {
  test(`About opens in place under a rule, with a 40px Edit beside its disclosure, in the ${theme} theme (STY-059 S4)`, async ({
    page,
  }) => {
    await useTheme(page, theme)
    await openProductA(page)
    const disclosure = aboutDisclosure(page)
    await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    // A text control at least 44px tall, underlined on hover.
    expect((await disclosure.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    const label = disclosure.getByText(ABOUT_HEADING)
    await expect(label).toHaveCSS("text-decoration-line", "none")
    await disclosure.hover()
    await expect(label).toHaveCSS("text-decoration-line", "underline")

    const about = await openAbout(page)
    const edit = about.getByRole("button", { name: `Edit ${ABOUT_HEADING}` })
    expect((await edit.boundingBox())?.height).toBe(40)
    // Beside the disclosure, above the first field.
    const opener = await disclosure.boundingBox()
    const button = await edit.boundingBox()
    const firstField = await about.getByRole("term").first().boundingBox()
    if (!opener || !button || !firstField) throw new Error("Not laid out")
    expect(button.x).toBeGreaterThan(opener.x + opener.width)
    expect(button.y + button.height).toBeLessThanOrEqual(firstField.y)
    // The fields sit in place, behind a rule in the border's colour.
    const fields = about.locator("[data-slot=collapsible-content]")
    await expect(fields).toHaveCSS("border-left-style", "solid")
    await expect(fields).toHaveCSS(
      "border-left-color",
      await tokenColour(page, "--border"),
    )
  })

  test(`a roadmap with no items shows a compact dashed panel, which holds "Add an item", in the ${theme} theme (STY-042 S2, S4; STY-046 S8)`, async ({
    page,
    sheets,
  }) => {
    await useTheme(page, theme)
    sheets.spreadsheet = withTabItems("ProductA")
    await openProductA(page)
    const main = page.getByRole("main")
    const panel = main.locator("[data-slot=empty]")

    await expect(main.getByRole("heading", { level: 2 })).toHaveText([
      ABOUT_HEADING,
      "No items yet",
    ])
    await expect(
      panel.getByRole("heading", { name: "No items yet" }),
    ).toBeVisible()
    await expect(
      panel.getByText("Add what the product is doing now, next and later."),
    ).toBeVisible()
    await expect(main.getByText(/spreadsheet/i)).toHaveCount(0)
    await expect(
      panel.getByRole("button", { name: "Add an item" }),
    ).toBeVisible()
    // No picture stands for the absence: the only icon is the button's.
    await expect(panel.locator("img")).toHaveCount(0)
    await expect(panel.locator("svg")).toHaveCount(1)
    await expect(panel).toHaveCSS("border-top-style", "dashed")
    // Square, as the About panel above it is (DEF-007 D1).
    await expect(panel).toHaveCSS("border-top-left-radius", "0px")
    await expect(main.getByRole("region", { name: ABOUT_HEADING })).toHaveCSS(
      "border-top-left-radius",
      "0px",
    )
    await expect(panel).toHaveCSS(
      "border-top-color",
      await tokenColour(page, "--border"),
    )
    // Compact: its heading, one line and the button, well short of a full panel.
    expect((await panel.boundingBox())?.height).toBeLessThan(200)

    // An item a co-lead adds shows after Refresh, in the panel's place.
    sheets.spreadsheet = withTabItems("ProductA", ["First work", "Now"])
    await refreshRoadmap(page)
    await expect(titlesUnder(page, "Now")).toHaveText(["First work"])
    await expect(
      main.getByRole("heading", { name: "No items yet" }),
    ).toBeHidden()
  })
}

test("an empty roadmap's page is in Welsh and fits a phone (STY-042 S4)", async ({
  page,
  sheets,
}) => {
  await useLanguage(page, "cy")
  await page.setViewportSize({ width: 375, height: 800 })
  sheets.spreadsheet = withTabItems("ProductA")
  await page.goto("./#/roadmaps/producta")
  await connect(page, "Cysylltu â Google")
  const main = page.getByRole("main")

  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Ynglŷn â'r map trywydd hwn",
    "Dim eitemau eto",
  ])
  await expect(
    main.getByText(
      "Ychwanegwch yr hyn mae'r cynnyrch yn ei wneud nawr, nesaf ac yn hwyrach.",
    ),
  ).toBeVisible()
  await expect(addItemButtons(page, "cy")).toHaveCount(2)
  await expect(
    main.getByRole("button", { name: "Golygu Ynglŷn â'r map trywydd hwn" }),
  ).toBeVisible()
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})
