import type { Locator, Page } from "@playwright/test"

import type { Language } from "./look"
import { expect } from "./test"

const TRIGGER_NAME = { en: "Account", cy: "Cyfrif" } as const

/** Opens the header's account menu (STY-056) and returns the menu, once it has focus. */
export async function openAccountMenu(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  await page
    .getByRole("banner")
    .getByRole("button", { name: TRIGGER_NAME[language] })
    .click()
  const menu = page.getByRole("menu")
  await expect(menu).toBeFocused()
  return menu
}

/**
 * Chooses the item named `name` in the header's account menu: the theme, where the
 * forms open (STY-077), and the session's action, whose name follows the connection (Connect Google, Reconnect,
 * Disconnect). `language` names the trigger; the caller gives the item's name. Returns
 * once the menu has gone: the choice is acted on as it finishes closing.
 */
export async function chooseFromAccountMenu(
  page: Page,
  name: string,
  language: Language = "en",
): Promise<void> {
  const menu = await openAccountMenu(page, language)
  await menu.getByRole("menuitem", { name }).click()
  await expect(menu).toBeHidden()
}

/** Disconnects from the header's account menu; it may ask about unpublished changes first. */
export function disconnectFromHeader(page: Page): Promise<void> {
  return chooseFromAccountMenu(page, "Disconnect")
}
