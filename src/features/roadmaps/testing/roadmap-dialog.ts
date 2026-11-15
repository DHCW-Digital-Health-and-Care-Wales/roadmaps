import type { UserEvent } from "@testing-library/user-event"

import type { Language } from "@/i18n"

import {
  confirmEdit,
  DONE,
  editDialog,
  openEditDialog,
  retype,
} from "./edit-dialog"

/** What the roadmap dialog's editing form is found by, in each language. */
const NAMES = {
  en: {
    edit: "Edit About this roadmap",
    heading: "Edit this roadmap",
    done: DONE.en,
  },
  cy: {
    edit: "Golygu Ynglŷn â'r map trywydd hwn",
    heading: "Golygu'r map trywydd hwn",
    done: DONE.cy,
  },
} as const satisfies Record<Language, object>

/** The roadmap dialog editing what a roadmap is about (test code only), which must be open. */
export function editRoadmapDialog(language: Language = "en") {
  return editDialog(NAMES[language])
}

/** Opens it from "About this roadmap"'s Edit, on a roadmap's page. */
export function openEditRoadmapDialog(
  user: UserEvent,
  language: Language = "en",
) {
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
