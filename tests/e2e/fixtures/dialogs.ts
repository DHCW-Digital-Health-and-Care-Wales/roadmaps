import type { Locator, Page } from "@playwright/test"

import type { Language } from "./look"
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
 * The roadmap dialog editing what a roadmap is about, in each language: `opener` is
 * the Edit beside "About this roadmap", which opens it.
 */
const EDIT_ROADMAP = {
  en: {
    opener: "Edit About this roadmap",
    title: "Edit this roadmap",
    firstField: "Title",
  },
  cy: {
    opener: "Golygu Ynglŷn â'r map trywydd hwn",
    title: "Golygu'r map trywydd hwn",
    firstField: "Teitl (Saesneg)",
  },
} as const satisfies Record<Language, DialogNames & { opener: string }>

/**
 * The item dialog editing an item, in each language: `opener` is the Edit on the
 * item's card, which its title follows.
 */
const EDIT_ITEM = {
  en: { opener: "Edit", title: "Edit this item", firstField: "Title" },
  cy: {
    opener: "Golygu",
    title: "Golygu'r eitem hon",
    firstField: "Teitl (Saesneg)",
  },
} as const satisfies Record<Language, DialogNames & { opener: string }>

/**
 * The item dialog adding an item, in each language: `opener` is "Add an item", with the
 * page's actions and in an empty roadmap's panel.
 */
const ADD_ITEM = {
  en: {
    opener: "Add an item",
    title: "Add an item",
    firstField: "Title",
    placement: "Horizon or section",
    submit: "Add item",
  },
  cy: {
    opener: "Ychwanegu eitem",
    title: "Ychwanegu eitem",
    firstField: "Teitl (Saesneg)",
    placement: "Gorwel neu adran",
    submit: "Ychwanegu'r eitem",
  },
} as const satisfies Record<
  Language,
  DialogNames & { opener: string; placement: string; submit: string }
>

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
 * from the button beside Refresh. A spec whose spreadsheet has the family and category
 * lists (`EXAMPLE_SPREADSHEET_WITH_LISTS`) passes `offersLists`, and gets the dialog
 * once it offers both.
 */
export async function openAddRoadmapDialog(
  page: Page,
  { offersLists = false } = {},
): Promise<Locator> {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  const dialog = await openDialog(page, addRoadmapButtons(page), ADD_ROADMAP)
  if (offersLists) await expectOffersLists(dialog)
  return dialog
}

/** About's Edit, on a roadmap's page in `language`. */
export function editRoadmapButton(
  page: Page,
  language: Language = "en",
): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: EDIT_ROADMAP[language].opener })
}

/**
 * Opens the roadmap dialog on the roadmap whose page is open, from About's Edit. As
 * `openAddRoadmapDialog`, a spec whose spreadsheet has the family and category lists
 * passes `offersLists`; one on the Welsh interface passes its `language`.
 */
export async function openEditRoadmapDialog(
  page: Page,
  {
    offersLists = false,
    language = "en",
  }: { offersLists?: boolean; language?: Language } = {},
): Promise<Locator> {
  const dialog = await openDialog(
    page,
    editRoadmapButton(page, language),
    EDIT_ROADMAP[language],
  )
  if (offersLists) await expectOffersLists(dialog)
  return dialog
}

/**
 * Waits for the roadmap dialog to offer a family and a category, their lists read: each
 * is a select, held while its list is read.
 */
async function expectOffersLists(dialog: Locator): Promise<void> {
  const selects = dialog.getByRole("combobox")
  await expect(selects).toHaveCount(2)
  for (const select of await selects.all()) await expect(select).toBeEnabled()
}

/** The Edit on the card of the item titled `title`, on a roadmap's page in `language`. */
export function editItemButton(
  page: Page,
  title: string,
  language: Language = "en",
): Locator {
  return page.getByRole("main").getByRole("button", {
    name: `${EDIT_ITEM[language].opener} ${title}`,
    exact: true,
  })
}

/** Opens the item dialog on the item titled `title`, from its card's Edit. */
export function openEditItemDialog(
  page: Page,
  title: string,
  language: Language = "en",
): Promise<Locator> {
  return openDialog(
    page,
    editItemButton(page, title, language),
    EDIT_ITEM[language],
  )
}

/**
 * A roadmap's page's "Add an item" buttons, in `language`: with the page's actions,
 * then an empty roadmap's panel's own.
 */
export function addItemButtons(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: ADD_ITEM[language].opener, exact: true })
}

/**
 * Opens the item dialog to add an item, from "Add an item" with the page's actions, or
 * from `opener`.
 */
export function openAddItemDialog(
  page: Page,
  {
    language = "en",
    opener = addItemButtons(page, language).first(),
  }: { language?: Language; opener?: Locator } = {},
): Promise<Locator> {
  return openDialog(page, opener, ADD_ITEM[language])
}

/**
 * Adds an item titled `title` to the horizon or section headed `placement`, with "Add
 * item", and waits for the dialog to go: the item is then pending, on its card.
 */
export async function addItem(
  page: Page,
  title: string,
  placement: string,
  language: Language = "en",
): Promise<void> {
  const names = ADD_ITEM[language]
  const dialog = await openAddItemDialog(page, { language })
  await dialog.getByRole("textbox", { name: names.firstField }).fill(title)
  await dialog
    .getByRole("combobox", { name: names.placement })
    .selectOption({ label: placement })
  await dialog.getByRole("button", { name: names.submit, exact: true }).click()
  await expect(dialog).toBeHidden()
}
