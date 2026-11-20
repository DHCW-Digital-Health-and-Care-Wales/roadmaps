import type { Locator, Page } from "@playwright/test"

import {
  askToRemove,
  cornerClose,
  isInView,
  openAddItemDialog,
  openAddRoadmapDialog,
  openEditItemDialog,
} from "./fixtures/dialogs"
import { settledBox, settledBoxes } from "./fixtures/layout"
import { words } from "./fixtures/long-fields"
import { connect, expect, test } from "./fixtures/test"

/**
 * A dialog keeps its title, its close button and its buttons in view while its form
 * scrolls (STY-076), where there is room: a screen at least 640px wide and 500px tall.
 * Narrower or shorter it scrolls as one piece. Geometry, so one run at each size, in
 * English and the light theme (CHO-014).
 */

const ITEM = "Card being explored"
const LAPTOP = { width: 1366, height: 768 }
const PHONE = { width: 390, height: 844 }
const LANDSCAPE = { width: 844, height: 390 }

async function openItem(page: Page): Promise<Locator> {
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
  return openEditItemDialog(page, ITEM)
}

/** Whether `inner`'s box lies wholly inside `outer`'s, on both axes. */
async function expectWithin(outer: Locator, inner: Locator): Promise<void> {
  const [outerBox, innerBox] = await settledBoxes(outer, inner)
  expect(innerBox.x).toBeGreaterThanOrEqual(outerBox.x)
  expect(innerBox.right).toBeLessThanOrEqual(outerBox.right)
  expect(innerBox.y).toBeGreaterThanOrEqual(outerBox.y)
  expect(innerBox.bottom).toBeLessThanOrEqual(outerBox.bottom)
}

const slot = (dialog: Locator, name: string) =>
  dialog.locator(`[data-slot="${name}"]`)

/** The border widths of `locator`'s top and bottom edges. */
function edges(locator: Locator) {
  return locator.evaluate((element) => {
    const { borderTopWidth, borderBottomWidth } = getComputedStyle(element)
    return { top: borderTopWidth, bottom: borderBottomWidth }
  })
}

test("on a laptop, a long form's title, close button and buttons stay in view while its fields scroll (S1)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  const dialog = await openItem(page)
  const title = dialog.getByRole("heading", { name: "Edit this item" })
  const done = dialog.getByRole("button", { name: "Done" })
  const body = slot(dialog, "dialog-body")

  // As it opens: the form is taller than the dialog, and both ends are in view.
  expect(
    await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  for (const part of [title, cornerClose(dialog), done]) {
    expect(await isInView(page, part)).toBe(true)
  }

  // Scrolled to the end of the fields, they are all still there.
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  for (const part of [title, cornerClose(dialog), done]) {
    expect(await isInView(page, part)).toBe(true)
  }
  expect(await body.evaluate((element) => element.scrollTop > 0)).toBe(true)

  // Neither pinned part is squeezed by the form: nothing of them is out of reach.
  for (const part of ["dialog-header", "dialog-footer"]) {
    expect(
      await slot(dialog, part).evaluate(
        (element) => element.scrollHeight <= element.clientHeight,
      ),
    ).toBe(true)
  }

  // A hairline sets the header and the footer apart, on the dialog's white.
  expect((await edges(slot(dialog, "dialog-header"))).bottom).toBe("1px")
  expect((await edges(slot(dialog, "dialog-footer"))).top).toBe("1px")
})

test("on a laptop, the dialog stays its content's height and shows no scrollbar when its content fits (S2)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
  const dialog = await askToRemove(page, ITEM)

  const box = await settledBox(dialog)
  expect(box.height).toBeLessThan(LAPTOP.height / 2)
  expect(
    await dialog.evaluate(
      (element) => element.scrollHeight <= element.clientHeight,
    ),
  ).toBe(true)
  // Its question has a header and a footer only: one hairline between them.
  expect((await edges(slot(dialog, "dialog-header"))).bottom).toBe("0px")
  expect((await edges(slot(dialog, "dialog-footer"))).top).toBe("1px")
})

for (const [size, viewport] of [
  ["a phone", PHONE],
  ["a phone held landscape", LANDSCAPE],
] as const) {
  test(`on ${size}, the dialog scrolls as one piece: its title, close button and buttons scroll with the fields (S3, S4)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const dialog = await openItem(page)
    const title = dialog.getByRole("heading", { name: "Edit this item" })
    const cancel = dialog.getByRole("button", { name: "Cancel" })

    expect(
      await dialog.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true)
    expect(
      await slot(dialog, "dialog-body").evaluate(
        (e) => getComputedStyle(e).overflowY,
      ),
    ).toBe("visible")
    expect(await isInView(page, title)).toBe(true)
    expect(await isInView(page, cancel)).toBe(false)

    await cancel.scrollIntoViewIfNeeded()

    expect(await isInView(page, cancel)).toBe(true)
    expect(await isInView(page, title)).toBe(false)
    expect(await isInView(page, cornerClose(dialog))).toBe(false)
    expect(await edges(slot(dialog, "dialog-header"))).toEqual({
      top: "0px",
      bottom: "0px",
    })
  })
}

test("on a laptop, a failed Add a roadmap is said in the footer above Add roadmap and Cancel, in view (S5)", async ({
  page,
  sheets,
}) => {
  await page.setViewportSize(LAPTOP)
  const dialog = await openAddRoadmapDialog(page)
  await dialog
    .getByRole("textbox", { name: "Product name" })
    .fill("Community Nursing roadmap")

  sheets.failWith(401)
  await dialog.getByRole("button", { name: "Add roadmap" }).click()

  const alert = dialog.getByRole("alert")
  await expect(alert).toContainText("Your session expired")
  await expect(slot(dialog, "dialog-footer").getByRole("alert")).toBeVisible()
  expect(await isInView(page, alert)).toBe(true)
  const [alertBox, addBox] = await settledBoxes(
    alert,
    dialog.getByRole("button", { name: "Add roadmap" }),
  )
  expect(alertBox.bottom).toBeLessThanOrEqual(addBox.y)
  await expect(
    dialog.getByRole("textbox", { name: "Product name" }),
  ).toHaveValue("Community Nursing roadmap")
})

test("on a laptop, the note about an item being added unpublished is the end of the scrolling body, not in the footer (S6)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  const dialog = await openAddItemDialog(page)

  const note = dialog.getByText(
    "It stays unpublished until you choose “Publish changes”.",
  )
  await expect(note).toHaveCount(1)
  await expect(
    slot(dialog, "dialog-body").locator(":scope > :last-child"),
  ).toContainText("It stays unpublished")
  await expect(
    slot(dialog, "dialog-footer").getByText(/stays unpublished/),
  ).toHaveCount(0)
})

test("on a laptop, a field that takes focus scrolls into the body, clear of the pinned header and footer (S7)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  const dialog = await openItem(page)
  const last = dialog.getByRole("button", { name: "Add details" })

  await last.focus()

  const [lastBox, header, footer] = await settledBoxes(
    last,
    slot(dialog, "dialog-header"),
    slot(dialog, "dialog-footer"),
  )
  expect(lastBox.y).toBeGreaterThanOrEqual(header.bottom)
  expect(lastBox.bottom).toBeLessThanOrEqual(footer.y)
})

test("on a laptop, the add-item dialog pins too: its buttons stay in view while its fields scroll, and so does the note after an item is added (S1, S2)", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP)
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  const dialog = await openAddItemDialog(page)
  const body = slot(dialog, "dialog-body")
  const parts = [
    dialog.getByRole("heading", { name: "Add an item" }),
    cornerClose(dialog),
    dialog.getByRole("button", { name: "Add item", exact: true }),
    dialog.getByRole("button", { name: "Add and start another" }),
    dialog.getByRole("button", { name: "Cancel" }),
  ]

  expect(
    await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  for (const part of parts) expect(await isInView(page, part)).toBe(true)

  await dialog.getByRole("textbox", { name: "Title" }).fill("Another item")
  await dialog
    .getByRole("combobox", { name: "Horizon or section" })
    .selectOption({ label: "Next" })
  await dialog.getByRole("button", { name: "Add and start another" }).click()

  const added = dialog.getByRole("status").getByText("was added.")
  await expect(added).toBeVisible()
  expect(await isInView(page, added)).toBe(true)
  await expectWithin(dialog, dialog.getByRole("status").getByRole("note"))
  for (const part of parts) expect(await isInView(page, part)).toBe(true)
  expect(
    await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
})

test("on the smallest pinned screen, a removal question about an item with a very long title keeps its buttons in view (S2)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 500 })
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  const form = await openEditItemDialog(page, ITEM)
  const title = `Long ${words(80)}`
  await form.getByRole("textbox", { name: "Title" }).fill(title)
  await form.getByRole("button", { name: "Done" }).click()
  await expect(form).toBeHidden()

  const dialog = await askToRemove(page, title)

  const header = slot(dialog, "dialog-header")
  expect(
    await header.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  for (const part of [
    cornerClose(dialog),
    dialog.getByRole("button", { name: "Remove", exact: true }),
    dialog.getByRole("button", { name: "Cancel" }),
  ]) {
    expect(await isInView(page, part)).toBe(true)
  }
})

test("on the smallest pinned screen, the add-item dialog keeps its buttons in view after an item with a very long title is added (S2)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 500 })
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  const dialog = await openAddItemDialog(page)
  await dialog.getByRole("textbox", { name: "Title" }).fill(words(200))
  await dialog
    .getByRole("combobox", { name: "Horizon or section" })
    .selectOption({ label: "Next" })

  await dialog.getByRole("button", { name: "Add and start another" }).click()

  const note = dialog.getByRole("status").getByRole("note")
  await expect(note).toBeVisible()
  // Its title is cut at three lines, so it leaves the form its room.
  const box = await settledBox(note)
  expect(box.height).toBeLessThan(120)
  for (const part of [
    dialog.getByRole("heading", { name: "Add an item" }),
    dialog.getByRole("button", { name: "Add item", exact: true }),
    dialog.getByRole("button", { name: "Cancel" }),
  ]) {
    expect(await isInView(page, part)).toBe(true)
  }
})

for (const [size, viewport] of [
  ["a phone", PHONE],
  ["a phone held landscape", LANDSCAPE],
] as const) {
  test(`on ${size}, the add-item dialog scrolls as one piece, with its padding under the buttons (S3, S4)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto("./#/roadmaps/producta")
    await connect(page)
    const dialog = await openAddItemDialog(page)
    const cancel = dialog.getByRole("button", { name: "Cancel" })

    await cancel.scrollIntoViewIfNeeded()
    await dialog.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })

    const [dialogBox, cancelBox] = await settledBoxes(dialog, cancel)
    // The popup's 24px padding, less its 1px border.
    expect(dialogBox.bottom - cancelBox.bottom).toBeGreaterThanOrEqual(23)
  })
}
