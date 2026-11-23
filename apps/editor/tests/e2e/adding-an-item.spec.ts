import type { Locator, Page } from "@playwright/test"

import {
  addItemButtons,
  confirmPublish,
  editItemButton,
  openAddItemDialog,
} from "./fixtures/dialogs"
import { goToList, refreshRoadmap } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead adds an item on a roadmap's page (STY-046), against the fake Sheets
 * API: "Add an item" opens the item dialog, empty; "Add item" keeps the item pending,
 * on a card tagged "New", and nothing is written until the roadmap is published or
 * saved. What the dialog shows and keeps, and the publish dialog's list of new items,
 * are held in `roadmap-detail-page-adding.test.tsx`; this spec holds the round trip of
 * an appended row and what only a browser shows. The journey runs once, at the default
 * size and theme (EPC-011's delivery notes): the accessibility spec and the focus tour
 * open the dialog in both themes.
 */

const CLINIC = "Choose a clinic closer to home"
const CHECK_IN = "Check in from your phone"

async function openRoadmap(
  page: Page,
  roadmap: "producta" | "productc",
  connectName?: string,
) {
  await page.goto(`./#/roadmaps/${roadmap}`)
  await connect(page, connectName)
  // The items are read once a heading follows Product details'.
  await expect(
    page.getByRole("main").getByRole("heading", { level: 2 }).nth(1),
  ).toBeVisible()
}

/** The item titles in the list under a horizon or section heading. */
function titlesUnder(page: Page, heading: string): Locator {
  return page
    .getByRole("main")
    .getByRole("list", { name: heading, exact: true })
    .getByRole("heading", { level: 3 })
}

/** The card of the item with this title. */
function itemCard(page: Page, title: string): Locator {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** The "New" tag on a card, which is named for its item. */
function newTag(card: Locator, title: string, word = "New"): Locator {
  return card.getByText(`${word} ${title}`, { exact: true })
}

/**
 * The lines under "What changes" in the open dialog that asks before a publish: each a
 * name, then what changes of it (STY-047).
 */
function listedChanges(page: Page): Locator {
  return page.getByRole("alertdialog").getByRole("listitem")
}

/** The cells of the rows a publish appended, by the write's last request. */
function appendedRows(write: unknown): string[][] {
  const { requests } = write as {
    requests: {
      appendCells?: {
        rows: { values: { userEnteredValue?: { stringValue?: string } }[] }[]
      }
    }[]
  }
  return requests.flatMap(({ appendCells }) =>
    (appendCells?.rows ?? []).map(({ values }) =>
      values.map(({ userEnteredValue }) => userEnteredValue?.stringValue ?? ""),
    ),
  )
}

test("a Product Lead adds an item in the item dialog, pending until published (S1, S2, S3, S5, S7)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, "producta")
  const main = page.getByRole("main")
  await expect(addItemButtons(page)).toHaveCount(1)

  const dialog = await openAddItemDialog(page)
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  // Empty, with no horizon chosen and Tags, Organisations and Details shut.
  for (const name of ["Title", "Description", "Expected outcome", "Phase"]) {
    await expect(dialog.getByRole("textbox", { name })).toHaveValue("")
  }
  const placement = dialog.getByRole("combobox", { name: "Horizon or section" })
  await expect(placement.locator("option:checked")).toHaveText(
    "Choose a horizon or section",
  )
  for (const name of ["Add tags", "Add organisations", "Add details"]) {
    await expect(dialog.getByRole("button", { name })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  }
  await expect(
    dialog.getByText(
      "It stays unpublished until you choose “Publish changes”.",
    ),
  ).toBeVisible()

  // A blank title and no horizon add nothing, each said at its field.
  const title = dialog.getByRole("textbox", { name: "Title" })
  await dialog.getByRole("button", { name: "Add item", exact: true }).click()
  await expect(title).toHaveAccessibleDescription("Error: Enter a title")
  await expect(placement).toHaveAccessibleDescription(
    "Error: Choose a horizon or section",
  )
  await expect(title).toBeFocused()

  await title.fill(CLINIC)
  await dialog
    .getByRole("textbox", { name: "Expected outcome" })
    .fill("Shorter journeys for patients.")
  await placement.selectOption({ label: "Next" })
  await dialog.getByRole("button", { name: "Add item", exact: true }).click()

  // Pending: last in its horizon, tagged, with Edit, Move and Remove, not written.
  await expect(dialog).toBeHidden()
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
  ])
  const card = itemCard(page, CLINIC)
  await expect(newTag(card, CLINIC)).toBeVisible()
  await expect(card.getByText("Shorter journeys for patients.")).toBeVisible()
  for (const name of ["Move", "Remove"]) {
    await expect(
      card.getByRole("button", { name: `${name} ${CLINIC}`, exact: true }),
    ).toBeVisible()
  }
  await expect(editItemButton(page, CLINIC)).toBeFocused()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  expect(sheets.writes).toEqual([])

  // Refresh keeps it; the roadmap list marks the roadmap.
  await refreshRoadmap(page)
  await expect(newTag(card, CLINIC)).toBeVisible()
  await goToList(page)
  await expect(
    main.getByRole("link", { name: "Product A roadmap" }),
  ).toHaveAccessibleDescription(/Unpublished changes/)
  await main.getByRole("link", { name: "Product A roadmap" }).click()
  await expect(newTag(card, CLINIC)).toBeVisible()

  // Publishing writes it in the one write, as a row after the roadmap's last.
  await main.getByRole("button", { name: "Publish changes" }).click()
  await expect(listedChanges(page)).toHaveText([`${CLINIC}New item`])
  await confirmPublish(page)
  expect(sheets.writes).toHaveLength(1)
  const [row = []] = appendedRows(sheets.writes[0])
  expect(row).toContain(CLINIC)
  expect(row).toContain("Next")
  expect(row).toContain("Shorter journeys for patients.")

  // Its card stays last in its horizon, no longer new.
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CLINIC,
  ])
  await expect(newTag(card, CLINIC)).toHaveCount(0)
  await expect(main.getByText(/unpublished change/)).toHaveCount(0)
})

test("a double click on “Add item” adds one item: the dialog is closing by the second click (S4)", async ({
  page,
}) => {
  await openRoadmap(page, "producta")
  const dialog = await openAddItemDialog(page)

  await dialog.getByRole("textbox", { name: "Title" }).fill(CHECK_IN)
  await dialog
    .getByRole("combobox", { name: "Horizon or section" })
    .selectOption({ label: "Next" })
  await dialog.getByRole("button", { name: "Add item", exact: true }).dblclick()

  await expect(dialog).toBeHidden()
  await expect(editItemButton(page, CHECK_IN)).toBeFocused()
  await expect(titlesUnder(page, "Next")).toHaveText([
    "Card being explored",
    CHECK_IN,
  ])
  await expect(
    page.getByRole("main").getByText("1 unpublished change"),
  ).toBeVisible()
})
