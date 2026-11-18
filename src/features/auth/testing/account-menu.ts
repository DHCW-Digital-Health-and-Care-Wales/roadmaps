import { screen, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"

/**
 * Chooses `name` in the header's account menu (test code only): the theme, and the
 * session's action, Disconnect while connected.
 */
export async function chooseFromAccountMenu(
  user: UserEvent,
  name: string,
): Promise<void> {
  await user.click(
    within(screen.getByRole("banner")).getByRole("button", { name: "Account" }),
  )
  await user.click(await screen.findByRole("menuitem", { name }))
}

/** Chooses Disconnect in the header's account menu (test code only). */
export function disconnectFromHeader(user: UserEvent): Promise<void> {
  return chooseFromAccountMenu(user, "Disconnect")
}
