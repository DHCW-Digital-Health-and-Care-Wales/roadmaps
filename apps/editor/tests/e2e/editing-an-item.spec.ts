import type { Page } from "@playwright/test"

import {
  clickOutside,
  editItemButton,
  openEditItemDialog,
} from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { escapeFrom } from "./fixtures/keyboard"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead edits an item in the item dialog (STY-044), against the fake Sheets
 * API: Edit on its card opens the dialog on the item's fields, with Tags, Organisations
 * and Details shut. Done keeps the edits pending, and nothing is written until the
 * roadmap is published or saved. The rules of each field are held in `editing.spec.ts`,
 * through this dialog. The journey runs once, at the default size and theme (EPC-011's
 * delivery notes): the accessibility spec and the focus tour open the dialog in both
 * themes.
 */

const ITEM = "Card being explored"
const OUTCOME = "Clinicians see one record."

async function openProductA(page: Page, connectName?: string) {
  await page.goto("./#/roadmaps/producta")
  await connect(page, connectName)
  await expect(
    page.getByRole("heading", { level: 3, name: ITEM }),
  ).toBeVisible()
}

/** The cards listed under a horizon or section heading. */
function listed(page: Page, heading: string) {
  return page.getByRole("main").getByRole("list", { name: heading })
}

test("a Product Lead edits an item in the item dialog, the edits pending until published (S1, S2, S3)", async ({
  page,
  sheets,
}) => {
  await openProductA(page)
  const dialog = await openEditItemDialog(page, ITEM)
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  // Every field at its value, with Tags, Organisations and Details shut.
  await expect(dialog.getByRole("textbox", { name: "Title" })).toHaveValue(ITEM)
  await expect(
    dialog.getByRole("textbox", { name: "Description" }),
  ).toHaveValue("Work we expect to pick up soon.")
  await expect(
    dialog.getByRole("textbox", { name: "Expected outcome" }),
  ).toHaveValue("What we hope this will achieve.")
  await expect(dialog.getByRole("textbox", { name: "Phase" })).toHaveValue(
    "Alpha",
  )
  const placement = dialog.getByRole("combobox", { name: "Horizon or section" })
  await expect(placement.locator("option:checked")).toHaveText("Next")
  await expect(dialog.getByText("No tags")).toBeVisible()
  await expect(dialog.getByText("Betsi Cadwaladr, Hywel Dda")).toBeVisible()
  await expect(dialog.getByText("No details")).toBeVisible()
  for (const name of ["Add tags", "Change organisations", "Add details"]) {
    await expect(dialog.getByRole("button", { name })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  }
  await expect(dialog.getByRole("checkbox")).toHaveCount(0)

  await dialog.getByRole("textbox", { name: "Expected outcome" }).fill(OUTCOME)
  await placement.selectOption({ label: "Now" })
  await dialog.getByRole("button", { name: "Done" }).click()

  // Pending: shown where it now is, tagged, undoable, not written.
  await expect(dialog).toBeHidden()
  const card = listed(page, "Now")
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { level: 3, name: ITEM }),
    })
  await expect(card.getByText(OUTCOME)).toBeVisible()
  await expect(card.getByText("Changed")).toBeVisible()
  await expect(
    card.getByRole("button", { name: `Undo changes ${ITEM}` }),
  ).toBeEnabled()
  await expect(
    card.getByRole("button", { name: `Move ${ITEM}`, exact: true }),
  ).toBeVisible()
  // Focus is on the card's Edit, in the list the card now is in.
  await expect(card.getByRole("button", { name: `Edit ${ITEM}` })).toBeFocused()
  await expect(
    listed(page, "Next").getByRole("heading", { name: ITEM }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("main").getByText("2 unpublished changes"),
  ).toBeVisible()
  expect(sheets.writes).toEqual([])

  // The dialog opens again on the pending edits.
  const reopened = await openEditItemDialog(page, ITEM)
  await expect(
    reopened.getByRole("textbox", { name: "Expected outcome" }),
  ).toHaveValue(OUTCOME)
  await expect(
    reopened
      .getByRole("combobox", { name: "Horizon or section" })
      .locator("option:checked"),
  ).toHaveText("Now")
})

test("Cancel and Escape close the dialog and drop what was typed, keeping the edits already pending; a click outside does nothing (S5)", async ({
  page,
}) => {
  await openProductA(page)
  const first = await openEditItemDialog(page, ITEM)
  await first.getByRole("textbox", { name: "Expected outcome" }).fill(OUTCOME)
  await first.getByRole("button", { name: "Done" }).click()
  const main = page.getByRole("main")
  await expect(main.getByText("1 unpublished change")).toBeVisible()

  const dialog = await openEditItemDialog(page, ITEM)
  const phase = dialog.getByRole("textbox", { name: "Phase" })
  await phase.fill("Beta")
  await clickOutside(page, dialog)
  await expect(dialog).toBeVisible()
  await expect(phase).toHaveValue("Beta")

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(editItemButton(page, ITEM)).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused()
  await expect(phase).toHaveValue("Alpha")
  await phase.fill("Live")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(editItemButton(page, ITEM)).toBeFocused()

  const card = listed(page, "Next").getByRole("listitem")
  await expect(card.getByText("Alpha")).toBeVisible()
  await expect(card.getByText(OUTCOME)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
})

test("the dialog stays through the session warning and the session's end, and Done still keeps the edits (S5)", async ({
  page,
}) => {
  await page.clock.install()
  await openProductA(page)
  const dialog = await openEditItemDialog(page, ITEM)
  const outcome = dialog.getByRole("textbox", { name: "Expected outcome" })
  await outcome.fill(OUTCOME)

  // The warning opens over the dialog; leaving it leaves the dialog as it was.
  await page.clock.fastForward(sessionMs() - SESSION_WARNING_MS)
  const warning = page.getByRole("alertdialog", {
    name: "Your session is about to end",
  })
  await escapeFrom(warning)
  await expect(outcome).toHaveValue(OUTCOME)

  await page.clock.fastForward(SESSION_WARNING_MS)
  // Said by the page behind, which only its text can reach.
  await expect(page.getByText("Your session has expired")).toBeVisible()
  await expect(outcome).toHaveValue(OUTCOME)
  await dialog.getByRole("button", { name: "Done" }).click()

  await expect(dialog).toBeHidden()
  const main = page.getByRole("main")
  await expect(main.getByText(OUTCOME)).toBeVisible()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  // Still on offer: it asks to reconnect first (STY-057).
  await expect(
    main.getByRole("button", { name: "Publish changes" }),
  ).toBeEnabled()
})

test("editing an item in Welsh (S6)", async ({ page }) => {
  await useLanguage(page, "cy")
  await openProductA(page, "Cysylltu â Google")
  const main = page.getByRole("main")

  const dialog = await openEditItemDialog(page, ITEM, "cy")
  const title = dialog.getByRole("textbox", { name: "Teitl (Saesneg)" })
  await title.fill("")
  await dialog.getByRole("button", { name: "Gorffen" }).click()
  await expect(title).toHaveAccessibleDescription("Gwall: Rhowch deitl")
  await expect(title).toBeFocused()

  await title.fill("Card, renamed")
  await dialog
    .getByRole("combobox", { name: "Gorwel neu adran" })
    .selectOption({ label: "Nawr" })
  await dialog.getByRole("button", { name: "Gorffen" }).click()

  await expect(dialog).toBeHidden()
  await expect(
    listed(page, "Nawr").getByRole("heading", {
      level: 3,
      name: "Card, renamed",
    }),
  ).toBeVisible()
  await expect(editItemButton(page, "Card, renamed", "cy")).toBeFocused()
  await expect(main.getByText("2 newid heb eu cyhoeddi")).toBeVisible()
})
