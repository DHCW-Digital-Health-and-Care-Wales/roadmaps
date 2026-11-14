import type { Locator, Page } from "@playwright/test"

import { EXAMPLE_SPREADSHEET_WITH_LISTS, type FakeSheets } from "./fake-sheets"
import { connect, expect, roadmapCards } from "./test"

// The form dialogs (EPC-011, _The dialogs_): how a spec opens one and clicks outside
// it. A story that adds a dialog adds its names and its way in here.

/** What a form dialog is found by, in the page's language. */
export interface DialogNames {
  /** Its heading, which names it. */
  title: string
  /** Its first field, where focus goes as it opens. */
  firstField: string
}

/** "Add a roadmap": the buttons that open it carry its heading. */
export const ADD_ROADMAP = {
  title: "Add a roadmap",
  firstField: "Title",
} as const satisfies DialogNames

/**
 * Clicks `opener` and returns the dialog it opens, once focus is in its first field:
 * the dialog is ready then, and not before.
 */
export async function openDialog(
  page: Page,
  opener: Locator,
  { title, firstField }: DialogNames,
): Promise<Locator> {
  await opener.click()
  const dialog = page.getByRole("dialog", { name: title })
  await expect(dialog.getByRole("textbox", { name: firstField })).toBeFocused()
  return dialog
}

/**
 * Clicks the dimmed page above `dialog` and beside it, wherever it sits: a click
 * outside a form dialog does nothing, which the caller then shows.
 */
export async function clickOutside(page: Page, dialog: Locator): Promise<void> {
  const box = await dialog.boundingBox()
  if (!box) throw new Error("The dialog has no box")
  const spots = [
    { x: box.x + box.width / 2, y: box.y / 2 },
    { x: box.x / 2, y: box.y + box.height / 2 },
  ].filter(({ x, y }) => x >= 1 && y >= 1)
  if (spots.length === 0) throw new Error("The dialog covers the page")
  for (const { x, y } of spots) await page.mouse.click(x, y)
}

/** The roadmap list's "Add a roadmap" buttons: beside Refresh, and the empty list's own. */
export function addRoadmapButtons(page: Page): Locator {
  return page.getByRole("main").getByRole("button", { name: ADD_ROADMAP.title })
}

/** The "Add a roadmap" dialog, open or not. */
export function addRoadmapDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: ADD_ROADMAP.title })
}

/**
 * Connects on the roadmap list, waits for its three roadmaps and opens "Add a roadmap"
 * from the button beside Refresh. With `withListsIn`, that fake's spreadsheet first
 * gains the example family and category lists, and the dialog is returned once it
 * offers both; without, the spreadsheet has neither list and the dialog says so.
 */
export async function openAddRoadmapDialog(
  page: Page,
  { withListsIn }: { withListsIn?: FakeSheets } = {},
): Promise<Locator> {
  if (withListsIn) withListsIn.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  const dialog = await openDialog(page, addRoadmapButtons(page), ADD_ROADMAP)
  if (withListsIn) {
    for (const name of ["Family", "Category"]) {
      await expect(dialog.getByRole("combobox", { name })).toBeEnabled()
    }
  }
  return dialog
}
