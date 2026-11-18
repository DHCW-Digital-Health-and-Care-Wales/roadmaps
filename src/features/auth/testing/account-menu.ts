import {
  screen,
  within,
  type BoundFunctions,
  type queries,
} from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"

/**
 * Opens the header's account menu and returns it (test code only); `trigger` is its
 * button's name, "Account" unless the page is in Welsh.
 */
export async function openAccountMenu(
  user: UserEvent,
  trigger = "Account",
): Promise<BoundFunctions<typeof queries>> {
  await user.click(screen.getByRole("button", { name: trigger }))
  return within(await screen.findByRole("menu"))
}

/**
 * Chooses `name` in the header's account menu (test code only): the theme, and the
 * session's action, Disconnect while connected.
 */
export async function chooseFromAccountMenu(
  user: UserEvent,
  name: string,
): Promise<void> {
  const menu = await openAccountMenu(user)
  await user.click(menu.getByRole("menuitem", { name }))
}

/** Chooses Disconnect in the header's account menu (test code only). */
export function disconnectFromHeader(user: UserEvent): Promise<void> {
  return chooseFromAccountMenu(user, "Disconnect")
}
