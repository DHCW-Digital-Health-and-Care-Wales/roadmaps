import type { Page } from "@playwright/test"

import { roadmapFacts } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead sets when a roadmap was last updated (STY-036). Its page test holds the
 * journeys (a pending date, Today, the refusal of a later date, the tick box beside a
 * publish); this is the one round trip, against the fake Sheets API, of today's date by the
 * browser's clock written to the index's `Last updated` cell as `YYYY-MM-DD` text.
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

test.beforeEach(async ({ page }) => {
  // 2 July in Europe/London, the browser's zone here, though 1 July in UTC.
  await page.clock.setFixedTime(new Date("2026-07-01T23:30:00Z"))
})

test("writes today's date with Enabled when ticked on Publish roadmap (D10)", async ({
  page,
  sheets,
}) => {
  await open(page, "productc", "Product C roadmap")
  const main = page.getByRole("main")

  await main.getByRole("button", { name: "Publish roadmap" }).click()
  const dialog = page.getByRole("alertdialog")
  await dialog.getByRole("checkbox", { name: "Mark as updated today" }).click()
  await dialog.getByRole("button", { name: "Publish roadmap" }).click()

  await expect(
    main.getByText(/^Product C roadmap is published\./),
  ).toBeVisible()
  await expect(roadmapFacts(page)).toContainText("Updated 2 July 2026")
  expect(sheets.writes).toHaveLength(1)
  const [index] = sheets.spreadsheet
  expect(indexCell(index?.rows, "ProductC", "Enabled")).toBe("Yes")
  expect(indexCell(index?.rows, "ProductC", "Last updated")).toBe("2026-07-02")
})
