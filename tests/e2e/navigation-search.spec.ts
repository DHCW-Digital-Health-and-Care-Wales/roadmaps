import type { Locator, Page } from "@playwright/test"

import { type Language, useLanguage } from "./fixtures/look"
import { NAVIGATION_WORLD } from "./fixtures/navigation-world"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-061: the search at the top of the shell's navigation, in a browser: it narrows the
 * roadmaps as the Product Lead types, its top row stays in view as the list scrolls, the
 * rail scrolls with no scrollbar, and on a phone it shares the drawer's top row with
 * Close menu. What it finds, word by word, is held in the unit tests.
 */

const DESKTOP = { width: 1280, height: 800 }
const NARROWEST_DESKTOP = { width: 1024, height: 768 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    navigation: "Roadmaps",
    connect: "Connect Google",
    search: "Search roadmaps",
    last: "Staff directory",
  },
  cy: {
    navigation: "Mapiau trywydd",
    connect: "Cysylltu â Google",
    search: "Chwilio mapiau trywydd",
    last: "Cyfeiriadur staff",
  },
} as const satisfies Record<Language, Record<string, string>>

function navigation(page: Page, language: Language = "en"): Locator {
  return page.getByRole("navigation", { name: COPY[language].navigation })
}

function searchBox(page: Page, language: Language = "en"): Locator {
  return navigation(page, language).getByRole("searchbox", {
    name: COPY[language].search,
  })
}

/** The navigation's list, which scrolls under its top row. */
function navigationList(page: Page): Locator {
  return navigation(page).locator(":scope > div").last()
}

/** Connects with the sample world's 14 roadmaps, on the home page. */
async function openWorld(
  page: Page,
  sheets: { spreadsheet: unknown },
  language: Language = "en",
) {
  sheets.spreadsheet = NAVIGATION_WORLD
  await page.goto("./")
  await connect(page, COPY[language].connect)
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: COPY[language].last, exact: true }),
  ).toBeVisible()
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )

test.describe("on a desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test("narrows the list as the Product Lead types, and says how many match once they pause (S1, S6)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)

    await searchBox(page).pressSequentially("prescri")

    await expect(navigation(page).getByRole("link")).toHaveText([
      "All roadmaps",
      "Prescriptions online",
      "Electronic prescribing",
      "Families, categories and organisations",
    ])
    await expect(
      page.locator("[aria-live=polite]", { hasText: "2 roadmaps match" }),
    ).toBeAttached()
  })

  test("keeps the search and the fold button in view as the list scrolls (S8)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    const fold = navigation(page).getByRole("button", {
      name: "Fold the navigation",
    })
    const before = await searchBox(page).boundingBox()

    await navigationList(page).evaluate((list) => {
      list.scrollTop = list.scrollHeight
    })

    await expect(
      navigation(page).getByRole("link", {
        name: "Families, categories and organisations",
      }),
    ).toBeInViewport()
    expect(await searchBox(page).boundingBox()).toEqual(before)
    await expect(searchBox(page)).toBeInViewport()
    await expect(fold).toBeInViewport()
    // On one row, the fold button to the search's right.
    const search = await searchBox(page).boundingBox()
    const button = await fold.boundingBox()
    expect(button?.x).toBeGreaterThan((search?.x ?? 0) + (search?.width ?? 0))
    expect(Math.abs((button?.y ?? 0) - (search?.y ?? 0))).toBeLessThan(1)
  })

  test("folded, scrolls its rail with no scrollbar, and its spyglass opens the search (S9)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await navigation(page)
      .getByRole("button", { name: "Fold the navigation" })
      .click()

    const list = navigationList(page)
    const room = await list.evaluate((element: HTMLElement) => ({
      scrolls: element.scrollHeight > element.clientHeight,
      scrollbar: element.offsetWidth - element.clientWidth,
    }))
    expect(room).toEqual({ scrolls: true, scrollbar: 0 })
    await list.hover()
    await page.mouse.wheel(0, 2000)
    await expect
      .poll(() => list.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0)

    await navigation(page)
      .getByRole("button", { name: "Search roadmaps" })
      .click()

    await expect(searchBox(page)).toBeFocused()
    await page.reload()
    await expect(
      navigation(page).getByRole("button", { name: "Fold the navigation" }),
    ).toBeVisible()
  })
})

test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE)
  })

  test("shares the drawer's top row with Close menu, which Escape reaches once the search is empty (S10)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await page.getByRole("banner").getByRole("button", { name: "Menu" }).click()
    const drawer = page.getByRole("dialog", { name: "Menu" })

    const close = drawer.getByRole("button", { name: "Close menu" })
    await expect(close).toBeFocused()
    const search = await searchBox(page).boundingBox()
    const button = await close.boundingBox()
    expect(Math.abs((button?.y ?? 0) - (search?.y ?? 0))).toBeLessThan(1)

    await searchBox(page).fill("care")
    await page.keyboard.press("Escape")
    await expect(searchBox(page)).toHaveValue("")
    await expect(drawer).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
  })
})

test("fits its Cymraeg at the narrowest desktop and in the drawer, finding a Welsh title (S12)", async ({
  page,
  sheets,
}) => {
  await useLanguage(page, "cy")
  await page.setViewportSize(NARROWEST_DESKTOP)
  await openWorld(page, sheets, "cy")

  await expect(searchBox(page, "cy")).toHaveAttribute("placeholder", "Chwilio")
  await searchBox(page, "cy").fill("gofal")
  await expect(navigation(page, "cy").getByRole("link")).toHaveText([
    "Pob map trywydd",
    "Cynlluniau gofal a rennir",
    "Gwyliwr cofnodion gofal",
    "Cofrestr gofalwyr",
    "Teuluoedd, categorïau a sefydliadau",
  ])
  expect(await horizontalOverflow(page)).toBe(0)

  await page.setViewportSize(PHONE)
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Dewislen" })
    .click()
  await expect(searchBox(page, "cy")).toHaveValue("gofal")
  expect(await horizontalOverflow(page)).toBe(0)
})
