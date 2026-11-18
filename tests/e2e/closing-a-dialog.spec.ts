import type { Locator, Page } from "@playwright/test"

import {
  addRoadmapButtons,
  changeItem,
  cornerClose,
  editItemButton,
  editRoadmapButton,
  openAddItemDialog,
  openAddRoadmapDialog,
  openEditItemDialog,
  openEditRoadmapDialog,
} from "./fixtures/dialogs"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead closes a form dialog from the close button at its top right (STY-068),
 * against the fake Sheets API: it shows as the dialog opens, at every width, closes as
 * Cancel does, and scrolls away with the title. The conflict review's own is held in
 * `roadmap-detail-page-editing.test.tsx`.
 */

const ITEM = "Card being explored"
const PHONE = { width: 375, height: 667 }
const DESKTOP = { width: 1280, height: 800 }

async function openProductA(page: Page, language: "en" | "cy" = "en") {
  if (language === "cy") await useLanguage(page, "cy")
  await page.goto("./#/roadmaps/producta")
  await connect(page, language === "cy" ? "Cysylltu â Google" : undefined)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
}

/** Whether `locator` lies wholly within the screen as it is now scrolled. */
async function isInView(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox()
  const size = page.viewportSize()
  if (!box || !size) throw new Error("No box or viewport")
  return box.y >= 0 && box.y + box.height <= size.height
}

for (const [size, viewport] of [
  ["a phone", PHONE],
  ["a desktop", DESKTOP],
] as const) {
  test(`on ${size}, the close button is at the title's row, top right, as the item dialog opens, and scrolls away with the title (S1, S9)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await openProductA(page)
    const dialog = await openEditItemDialog(page, ITEM)
    const close = cornerClose(dialog)
    const title = dialog.getByRole("heading", { name: "Edit this item" })

    await expect(close).toBeVisible()
    expect(await isInView(page, close)).toBe(true)
    await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused()
    const [box, titleBox, dialogBox] = await Promise.all([
      close.boundingBox(),
      title.boundingBox(),
      dialog.boundingBox(),
    ])
    if (!box || !titleBox || !dialogBox) throw new Error("No box")
    // At the dialog's right edge, level with the title, which keeps clear of it.
    expect(dialogBox.x + dialogBox.width - (box.x + box.width)).toBeLessThan(32)
    expect(
      Math.abs(box.y + box.height / 2 - (titleBox.y + titleBox.height / 2)),
    ).toBeLessThan(8)
    // The title's text has room up to the close button, and no further.
    const room = await title.evaluate(
      (heading) =>
        heading.getBoundingClientRect().right -
        Number.parseFloat(getComputedStyle(heading).paddingRight),
    )
    expect(room).toBeLessThanOrEqual(box.x)

    // Scrolled to the foot, the title and the close button have gone and Cancel is there.
    const cancel = dialog.getByRole("button", { name: "Cancel" })
    await cancel.scrollIntoViewIfNeeded()
    if (viewport === PHONE) {
      expect(await isInView(page, close)).toBe(false)
      expect(await isInView(page, title)).toBe(false)
    }
    await expect(cancel).toBeInViewport()
  })
}

test("the close button closes the item dialog as Cancel does: what was typed is dropped, no edit is kept, and focus is back on Edit (S2)", async ({
  page,
}) => {
  await openProductA(page)
  const dialog = await openEditItemDialog(page, ITEM)
  await dialog.getByRole("textbox", { name: "Phase" }).fill("Beta")

  await cornerClose(dialog).click()

  await expect(dialog).toBeHidden()
  await expect(editItemButton(page, ITEM)).toBeFocused()
  await expect(page.getByText(/unpublished change/)).toHaveCount(0)
  const card = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { level: 3, name: ITEM }),
    })
  await expect(card.getByText("Alpha")).toBeVisible()
  const reopened = await openEditItemDialog(page, ITEM)
  await expect(reopened.getByRole("textbox", { name: "Phase" })).toHaveValue(
    "Alpha",
  )
})

test.describe("every form dialog has it (S3)", () => {
  const dialogs: readonly {
    name: string
    open: (page: Page) => Promise<Locator>
    opener: (page: Page) => Locator
  }[] = [
    {
      name: "adding a roadmap",
      open: (page) => openAddRoadmapDialog(page),
      opener: (page) => addRoadmapButtons(page).first(),
    },
    {
      name: "editing product details",
      open: async (page) => {
        await openProductA(page)
        return openEditRoadmapDialog(page)
      },
      opener: (page) => editRoadmapButton(page),
    },
    {
      name: "adding an item",
      open: async (page) => {
        await openProductA(page)
        return openAddItemDialog(page)
      },
      opener: (page) =>
        page
          .getByRole("main")
          .getByRole("button", { name: "Add an item" })
          .first(),
    },
    {
      name: "editing an item",
      open: async (page) => {
        await openProductA(page)
        return openEditItemDialog(page, ITEM)
      },
      opener: (page) => editItemButton(page, ITEM),
    },
  ]
  for (const { name, open, opener } of dialogs) {
    test(name, async ({ page }) => {
      const dialog = await open(page)

      await cornerClose(dialog).click()

      await expect(dialog).toBeHidden()
      await expect(opener(page)).toBeFocused()
    })
  }
})

test("it is a button named Close, its icon hidden from assistive technology (S4)", async ({
  page,
}) => {
  await openProductA(page)
  const english = await openEditItemDialog(page, ITEM)
  await expect(cornerClose(english)).toHaveRole("button")
  await expect(cornerClose(english)).toHaveAccessibleName("Close")
  await expect(cornerClose(english).locator("svg")).toHaveAttribute(
    "aria-hidden",
    "true",
  )
})

test("it is named Cau in the Welsh interface (S4)", async ({ page }) => {
  await openProductA(page, "cy")
  const dialog = await openEditItemDialog(page, ITEM, "cy")

  await expect(cornerClose(dialog)).toHaveAccessibleName("Cau")
})

test("Tab from the last control in the footer wraps to the close button, then the first field (S6)", async ({
  page,
}) => {
  await openProductA(page)
  const dialog = await openEditItemDialog(page, ITEM)
  const close = cornerClose(dialog)

  await dialog.getByRole("button", { name: "Cancel" }).focus()
  await page.keyboard.press("Tab")
  await expect(close).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(close).toBeFocused()
})

test("an alert dialog has no close button (S8)", async ({ page }) => {
  await openProductA(page)
  await changeItem(page, "producta", ITEM)
  await page
    .getByRole("main")
    .getByRole("button", { name: "Publish changes" })
    .click()

  const alert = page.getByRole("alertdialog")
  await expect(
    alert.getByRole("button", { name: "Publish changes" }),
  ).toBeVisible()
  await expect(alert.locator("button")).toHaveCount(2)
  await expect(alert.getByRole("button", { name: "Close" })).toHaveCount(0)
})
