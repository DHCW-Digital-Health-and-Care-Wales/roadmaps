import type { Locator, Page } from "@playwright/test"

import type { FakeSheets } from "./fixtures/fake-sheets"
import { boxOf, scrollsSideways } from "./fixtures/layout"
import { type Language, useLanguage } from "./fixtures/look"
import { NAVIGATION_WORLD } from "./fixtures/navigation-world"
import { openLongRoadmap } from "./fixtures/roadmap-page"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-064: the open navigation's right edge drags its width, from 208px to 400px, by
 * pointer, finger or keyboard, remembered on this device, in a browser. The edge's roles
 * and keys word by word are held in the unit tests.
 */

const DESKTOP = { width: 1280, height: 800 }
const NARROWEST_DESKTOP = { width: 1024, height: 768 }
const PHONE = { width: 375, height: 812 }

const COPY = {
  en: {
    navigation: "Roadmaps",
    connect: "Connect Google",
    resize: "Resize the navigation",
    fold: "Fold the navigation",
    unfold: "Open the navigation",
    menu: "Menu",
    last: "Staff directory",
  },
  cy: {
    navigation: "Mapiau trywydd",
    connect: "Cysylltu â Google",
    resize: "Newid lled y llywio",
    fold: "Plygu'r llywio",
    unfold: "Agor y llywio",
    menu: "Dewislen",
    last: "Cyfeiriadur staff",
  },
} as const satisfies Record<Language, Record<string, string>>

const edge = (page: Page, language: Language = "en"): Locator =>
  page.getByRole("separator", { name: COPY[language].resize })

function navigation(page: Page): Locator {
  return page.getByRole("navigation", { name: COPY.en.navigation })
}

/** The navigation's width on the screen, and where the page and its pinned bars start. */
async function widths(page: Page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector("[data-slot=navigation-sidebar]")
    const bar = document.querySelector("[data-slot=sticky-header]")
    return {
      navigation: sidebar?.getBoundingClientRect().width ?? 0,
      custom: getComputedStyle(
        document.querySelector("[data-navigation]") ?? document.body,
      ).getPropertyValue("--navigation-width"),
      bar: bar?.getBoundingClientRect().left ?? null,
    }
  })
}

const navigationWidth = async (page: Page) => (await widths(page)).navigation

/** Drags the edge by `by` px, to the right when positive, with the mouse. */
async function drag(page: Page, by: number, language: Language = "en") {
  const box = await boxOf(edge(page, language))
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + by, y, { steps: 6 })
  await page.mouse.up()
}

async function openWorld(
  page: Page,
  sheets: FakeSheets,
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

test.describe("on a desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test("widens with the pointer, to 400px at most and 208px at least, and the page starts where it ends (S1, S2)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    expect(await navigationWidth(page)).toBe(256)

    await drag(page, 64)
    expect(await navigationWidth(page)).toBe(320)
    const main = page.getByRole("main")
    expect((await boxOf(main)).x).toBeGreaterThanOrEqual(320)

    await drag(page, 500)
    expect(await navigationWidth(page)).toBe(400)
    await drag(page, -800)
    expect(await navigationWidth(page)).toBe(208)
    expect(await scrollsSideways(page)).toBe(false)
  })

  test("shows the edge can be dragged, and puts the navigation back to 256px on a double-click (S1, S3)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await expect(edge(page)).toHaveCSS("cursor", "col-resize")

    await drag(page, 144)
    expect(await navigationWidth(page)).toBe(400)
    await edge(page).dblclick()

    expect(await navigationWidth(page)).toBe(256)
  })

  test("is moved by the keyboard from the navigation's last stop (S4)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await navigation(page)
      .getByRole("link", { name: "Families, categories and organisations" })
      .focus()
    await page.keyboard.press("Tab")
    await expect(edge(page)).toBeFocused()
    await expect(edge(page)).toHaveAttribute(
      "aria-valuetext",
      "256 pixels wide",
    )

    await page.keyboard.press("ArrowRight")
    expect(await navigationWidth(page)).toBe(272)
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.press("ArrowLeft")
    expect(await navigationWidth(page)).toBe(240)
    await page.keyboard.press("End")
    expect(await navigationWidth(page)).toBe(400)
    await page.keyboard.press("Home")
    expect(await navigationWidth(page)).toBe(208)

    await expect(edge(page)).toBeFocused()
    await expect(edge(page)).toHaveAttribute("aria-valuenow", "208")
    // The navigation's focus style: the yellow fill, not the browser's own ring.
    await expect(edge(page)).toHaveCSS("background-color", "rgb(255, 235, 59)")
  })

  test("is remembered across a reload and a fold, and sets nothing in the data source (S5)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await drag(page, 64)

    await page.getByRole("button", { name: COPY.en.fold }).click()
    expect(await navigationWidth(page)).toBe(64)
    await expect(edge(page)).toHaveCount(0)
    await page.getByRole("button", { name: COPY.en.unfold }).click()
    expect(await navigationWidth(page)).toBe(320)

    await page.reload()
    await connect(page)
    await expect(navigation(page).getByRole("searchbox")).toBeVisible()
    expect(await navigationWidth(page)).toBe(320)
    expect(sheets.writes).toHaveLength(0)
  })

  test("is 256px, with no error, where browser storage can't be read or kept (S5)", async ({
    page,
    sheets,
  }) => {
    await page.addInitScript(() => {
      const blocked = () => {
        throw new DOMException("blocked", "SecurityError")
      }
      Object.defineProperty(Storage.prototype, "getItem", { value: blocked })
      Object.defineProperty(Storage.prototype, "setItem", { value: blocked })
    })
    await openWorld(page, sheets)
    expect(await navigationWidth(page)).toBe(256)

    await drag(page, 64)

    expect(await navigationWidth(page)).toBe(320)
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("has no edge in the rail, and the rail is 64px (S6)", async ({
    page,
    sheets,
  }) => {
    await openWorld(page, sheets)
    await page.getByRole("button", { name: COPY.en.fold }).click()

    await expect(edge(page)).toHaveCount(0)
    expect(await navigationWidth(page)).toBe(64)
  })
})

test("has no edge in the phone's drawer (S6)", async ({ page, sheets }) => {
  await page.setViewportSize(PHONE)
  await openWorld(page, sheets)
  await page
    .getByRole("banner")
    .getByRole("button", { name: COPY.en.menu })
    .click()

  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(edge(page)).toHaveCount(0)
})

for (const language of ["en", "cy"] as const) {
  test(`keeps a roadmap's page in the 624px left at 1024px, in ${language} (S7)`, async ({
    page,
    sheets,
  }) => {
    if (language === "cy") await useLanguage(page, "cy")
    await page.setViewportSize(NARROWEST_DESKTOP)
    await openLongRoadmap(page, sheets, { language })

    await drag(page, 144, language)

    expect(await navigationWidth(page)).toBe(400)
    expect(await scrollsSideways(page)).toBe(false)
    const inside = await page
      .getByRole("main")
      .locator("button, a")
      .evaluateAll((controls) =>
        controls
          .map((control) => control.getBoundingClientRect())
          .filter((box) => box.width > 0)
          .every(
            (box) =>
              box.left >= 400 - 0.5 && box.right <= window.innerWidth + 0.5,
          ),
      )
    expect(inside).toBe(true)
    // The pinned title strip starts where the navigation ends.
    await page.evaluate(() => {
      window.scrollTo(0, 900)
    })
    await expect.poll(async () => (await widths(page)).bar).toBe(400)
  })
}

test.describe("under a finger", () => {
  test.use({ hasTouch: true, isMobile: true })

  test("widens and narrows as with a pointer, the edge wider to catch (S8)", async ({
    page,
    sheets,
  }) => {
    await page.setViewportSize(DESKTOP)
    await openWorld(page, sheets)
    const cdp = await page.context().newCDPSession(page)
    const touch = async (
      type: "touchStart" | "touchMove" | "touchEnd",
      x: number,
      y: number,
    ) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      })
    }
    const box = await boxOf(edge(page))
    const y = box.y + 200

    await touch("touchStart", 256, y)
    await touch("touchMove", 330, y)
    await expect.poll(() => navigationWidth(page)).toBe(330)
    await touch("touchMove", 300, y)
    await expect.poll(() => navigationWidth(page)).toBe(300)
    await touch("touchEnd", 300, y)
    await expect.poll(() => navigationWidth(page)).toBe(300)
    // Thin as its line is, the edge to catch is no narrower than 24px.
    expect(box.width).toBeGreaterThanOrEqual(24)
  })
})
