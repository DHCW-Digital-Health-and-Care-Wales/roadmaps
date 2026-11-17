import { screen, waitFor, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"
import { expect } from "vitest"

const NAME = "Your session has expired"

/**
 * The dialog an action that needs a session opens once it has expired, named in English
 * unless `name` gives its Welsh (test code only).
 */
export function findReconnectDialog(name = NAME): Promise<HTMLElement> {
  return screen.findByRole("alertdialog", { name })
}

/**
 * Chooses Reconnect in the reconnect dialog, which the fake auth client grants at once,
 * and waits for the dialog to close and the action to carry on (test code only).
 */
export async function reconnectFromDialog(user: UserEvent): Promise<void> {
  const dialog = await findReconnectDialog()
  await user.click(within(dialog).getByRole("button", { name: "Reconnect" }))
  await waitFor(() => {
    expect(
      screen.queryByRole("alertdialog", { name: NAME }),
    ).not.toBeInTheDocument()
  })
}
