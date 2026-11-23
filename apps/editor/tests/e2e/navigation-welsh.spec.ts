import type { Locator, Page } from "@playwright/test"

import { addItem } from "./fixtures/dialogs"
import type { FakeSheets } from "./fixtures/fake-sheets"
import { boxesOf } from "./fixtures/layout"
import { useLanguage } from "./fixtures/look"
import { NAVIGATION_WORLD } from "./fixtures/navigation-world"
import { connect, expect, test } from "./fixtures/test"

/**
 * The shell's navigation in Cymraeg, whose copy is the longest, with its widest content
 * (STY-061 S12, STY-062 S8, STY-063 S8, STY-055 D4): a family shut, three roadmaps with
 * unpublished changes and the count shown, and a search.
 * One test per width where the navigation changes shape: beside the page at the narrowest
 * desktop, and in the phone's drawer. Each fits with no sideways scroll. What each state
 * says, and every English run of it, is held by the unit tests
 * (`changed-roadmaps-only.test.tsx`, `unpublished-changes.test.tsx`,
 * `navigation-families.test.tsx`, `navigation-search.test.tsx`).
 */

const NARROWEST_DESKTOP = { width: 1024, height: 768 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  navigation: "Mapiau trywydd",
  connect: "Cysylltu â Google",
  count: "3 map trywydd â newidiadau heb eu cyhoeddi",
  menu: "Dewislen",
  horizon: "Nawr",
  changed: ["eprescribing", "careplans", "carers"],
  plans: "Cynlluniau gofal a rennir",
  carers: "Cofrestr gofalwyr",
  other: "Rhestrau dyletswydd",
  single: "Cofnod Sengl",
  families: "Teuluoedd, categorïau a sefydliadau",
  search: "Chwilio mapiau trywydd",
  last: "Cyfeiriadur staff",
} as const

function navigation(page: Page): Locator {
  return page.getByRole("navigation", { name: COPY.navigation })
}

function count(page: Page): Locator {
  return navigation(page).getByRole("button", { name: COPY.count })
}

/** A family's button, whether or not a dot adds its unpublished changes to the name. */
function family(page: Page): Locator {
  return navigation(page).getByRole("button", {
    name: new RegExp(`^${COPY.single}`),
  })
}

function searchBox(page: Page): Locator {
  return navigation(page).getByRole("searchbox", { name: COPY.search })
}

/** A roadmap's link in the navigation, by its title, with or without a dot's words. */
function roadmap(page: Page, title: string) {
  return navigation(page).getByRole("link", {
    name: new RegExp(`${title}(, newidiadau heb eu cyhoeddi)?$`),
  })
}

/**
 * Connects with the sample world's 14 roadmaps and gives Electronic prescribing, Shared
 * care plans and Carers' register each an item, so each has unpublished changes, ending on
 * the families page.
 */
async function openChangedWorld(page: Page, sheets: FakeSheets) {
  sheets.spreadsheet = NAVIGATION_WORLD
  await useLanguage(page, "cy")
  await page.goto("./")
  await connect(page, COPY.connect)
  await expect(
    page.getByRole("main").getByRole("link", { name: COPY.last, exact: true }),
  ).toBeVisible()
  for (const id of COPY.changed) {
    await page.goto(`./#/roadmaps/${id}`)
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toBeVisible()
    await addItem(page, `Item for ${id}`, COPY.horizon, "cy")
  }
  await page.goto("./#/families")
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )

test("at the narrowest desktop, a Welsh family shut, the count pressed and a search fit with no sideways scroll (STY-063 S8)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(NARROWEST_DESKTOP)
  await openChangedWorld(page, sheets)

  await family(page).click()
  await expect(family(page)).toHaveAttribute("aria-expanded", "false")
  await expect(roadmap(page, COPY.plans)).toBeHidden()

  await count(page).click()
  await expect(count(page)).toHaveAttribute("aria-pressed", "true")
  await expect(roadmap(page, COPY.other)).toBeHidden()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

  // A Welsh title found in the shut family, the placeholder cut short to fit.
  await expect(searchBox(page)).toHaveAttribute("placeholder", "Chwilio")
  await searchBox(page).fill("gofal")
  await expect(count(page)).toHaveAttribute("aria-pressed", "false")
  await expect(roadmap(page, COPY.plans)).toBeVisible()
  await expect(roadmap(page, COPY.carers)).toBeVisible()
  await expect(roadmap(page, COPY.other)).toBeHidden()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
})

test("on a phone, the Welsh menu button, a family shut, the count and a search fit in the drawer with no sideways scroll (STY-063 S8, STY-055 D4)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(PHONE)
  await openChangedWorld(page, sheets)
  const menu = page
    .getByRole("banner")
    .getByRole("button", { name: `${COPY.menu}, ${COPY.count}` })
  await expect(menu).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

  await menu.click()
  const drawer = page.getByRole("dialog", { name: COPY.menu })
  await expect(drawer).toBeVisible()
  await expect(count(page)).toBeVisible()
  // The count, the longest Welsh string, fits inside the drawer: the list it sits in
  // scrolls on its own, so a count past the edge would not scroll the page.
  const [drawerBox, countBox] = await boxesOf(drawer, count(page))
  expect(countBox.right).toBeLessThanOrEqual(drawerBox.right)
  await family(page).click()
  await expect(family(page)).toHaveAttribute("aria-expanded", "false")
  await searchBox(page).fill("gofal")
  await expect(roadmap(page, COPY.plans)).toBeVisible()

  // The longest link, and a title found, fit inside the drawer.
  const [box, families, plans] = await boxesOf(
    drawer,
    navigation(page).getByRole("link", { name: COPY.families, exact: true }),
    roadmap(page, COPY.plans),
  )
  expect(families.right).toBeLessThanOrEqual(box.right)
  expect(plans.right).toBeLessThanOrEqual(box.right)
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
})
