import { screen, waitFor, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"
import { expect } from "vitest"

import type { Language } from "@/i18n"

/** What a dialog's editing form is found by, in one language. */
export interface EditDialogNames {
  /** Its heading, which names it. */
  heading: string
  done: string
}

/** The names every editing dialog shares, in each language. */
export const DONE = {
  en: "Done",
  cy: "Gorffen",
} as const satisfies Record<Language, string>

/**
 * The dialog headed `heading` (test code only), which must be open. While it is, the
 * page behind it is out of reach of role queries.
 */
export function editDialog({ heading }: EditDialogNames) {
  return within(screen.getByRole("dialog", { name: heading }))
}

/** Clicks the page's button named `opener` and returns the dialog it opens. */
export async function openEditDialog(
  user: UserEvent,
  opener: string,
  names: EditDialogNames,
) {
  await user.click(
    within(screen.getByRole("main")).getByRole("button", { name: opener }),
  )
  return editDialog(names)
}

/** Gives the dialog's text field named `field` the text `to`. */
export async function retype(
  user: UserEvent,
  dialog: ReturnType<typeof editDialog>,
  field: string,
  to: string,
) {
  const control = dialog.getByRole("textbox", { name: field })
  await user.clear(control)
  await user.type(control, to)
}

/**
 * Chooses Done in the dialog and waits for it to go. A test of a Done the form refuses
 * clicks the button itself.
 */
export async function confirmEdit(user: UserEvent, names: EditDialogNames) {
  await user.click(editDialog(names).getByRole("button", { name: names.done }))
  await expectDialogClosed()
}

/**
 * Waits for the open form dialog, whichever it is, to go, so the page behind can be
 * read again: after Cancel, Escape or a read that closes it.
 */
export async function expectDialogClosed() {
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
}
