import type { Locator, Page } from "@playwright/test"

import type { Language } from "./look"
import { expect } from "./test"

// A roadmap's items as EPC-018 moves them: each with its Move menu, in Cards or the
// compact view, the item moved scrolled into the room between the pinned bars
// (STY-071, STY-072).

const COPY = {
  en: { move: "Move", compact: "Compact", compactView: "Compact view" },
  cy: { move: "Symud", compact: "Cryno", compactView: "Golwg gryno" },
} as const satisfies Record<Language, Record<string, string>>

/** The page's own content, apart from the navigation beside it. */
export const main = (page: Page): Locator => page.getByRole("main")

/** The card or row of the item titled `title`. */
export function itemOf(page: Page, title: string): Locator {
  return main(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

/** The Move of the item titled `title`. */
export function moveButton(
  page: Page,
  title: string,
  language: Language = "en",
): Locator {
  return main(page).getByRole("button", {
    name: `${COPY[language].move} ${title}`,
    exact: true,
  })
}

/** Chooses `choice` from the Move menu of the item titled `title`, once it closes. */
export async function chooseFromMenu(
  page: Page,
  title: string,
  choice: string,
  language: Language = "en",
): Promise<void> {
  await moveButton(page, title, language).click()
  await page.getByRole("menuitem", { name: choice, exact: true }).click()
  await expect(page.getByRole("menu")).toBeHidden()
}

/** Switches the items to the compact view, by the control the viewport's width shows. */
export async function chooseCompact(
  page: Page,
  language: Language = "en",
): Promise<void> {
  const wide = (page.viewportSize()?.width ?? 0) >= 768
  const copy = COPY[language]
  await main(page)
    .getByRole("button", { name: wide ? copy.compact : copy.compactView })
    .click()
  await expect(
    main(page)
      .getByRole("button", { name: /^(Show|Dangos)/ })
      .first(),
  ).toBeVisible()
}

/**
 * Whether the item lies wholly in the room between the stuck header and the foot bar,
 * which pin themselves as `--pinned-top` and `--pinned-bottom`.
 */
export async function inRoom(item: Locator): Promise<boolean> {
  return item.evaluate((element) => {
    const style = getComputedStyle(document.documentElement)
    const top = parseFloat(style.getPropertyValue("--pinned-top")) || 0
    const bottom =
      window.innerHeight -
      (parseFloat(style.getPropertyValue("--pinned-bottom")) || 0)
    const box = element.getBoundingClientRect()
    return box.top >= top - 1 && box.bottom <= bottom + 1
  })
}
