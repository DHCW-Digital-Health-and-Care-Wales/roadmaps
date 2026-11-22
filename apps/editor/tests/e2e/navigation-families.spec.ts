import type { Locator, Page } from "@playwright/test"

import type { FakeSheets } from "./fixtures/fake-sheets"
import { type Language, useLanguage } from "./fixtures/look"
import { NAVIGATION_WORLD } from "./fixtures/navigation-world"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-062: each family's name in the shell's navigation is a button that closes and opens
 * its roadmaps, "Close all" does so for every family, closed families are remembered on
 * this device, and going to a roadmap opens its family, in a browser. What each state says,
 * word by word, is held in the unit tests.
 */

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    navigation: "Roadmaps",
    connect: "Connect Google",
    closeAll: "Close all families",
    openAll: "Open all families",
    single: "Single Record",
    workforce: "Workforce",
    plans: "Shared care plans",
    rostering: "Rostering",
    last: "Staff directory",
  },
  cy: {
    navigation: "Mapiau trywydd",
    connect: "Cysylltu â Google",
    closeAll: "Cau pob un o'r teuluoedd",
    openAll: "Agor pob un o'r teuluoedd",
    single: "Cofnod Sengl",
    workforce: "Gweithlu",
    plans: "Cynlluniau gofal a rennir",
    rostering: "Rhestrau dyletswydd",
    last: "Cyfeiriadur staff",
  },
} as const satisfies Record<Language, Record<string, string>>

function navigation(page: Page, language: Language = "en"): Locator {
  return page.getByRole("navigation", { name: COPY[language].navigation })
}

function family(page: Page, name: string, language: Language = "en"): Locator {
  return navigation(page, language).getByRole("button", {
    name,
    exact: true,
  })
}

/** A roadmap's link in the navigation. */
function roadmap(page: Page, name: string, language: Language = "en") {
  return navigation(page, language).getByRole("link", { name, exact: true })
}

/** Connects with the sample world's 14 roadmaps, on the home page. */
async function openWorld(
  page: Page,
  sheets: FakeSheets,
  { language = "en" }: { language?: Language } = {},
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

/** A reload ends the session, so the Product Lead connects again. */
async function reload(page: Page) {
  await page.reload()
  await connect(page)
  await expect(navigation(page).getByRole("searchbox")).toBeVisible()
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

  test("closes and opens a family, focus staying on its button (S1)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    const single = family(page, COPY.en.single)
    await expect(single).toHaveAttribute("aria-expanded", "true")

    await single.click()

    await expect(single).toHaveAttribute("aria-expanded", "false")
    await expect(single).toBeFocused()
    await expect(roadmap(page, COPY.en.plans)).toBeHidden()
    await expect(roadmap(page, COPY.en.rostering)).toBeVisible()

    await page.keyboard.press("Enter")
    await expect(single).toHaveAttribute("aria-expanded", "true")
    await expect(roadmap(page, COPY.en.plans)).toBeVisible()
  })

  test("closes every family and opens them again, the button's words and focus following (S3)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)

    await navigation(page)
      .getByRole("button", { name: COPY.en.closeAll })
      .click()

    const openAll = navigation(page).getByRole("button", {
      name: COPY.en.openAll,
    })
    await expect(openAll).toBeFocused()
    await expect(openAll).toHaveText("Open all")
    await expect(
      page.locator("[aria-live=polite]", { hasText: "All families closed" }),
    ).toBeAttached()
    await expect(roadmap(page, COPY.en.rostering)).toBeHidden()

    await family(page, COPY.en.workforce).click()
    await expect(
      navigation(page).getByRole("button", { name: COPY.en.closeAll }),
    ).toHaveText("Close all")

    await navigation(page)
      .getByRole("button", { name: COPY.en.closeAll })
      .click()
    await openAll.click()
    await expect(roadmap(page, COPY.en.rostering)).toBeVisible()
    await expect(roadmap(page, COPY.en.plans)).toBeVisible()
    await expect(
      page.locator("[aria-live=polite]", { hasText: "All families open" }),
    ).toBeAttached()
  })

  test("remembers the closed families across a reload, and writes nothing to the data source (S4)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await family(page, COPY.en.single).click()
    await family(page, COPY.en.workforce).click()

    await reload(page)

    await expect(family(page, COPY.en.single)).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await expect(family(page, COPY.en.workforce)).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await expect(family(page, "Citizen Services")).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(sheets.writes).toHaveLength(0)
  })

  test("opens a family as its roadmap is opened, by its address and a reload too (S5)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await family(page, COPY.en.single).click()
    await expect(roadmap(page, COPY.en.plans)).toBeHidden()

    // A card on the list, which the page scrolls to.
    await page
      .getByRole("main")
      .getByRole("link", { name: COPY.en.plans, exact: true })
      .click()
    await expect(roadmap(page, COPY.en.plans)).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(family(page, COPY.en.single)).toHaveAttribute(
      "aria-expanded",
      "true",
    )

    // Closed again, then the address reloaded.
    await family(page, COPY.en.single).click()
    await reload(page)
    await expect(roadmap(page, COPY.en.plans)).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("finds a roadmap in a closed family under a plain heading, with no Close all, and closes it again (S6)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await family(page, COPY.en.single).click()

    await navigation(page).getByRole("searchbox").fill("shared")

    await expect(roadmap(page, COPY.en.plans)).toBeVisible()
    await expect(family(page, COPY.en.single)).toHaveCount(0)
    await expect(
      navigation(page).getByRole("button", { name: COPY.en.closeAll }),
    ).toHaveCount(0)

    await navigation(page).getByRole("searchbox").fill("")
    await expect(family(page, COPY.en.single)).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await expect(roadmap(page, COPY.en.plans)).toBeHidden()
  })

  test("shows every roadmap in the rail, with no family control (S7)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await navigation(page)
      .getByRole("button", { name: COPY.en.closeAll })
      .click()

    await navigation(page)
      .getByRole("button", { name: "Fold the navigation" })
      .click()

    // Every roadmap, by its initials and a name for a screen reader.
    await expect(
      navigation(page).getByRole("link", { name: /Rostering$/ }),
    ).toBeVisible()
    await expect(
      navigation(page).getByRole("link", { name: /Care record viewer$/ }),
    ).toBeVisible()
    // The spyglass and the fold button alone.
    await expect(navigation(page).getByRole("button")).toHaveCount(2)
  })

  test("is reached and worked by keyboard (S8)", async ({ page, sheets }) => {
    await openWorld(page, sheets)

    await navigation(page)
      .getByRole("link", { name: "All roadmaps", exact: true })
      .focus()
    await page.keyboard.press("Tab")
    await expect(
      navigation(page).getByRole("button", { name: COPY.en.closeAll }),
    ).toBeFocused()
    await page.keyboard.press("Space")
    await expect(
      navigation(page).getByRole("button", { name: COPY.en.openAll }),
    ).toBeFocused()
  })
})

test.describe("on a phone", () => {
  test("closes and opens families in the drawer, in Cymraeg too, with no sideways scroll (S8)", async ({
    page,
    sheets,
  }) => {
    await useLanguage(page, "cy")
    await page.setViewportSize(PHONE)
    await openWorld(page, sheets, { language: "cy" })
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Dewislen" })
      .click()
    const drawer = page.getByRole("dialog", { name: "Dewislen" })

    await drawer
      .getByRole("button", { name: COPY.cy.single, exact: true })
      .click()
    await expect(
      drawer.getByRole("link", { name: COPY.cy.plans, exact: true }),
    ).toBeHidden()

    await drawer.getByRole("button", { name: COPY.cy.closeAll }).click()
    await expect(
      drawer.getByRole("button", { name: COPY.cy.openAll }),
    ).toBeFocused()
    expect(await horizontalOverflow(page)).toBe(0)

    await drawer.getByRole("button", { name: COPY.cy.openAll }).click()
    await expect(
      drawer.getByRole("link", { name: COPY.cy.rostering, exact: true }),
    ).toBeVisible()
  })
})
