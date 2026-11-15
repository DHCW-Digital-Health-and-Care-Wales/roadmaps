import type { UserEvent } from "@testing-library/user-event"

import type { Language } from "@/i18n"

import {
  confirmEdit,
  DONE,
  editDialog,
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
