import { screen, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"

import type { Language } from "@/i18n"

import { expectDialogClosed } from "./edit-dialog"

/** The removal dialog's names (STY-049 S1), in each language. */
export const REMOVAL = {
  en: {
    remove: "Remove",
    heading: (title: string) => `Remove “${title}”?`,
    notDoing: "Move to Not doing",
    confirm: "Remove",
    undo: "Undo removal",
    tag: "Removed",
  },
  cy: {
    remove: "Tynnu",
    heading: (title: string) => `Tynnu “${title}”?`,
    notDoing: "Symud i Ddim yn bwrw ymlaen",
    confirm: "Tynnu",
    undo: "Dadwneud y tynnu",
    tag: "Wedi'i thynnu",
  },
} as const

/** The removal dialog asking about the item titled `title`, which must be open. */
export function removalDialog(title: string, language: Language = "en") {
  return within(
    screen.getByRole("dialog", { name: REMOVAL[language].heading(title) }),
  )
}

/** Chooses Remove on the item titled `title`, and returns the dialog it opens. */
export async function askToRemove(
  user: UserEvent,
  title: string,
  language: Language = "en",
) {
  await user.click(
    within(screen.getByRole("main")).getByRole("button", {
      name: `${REMOVAL[language].remove} ${title}`,
    }),
  )
  return removalDialog(title, language)
}

/**
 * Removes the item titled `title`, from its card's or row's Remove and the dialog's
 * Remove, or moves it to Not doing, and waits for the dialog to go.
 */
export async function removeItem(
  user: UserEvent,
  title: string,
  {
    choice = "confirm",
    language = "en",
  }: {
    choice?: "confirm" | "notDoing"
    language?: Language
  } = {},
) {
  const dialog = await askToRemove(user, title, language)
  await user.click(
    dialog.getByRole("button", { name: REMOVAL[language][choice] }),
  )
  await expectDialogClosed()
}
