import { screen, waitFor, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"
import { expect } from "vitest"

import type { Language } from "@/i18n"

/** What the roadmap dialog's editing form is found by, in each language. */
const NAMES = {
  en: {
    edit: "Edit About this roadmap",
    heading: "Edit this roadmap",
    done: "Done",
  },
  cy: {
    edit: "Golygu Ynglŷn â'r map trywydd hwn",
    heading: "Golygu'r map trywydd hwn",
    done: "Gorffen",
  },
} as const satisfies Record<Language, object>

/**
 * The roadmap dialog editing what a roadmap is about (test code only), which must be
 * open. While it is, the page behind it is out of reach of role queries.
 */
export function editRoadmapDialog(language: Language = "en") {
  return within(screen.getByRole("dialog", { name: NAMES[language].heading }))
}

/** Opens it from "About this roadmap"'s Edit, on a roadmap's page. */
export async function openEditRoadmapDialog(
  user: UserEvent,
  language: Language = "en",
) {
  await user.click(
    within(screen.getByRole("main")).getByRole("button", {
      name: NAMES[language].edit,
    }),
  )
  return editRoadmapDialog(language)
}

/** Opens it, gives its text field named `field` the text `to` and chooses Done. */
export async function editRoadmapText(
  user: UserEvent,
  field: string,
  to: string,
) {
  const form = await openEditRoadmapDialog(user)
  const control = form.getByRole("textbox", { name: field })
  await user.clear(control)
  await user.type(control, to)
  await confirmRoadmapEdit(user)
}

/**
 * Chooses Done in it and waits for it to go, so the page behind can be read again. A
 * test of a Done the form refuses clicks the button itself.
 */
export async function confirmRoadmapEdit(
  user: UserEvent,
  language: Language = "en",
) {
  await user.click(
    editRoadmapDialog(language).getByRole("button", {
      name: NAMES[language].done,
    }),
  )
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
}
