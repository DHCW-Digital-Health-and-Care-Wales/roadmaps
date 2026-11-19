import type { Locator, Page } from "@playwright/test"

import type { Language } from "./look"
import { moreButton, openProductDetails } from "./roadmap-page"
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
  firstField: "Product name",
} as const satisfies DialogNames

/**
 * The roadmap dialog editing a roadmap's product details, in each language: `opener` is
 * the Edit at the foot of the open "Product details", `moreItem` the item of More that
 * opens it too (STY-065 S5).
 */
const EDIT_ROADMAP = {
  en: {
    opener: "Edit Product details",
    moreItem: "Edit product details",
    title: "Edit product details",
    firstField: "Product name",
    lastField: "Roadmap last updated",
  },
  cy: {
    opener: "Golygu Manylion y cynnyrch",
    moreItem: "Golygu manylion y cynnyrch",
    title: "Golygu manylion y cynnyrch",
    firstField: "Enw'r cynnyrch (Saesneg)",
    lastField: "Diweddarwyd y map trywydd ddiwethaf",
  },
} as const satisfies Record<
  Language,
  DialogNames & { opener: string; moreItem: string; lastField: string }
>

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
 * The close button in the corner of `dialog` (STY-068). A dialog's footer Close, and the
 * conflict review's, carry its name too, so both are found by their slots.
 */
export function cornerClose(dialog: Locator): Locator {
  return dialog.locator('[data-slot="dialog-close-button"]')
}

/** The conflict review's Close in its foot, which its corner close button repeats. */
export function reviewFooterClose(review: Locator): Locator {
  return review.locator('[data-slot="dialog-close"]')
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

/**
 * The roadmap dialog's names in `language`: its heading, and its first and last fields
 * (STY-065 S9).
 */
export function editRoadmapNames(
  language: Language = "en",
): Pick<(typeof EDIT_ROADMAP)[Language], "title" | "firstField" | "lastField"> {
  return EDIT_ROADMAP[language]
}

/** The Edit at the foot of the open "Product details", on a roadmap's page in `language`. */
export function editRoadmapButton(
  page: Page,
  language: Language = "en",
): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: EDIT_ROADMAP[language].opener })
}

/** The roadmap dialog, open or not, in `language`. */
export function editRoadmapDialog(
  page: Page,
  language: Language = "en",
): Locator {
  return page.getByRole("dialog", { name: EDIT_ROADMAP[language].title })
}

/**
 * Opens the roadmap dialog on the roadmap whose page is open, from Edit at the foot of
 * the open "Product details" (STY-065 S3), which this opens first, back at the top of
 * the page: once the header has stuck, the details are not in it (STY-059). As
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
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await expect(page.locator("[data-stuck]")).toHaveCount(0)
  await openProductDetails(page, language)
  const dialog = await openDialog(
    page,
    editRoadmapButton(page, language),
    EDIT_ROADMAP[language],
  )
  if (offersLists) await expectOffersLists(dialog)
  return dialog
}

/**
 * Opens the roadmap dialog from "Edit product details" in More, the details as they are
 * (STY-065 S5), and returns it once focus is in its first field.
 */
export async function openEditRoadmapDialogFromMore(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  await moreButton(page, language).click()
  return openDialog(
    page,
    page
      .getByRole("menu")
      .getByRole("menuitem", { name: EDIT_ROADMAP[language].moreItem }),
    EDIT_ROADMAP[language],
  )
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

/** The question an item's Remove asks first (STY-049), in each language. */
const REMOVAL = {
  en: { opener: "Remove", confirm: "Remove", notDoing: "Move to Not doing" },
  cy: {
    opener: "Tynnu",
    confirm: "Tynnu",
    notDoing: "Symud i Ddim yn bwrw ymlaen",
  },
} as const satisfies Record<
  Language,
  { opener: string; confirm: string; notDoing: string }
>

/** The removal dialog asking about the item titled `title`, open or not. */
export function removalDialog(
  page: Page,
  title: string,
  language: Language = "en",
): Locator {
  const heading = language === "en" ? "Remove" : "Tynnu"
  return page.getByRole("dialog", { name: `${heading} “${title}”?` })
}

/**
 * Chooses Remove on the item titled `title` and returns the dialog it opens, once
 * focus is on its first button: the dialog is ready then.
 */
export async function askToRemove(
  page: Page,
  title: string,
  language: Language = "en",
): Promise<Locator> {
  await page
    .getByRole("main")
    .getByRole("button", {
      name: `${REMOVAL[language].opener} ${title}`,
      exact: true,
    })
    .click()
  const dialog = removalDialog(page, title, language)
  await expect(dialog.getByRole("button").first()).toBeFocused()
  return dialog
}

/**
 * Removes the item titled `title`, from its card's or row's Remove and the dialog's
 * Remove, and waits for the dialog to go.
 */
export async function confirmRemoval(
  page: Page,
  title: string,
  language: Language = "en",
): Promise<void> {
  const dialog = await askToRemove(page, title, language)
  await dialog
    .getByRole("button", { name: REMOVAL[language].confirm, exact: true })
    .click()
  await expect(dialog).toBeHidden()
}

/**
 * Gives a roadmap one pending change: opens its page and retitles the item `item`, so the
 * roadmap has unpublished changes.
 */
export async function changeItem(
  page: Page,
  roadmapId: string,
  item: string,
): Promise<void> {
  await page.goto(`./#/roadmaps/${roadmapId}`)
  await expect(
    page.getByRole("main").getByRole("heading", { level: 3, name: item }),
  ).toBeVisible()
  const form = await openEditItemDialog(page, item)
  await form.getByRole("textbox", { name: "Title" }).fill(`${item}, edited`)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(form).toBeHidden()
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

/**
 * Publishes a first edit of Product A, "Minimal card" retitled "A minimal card", which
 * gives every item its ID: only an item with an ID can be found again, so only then
 * does a co-lead's change conflict.
 */
export async function publishOnce(page: Page): Promise<void> {
  const main = page.getByRole("main")
  const form = await openEditItemDialog(page, "Minimal card")
  await form.getByRole("textbox", { name: "Title" }).fill("A minimal card")
  await form.getByRole("button", { name: "Done" }).click()
  await main.getByRole("button", { name: "Publish changes" }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish changes" })
    .click()
  await expect(main.getByText(/^Changes published\./)).toBeVisible()
}

/**
 * The dialog an action that needs a session asks in once it has expired (STY-057), in
 * each language: `reconnect` is its button that reconnects.
 */
const RECONNECT = {
  en: { title: "Your session has expired", reconnect: "Reconnect" },
  cy: { title: "Mae eich sesiwn wedi dod i ben", reconnect: "Ailgysylltu" },
} as const satisfies Record<Language, { title: string; reconnect: string }>

/** The reconnect dialog, in `language`. */
export function reconnectDialog(
  page: Page,
  language: Language = "en",
): Locator {
  return page.getByRole("alertdialog", { name: RECONNECT[language].title })
}

/** The reconnect dialog's Reconnect, in `language`. */
export function reconnectButton(
  page: Page,
  language: Language = "en",
): Locator {
  return reconnectDialog(page, language).getByRole("button", {
    name: RECONNECT[language].reconnect,
  })
}
