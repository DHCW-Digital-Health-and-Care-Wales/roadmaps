import type { Page } from "@playwright/test"

import { openEditRoadmapDialog } from "./fixtures/dialogs"
import {
  EXAMPLE_INDEX_ROWS,
  withRoadmapIndex,
  withTabItems,
} from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * A Product Lead publishes or unpublishes a roadmap from its page (STY-035), against the
 * fake Sheets API: one `batchUpdate` writing the roadmap's `Enabled` cell, with any
 * pending edits; refused, writing nothing, when the public site's sync would fail.
 */

/** Product C, not published, with its first item. */
async function openProductC(page: Page) {
  await page.goto("./#/roadmaps/productc")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product C roadmap" }),
  ).toBeVisible()
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()
}

const NO_ITEMS_LINE = "The public site will show it with no items."

/** Chooses the action, then the dialog's button named `confirm`. */
async function choose(page: Page, action: string, confirm = action) {
  await page.getByRole("main").getByRole("button", { name: action }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: confirm }).click()
}

/** The index cell of the row whose `Sheet` is `sheet`, in the column headed `column`. */
function indexCell(
  rows: readonly (readonly string[])[] | undefined,
  sheet: string,
  column: string,
) {
  const [header = [], ...body] = rows ?? []
  return body.find((row) => row[0] === sheet)?.[header.indexOf(column)]
}

test("publishes a roadmap by its Enabled cell alone, then the page and list show it (S2)", async ({
  page,
  sheets,
}) => {
  await openProductC(page)
  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toBeVisible()

  await choose(page, "Publish roadmap")

  await expect(
    page
      .getByRole("main")
      .getByText(
        "Product C roadmap is published. The public site shows it after its next nightly update.",
      ),
  ).toBeVisible()
  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toHaveCount(0)
  expect(sheets.writes).toHaveLength(1)
  const [index] = sheets.spreadsheet
  expect(indexCell(index?.rows, "ProductC", "Enabled")).toBe("Yes")

  await page.getByRole("link", { name: "Back to roadmaps" }).click()
  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(page.getByText("3 roadmaps", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toHaveCount(0)
})

test("refuses to publish a roadmap whose colour the public site rejects, writing nothing (S4)", async ({
  page,
  sheets,
}) => {
  const rows = EXAMPLE_INDEX_ROWS.map((row) => [...row])
  const [header = []] = rows
  const productC = rows.find((row) => row[0] === "ProductC")
  if (productC) productC[header.indexOf("Colour")] = "#9a8"
  sheets.spreadsheet = withRoadmapIndex(rows)
  await openProductC(page)

  await choose(page, "Publish roadmap")

  const alert = page.getByRole("main").getByRole("alert")
  await expect(alert).toContainText("Couldn't publish Product C roadmap")
  await expect(alert).toContainText(
    "Its colour #9a8 has 3 digits. Write it with 6, like #99aa88.",
  )
  expect(sheets.writes).toEqual([])
  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toBeVisible()
})

test("saves and publishes a roadmap's unsaved edits in one write (S5)", async ({
  page,
  sheets,
}) => {
  await openProductC(page)
  const main = page.getByRole("main")
  const editing = await openEditRoadmapDialog(page)
  await editing.getByRole("textbox", { name: "Status" }).fill("Beta")
  await editing.getByRole("button", { name: "Done" }).click()
  await expect(main.getByText("1 change to save")).toBeVisible()

  await main.getByRole("button", { name: "Publish roadmap" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("Your unsaved change goes public with it.")
  await dialog.getByRole("button", { name: "Save and publish" }).click()

  await expect(
    main.getByText(/^Changes saved and Product C roadmap published\./),
  ).toBeVisible()
  await expect(main.getByText("1 change to save")).toHaveCount(0)
  expect(sheets.writes).toHaveLength(1)
  const [index] = sheets.spreadsheet
  expect(indexCell(index?.rows, "ProductC", "Enabled")).toBe("Yes")
  expect(indexCell(index?.rows, "ProductC", "Status label")).toBe("Beta")
})

test("unpublishes a roadmap after asking (S3)", async ({ page, sheets }) => {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product A roadmap" }),
  ).toBeVisible()

  await choose(page, "Unpublish roadmap")

  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toBeVisible()
  const [index] = sheets.spreadsheet
  expect(indexCell(index?.rows, "ProductA", "Enabled")).toBe("No")
})

test("says the public site will show a roadmap with no items, and still publishes it (STY-042 S3)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withTabItems("ProductC")
  await page.goto("./#/roadmaps/productc")
  await connect(page)
  const main = page.getByRole("main")
  await expect(
    main.getByRole("heading", { name: "No items yet" }),
  ).toBeVisible()

  await main.getByRole("button", { name: "Publish roadmap" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText(
    `It shows on the public site after its next nightly update. ${NO_ITEMS_LINE}`,
  )
  await dialog.getByRole("button", { name: "Publish roadmap" }).click()

  await expect(
    main.getByText(/^Product C roadmap is published\./),
  ).toBeVisible()
  const [index] = sheets.spreadsheet
  expect(indexCell(index?.rows, "ProductC", "Enabled")).toBe("Yes")

  // Published, it can only be unpublished, which never says so.
  await main.getByRole("button", { name: "Unpublish roadmap" }).click()
  await expect(dialog).toContainText(
    "It leaves the public site after its next nightly update.",
  )
  await expect(dialog).not.toContainText(NO_ITEMS_LINE)
})

test("says so while no item has a recognised horizon, until a pending move gives one (STY-042 S3)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withTabItems("ProductC", ["Work coming soon", "Soon"])
  await page.goto("./#/roadmaps/productc")
  await connect(page)
  const main = page.getByRole("main")
  await expect(
    main.getByRole("heading", { name: "Not on the public roadmap" }),
  ).toBeVisible()

  await main.getByRole("button", { name: "Publish roadmap" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText(NO_ITEMS_LINE)
  await dialog.getByRole("button", { name: "Cancel" }).click()

  await main.getByRole("button", { name: "Move Work coming soon" }).click()
  await page.getByRole("menuitem", { name: "Next" }).click()
  await main.getByRole("button", { name: "Publish roadmap" }).click()
  await expect(dialog).toContainText("Your unsaved change goes public with it.")
  await expect(dialog).not.toContainText(NO_ITEMS_LINE)
  await dialog.getByRole("button", { name: "Save and publish" }).click()

  await expect(
    main.getByText(/^Changes saved and Product C roadmap published\./),
  ).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
})
