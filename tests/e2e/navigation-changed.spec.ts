import type { Locator, Page } from "@playwright/test"

import { disconnectFromHeader } from "./fixtures/account-menu"
import { addItem } from "./fixtures/dialogs"
import type { FakeSheets } from "./fixtures/fake-sheets"
import { type Language, useLanguage, useTheme } from "./fixtures/look"
import { NAVIGATION_WORLD } from "./fixtures/navigation-world"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-063: with two or more roadmaps changed, the navigation's count is a button that
 * shows only those roadmaps, in a browser: on a desktop, folded to its rail, in the
 * phone's drawer, in Welsh and in the dark. What each state says, word by word, is held
 * in the unit tests.
 */

const DESKTOP = { width: 1280, height: 800 }
const NARROWEST_DESKTOP = { width: 1024, height: 768 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    navigation: "Roadmaps",
    connect: "Connect Google",
    count: "3 roadmaps have unpublished changes",
    horizon: "Now",
    changed: ["eprescribing", "careplans", "carers"],
    plans: "Shared care plans",
    prescribing: "Electronic prescribing",
    carers: "Carers' register",
    other: "Rostering",
    single: "Single Record",
    search: "Search roadmaps",
    last: "Staff directory",
  },
  cy: {
    navigation: "Mapiau trywydd",
    connect: "Cysylltu â Google",
    count: /^3 map trywydd â newidiadau heb eu cyhoeddi$/,
    horizon: "Nawr",
    changed: ["eprescribing", "careplans", "carers"],
    plans: "Cynlluniau gofal a rennir",
    prescribing: "Presgripsiynu electronig",
    carers: "Cofrestr gofalwyr",
    other: "Rhestrau dyletswydd",
    single: "Cofnod Sengl",
    search: "Chwilio mapiau trywydd",
    last: "Cyfeiriadur staff",
  },
} as const satisfies Record<Language, Record<string, unknown>>

function navigation(page: Page, language: Language = "en"): Locator {
  return page.getByRole("navigation", { name: COPY[language].navigation })
}

function count(page: Page, language: Language = "en"): Locator {
  return navigation(page, language).getByRole("button", {
    name: COPY[language].count,
  })
}

/** A roadmap's link in the navigation, by its title, with or without a dot's words. */
function roadmap(page: Page, title: string, language: Language = "en") {
  return navigation(page, language).getByRole("link", {
    name: new RegExp(
      `${title}(, unpublished changes|, newidiadau heb eu cyhoeddi)?$`,
    ),
  })
}

/**
 * Connects with the sample world's 14 roadmaps and gives Electronic prescribing, Shared
 * care plans and Carers' register each an item, so each has unpublished changes, ending on
 * the families page.
 */
async function openChangedWorld(
  page: Page,
  sheets: FakeSheets,
  language: Language = "en",
) {
  const copy = COPY[language]
  sheets.spreadsheet = NAVIGATION_WORLD
  await page.goto("./")
  await connect(page, copy.connect)
  await expect(
    page.getByRole("main").getByRole("link", { name: copy.last, exact: true }),
  ).toBeVisible()
  for (const id of copy.changed) {
    await page.goto(`./#/roadmaps/${id}`)
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toBeVisible()
    await addItem(page, `Item for ${id}`, copy.horizon, language)
  }
  await page.goto("./#/families")
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

  test("shows only the roadmaps with changes, empties the search, and shows every roadmap again when pressed again (S1, S2)", async ({
    page,
    sheets,
  }) => {
    await openChangedWorld(page, sheets)
    await navigation(page)
      .getByRole("button", { name: COPY.en.single, exact: true })
      .click()
    await navigation(page).getByRole("searchbox").fill("care")
    await expect(roadmap(page, COPY.en.other)).toBeHidden()

    await count(page).click()

    await expect(navigation(page).getByRole("searchbox")).toHaveValue("")
    await expect(count(page)).toHaveAttribute("aria-pressed", "true")
    await expect(count(page)).toBeFocused()
    for (const title of [COPY.en.plans, COPY.en.prescribing, COPY.en.carers]) {
      await expect(roadmap(page, title)).toBeVisible()
    }
    await expect(roadmap(page, COPY.en.other)).toBeHidden()
    await expect(
      page.locator("[aria-live=polite]", {
        hasText: "Showing only the 3 roadmaps with unpublished changes",
      }),
    ).toBeAttached()

    await count(page).click()

    await expect(count(page)).toHaveAttribute("aria-pressed", "false")
    await expect(count(page)).toBeFocused()
    await expect(roadmap(page, COPY.en.other)).toBeVisible()
    // Single Record stays closed, as it was.
    await expect(roadmap(page, COPY.en.plans)).toBeHidden()
    await expect(navigation(page).getByRole("searchbox")).toHaveValue("")
    await expect(
      page.locator("[aria-live=polite]", { hasText: "Showing all roadmaps" }),
    ).toBeAttached()
  })

  test("lets the count go as the Product Lead types, and lasts while moving between pages (S3, S6)", async ({
    page,
    sheets,
  }) => {
    await openChangedWorld(page, sheets)
    await count(page).click()

    await roadmap(page, COPY.en.carers).click()
    await expect(roadmap(page, COPY.en.carers)).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(count(page)).toHaveAttribute("aria-pressed", "true")
    await expect(roadmap(page, COPY.en.other)).toBeHidden()

    await navigation(page).getByRole("searchbox").fill("rost")

    await expect(count(page)).toHaveAttribute("aria-pressed", "false")
    await expect(roadmap(page, COPY.en.other)).toBeVisible()
    await expect(roadmap(page, COPY.en.carers)).toBeHidden()
  })

  test("opens the folded navigation narrowed from the count's circle, remembered as open (S7)", async ({
    page,
    sheets,
  }) => {
    await openChangedWorld(page, sheets)
    await page.getByRole("button", { name: "Fold the navigation" }).click()
    const circle = navigation(page).getByRole("button", {
      name: COPY.en.count,
    })
    await expect(circle).not.toHaveAttribute("aria-pressed")
    await expect(roadmap(page, COPY.en.other)).toBeAttached()

    await circle.click()

    await expect(count(page)).toHaveAttribute("aria-pressed", "true")
    await expect(count(page)).toBeFocused()
    await expect(roadmap(page, COPY.en.other)).toBeHidden()
    await expect(
      navigation(page).getByRole("searchbox", { name: COPY.en.search }),
    ).toBeVisible()
    await page.goto("./#/families")
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Fold the navigation" }),
    ).toBeVisible()
  })

  test("is text, with nothing to press, while the roadmaps are unread (S9)", async ({
    page,
    sheets,
  }) => {
    await openChangedWorld(page, sheets)

    await disconnectFromHeader(page)
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Keep changes and disconnect" })
      .click()

    await expect(
      navigation(page).getByText(COPY.en.count, { exact: true }),
    ).toBeVisible()
    await expect(count(page)).toHaveCount(0)
    await expect(roadmap(page, COPY.en.other)).toHaveCount(0)
  })
})

test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE)
  })

  test("leaves the drawer open when pressed, and closes it as a roadmap is chosen (S6)", async ({
    page,
    sheets,
  }) => {
    await useTheme(page, "dark")
    await openChangedWorld(page, sheets)
    await page.getByRole("button", { name: /^Menu/ }).first().click()
    const drawer = page.getByRole("dialog", { name: "Menu" })

    await count(page).click()

    await expect(drawer).toBeVisible()
    await expect(count(page)).toHaveAttribute("aria-pressed", "true")
    await expect(roadmap(page, COPY.en.other)).toBeHidden()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    await roadmap(page, COPY.en.carers).click()

    await expect(drawer).toBeHidden()
    await expect(page).toHaveURL(/#\/roadmaps\/carers$/)
  })
})

test("in Welsh at the narrowest desktop, the count and its pressed state fit with no sideways scroll (S8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(NARROWEST_DESKTOP)
  await useLanguage(page, "cy")
  await openChangedWorld(page, sheets, "cy")

  const button = count(page, "cy")
  await button.click()

  await expect(button).toHaveAttribute("aria-pressed", "true")
  await expect(roadmap(page, COPY.cy.other, "cy")).toBeHidden()
  await expect(
    page.locator("[aria-live=polite]", {
      hasText: "Yn dangos y 3 map trywydd â newidiadau heb eu cyhoeddi yn unig",
    }),
  ).toBeAttached()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
})
