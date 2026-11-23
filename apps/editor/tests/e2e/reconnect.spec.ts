import type { Page } from "@playwright/test"

import {
  confirmPublish,
  openEditItemDialog,
  reconnectDialog,
} from "./fixtures/dialogs"
import { sessionMs } from "./fixtures/fake-gis"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-057: once the session has expired, an action that needs it stays on offer. Pressed,
 * it asks to reconnect in one dialog, then carries on. Publish changes is the journey's
 * action, run once through the fakes: Google's popup opening inside the Reconnect click,
 * the new token on the write that follows, and focus back on Publish as the dialog closes.
 * `reconnect-dialog.test.tsx` and the page tests hold the other actions, a refusal, Escape
 * and Welsh.
 */

/** An item the test edits, to leave one change pending. */
const ITEM = "Minimal card"
const EDITED = "A clearer card"

/** Opens Product A, makes one pending change, then lets the session run out. */
async function expireWithAChange(page: Page) {
  await page.clock.install()
  await page.goto("./#/roadmaps/producta")
  await connect(page)
  const form = await openEditItemDialog(page, ITEM)
  await form.getByRole("textbox", { name: "Title" }).fill(EDITED)
  await form.getByRole("button", { name: "Done" }).click()
  // Closed, it has given focus back to the card's Edit.
  await expect(form).toBeHidden()
  await expect(
    page.getByRole("heading", { level: 3, name: EDITED }),
  ).toBeVisible()

  await page.clock.fastForward(sessionMs())
  // The session warning closes as the session ends, and the page says it has.
  await page.keyboard.press("Escape")
  const main = page.getByRole("main")
  await expect(main.getByRole("alert")).toBeVisible()
  return main
}

test("Publish stays on offer, asks to reconnect, then asks to publish the changes (S1, S2, S3)", async ({
  page,
  gis,
  sheets,
}) => {
  const main = await expireWithAChange(page)
  await expect(main.getByText("Your session has expired")).toBeVisible()
  const publish = main.getByRole("button", { name: "Publish changes" })
  await expect(publish).toBeEnabled()

  await publish.click()

  const dialog = reconnectDialog(page)
  const reconnect = dialog.getByRole("button", { name: "Reconnect" })
  await expect(reconnect).toBeFocused()

  // Cancelled, the dialog gives focus back to Publish and keeps the change.
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toBeHidden()
  await expect(publish).toBeFocused()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  expect(sheets.writes).toEqual([])

  await publish.click()
  const requests = gis.tokenRequests.length
  await reconnect.click()

  // Google's popup came from the click itself: the fake fails the test otherwise.
  expect(gis.tokenRequests).toHaveLength(requests + 1)
  await expect(dialog).toBeHidden()
  const confirm = page.getByRole("alertdialog", {
    name: "Publish these changes?",
  })
  await expect(confirm.getByText(EDITED)).toBeVisible()
  expect(sheets.writes).toEqual([])
  await confirmPublish(page)
  expect(sheets.writes).toHaveLength(1)
  // The write went with the new session's token.
  expect(sheets.tokens.at(-1)).toBe("e2e-token-2")
})
