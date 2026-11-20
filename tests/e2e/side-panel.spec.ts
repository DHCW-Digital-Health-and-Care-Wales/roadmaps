import type { Locator, Page } from "@playwright/test"

import { chooseFromAccountMenu, openAccountMenu } from "./fixtures/account-menu"
import {
  askToRemove,
  clickOutside,
  cornerClose,
  editItemButton,
  isInView,
  openAddItemDialog,
  openAddRoadmapDialog,
  openEditItemDialog,
  openEditRoadmapDialog,
} from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * The item and roadmap forms open along the right of the screen, unless a Product Lead
 * chose "Edit in a dialog" in the account menu (STY-077, STY-083).
 * Geometry, so one run at each size, in English and the light theme (CHO-014).
 */

test.use({ reducedMotion: "reduce" })

const ITEM = "Card being explored"
const LAPTOP = { width: 1366, height: 768 }
const PHONE = { width: 390, height: 844 }
const LANDSCAPE = { width: 844, height: 390 }

async function openProductA(page: Page) {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
}

/** The popup's box, and the screen it sits on. */
async function boxOf(page: Page, dialog: Locator) {
  const box = await dialog.boundingBox()
  const size = page.viewportSize()
  if (!box || !size) throw new Error("No box or viewport")
  return { box, size }
}

/** Whether the dialog sits along the right edge, full height, 32rem wide. */
async function expectPanel(page: Page, dialog: Locator) {
  const { box, size } = await boxOf(page, dialog)
  expect(box.x + box.width).toBeCloseTo(size.width, 0)
  expect(box.y).toBeCloseTo(0, 0)
  expect(box.height).toBeCloseTo(size.height, 0)
  expect(box.width).toBeCloseTo(512, 0)
}

const slot = (dialog: Locator, name: string) =>
  dialog.locator(`[data-slot="${name}"]`)

/** Whether the dialog's buttons end where the dialog does, however short its form. */
async function expectFooterAtFoot(dialog: Locator) {
  const [footer, panel] = await Promise.all([
    slot(dialog, "dialog-footer").boundingBox(),
    dialog.boundingBox(),
  ])
  if (!footer || !panel) throw new Error("No box")
  expect(footer.y + footer.height).toBeCloseTo(panel.y + panel.height, 0)
}

test("the account menu offers the dialog, and the way back, and the choice survives a reload (S1, S2, S3, S4)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await openProductA(page)
  await expectPanel(page, await openEditItemDialog(page, ITEM))
  await page.keyboard.press("Escape")
  const menu = await openAccountMenu(page)
  await expect(
    menu.getByRole("menuitem", { name: "Edit in a side panel" }),
  ).toHaveCount(0)

  await menu.getByRole("menuitem", { name: "Edit in a dialog" }).click()

  await expect(menu).toBeHidden()
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Account" }),
  ).toBeFocused()
  await page.reload()
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
  const dialog = await openEditItemDialog(page, ITEM)
  const { box, size } = await boxOf(page, dialog)
  expect(box.x + box.width).toBeLessThan(size.width)
  expect(box.height).toBeLessThan(size.height)
  await page.keyboard.press("Escape")

  await chooseFromAccountMenu(page, "Edit in a side panel")

  await expectPanel(page, await openEditItemDialog(page, ITEM))
})

test("on a laptop, an item's form is a panel along the right with its title, close button and buttons in view while its fields scroll (S2)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await openProductA(page)

  const dialog = await openEditItemDialog(page, ITEM)

  await expectPanel(page, dialog)
  const body = slot(dialog, "dialog-body")
  expect(await body.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
  const parts = [
    dialog.getByRole("heading", { name: "Edit this item" }),
    cornerClose(dialog),
    dialog.getByRole("button", { name: "Done" }),
    dialog.getByRole("button", { name: "Cancel" }),
  ]
  for (const part of parts) expect(await isInView(page, part)).toBe(true)
  await body.evaluate((e) => {
    e.scrollTop = e.scrollHeight
  })
  for (const part of parts) expect(await isInView(page, part)).toBe(true)
  // The rest of the page is dimmed beside it.
  const overlay = page.locator('[data-slot="dialog-overlay"]')
  await expect(overlay).toBeVisible()
  expect(
    await overlay.evaluate((e) => getComputedStyle(e).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)")
})

test("on a tall screen, a form that fits still has its buttons at the panel's foot, whichever form it is (S2, S3)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 1300 })
  await openProductA(page)
  const forms = [
    () => openEditItemDialog(page, ITEM),
    () => openAddItemDialog(page),
    () => openEditRoadmapDialog(page),
  ]

  for (const open of forms) {
    const dialog = await open()
    await expectPanel(page, dialog)
    await expectFooterAtFoot(dialog)
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  }
})

test("on a tall screen, Add a roadmap's buttons are at the panel's foot (S2)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 1300 })

  const dialog = await openAddRoadmapDialog(page)

  await expectPanel(page, dialog)
  await expectFooterAtFoot(dialog)
})

test("on a laptop, every form dialog is a panel, and a question is still centred (S3)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await openProductA(page)

  const adding = await openAddItemDialog(page)
  await expectPanel(page, adding)
  await page.keyboard.press("Escape")
  await expect(adding).toBeHidden()

  const roadmap = await openEditRoadmapDialog(page)
  await expectPanel(page, roadmap)
  await page.keyboard.press("Escape")
  await expect(roadmap).toBeHidden()

  const removal = await askToRemove(page, ITEM)
  const { box, size } = await boxOf(page, removal)
  expect(box.x + box.width).toBeLessThan(size.width)
  expect(box.height).toBeLessThan(size.height / 2)
})

test("on a laptop, a click on the dimmed page does nothing; Cancel, Escape and the close button close the panel and drop what was typed, focus back on Edit (S4)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await openProductA(page)
  let dialog = await openEditItemDialog(page, ITEM)
  const phase = dialog.getByRole("textbox", { name: "Phase" })
  await phase.fill("Beta")

  await clickOutside(page, dialog)

  await expect(dialog).toBeVisible()
  await expect(phase).toHaveValue("Beta")
  const closers: ((panel: Locator) => Promise<void>)[] = [
    (panel) => panel.getByRole("button", { name: "Cancel" }).click(),
    () => page.keyboard.press("Escape"),
    (panel) => cornerClose(panel).click(),
  ]
  for (const close of closers) {
    await close(dialog)
    await expect(dialog).toBeHidden()
    await expect(editItemButton(page, ITEM)).toBeFocused()
    await expect(page.getByText(/unpublished change/)).toHaveCount(0)
    dialog = await openEditItemDialog(page, ITEM)
    await expect(dialog.getByRole("textbox", { name: "Phase" })).toHaveValue(
      "Alpha",
    )
    await dialog.getByRole("textbox", { name: "Phase" }).fill("Beta")
  }
})

test("on a phone, the form rises from the foot at full width as the dialog does (S7)", async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await openProductA(page)

  const dialog = await openEditItemDialog(page, ITEM)

  const { box, size } = await boxOf(page, dialog)
  expect(box.x).toBeCloseTo(0, 0)
  expect(box.width).toBeCloseTo(size.width, 0)
  expect(box.y + box.height).toBeCloseTo(size.height, 0)
  expect(box.y).toBeGreaterThan(0)
})

test("on a short, wide screen, the panel is at the right and scrolls as one piece (S8)", async ({
  page,
}) => {
  await page.setViewportSize(LANDSCAPE)
  await openProductA(page)

  const dialog = await openEditItemDialog(page, ITEM)

  await expectPanel(page, dialog)
  expect(await dialog.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(
    true,
  )
  expect(
    await slot(dialog, "dialog-body").evaluate(
      (e) => getComputedStyle(e).overflowY,
    ),
  ).toBe("visible")
  const cancel = dialog.getByRole("button", { name: "Cancel" })
  expect(await isInView(page, cancel)).toBe(false)
  await cancel.scrollIntoViewIfNeeded()
  expect(await isInView(page, cancel)).toBe(true)
})

test("the session warning shows centred above the panel, and focus returns into the panel when it closes (S9)", async ({
  page,
}) => {
  await page.clock.install()
  await page.setViewportSize(LAPTOP)
  await openProductA(page)
  const dialog = await openEditItemDialog(page, ITEM)
  const outcome = dialog.getByRole("textbox", { name: "Expected outcome" })
  await outcome.fill("Typed before the warning")

  await page.clock.fastForward(sessionMs() - SESSION_WARNING_MS)

  const warning = page.getByRole("alertdialog", {
    name: "Your session is about to end",
  })
  await expect(warning).toBeVisible()
  const { box, size } = await boxOf(page, warning)
  expect(box.x + box.width / 2).toBeCloseTo(size.width / 2, -1)
  expect(
    await page.evaluate(
      ([x, y]) =>
        document
          .elementFromPoint(x ?? 0, y ?? 0)
          ?.closest('[role="alertdialog"]') !== null,
      [box.x + box.width / 2, box.y + box.height / 2],
    ),
  ).toBe(true)
  await page.keyboard.press("Escape")
  await expect(warning).toBeHidden()
  await expect(dialog).toBeVisible()
  await expect(outcome).toHaveValue("Typed before the warning")
  await expect(dialog.locator(":focus")).toHaveCount(1)
})

test("with reduced motion the panel shows in place, without sliding (S10)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await openProductA(page)

  await page
    .getByRole("main")
    .getByRole("button", { name: `Edit ${ITEM}`, exact: true })
    .click()

  const dialog = page.getByRole("dialog", { name: "Edit this item" })
  await expect(dialog).toBeVisible()
  await expectPanel(page, dialog)
  expect(
    await dialog.evaluate((e) =>
      e
        .getAnimations()
        .every((a) => Number(a.effect?.getTiming().duration ?? 0) < 1),
    ),
  ).toBe(true)
})

test("in Welsh, the menu names both ways in Welsh and the panel opens (S11, STY-083 S1)", async ({
  page,
}) => {
  await useLanguage(page, "cy")
  await page.setViewportSize(LAPTOP)
  await page.goto("./#/roadmaps/producta")
  await connect(page, "Cysylltu â Google")
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()

  await expectPanel(page, await openEditItemDialog(page, ITEM, "cy"))
  await page.keyboard.press("Escape")

  await chooseFromAccountMenu(page, "Golygu mewn deialog", "cy")

  const menu = await openAccountMenu(page, "cy")
  await expect(
    menu.getByRole("menuitem", { name: "Golygu mewn panel ochr" }),
  ).toBeVisible()
})
