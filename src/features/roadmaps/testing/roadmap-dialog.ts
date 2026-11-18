import type { UserEvent } from "@testing-library/user-event"

import type { Language } from "@/i18n"

import {
  confirmEdit,
  DONE,
  editDialog,
  openEditDialog,
  retype,
} from "./edit-dialog"
import { openProductDetails } from "./roadmap-page"

/** What the roadmap dialog's editing form is found by, in each language. */
const NAMES = {
  en: {
    edit: "Edit Product details",
    heading: "Edit product details",
    done: DONE.en,
  },
  cy: {
    edit: "Golygu Manylion y cynnyrch",
    heading: "Golygu manylion y cynnyrch",
    done: DONE.cy,
  },
} as const satisfies Record<Language, object>

/** The roadmap dialog editing a roadmap's product details (test code only), which must be open. */
export function editRoadmapDialog(language: Language = "en") {
  return editDialog(NAMES[language])
}

/**
 * Opens it from the Edit that ends "Product details", on a roadmap's page, opening the
 * details first unless they are open.
 */
export async function openEditRoadmapDialog(
  user: UserEvent,
  language: Language = "en",
) {
  await openProductDetails(user)
  return openEditDialog(user, NAMES[language].edit, NAMES[language])
}

/** Opens it, gives its text field named `field` the text `to` and chooses Done. */
export async function editRoadmapText(
  user: UserEvent,
  field: string,
  to: string,
) {
  await retype(user, await openEditRoadmapDialog(user), field, to)
  await confirmRoadmapEdit(user)
}

/** Chooses Done in it and waits for it to go, as `confirmEdit` says. */
export function confirmRoadmapEdit(user: UserEvent, language: Language = "en") {
  return confirmEdit(user, NAMES[language])
}
