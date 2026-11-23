import type { Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { escapeFrom } from "./fixtures/keyboard"
import { connect, expect, test } from "./fixtures/test"

/**
 * A Product Lead edits an item in the item dialog (STY-044), against the fake Sheets
 * API: Edit on its card opens the dialog over the page, and Done sends focus to the
 * card's Edit. What the dialog shows and keeps (its fields, Cancel and Escape, Welsh
 * copy) is held in `roadmap-detail-page-editing.test.tsx`, and a click outside it in
 * `closing-a-dialog.spec.ts`; this spec holds what only a browser shows: the page
 * behind it out of reach, focus after Done, and the clock running out under it. It runs
 * once, at the default size and theme (EPC-011's delivery notes): the accessibility
 * spec and the focus tour open the dialog in both themes.
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

test("Done sends focus to the card's Edit, in the list the item now is in, the page behind the dialog out of reach meanwhile (S1, S2, S3)", async ({
  page,
}) => {
  await openProductA(page)
  const dialog = await openEditItemDialog(page, ITEM)
  // Modal: nothing behind it can be reached.
  await expect(page.getByRole("main")).toHaveCount(0)

  await dialog.getByRole("textbox", { name: "Expected outcome" }).fill(OUTCOME)
  await dialog
    .getByRole("combobox", { name: "Horizon or section" })
    .selectOption({ label: "Now" })
  await dialog.getByRole("button", { name: "Done" }).click()

  await expect(dialog).toBeHidden()
  const card = listed(page, "Now")
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { level: 3, name: ITEM }),
    })
  await expect(card.getByText(OUTCOME)).toBeVisible()
  await expect(card.getByRole("button", { name: `Edit ${ITEM}` })).toBeFocused()
})

test("the dialog stays through the session warning and the session's end, what was typed in it kept (S5)", async ({
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
})
