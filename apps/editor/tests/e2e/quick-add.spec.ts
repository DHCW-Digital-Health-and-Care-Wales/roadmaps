import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"

import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { type FakeTab, withTabItems } from "./fixtures/fake-sheets"
import { escapeFrom } from "./fixtures/keyboard"
import { boxesOf } from "./fixtures/layout"
import { type Language, useTheme } from "./fixtures/look"
import { openRoadmapIn } from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

// Quick add (STY-080): each placement ends with "Add an item", which opens a title
// field in its place; Enter adds a new item there, title only, and opens the next.

test.use({ reducedMotion: "reduce" })

const COPY = {
  en: {
    open: (placement: string) => `Add an item to ${placement}`,
    field: (placement: string) => `Title of a new item in ${placement}`,
    more: "Add more details",
    compact: "Compact",
    compactView: "Compact view",
  },
  cy: {
    open: (placement: string) => `Ychwanegu eitem o dan ${placement}`,
    field: (placement: string) => `Teitl eitem newydd o dan ${placement}`,
    add: "Ychwanegu",
    more: "Ychwanegu rhagor o fanylion",
    cancel: "Canslo",
    compact: "Cryno",
    compactView: "Golwg gryno",
    next: "Nesaf",
  },
} as const

const HEARING = "Book a hearing test online"
const CHECK_IN = "Check in from your phone"

/** Product A with items in Now, Next, Later and Delivered this year, none elsewhere. */
const SPREADSHEET: readonly FakeTab[] = withTabItems(
  "ProductA",
  ["Leaflets in plain language", "Now"],
  ["Text reminders for appointments", "Now"],
  ["See your waiting time", "Next"],
  ["Choose a clinic online", "Later"],
  ["Paper forms retired", "Delivered this year"],
)

function main(page: Page): Locator {
  return page.getByRole("main")
}

function openRoadmap(
  page: Page,
  sheets: { spreadsheet: readonly FakeTab[] },
  language: Language = "en",
) {
  return openRoadmapIn(page, sheets, {
    spreadsheet: SPREADSHEET,
    tab: "ProductA",
    lastCard: "Paper forms retired",
    language,
  })
}

async function chooseCompact(page: Page, language: Language = "en") {
  const wide = (page.viewportSize()?.width ?? 0) >= 768
  await main(page)
    .getByRole("button", {
      name: wide ? COPY[language].compact : COPY[language].compactView,
      exact: true,
    })
    .click()
}

function quickAdd(page: Page, placement: string, language: Language = "en") {
  return main(page).getByRole("button", {
    name: COPY[language].open(placement),
    exact: true,
  })
}

function field(page: Page, placement: string, language: Language = "en") {
  return main(page).getByRole("textbox", {
    name: COPY[language].field(placement),
  })
}

/** The titles of the items listed under `placement`, in order. */
function titlesUnder(page: Page, placement: string): Locator {
  return main(page)
    .getByRole("list", { name: placement, exact: true })
    .getByRole("heading", { level: 3 })
}

test("a press on another placement's “Add an item” opens its field, as Next's closes (S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openRoadmap(page, sheets)

  await quickAdd(page, "Next").click()
  await field(page, "Next").fill(HEARING)
  const later = quickAdd(page, "Later")
  await later.scrollIntoViewIfNeeded()
  // Next's field, taller than its control, is still open as the press lands: the
  // field closes once it has ended, so Later's control is where it was aimed.
  await later.click()

  await expect(field(page, "Later")).toBeFocused()
  await expect(field(page, "Next")).toHaveCount(0)
  await expect(quickAdd(page, "Next")).toBeVisible()
  await expect(titlesUnder(page, "Next")).toHaveText(["See your waiting time"])
})

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } })

  test("a tap on another placement's “Add an item” opens its field, as Next's closes, in the compact view (S5)", async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, sheets)
    await chooseCompact(page)

    await quickAdd(page, "Next").tap()
    await field(page, "Next").fill(HEARING)
    const later = quickAdd(page, "Later")
    await later.scrollIntoViewIfNeeded()
    // A tap moves focus once the finger has lifted, and Next's field is taller than
    // its control: the field closes only after the tap's click has landed.
    await later.tap()

    await expect(field(page, "Later")).toBeFocused()
    await expect(field(page, "Next")).toHaveCount(0)
    await expect(titlesUnder(page, "Next")).toHaveText([
      "See your waiting time",
    ])
  })
})

test("the session warning, opening as a title is typed, leaves the field and its title (S5)", async ({
  page,
  sheets,
}) => {
  await page.clock.install()
  await openRoadmap(page, sheets)
  await quickAdd(page, "Next").click()
  await field(page, "Next").fill(HEARING)

  await page.clock.fastForward(sessionMs() - SESSION_WARNING_MS)
  const warning = page.getByRole("alertdialog", {
    name: "Your session is about to end",
  })
  await escapeFrom(warning)

  await expect(field(page, "Next")).toHaveValue(HEARING)
  await field(page, "Next").focus()
  await page.keyboard.press("Enter")
  await expect(titlesUnder(page, "Next")).toHaveText([
    "See your waiting time",
    HEARING,
  ])
})

test("closing the item dialog “Add more details” opens sends focus back: to the field as typed after Cancel, to the new card's Edit after adding, to the placement's “Add an item” after “Add and start another” (STY-081 S3, S4, S7)", async ({
  page,
  sheets,
}) => {
  const typed = " Book a  hearing test "
  const tidied = "Book a hearing test"
  await openRoadmap(page, sheets)
  await quickAdd(page, "Next").click()
  await field(page, "Next").fill(typed)
  const more = main(page).getByRole("button", { name: COPY.en.more })
  await more.click()
  const dialog = page.getByRole("dialog", { name: "Add an item" })
  await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused()

  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(field(page, "Next")).toBeFocused()
  await expect(field(page, "Next")).toHaveValue(typed)

  await more.click()
  await dialog.getByRole("button", { name: "Add item", exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(
    main(page).getByRole("button", { name: `Edit ${tidied}` }),
  ).toBeFocused()
  await expect(field(page, "Next")).toHaveCount(0)

  await quickAdd(page, "Later").click()
  await field(page, "Later").fill(CHECK_IN)
  await more.click()
  await dialog
    .getByRole("button", { name: "Add and start another", exact: true })
    .click()
  await expect(dialog.getByRole("status")).toContainText(CHECK_IN)
  await escapeFrom(dialog)
  await expect(quickAdd(page, "Later")).toBeFocused()
  await expect(field(page, "Later")).toHaveCount(0)
})

test.describe("the field's layout (S2)", () => {
  // The phone's reflow width and the `md` breakpoint, where Add and Cancel move beside
  // the field.
  for (const [width, beside] of [
    [375, false],
    [768, true],
  ] as const) {
    test(`in Welsh at ${String(width)}px, Add and Cancel sit ${beside ? "beside" : "under"} the field in the compact view and under it in the cards view, full size, within the list`, async ({
      page,
      sheets,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await openRoadmap(page, sheets, "cy")
      for (const view of ["cards", "compact"] as const) {
        if (view === "compact") await chooseCompact(page, "cy")
        await quickAdd(page, COPY.cy.next, "cy").click()
        const title = field(page, COPY.cy.next, "cy")
        await expect(title).toBeFocused()
        await expect(title).not.toHaveAttribute("placeholder")
        const add = main(page).getByRole("button", {
          name: COPY.cy.add,
          exact: true,
        })
        const cancel = main(page).getByRole("button", {
          name: COPY.cy.cancel,
          exact: true,
        })
        const list = main(page).getByRole("list", {
          name: COPY.cy.next,
          exact: true,
        })
        const more = main(page).getByRole("button", {
          name: COPY.cy.more,
          exact: true,
        })
        const [fieldBox, addBox, cancelBox, listBox, moreBox] = await boxesOf(
          title,
          add,
          cancel,
          list,
          more,
        )
        // "Add more details" is inside the field's end (STY-081 S1).
        expect(moreBox.right).toBeLessThan(fieldBox.right)
        expect(moreBox.right).toBeGreaterThan(fieldBox.right - 8)
        expect(moreBox.y).toBeGreaterThan(fieldBox.y)
        expect(moreBox.bottom).toBeLessThan(fieldBox.bottom)
        expect(Math.round(addBox.height)).toBe(40)
        expect(Math.round(cancelBox.height)).toBe(40)
        if (view === "compact" && beside) {
          // Centred on the field's line.
          expect(
            Math.abs(
              addBox.y + addBox.height / 2 - (fieldBox.y + fieldBox.height / 2),
            ),
          ).toBeLessThan(1)
          expect(addBox.x).toBeGreaterThan(fieldBox.right)
        } else {
          expect(addBox.y).toBeGreaterThanOrEqual(fieldBox.bottom)
        }
        expect(cancelBox.right).toBeLessThanOrEqual(listBox.right)
        await page.keyboard.press("Escape")
        await expect(title).toHaveCount(0)
      }
    })
  }
})

for (const theme of ["light", "dark"] as const) {
  test(`has no axe violation with a field open, in each view, in the ${theme} theme (S13)`, async ({
    page,
    sheets,
  }) => {
    await useTheme(page, theme)
    await openRoadmap(page, sheets)
    for (const view of ["cards", "compact"] as const) {
      if (view === "compact") await chooseCompact(page)
      await quickAdd(page, "Next").click()
      await field(page, "Next").fill(HEARING)
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(results.violations).toEqual([])
      await page.keyboard.press("Escape")
      await expect(field(page, "Next")).toHaveCount(0)
    }
  })

  test(`has no axe violation in the dialog “Add more details” opens, in the ${theme} theme (STY-081 S6)`, async ({
    page,
    sheets,
  }) => {
    await useTheme(page, theme)
    await openRoadmap(page, sheets)
    await quickAdd(page, "Next").click()
    await field(page, "Next").fill(HEARING)
    await main(page).getByRole("button", { name: COPY.en.more }).click()
    const dialog = page.getByRole("dialog", { name: "Add an item" })
    await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused()

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations).toEqual([])
  })
}
