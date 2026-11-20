import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"

import { reconnectDialog } from "./fixtures/dialogs"
import { sessionMs } from "./fixtures/fake-gis"
import { type FakeTab, withTabItems } from "./fixtures/fake-sheets"
import { boxesOf } from "./fixtures/layout"
import { type Language, useTheme } from "./fixtures/look"
import { openRoadmapIn, refreshRoadmap } from "./fixtures/roadmap-page"
import { expect, test } from "./fixtures/test"

// Quick add (STY-080): each placement ends with "Add an item", which opens a title
// field in its place; Enter adds a new item there, title only, and opens the next.

test.use({ reducedMotion: "reduce" })

const COPY = {
  en: {
    open: (placement: string) => `Add an item to ${placement}`,
    first: (placement: string) => `Add the first item to ${placement}`,
    field: (placement: string) => `Title of a new item in ${placement}`,
    add: "Add",
    cancel: "Cancel",
    compact: "Compact",
    compactView: "Compact view",
    next: "Next",
  },
  cy: {
    open: (placement: string) => `Ychwanegu eitem o dan ${placement}`,
    first: (placement: string) => `Ychwanegu'r eitem gyntaf o dan ${placement}`,
    field: (placement: string) => `Teitl eitem newydd o dan ${placement}`,
    add: "Ychwanegu",
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

/** The page's status line that says `text`. */
function said(page: Page, text: string): Locator {
  return main(page).getByRole("status").filter({ hasText: text })
}

for (const view of ["cards", "compact"] as const) {
  test(`adds a run of items by title in the ${view} view, each pending and last in its placement, then publishes them (S3, S4, S12)`, async ({
    page,
    sheets,
  }) => {
    await openRoadmap(page, sheets)
    if (view === "compact") await chooseCompact(page)

    await quickAdd(page, "Next").click()
    const title = field(page, "Next")
    await expect(title).toBeFocused()
    await title.fill(HEARING)
    await page.keyboard.press("Enter")

    await expect(titlesUnder(page, "Next")).toHaveText([
      "See your waiting time",
      HEARING,
    ])
    await expect(said(page, `“${HEARING}” was added to Next.`)).toHaveCount(1)
    await expect(title).toBeFocused()
    await expect(title).toHaveValue("")
    await title.fill(CHECK_IN)
    await main(page).getByRole("button", { name: "Add", exact: true }).click()
    await expect(titlesUnder(page, "Next")).toHaveText([
      "See your waiting time",
      HEARING,
      CHECK_IN,
    ])
    await expect(title).toBeFocused()
    await expect(main(page).getByText("2 unpublished changes")).toBeVisible()
    expect(sheets.writes).toHaveLength(0)

    await title.fill("Not wanted")
    await page.keyboard.press("Escape")
    await expect(quickAdd(page, "Next")).toBeFocused()
    await expect(titlesUnder(page, "Next")).toHaveCount(3)

    await main(page).getByRole("button", { name: "Publish changes" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Publish changes" })
      .click()
    await expect(main(page).getByText(/^Changes published\./)).toBeVisible()
    expect(sheets.writes).toHaveLength(1)
    await expect(titlesUnder(page, "Next")).toHaveText([
      "See your waiting time",
      HEARING,
      CHECK_IN,
    ])
  })
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

test("Cancel drops what was typed; Tab to Add and Cancel keeps the field, and Tab past them drops it (S4, S5)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, sheets)

  await quickAdd(page, "Later").click()
  await field(page, "Later").fill(HEARING)
  await main(page).getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(quickAdd(page, "Later")).toBeFocused()
  await expect(titlesUnder(page, "Later")).toHaveText([
    "Choose a clinic online",
  ])

  await page.keyboard.press("Enter")
  await field(page, "Later").fill(HEARING)
  await page.keyboard.press("Tab")
  await expect(
    main(page).getByRole("button", { name: "Add", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(
    main(page).getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(field(page, "Later")).toHaveCount(0)
  await expect(quickAdd(page, "Later")).toBeVisible()
  await expect(titlesUnder(page, "Later")).toHaveText([
    "Choose a clinic online",
  ])
})

test("an empty placement offers its first item, and adding it there needs no other step (S1, S6)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, sheets)
  const notDoing = main(page).getByRole("button", {
    name: COPY.en.first("Not doing"),
  })
  await expect(
    notDoing.getByText("Add the first item", { exact: true }),
  ).toBeVisible()
  await expect(main(page).getByText("No items", { exact: true })).toHaveCount(0)

  await notDoing.click()
  await page.keyboard.press("Enter")
  await expect(field(page, "Not doing")).toBeFocused()
  await field(page, "Not doing").fill("  Paper   letters ")
  await page.keyboard.press("Enter")

  await expect(titlesUnder(page, "Not doing")).toHaveText(["Paper letters"])
})

test("adds while the session has expired, without asking to reconnect; Publish still asks (S10)", async ({
  page,
  sheets,
}) => {
  await page.clock.install()
  await openRoadmap(page, sheets)

  await page.clock.fastForward(sessionMs())
  await page.keyboard.press("Escape")
  await expect(main(page).getByText("Your session has expired")).toBeVisible()

  await quickAdd(page, "Next").click()
  await field(page, "Next").fill(HEARING)
  await page.keyboard.press("Enter")
  await expect(titlesUnder(page, "Next")).toHaveText([
    "See your waiting time",
    HEARING,
  ])
  await expect(reconnectDialog(page)).toHaveCount(0)

  await main(page).getByRole("button", { name: "Publish changes" }).click()
  await expect(reconnectDialog(page)).toBeVisible()
})

// The publish dialog is modal until the publish has settled and the items are read
// again, and opening it leaves the field: the read that lands with a field open is a
// Refresh's, as the publish's own read is drawn.
test("a field open as the items are read again stays open with what was typed in it (S9)", async ({
  page,
  sheets,
}) => {
  await openRoadmap(page, sheets)
  const release = sheets.hold()
  await refreshRoadmap(page)

  await quickAdd(page, "Next").click()
  await field(page, "Next").fill(HEARING)
  release()
  await expect(
    main(page).getByRole("button", { name: "More", exact: true }),
  ).not.toHaveAttribute("aria-busy", "true")

  await expect(field(page, "Next")).toHaveValue(HEARING)
  await expect(field(page, "Next")).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(titlesUnder(page, "Next")).toHaveText([
    "See your waiting time",
    HEARING,
  ])
})

test.describe("the field's layout (S2)", () => {
  for (const [width, beside] of [
    [375, false],
    [640, false],
    [768, true],
    [1024, true],
    [1280, true],
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
        const [fieldBox, addBox, cancelBox, listBox] = await boxesOf(
          title,
          add,
          cancel,
          list,
        )
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
    }
  })
}
