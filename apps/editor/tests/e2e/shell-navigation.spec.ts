import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { escapeFrom } from "./fixtures/keyboard"
import { boxesOf, boxOf } from "./fixtures/layout"
import { tokenColour } from "./fixtures/look"
import { EXAMPLE_SPREADSHEET, type FakeTab } from "./fixtures/fake-sheets"
import { openLongRoadmap, openRoadmapIn } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-054: the dashboard shell's navigation. On a desktop it stands at the left, full
 * height as the page scrolls, folding to a rail; on a phone it is a drawer, opened from
 * the top bar or a roadmap's sticky strip. Either way it reaches any roadmap and the
 * families page in one step, marks the page open, and offers only what works before the
 * roadmaps are read.
 */

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  navigation: "Roadmaps",
  all: "All roadmaps",
  families: "Families, categories and organisations",
  menu: "Menu",
  closeMenu: "Close menu",
  fold: "Fold the navigation",
  unfold: "Open the navigation",
} as const

function navigation(page: Page): Locator {
  return page.getByRole("navigation", { name: COPY.navigation })
}

/** The navigation's link to `name`, matched whole. */
function navLink(page: Page, name: string) {
  return navigation(page).getByRole("link", { name, exact: true })
}

/** Opens Product A, connected, with the example spreadsheet. */
function openProductA(page: Page, sheets: { spreadsheet: readonly FakeTab[] }) {
  return openRoadmapIn(page, sheets, {
    spreadsheet: EXAMPLE_SPREADSHEET,
    tab: "ProductA",
    lastCard: "Minimal card",
  })
}

test.describe("on a desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test("opens another roadmap in one step, moving focus to its page (S1)", async ({
    page,
    sheets,
  }) => {
    await openProductA(page, sheets)

    await navLink(page, "Product B roadmap").click()

    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { level: 1, name: "Product B roadmap" }),
    ).toBeVisible()
    await expect(page).toHaveURL(/#\/roadmaps\/productb$/)
    await expect(page.getByRole("main")).toBeFocused()
  })

  test("reaches the families page from a roadmap's page (S2)", async ({
    page,
    sheets,
  }) => {
    await openProductA(page, sheets)

    await navLink(page, COPY.families).click()

    await expect(page).toHaveURL(/#\/families$/)
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toHaveText(COPY.families)
  })

  test("marks the roadmap open as the current page, to sight and to a screen reader (S3)", async ({
    page,
    sheets,
  }) => {
    await openProductA(page, sheets)

    const current = navLink(page, "Product A roadmap")
    await expect(current).toHaveAttribute("aria-current", "page")
    await expect(current).toHaveCSS("font-weight", "700")
    await expect(current.locator("xpath=..")).toHaveCSS(
      "background-color",
      await tokenColour(page, "--sidebar-accent"),
    )
    await expect(navigation(page).locator("[aria-current]")).toHaveCount(1)
  })

  test("stays full height at the left as the page scrolls, the pinned bars beside it (D7)", async ({
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
    await expect(page.locator("[data-stuck]")).toBeVisible()

    const bars = ["[data-stuck]", "[data-pinned]"]
    const [sidebar, ...barBoxes] = await boxesOf(
      page.locator("[data-slot=navigation-sidebar]"),
      ...bars.map((bar) => page.locator(bar)),
    )
    expect(sidebar).toMatchObject({ x: 0, y: 0, width: 256, height: 800 })
    barBoxes.forEach((box, at) => {
      expect(box.x, bars[at]).toBe(256)
      expect(box.right, bars[at]).toBe(DESKTOP.width)
    })
    // At the page's end too, below the room the pinned foot leaves.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await expect
      .poll(() => boxOf(page.locator("[data-slot=navigation-sidebar]")))
      .toMatchObject({ x: 0, y: 0, width: 256, height: 800 })
    // The top bar and phase banner have scrolled away.
    await expect(page.getByRole("banner")).not.toBeInViewport()
  })

  test("folds to a rail and back, remembered on this device, the cards taking three columns folded and two open (D5)", async ({
    page,
    sheets,
  }) => {
    await openLongRoadmap(page, sheets)
    const sidebar = page.locator("[data-slot=navigation-sidebar]")
    const columns = () =>
      page
        .getByRole("main")
        .getByRole("heading", { level: 3 })
        .evaluateAll(
          (titles) =>
            new Set(titles.map((title) => title.getBoundingClientRect().left))
              .size,
        )
    expect((await boxOf(sidebar)).width).toBe(256)
    expect(await columns()).toBe(2)

    await page.getByRole("button", { name: COPY.fold }).click()

    const unfold = page.getByRole("button", { name: COPY.unfold })
    await expect(unfold).toBeFocused()
    expect((await boxOf(sidebar)).width).toBe(64)
    expect(await columns()).toBe(3)
    // A roadmap shows its initials, named by them and its title.
    await expect(navLink(page, "PB Product B roadmap")).toHaveText(
      "PB Product B roadmap",
    )

    await page.reload()
    await connect(page)
    await expect(unfold).toBeVisible()
    expect((await boxOf(sidebar)).width).toBe(64)

    await unfold.click()
    await expect(page.getByRole("button", { name: COPY.fold })).toBeFocused()
    expect((await boxOf(sidebar)).width).toBe(256)
  })

  test("before connecting, offers only all the roadmaps and the families page, each of which asks to connect (S4)", async ({
    page,
  }) => {
    await page.goto("./")

    await expect(navigation(page).getByRole("link")).toHaveText([
      COPY.all,
      COPY.families,
    ])
    await navLink(page, COPY.families).click()
    await expect(
      page.getByRole("main").getByRole("button", { name: "Connect Google" }),
    ).toBeVisible()
  })

  test("when the roadmap list can't be read, offers only the two pages (S4)", async ({
    page,
    sheets,
  }) => {
    sheets.failWith(403)
    await page.goto("./")
    await connect(page)
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible()

    await expect(navigation(page).getByRole("link")).toHaveText([
      COPY.all,
      COPY.families,
    ])
  })
})

test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE)
  })

  // The drawer's fit in Welsh, the longest copy, is held with the navigation's other
  // Welsh reflow checks in `navigation-changed.spec.ts`.
  test("opens over the page from the top bar, keeps focus in it and returns it (S5, D9)", async ({
    page,
  }) => {
    await page.goto("./")
    const menu = page
      .getByRole("banner")
      .getByRole("button", { name: COPY.menu })

    await menu.click()

    const drawer = page.getByRole("dialog", { name: COPY.menu })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole("navigation")).toBeVisible()
    await expect(
      drawer.getByRole("button", { name: COPY.closeMenu }),
    ).toBeFocused()
    // Focus cycles inside the drawer: past its last link comes its first control.
    await navLink(page, COPY.families).focus()
    await page.keyboard.press("Tab")
    await expect(
      drawer.getByRole("button", { name: COPY.closeMenu }),
    ).toBeFocused()

    await escapeFrom(drawer)
    await expect(menu).toBeFocused()
  })

  test("opens from a roadmap's sticky strip once scrolled, and a roadmap chosen opens its page (S5, D8, S1)", async ({
    page,
    sheets,
  }) => {
    await openLongRoadmap(page, sheets)
    await page
      .getByRole("heading", { level: 2, name: "Later", exact: true })
      .evaluate((heading) => {
        heading.scrollIntoView({ block: "center" })
      })
    const strip = page.locator("[data-stuck]")
    await expect(strip).toBeVisible()
    const menu = strip.getByRole("button", { name: COPY.menu })
    expect((await boxOf(menu)).x).toBe(16)

    await menu.click()
    await page.getByRole("dialog", { name: COPY.menu }).waitFor()
    await navLink(page, "Product B roadmap").click()

    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { level: 1, name: "Product B roadmap" }),
    ).toBeVisible()
    await expect(page.getByRole("main")).toBeFocused()
  })
})

test("keeps a roadmap's pending changes as the Product Lead switches roadmaps and back (S6)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(DESKTOP)
  await openProductA(page, sheets)
  const form = await openEditItemDialog(page, "Minimal card")
  await form.getByRole("textbox", { name: "Title" }).fill("A minimal card")
  await form.getByRole("button", { name: "Done" }).click()
  await expect(form).toBeHidden()
  const pending = page.getByRole("main").getByText("1 unpublished change")
  await expect(pending).toBeVisible()

  await navLink(page, "Product B roadmap").click()
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 1, name: "Product B roadmap" }),
  ).toBeVisible()
  await expect(pending).toBeHidden()
  // Its dot says it has the change (STY-055).
  await navLink(page, "Product A roadmap, unpublished changes").click()

  await expect(pending).toBeVisible()
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 3, name: "A minimal card" }),
  ).toBeVisible()
})
