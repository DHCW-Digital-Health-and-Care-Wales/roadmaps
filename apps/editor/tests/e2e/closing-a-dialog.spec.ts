import type { Locator, Page } from "@playwright/test"

import {
  addRoadmapButtons,
  changeItem,
  clickOutside,
  cornerClose,
  editItemButton,
  editRoadmapButton,
  isInView,
  openAddItemDialog,
  openAddRoadmapDialog,
  openEditItemDialog,
  openEditRoadmapDialog,
} from "./fixtures/dialogs"
import { centre, boxesOf } from "./fixtures/layout"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead closes a form dialog from the close button at its top right (STY-068),
 * against the fake Sheets API: it shows as the dialog opens, at every width, closes as
 * Cancel does, and on a phone scrolls away with the title (a laptop's stays pinned with
 * it, STY-076). The conflict review's own is held in
 * `roadmap-detail-page-editing.test.tsx`.
 */

const ITEM = "Card being explored"
const PHONE = { width: 375, height: 667 }
const DESKTOP = { width: 1280, height: 800 }

async function openProductA(page: Page) {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
}

for (const [size, viewport] of [
  ["a phone", PHONE],
  ["a desktop", DESKTOP],
] as const) {
  test(`on ${size}, the close button is at the title's row, top right, as the item dialog opens, and on a phone scrolls away with the title (S1, S9)`, async ({
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
    const [box, titleBox, dialogBox] = await boxesOf(close, title, dialog)
    // At the dialog's right edge, level with the title, which keeps clear of it.
    expect(dialogBox.right - box.right).toBeLessThan(32)
    expect(Math.abs(centre(box) - centre(titleBox))).toBeLessThan(8)
    // The title's text has room up to the close button, and no further.
    const room = await title.evaluate(
      (heading) =>
        heading.getBoundingClientRect().right -
        Number.parseFloat(getComputedStyle(heading).paddingRight),
    )
    expect(room).toBeLessThanOrEqual(box.x)

    // Scrolled to the foot, a phone's title and close button have gone, as one piece with
    // the form; a desktop's are pinned (STY-076), so they stay with Cancel.
    const cancel = dialog.getByRole("button", { name: "Cancel" })
    await cancel.scrollIntoViewIfNeeded()
    const pinned = viewport === DESKTOP
    expect(await isInView(page, close)).toBe(pinned)
    expect(await isInView(page, title)).toBe(pinned)
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

test.describe("every form dialog has it, and a click outside does not close it (S3)", () => {
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

      // A click outside it does nothing.
      await clickOutside(page, dialog)
      await expect(dialog).toBeVisible()
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
