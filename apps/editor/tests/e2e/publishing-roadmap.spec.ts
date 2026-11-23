import type { Page } from "@playwright/test"

import { goToList } from "./fixtures/roadmap-page"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * A Product Lead publishes a roadmap from its page (STY-035), against the fake Sheets API:
 * one `batchUpdate` writing the roadmap's `Enabled` cell. Unpublishing, a refusal, Save
 * and publish and the no-items note are held by `roadmap-detail-page-publishing-roadmap.test.tsx`
 * and the repository contract; the adapter reading what the public site's sync would
 * reject is held by the Sheets parsers' tests.
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

/** Chooses the page's visible button, then the dialog's button of the same name. */
async function choose(page: Page, action: string) {
  await page.getByRole("main").getByRole("button", { name: action }).click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: action }).click()
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

test("publishes a roadmap by its Enabled cell alone, then a fresh load and the list show it (S2)", async ({
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

  // A reload forgets the session and the cards: what shows next is read from the fake.
  await page.reload()
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product C roadmap" }),
  ).toBeVisible()
  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toHaveCount(0)
  await goToList(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(page.getByText("3 roadmaps", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("main").getByText("Not published", { exact: true }),
  ).toHaveCount(0)
})
