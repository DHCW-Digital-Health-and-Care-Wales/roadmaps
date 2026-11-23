import type { Page } from "@playwright/test"

import { changeItem, openEditItemDialog } from "./fixtures/dialogs"
import { tokenColour } from "./fixtures/look"
import { openLongRoadmap } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-055: which roadmaps have unpublished changes, from any page. What a browser alone
 * shows of it: the dot's colour on the navy navigation, on a focused entry (dark on the
 * yellow focus fill), on the phone's menu button and on its sticky strip's. What each
 * state says, the count, its lead, the rail, the drawer and Disconnect's question, is
 * held by `unpublished-changes.test.tsx`; the Welsh fit by `navigation-changed.spec.ts`.
 */

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }

const navigation = (page: Page) =>
  page.getByRole("navigation", { name: "Roadmaps" })

const A_ITEM = "Example card with every column"
const B_ITEM = "Building the core service"

/** Two roadmaps with changes, then the families page, connected. */
async function twoChangedThenFamilies(page: Page) {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await changeItem(page, "producta", A_ITEM)
  await changeItem(page, "productb", B_ITEM)
  await page.goto("./#/families")
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toBeVisible()
}

test.describe("on a desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test("marks a roadmap with unpublished changes with a dot in DHCW's yellow on the navy navigation (S1, D1)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    const withDot = navigation(page).getByRole("link", {
      name: "Product A roadmap, unpublished changes",
    })
    await expect(withDot.locator("[data-slot=unpublished-dot]")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--focus"),
    )
  })

  test("keeps the dot in view while its entry is focused, dark on the yellow focus fill (D1)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)
    const entry = navigation(page).getByRole("link", {
      name: "Product A roadmap, unpublished changes",
    })

    // Reached by the keyboard, as `:focus-visible` needs: a script's focus() alone is not.
    await entry.focus()
    await page.keyboard.press("Shift+Tab")
    await page.keyboard.press("Tab")

    await expect(entry).toBeFocused()
    await expect(entry.locator("[data-slot=unpublished-dot]")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--focus-foreground"),
    )
  })
})

test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE)
  })

  test("carries a dot on the menu button, in DHCW's yellow (D4)", async ({
    page,
  }) => {
    await twoChangedThenFamilies(page)

    const menu = page.getByRole("banner").getByRole("button", {
      name: "Menu, 2 roadmaps have unpublished changes",
    })
    await expect(menu).toBeVisible()
    await expect(menu.locator("[data-slot=unpublished-dot]")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--focus"),
    )
  })

  test("carries the dot on the button in a roadmap's sticky strip too (D4)", async ({
    page,
    sheets,
  }) => {
    await openLongRoadmap(page, sheets)
    const form = await openEditItemDialog(page, "Planned work 3")
    await form
      .getByRole("textbox", { name: "Title" })
      .fill("Planned work 3, edited")
    await form.getByRole("button", { name: "Done" }).click()
    await expect(form).toBeHidden()
    await page
      .getByRole("heading", { level: 2, name: "Later", exact: true })
      .evaluate((heading) => {
        heading.scrollIntoView({ block: "center" })
      })

    const strip = page.locator("[data-stuck]")
    await expect(
      strip.getByRole("button", {
        name: "Menu, 1 roadmap has unpublished changes",
      }),
    ).toBeVisible()
  })
})
