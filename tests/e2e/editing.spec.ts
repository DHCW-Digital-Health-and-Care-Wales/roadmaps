import type { Page } from "@playwright/test"

import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * A Product Lead edits a roadmap's English and publishes it, or saves it when the roadmap
 * is not published (STY-025), against the fake Sheets API: one `batchUpdate` per publish.
 */

const ITEM = "Example card with every column"

/** The card of the item with this title, found by its heading. */
function itemCard(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

async function openRoadmap(page: Page, id: string, firstItem: string) {
  await page.goto(`./#/roadmaps/${id}`)
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: firstItem }),
  ).toBeVisible()
}

/** Edits an item's English title through its card's form. */
async function editTitle(page: Page, from: string, to: string) {
  const main = page.getByRole("main")
  await main.getByRole("button", { name: `Edit ${from}` }).click()
  const form = main.getByRole("form", { name: from })
  await form.getByRole("textbox", { name: "Title" }).fill(to)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(itemCard(page, to).getByText("Changed")).toBeVisible()
}

/** Opens the publish (or save) dialog and confirms it. */
async function confirmPublish(page: Page, action: "Publish" | "Save") {
  await page
    .getByRole("main")
    .getByRole("button", { name: `${action} changes` })
    .click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: `${action} changes` }).click()
}

test("publishes a roadmap's changes in one write, then shows the published text (S10)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta", ITEM)
  await editTitle(page, ITEM, "A clearer first card")
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()

  await confirmPublish(page, "Publish")

  await expect(page.getByRole("main").getByRole("status").first()).toHaveText(
    /Changes published\. The public site shows them after its next nightly update\./,
  )
  expect(sheets.writes).toHaveLength(1)
  const productA = sheets.spreadsheet.find(({ title }) => title === "ProductA")
  expect(productA?.rows[1]?.[0]).toBe("A clearer first card")
  await expect(
    itemCard(page, "A clearer first card").getByText("Changed"),
  ).toHaveCount(0)
  await expect(
    page.getByRole("main").getByText(/unpublished change/),
  ).toHaveCount(0)
})

test("saves a roadmap that is not published (S11)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "productc", "Unpublished work")
  await editTitle(page, "Unpublished work", "Work in progress")
  await expect(
    page.getByRole("main").getByText("1 change to save"),
  ).toBeVisible()

  await confirmPublish(page, "Save")

  await expect(page.getByRole("main").getByText("Changes saved")).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
})

test("keeps the changes and says why when a publish fails, writing nothing (S13)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta", ITEM)
  await editTitle(page, ITEM, "A clearer first card")
  sheets.failWith(403)

  await confirmPublish(page, "Publish")

  const alert = page.getByRole("main").getByRole("alert")
  await expect(alert).toContainText("Couldn't publish your changes")
  await expect(alert).toContainText("Your changes are kept in this tab.")
  await expect(alert).toBeFocused()
  expect(sheets.writes).toEqual([])
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()
})

test("Disconnect asks first, and kept changes wait for the next connection (S14)", async ({
  page,
}) => {
  await openRoadmap(page, "producta", ITEM)
  await editTitle(page, ITEM, "A clearer first card")

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Disconnect" })
    .click()
  const question = page.getByRole("alertdialog")
  await expect(question).toContainText("Keep your changes?")
  await question
    .getByRole("button", { name: "Keep changes and disconnect" })
    .click()

  await page
    .getByRole("main")
    .getByRole("link", { name: "Back to roadmaps" })
    .click()
  await expect(
    page.getByRole("main").getByText("Changes to 1 roadmap are waiting"),
  ).toBeVisible()
  await connect(page)
  const card = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: "Product A roadmap" }) })
  await expect(card.getByText("Unpublished changes")).toBeVisible()
  await roadmapCards(page).filter({ hasText: "Product A roadmap" }).click()
  await expect(
    itemCard(page, "A clearer first card").getByText("Changed"),
  ).toBeVisible()
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()
})

test("warns before the tab closes only while changes are pending (S8)", async ({
  page,
}) => {
  await openRoadmap(page, "producta", ITEM)
  const dialogs: string[] = []
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type())
    void dialog.dismiss()
  })

  await editTitle(page, ITEM, "A clearer first card")
  await page.close({ runBeforeUnload: true })
  await expect.poll(() => dialogs).toEqual(["beforeunload"])
  // Staying keeps the page, and its change.
  expect(page.isClosed()).toBe(false)
  await expect(
    itemCard(page, "A clearer first card").getByText("Changed"),
  ).toBeVisible()

  await page
    .getByRole("main")
    .getByRole("button", { name: "Undo changes A clearer first card" })
    .click()
  await expect(
    page.getByRole("main").getByText(/unpublished change/),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole("main").getByRole("button", { name: "Connect Google" }),
  ).toBeVisible()
  expect(dialogs).toEqual(["beforeunload"])
})

test("edits an unplaced item on a phone, every form and dialog fitting the width (S17)", async ({
  page,
  sheets,
}) => {
  const tab = sheets.spreadsheet.find(({ title }) => title === "ProductA")
  const horizon = tab?.rows[0]?.indexOf("Horizon") ?? -1
  sheets.spreadsheet = sheets.spreadsheet.map((sheet) =>
    sheet === tab
      ? {
          ...sheet,
          rows: sheet.rows.map((row, index) =>
            index === 2
              ? row.map((cell, i) => (i === horizon ? "Someday" : cell))
              : row,
          ),
        }
      : sheet,
  )
  await page.setViewportSize({ width: 375, height: 800 })
  await openRoadmap(page, "producta", "Minimal card")
  await expect(
    itemCard(page, "Minimal card").getByText(
      "Horizon “Someday” isn't recognised",
    ),
  ).toBeVisible()
  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )

  await page
    .getByRole("main")
    .getByRole("button", { name: "Edit Minimal card" })
    .click()
  await expect(
    page.getByRole("main").getByRole("form", { name: "Minimal card" }),
  ).toBeVisible()
  expect(await overflow()).toBe(0)
  const form = page
    .getByRole("main")
    .getByRole("form", { name: "Minimal card" })
  await form.getByRole("textbox", { name: "Title" }).fill("A placed card, soon")
  await form.getByRole("button", { name: "Done" }).click()
  await expect(
    itemCard(page, "A placed card, soon").getByText("Changed"),
  ).toBeVisible()

  await page
    .getByRole("main")
    .getByRole("button", { name: "Publish changes" })
    .click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  expect(await overflow()).toBe(0)
})
