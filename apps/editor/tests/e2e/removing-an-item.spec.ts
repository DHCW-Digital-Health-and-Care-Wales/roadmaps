import type { Page } from "@playwright/test"

import {
  addItem,
  addItemButtons,
  askToRemove,
  clickOutside,
  confirmPublish,
  cornerClose,
  publishOnce,
  confirmRemoval,
} from "./fixtures/dialogs"
import { openConflictReview, refusal } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead removes an item the public site shows (STY-049), against the fake
 * Sheets API, on a desktop: Remove asks first, with "Move to Not doing"
 * first; a confirmed removal stays in place, struck through, with "Undo removal"
 * focused, until the roadmap is published, which deletes its row. A co-lead's change
 * to it stops the publish for review. A new item's Remove asks the same question.
 */

const EXPLORED = "Card being explored"

const DESKTOP = { width: 1280, height: 900 }

async function openProductA(page: Page) {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: "Something we are not doing" }),
  ).toBeVisible()
}

/** The card of the item titled `title`. */
function itemCard(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** The titles of the cards listed under a horizon or section heading. */
function titlesUnder(page: Page, heading: string) {
  return page
    .getByRole("main")
    .getByRole("list", { name: heading, exact: true })
    .getByRole("heading", { level: 3 })
}

/** Rows of Product A's tab, by their titles. */
function storedTitles(sheets: {
  spreadsheet: readonly {
    title: string
    rows: readonly (readonly string[])[]
  }[]
}) {
  const tab = sheets.spreadsheet.find(({ title }) => title === "ProductA")
  return (tab?.rows ?? []).slice(1).map((row) => row[0])
}

test("a published item is removed, pending until published, then its row is deleted (S1, S2, S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openProductA(page)
  const main = page.getByRole("main")

  // Cancel and a click outside change nothing; focus goes back to Remove.
  let dialog = await askToRemove(page, EXPLORED)
  await expect(dialog.getByRole("button")).toHaveText([
    "Move to Not doing",
    "Remove",
    "Cancel",
    "Close",
  ])
  await clickOutside(page, dialog)
  await expect(dialog).toBeVisible()
  await cornerClose(dialog).click()
  await expect(dialog).toBeHidden()
  await expect(
    main.getByRole("button", { name: `Remove ${EXPLORED}` }),
  ).toBeFocused()
  await expect(main.getByText(/unpublished change/)).toHaveCount(0)

  // Remove: the card stays in Next, struck through, with Undo removal focused.
  dialog = await askToRemove(page, EXPLORED)
  await dialog.getByRole("button", { name: "Remove", exact: true }).click()
  await expect(dialog).toBeHidden()
  const card = itemCard(page, EXPLORED)
  await expect(titlesUnder(page, "Next")).toHaveText([EXPLORED])
  await expect(card.getByText("Removed")).toBeVisible()
  await expect(
    card.getByRole("button", { name: `Undo removal ${EXPLORED}` }),
  ).toBeFocused()
  await expect(
    card.getByRole("button", { name: `Edit ${EXPLORED}` }),
  ).toHaveAttribute("aria-disabled", "true")
  // The card's text, not its controls, is struck through.
  await expect(
    card.getByRole("heading", { level: 3, name: EXPLORED }).locator(".."),
  ).toHaveCSS("text-decoration-line", "line-through")
  await expect(
    card.getByRole("button", { name: `Undo removal ${EXPLORED}` }),
  ).toHaveCSS("text-decoration-line", "none")
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  expect(sheets.writes).toEqual([])

  // Publishing lists it as removed, then deletes its row.
  await main.getByRole("button", { name: "Publish changes" }).click()
  const publish = page.getByRole("alertdialog")
  await expect(publish.getByRole("listitem")).toHaveText([`${EXPLORED}Removed`])
  await confirmPublish(page)
  await expect(
    main.getByRole("heading", { level: 3, name: EXPLORED }),
  ).toHaveCount(0)
  await expect(main.getByText(/unpublished change/)).toHaveCount(0)
  expect(storedTitles(sheets)).not.toContain(EXPLORED)
})

test("a co-lead's change to a removed item is reviewed; Remove anyway then deletes it (S6)", async ({
  page,
  sheets,
}) => {
  await openProductA(page)
  const main = page.getByRole("main")
  await publishOnce(page)
  await confirmRemoval(page, EXPLORED)
  sheets.coLead("ProductA", EXPLORED, "Description", "Their reason")

  await main.getByRole("button", { name: "Publish changes" }).click()
  await confirmPublish(page, refusal(page))
  const review = await openConflictReview(page)

  await expect(review).toContainText("Nothing was published.")
  await expect(review.getByRole("definition").first()).toHaveText("Removed")
  await expect(review.getByRole("definition").nth(1)).toHaveText(
    "DescriptionTheir reason",
  )
  await expect(
    review.getByRole("button", { name: `Remove anyway ${EXPLORED}` }),
  ).toBeFocused()
  expect(storedTitles(sheets)).toContain(EXPLORED)

  await review
    .getByRole("button", { name: `Remove anyway ${EXPLORED}` })
    .click()
  await review.getByRole("button", { name: "Publish changes" }).click()
  await expect(review).toBeHidden()
  await confirmPublish(page)
  expect(storedTitles(sheets)).not.toContain(EXPLORED)
})

test("a new item's Remove asks the same question, then drops it at once, focus on “Add an item” (S10)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openProductA(page)
  await addItem(page, "Patient app pilot", "Next")

  const dialog = await askToRemove(page, "Patient app pilot")
  await expect(
    dialog.getByRole("button", { name: "Move to Not doing" }),
  ).toBeFocused()
  await dialog.getByRole("button", { name: "Remove", exact: true }).click()
  await expect(dialog).toBeHidden()

  await expect(titlesUnder(page, "Next")).toHaveText([EXPLORED])
  await expect(addItemButtons(page).first()).toBeFocused()
  await expect(
    page.getByRole("main").getByText(/unpublished change/),
  ).toHaveCount(0)
  expect(sheets.writes).toEqual([])
})
