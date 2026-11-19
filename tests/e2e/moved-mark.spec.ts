import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { withTabItems } from "./fixtures/fake-sheets"
import {
  type Language,
  tokenColour,
  useLanguage,
  useTheme,
} from "./fixtures/look"
import {
  chooseCompact,
  chooseFromMenu,
  inRoom,
  itemOf,
  main,
  moveButton,
} from "./fixtures/moved-items"
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
  en: { upOne: "Up one", movedUp: "Moved up", short: "Moved" },
  cy: { upOne: "I fyny un", movedUp: "Symudwyd i fyny", short: "Symudwyd" },
} as const satisfies Record<Language, Record<string, string>>

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

/** A computed `box-shadow` layer in `colour` whose lengths match `lengths`. */
function shadowOf(colour: string, lengths: RegExp): RegExp {
  const escaped = colour.replace(/[()]/g, "\\$&")
  return new RegExp(`${escaped} ${lengths.source}`)
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

test("“Undo order” at once after a move leaves focus on its heading, in view: the reveal stops with the mark (S4, S8)", async ({
  page,
  sheets,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  const now = Array.from({ length: 20 }, (_, at): [string, string] => [
    `Now item ${String(at + 1)}`,
    "Now",
  ])
  sheets.spreadsheet = withTabItems(
    "ProductA",
    ["Minimal card", "Next"],
    ...now,
  )
  await page.setViewportSize(DESKTOP)
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  const last = itemOf(page, "Now item 20")
  await expect(last).toBeAttached()
  await chooseFromMenu(page, "Now item 20", "To the top")
  await expect.poll(() => inRoom(last)).toBe(true)

  await main(page).getByRole("button", { name: "Undo order Now" }).click()

  const heading = main(page).getByRole("heading", { level: 2, name: "Now" })
  await expect(heading).toBeFocused()
  // Nothing is pending: the foot bar goes, which the reveal of a mark still
  // showing would follow, two frames on.
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--pinned-bottom"),
      ),
    )
    .toMatch(/^(0px)?$/)
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      }),
  )
  await expect(heading).toBeInViewport()
  await expect(heading).toBeFocused()
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
      // A bar inside its edge, a ring round it, and the grey bar still under it.
      expect(shadow).toMatch(shadowOf(success, /[1-9]\d*px 0px 0px 0px inset/))
      expect(shadow).toMatch(shadowOf(success, /0px 0px 0px [1-9]\d*px/))
      expect(shadow).toMatch(shadowOf(border, /0px [1-9]\d*px 0px 0px/))
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
        ).toMatch(
          shadowOf(
            await tokenColour(page, "--status-success-border"),
            /[1-9]\d*px 0px 0px 0px inset/,
          ),
        )
        // The row's line is still one line on a desktop: Move and Edit in view.
        await expect(
          moveButton(page, "Minimal card", language),
        ).toBeInViewport()
      })
    }
  }

  test("a compact row's “Placed” shows whole in a list too narrow for “Moved up” (D19)", async ({
    page,
    sheets,
  }) => {
    sheets.spreadsheet = withTabItems(
      "ProductA",
      ["Someday", "Soon"],
      ["Minimal card", "Now"],
    )
    await open(page, PHONE)
    await chooseCompact(page)
    const row = itemOf(page, "Someday")

    await chooseFromMenu(page, "Someday", "Now")

    await expect(row.getByText("Placed", { exact: true })).toBeVisible()
    await expect(shortPart(row)).toHaveCount(0)
  })
})
