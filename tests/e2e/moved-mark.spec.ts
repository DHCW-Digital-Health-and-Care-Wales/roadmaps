import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import {
  type Language,
  tokenColour,
  useLanguage,
  useTheme,
} from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-071: the item a Product Lead moved last shows the moved mark, an edge and a label
 * saying how it moved, and the page scrolls to it. What keeps and clears the mark, and
 * the status line's words, are held in the page's unit tests; here what needs layout:
 * the scroll (S4), the label's place and its short form by the list's width (S3), the
 * edge that shifts nothing (S1), the dark theme and Welsh (S9).
 */

const PHONE = { width: 375, height: 812 }
const NARROWEST_DESKTOP = { width: 1024, height: 768 }
const DESKTOP = { width: 1280, height: 812 }

const COPY = {
  en: {
    move: "Move",
    later: "Later",
    upOne: "Up one",
    movedUp: "Moved up",
    short: "Moved",
    compact: "Compact",
    compactView: "Compact view",
  },
  cy: {
    move: "Symud",
    later: "Hwyrach",
    upOne: "I fyny un",
    movedUp: "Symudwyd i fyny",
    short: "Symudwyd",
    compact: "Cryno",
    compactView: "Golwg gryno",
  },
} as const satisfies Record<Language, Record<string, string>>

const main = (page: Page) => page.getByRole("main")

/** The card or row of the item titled `title`. */
function itemOf(page: Page, title: string): Locator {
  return main(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) })
}

const moveButton = (page: Page, title: string, language: Language = "en") =>
  main(page).getByRole("button", {
    name: `${COPY[language].move} ${title}`,
    exact: true,
  })

async function open(
  page: Page,
  size: { width: number; height: number },
  language: Language = "en",
) {
  await page.setViewportSize(size)
  await page.goto("./#/roadmaps/producta")
  await connect(page, language === "cy" ? "Cysylltu â Google" : undefined)
  await expect(
    main(page).getByRole("heading", { level: 3, name: "Minimal card" }),
  ).toBeVisible()
}

async function chooseFromMenu(
  page: Page,
  title: string,
  choice: string,
  language: Language = "en",
) {
  await moveButton(page, title, language).click()
  await page.getByRole("menuitem", { name: choice, exact: true }).click()
  await expect(page.getByRole("menu")).toBeHidden()
}

async function chooseCompact(page: Page, language: Language = "en") {
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
async function inRoom(item: Locator): Promise<boolean> {
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

/** The part of a label a sighted reader sees when it is cut: its "Moved". */
const shortPart = (item: Locator, language: Language = "en") =>
  item.locator('[aria-hidden="true"]', {
    hasText: new RegExp(`^${COPY[language].short}$`),
  })

test.describe("the page scrolls to the moved item (S4)", () => {
  for (const motion of ["no-preference", "reduce"] as const) {
    test(`after a move from the Move menu to Later, below the screen, focus on its Move (${motion} motion)`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion })
      await open(page, DESKTOP)
      const later = main(page).getByRole("list", { name: "Later", exact: true })
      expect(await inRoom(later)).toBe(false)

      await chooseFromMenu(page, "Minimal card", "Later")

      await expect(later).toContainText("Minimal card")
      const card = itemOf(page, "Minimal card")
      await expect.poll(() => inRoom(card)).toBe(true)
      await expect(moveButton(page, "Minimal card")).toBeFocused()
      await expect(card.getByText("Moved from Now")).toBeVisible()
    })
  }

  test("after a move by the item dialog, focus on its Edit as the dialog closes", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await open(page, PHONE)
    const form = await openEditItemDialog(page, "Minimal card")
    await form
      .getByRole("combobox", { name: "Horizon or section" })
      .selectOption("Later")
    await form.getByRole("button", { name: "Done" }).click()
    await expect(form).toBeHidden()

    const card = itemOf(page, "Minimal card")
    await expect.poll(() => inRoom(card)).toBe(true)
    await expect(
      main(page).getByRole("button", {
        name: "Edit Minimal card",
        exact: true,
      }),
    ).toBeFocused()
    await expect(card.getByText("Moved from Now")).toBeVisible()
  })
})

test.describe("the mark's look", () => {
  test.use({ reducedMotion: "reduce" })

  for (const theme of ["light", "dark"] as const) {
    test(`a card's edge is the success tone round it, over its own padding, its grey bar kept, its label under the title (S1, S3, S9: ${theme})`, async ({
      page,
    }) => {
      await useTheme(page, theme)
      await open(page, DESKTOP)
      const card = itemOf(page, "Minimal card")
      const title = card.getByRole("heading", { level: 3 })
      const offset = async () => {
        const [cardBox, titleBox] = await Promise.all([
          card.boundingBox(),
          title.boundingBox(),
        ])
        return {
          left: (titleBox?.x ?? 0) - (cardBox?.x ?? 0),
          top: (titleBox?.y ?? 0) - (cardBox?.y ?? 0),
        }
      }
      const before = await offset()

      await chooseFromMenu(page, "Minimal card", "Up one")

      const label = card.getByText("Moved up", { exact: true })
      await expect(label).toBeVisible()
      expect(await offset()).toEqual(before)
      const [labelBox, titleBox] = await Promise.all([
        label.boundingBox(),
        title.boundingBox(),
      ])
      expect(labelBox?.y ?? 0).toBeGreaterThan(
        (titleBox?.y ?? 0) + (titleBox?.height ?? 0) - 1,
      )
      const shadow = await card.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      )
      const success = await tokenColour(page, "--status-success-border")
      const border = await tokenColour(page, "--border")
      expect(shadow).toContain(`${success} 6px 0px 0px 0px inset`)
      expect(shadow).toContain(`${success} 0px 0px 0px 2px`)
      expect(shadow).toContain(`${border} 0px 6px 0px 0px`)
      // Only the item moved is marked.
      await expect(main(page).getByText(/^Moved [^.]+$/)).toHaveCount(1)
    })
  }

  const widths = [
    ["a phone", PHONE, true],
    ["a 1024px screen beside the open navigation", NARROWEST_DESKTOP, true],
    ["a 1280px screen beside the open navigation", DESKTOP, false],
  ] as const
  for (const language of ["en", "cy"] as const) {
    for (const [where, size, short] of widths) {
      test(`a compact row's label is ${short ? "cut to its arrow and its first word" : "whole"} on ${where}, in ${language}, read whole (S3, S9)`, async ({
        page,
      }) => {
        await useLanguage(page, language)
        await open(page, size, language)
        await chooseCompact(page, language)
        const copy = COPY[language]
        const row = itemOf(page, "Minimal card")

        await chooseFromMenu(page, "Minimal card", copy.upOne, language)

        const whole = row.getByText(copy.movedUp, { exact: true })
        await expect(whole).toBeAttached()
        if (short) {
          await expect(shortPart(row, language)).toBeVisible()
          // The whole label is read, not seen: one pixel, as `sr-only` draws it.
          expect((await whole.boundingBox())?.width).toBeLessThanOrEqual(1)
        } else {
          await expect(whole).toBeVisible()
          await expect(shortPart(row, language)).toBeHidden()
        }
        expect(
          await row.evaluate((element) => getComputedStyle(element).boxShadow),
        ).toContain(
          `${await tokenColour(page, "--status-success-border")} 4px 0px 0px 0px inset`,
        )
        // The row's line is still one line on a desktop: Move and Edit in view.
        await expect(
          moveButton(page, "Minimal card", language),
        ).toBeInViewport()
      })
    }
  }
})
