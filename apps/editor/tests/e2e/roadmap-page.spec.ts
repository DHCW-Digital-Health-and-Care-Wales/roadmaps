import type { Locator, Page } from "@playwright/test"

import {
  editRoadmapButton,
  editRoadmapDialog,
  openEditRoadmapDialogFromMore,
} from "./fixtures/dialogs"
import { boxOf, scrollsSideways } from "./fixtures/layout"
import { withTabItems } from "./fixtures/fake-sheets"
import { THEMES, tokenColour, useLanguage, useTheme } from "./fixtures/look"
import {
  openProductDetails,
  productDetails,
  productDetailsDisclosure,
  refreshRoadmap,
  roadmapFacts,
} from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

const PRODUCT_DETAILS = "Product details"

const PLACEMENT_HEADINGS = [
  "Recently delivered",
  "Now",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
]

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
    PRODUCT_DETAILS,
    ...PLACEMENT_HEADINGS,
  ])
  await expect(roadmapFacts(page).getByRole("listitem")).toHaveText([
    "Status: Beta",
    "Product lead: Alex Jones",
    "Updated 1 October 2026",
    PRODUCT_DETAILS,
  ])
  const details = await openProductDetails(page)
  await expect(details.getByRole("term")).toHaveText([
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

test("Product details holds “Changed” beside its disclosure while closed, and with “Undo changes” and Edit once open, Undo returning focus to Edit (STY-042 S1, STY-065 S3)", async ({
  page,
}) => {
  await openProductA(page)

  // Once, not per theme: the edit is made in the roadmap dialog (STY-043), opened from
  // More so the details stay closed.
  const dialog = await openEditRoadmapDialogFromMore(page)
  await dialog.getByRole("textbox", { name: "Product lead" }).fill("Sam Evans")
  await dialog.getByRole("button", { name: "Done" }).click()
  const details = productDetails(page)
  await expect(productDetailsDisclosure(page)).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  await expect(details.getByText("Changed", { exact: true })).toBeVisible()
  await expect(
    details.getByRole("button", { name: `Undo changes ${PRODUCT_DETAILS}` }),
  ).toHaveCount(0)
  await expect(editRoadmapButton(page)).toHaveCount(0)

  await openProductDetails(page)
  await expect(details.getByText("Changed", { exact: true })).toBeVisible()
  await details
    .getByRole("button", { name: `Undo changes ${PRODUCT_DETAILS}` })
    .click()
  await expect(details.getByText("Changed", { exact: true })).toBeHidden()
  await expect(editRoadmapButton(page)).toBeFocused()
})

for (const theme of THEMES) {
  test(`Product details open in place under a rule, a press across 44px, in the ${theme} theme (STY-065 S3)`, async ({
    page,
  }) => {
    await useTheme(page, theme)
    await openProductA(page)
    const disclosure = productDetailsDisclosure(page)
    await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    // A line of text, always underlined as a link is.
    const label = disclosure.getByText(PRODUCT_DETAILS)
    await expect(label).toHaveCSS("text-decoration-line", "underline")
    // Pressed across 44px: 20px above and below its middle still toggles it.
    const line = await boxOf(disclosure)
    const middle = line.y + line.height / 2
    const x = line.x + line.width / 2
    for (const y of [middle + 20, middle - 20]) {
      await page.mouse.click(x, y)
      await expect(disclosure).toHaveAttribute("aria-expanded", "true")
      await page.mouse.click(x, y)
      await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    }

    const details = await openProductDetails(page)
    await expect(disclosure).toHaveAttribute("aria-expanded", "true")
    const edit = details.getByRole("button", {
      name: `Edit ${PRODUCT_DETAILS}`,
    })
    // The fields sit in place, behind a rule in the border's colour.
    const fields = details.locator("[data-slot=collapsible-content]")
    await expect(fields).toHaveCSS("border-left-style", "solid")
    await expect(fields).toHaveCSS(
      "border-left-color",
      await tokenColour(page, "--border"),
    )
    // Edit opens the dialog and takes focus back as it closes.
    await edit.click()
    const dialog = editRoadmapDialog(page)
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()
    await expect(edit).toBeFocused()
  })

  test(`a roadmap with no items shows a dashed panel, which holds "Add an item", in the ${theme} theme (STY-042 S2, S4; STY-046 S8)`, async ({
    page,
    sheets,
  }) => {
    await useTheme(page, theme)
    sheets.spreadsheet = withTabItems("ProductA")
    await openProductA(page)
    const main = page.getByRole("main")
    const panel = main.locator("[data-slot=empty]")

    await expect(main.getByRole("heading", { level: 2 })).toHaveText([
      PRODUCT_DETAILS,
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
    // Square, as the Product details above it are (DEF-007 D1).
    await expect(panel).toHaveCSS("border-top-left-radius", "0px")
    await expect(main.getByRole("region", { name: PRODUCT_DETAILS })).toHaveCSS(
      "border-top-left-radius",
      "0px",
    )
    await expect(panel).toHaveCSS(
      "border-top-color",
      await tokenColour(page, "--border"),
    )
    // An item a co-lead adds shows after Refresh, in the panel's place.
    sheets.spreadsheet = withTabItems("ProductA", ["First work", "Now"])
    await refreshRoadmap(page)
    await expect(titlesUnder(page, "Now")).toHaveText(["First work"])
    await expect(
      main.getByRole("heading", { name: "No items yet" }),
    ).toBeHidden()
  })
}

test("an empty roadmap's page in Welsh fits a phone (STY-042 S4)", async ({
  page,
  sheets,
}) => {
  await useLanguage(page, "cy")
  await page.setViewportSize({ width: 375, height: 800 })
  sheets.spreadsheet = withTabItems("ProductA")
  await page.goto("./#/roadmaps/producta")
  await connect(page, "Cysylltu â Google")
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Dim eitemau eto" }),
  ).toBeVisible()
  await openProductDetails(page, "cy")
  expect(await scrollsSideways(page)).toBe(false)
})
