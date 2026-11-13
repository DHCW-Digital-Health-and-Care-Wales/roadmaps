import type { Page } from "@playwright/test"

import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead sets when a roadmap was last updated (STY-036), against the fake Sheets
 * API: a pending date from the About form, or today's date ticked when publishing, each
 * written to the index's `Last updated` cell as `YYYY-MM-DD` text.
 */

/** The index cell of the row whose `Sheet` is `sheet`, in the column headed `column`. */
function indexCell(
  rows: readonly (readonly string[])[] | undefined,
  sheet: string,
  column: string,
) {
  const [header = [], ...body] = rows ?? []
  return body.find((row) => row[0] === sheet)?.[header.indexOf(column)]
}

async function open(page: Page, id: string, title: string) {
  await page.goto(`./#/roadmaps/${id}`)
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible()
  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible()
}

test("publishes a date picked in the About form as YYYY-MM-DD text (S2, S8)", async ({
  page,
  sheets,
}) => {
  await open(page, "productb", "Product B roadmap")
  const main = page.getByRole("main")
  const about = main.getByRole("region", { name: "About this roadmap" })
  await expect(about).toContainText("Last updated15 September 2026")

  await main.getByRole("button", { name: "Edit About this roadmap" }).click()
  const field = main.getByLabel("Last updated")
  await expect(field).toHaveValue("2026-09-15")
  await field.fill("2026-11-10")
  await main.getByRole("button", { name: "Done" }).click()
  await expect(about).toContainText("Last updated10 November 2026")
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  expect(sheets.writes).toEqual([])

  await main.getByRole("button", { name: "Publish changes" }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("Last updated")
  await expect(
    dialog.getByRole("checkbox", { name: "Mark as updated today" }),
  ).toHaveCount(0)
  await dialog.getByRole("button", { name: "Publish changes" }).click()

  await expect(main.getByText(/^Changes published\./)).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
  const [index] = sheets.spreadsheet
  // Read back as displayed: written as text, it shows as it was written.
  expect(indexCell(index?.rows, "ProductB", "Last updated")).toBe("2026-11-10")
})

test.describe("today, by the browser's clock (D11)", () => {
  test.beforeEach(async ({ page }) => {
    // 2 July in Europe/London, the browser's zone here, though 1 July in UTC.
    await page.clock.setFixedTime(new Date("2026-07-01T23:30:00Z"))
  })

  test("fills today with Today, and refuses a later date (S3, S4)", async ({
    page,
  }) => {
    await open(page, "producta", "Product A roadmap")
    const main = page.getByRole("main")
    await main.getByRole("button", { name: "Edit About this roadmap" }).click()
    const field = main.getByLabel("Last updated")
    await expect(field).toHaveAttribute("max", "2026-07-02")

    await field.fill("2026-07-03")
    await main.getByRole("button", { name: "Done" }).click()
    await expect(field).toHaveAccessibleDescription(
      "Error: Enter today's date or an earlier one",
    )
    await expect(field).toBeFocused()

    await main.getByRole("button", { name: "Today" }).click()
    await expect(field).toHaveValue("2026-07-02")
  })

  test("writes today's date with the changes when ticked (S6)", async ({
    page,
    sheets,
  }) => {
    await open(page, "producta", "Product A roadmap")
    const main = page.getByRole("main")
    await main.getByRole("button", { name: "Edit About this roadmap" }).click()
    await main.getByRole("textbox", { name: "Status" }).fill("Live")
    await main.getByRole("button", { name: "Done" }).click()

    await main.getByRole("button", { name: "Publish changes" }).click()
    const dialog = page.getByRole("alertdialog")
    const box = dialog.getByRole("checkbox", { name: "Mark as updated today" })
    await expect(box).not.toBeChecked()
    await box.click()
    await dialog.getByRole("button", { name: "Publish changes" }).click()

    await expect(main.getByText(/^Changes published\./)).toBeVisible()
    expect(sheets.writes).toHaveLength(1)
    const [index] = sheets.spreadsheet
    expect(indexCell(index?.rows, "ProductA", "Status label")).toBe("Live")
    expect(indexCell(index?.rows, "ProductA", "Last updated")).toBe(
      "2026-07-02",
    )
  })

  test("writes today's date with Enabled when ticked on Publish roadmap (D10)", async ({
    page,
    sheets,
  }) => {
    await open(page, "productc", "Product C roadmap")
    const main = page.getByRole("main")

    await main.getByRole("button", { name: "Publish roadmap" }).click()
    const dialog = page.getByRole("alertdialog")
    await dialog
      .getByRole("checkbox", { name: "Mark as updated today" })
      .click()
    await dialog.getByRole("button", { name: "Publish roadmap" }).click()

    await expect(
      main.getByText(/^Product C roadmap is published\./),
    ).toBeVisible()
    await expect(
      main.getByRole("region", { name: "About this roadmap" }),
    ).toContainText("Last updated2 July 2026")
    expect(sheets.writes).toHaveLength(1)
    const [index] = sheets.spreadsheet
    expect(indexCell(index?.rows, "ProductC", "Enabled")).toBe("Yes")
    expect(indexCell(index?.rows, "ProductC", "Last updated")).toBe(
      "2026-07-02",
    )
  })
})
