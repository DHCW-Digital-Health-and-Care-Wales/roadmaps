import type { Locator, Page } from "@playwright/test"

import type { Language } from "./look"

const TRIGGER_NAME = { en: "Account", cy: "Cyfrif" } as const

/** Opens the header's account menu (STY-056) and returns the menu. */
export async function openAccountMenu(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  await page
    .getByRole("banner")
    .getByRole("button", { name: TRIGGER_NAME[language] })
    .click()
  return page.getByRole("menu")
}

/**
 * Chooses the item named `name` in the header's account menu: the theme, and the
 * session's action, whose name follows the connection (Connect Google, Reconnect,
 * Disconnect). `language` names the trigger; the caller gives the item's name.
 */
export async function chooseFromAccountMenu(
  page: Page,
  name: string,
  language: Language = "en",
): Promise<void> {
  const menu = await openAccountMenu(page, language)
  await menu.getByRole("menuitem", { name }).click()
}

/** Disconnects from the header's account menu; it may ask about unpublished changes first. */
export function disconnectFromHeader(page: Page): Promise<void> {
  return chooseFromAccountMenu(page, "Disconnect")
}
