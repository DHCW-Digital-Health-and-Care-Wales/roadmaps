import { screen, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"

import type { Language } from "@/i18n"

import {
  confirmEdit,
  DONE,
  editDialog,
  expectDialogClosed,
  openEditDialog,
  retype,
} from "./edit-dialog"

/** What the item dialog's editing form is found by, in each language. */
const NAMES = {
  en: { edit: "Edit", heading: "Edit this item", done: DONE.en },
  cy: { edit: "Golygu", heading: "Golygu'r eitem hon", done: DONE.cy },
} as const satisfies Record<Language, object>

/** The item dialog editing an item (test code only), which must be open. */
export function editItemDialog(language: Language = "en") {
  return editDialog(NAMES[language])
}

/** Opens it from the Edit on the card of the item titled `title`, on a roadmap's page. */
export function openEditItemDialog(
  user: UserEvent,
  title: string,
  language: Language = "en",
) {
  const names = NAMES[language]
  return openEditDialog(user, `${names.edit} ${title}`, names)
}

/**
 * Opens it on the item titled `title`, gives its text field named `field` the text `to`
 * and chooses Done.
 */
export async function editItemText(
  user: UserEvent,
  title: string,
  field: string,
  to: string,
) {
  await retype(user, await openEditItemDialog(user, title), field, to)
  await confirmItemEdit(user)
}

/** Chooses Done in it and waits for it to go, as `confirmEdit` says. */
export function confirmItemEdit(user: UserEvent, language: Language = "en") {
  return confirmEdit(user, NAMES[language])
}

/** What the item dialog's adding form is found by, in each language. */
const ADD_NAMES = {
  en: {
    opener: "Add an item",
    heading: "Add an item",
    title: "Title",
    placement: "Horizon or section",
    add: "Add item",
    another: "Add and start another",
  },
  cy: {
    opener: "Ychwanegu eitem",
    heading: "Ychwanegu eitem",
    title: "Teitl (Saesneg)",
    placement: "Gorwel neu adran",
    add: "Ychwanegu'r eitem",
    another: "Ychwanegu a dechrau un arall",
  },
} as const satisfies Record<Language, object>

/** The page's "Add an item" buttons: with its actions, then an empty roadmap's own. */
export function addItemButtons(language: Language = "en") {
  return within(screen.getByRole("main")).getAllByRole("button", {
    name: ADD_NAMES[language].opener,
  })
}

/** The item dialog adding an item (test code only), which must be open. */
export function addItemDialog(language: Language = "en") {
  return within(
    screen.getByRole("dialog", { name: ADD_NAMES[language].heading }),
  )
}

/** Opens it from the "Add an item" with the page's actions, on a roadmap's page. */
export async function openAddItemDialog(
  user: UserEvent,
  language: Language = "en",
) {
  const [button] = addItemButtons(language)
  if (!button) throw new Error("The page has no Add an item")
  await user.click(button)
  return addItemDialog(language)
}

/**
 * Types `title` into the open adding form, chooses the horizon or section named
 * `placement`, and chooses "Add item", or "Add and start another".
 */
export async function fillAndAddItem(
  user: UserEvent,
  title: string,
  placement: string,
  {
    another = false,
    language = "en",
  }: { another?: boolean; language?: Language } = {},
) {
  const names = ADD_NAMES[language]
  const form = addItemDialog(language)
  await user.type(form.getByRole("textbox", { name: names.title }), title)
  await user.selectOptions(
    form.getByRole("combobox", { name: names.placement }),
    placement,
  )
  await user.click(
    form.getByRole("button", { name: another ? names.another : names.add }),
  )
}

/**
 * Opens the adding form, adds an item titled `title` to the horizon or section named
 * `placement` with "Add item", and waits for the dialog to go.
 */
export async function addItem(
  user: UserEvent,
  title: string,
  placement: string,
  language: Language = "en",
) {
  await openAddItemDialog(user, language)
  await fillAndAddItem(user, title, placement, { language })
  await expectDialogClosed()
}
