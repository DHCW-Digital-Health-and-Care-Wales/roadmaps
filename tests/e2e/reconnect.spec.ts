import type { Page } from "@playwright/test"

import { openEditItemDialog } from "./fixtures/dialogs"
import { sessionMs } from "./fixtures/fake-gis"
import { useLanguage } from "./fixtures/look"
import { connect, expect, test } from "./fixtures/test"

/**
 * STY-057: once the session has expired, an action that needs it stays on offer. Pressed,
 * it asks to reconnect in one dialog, then carries on; cancelled or refused, nothing is
 * written and nothing pending is lost. Publish changes is the journey's action; the
 * component tests hold the others.
 */

/** An item with no Welsh title, so it reads the same in either language. */
const ITEM = "Minimal card"
const EDITED = "A clearer card"

const COPY = {
  en: { connect: "Connect Google", title: "Title", done: "Done" },
  cy: {
    connect: "Cysylltu â Google",
    title: "Teitl (Saesneg)",
    done: "Gorffen",
  },
} as const

/** Opens Product A, makes one pending change, then lets the session run out. */
async function expireWithAChange(page: Page, language: "en" | "cy" = "en") {
  const copy = COPY[language]
  await page.clock.install()
  await page.goto("./#/roadmaps/producta")
  await connect(page, copy.connect)
  const form = await openEditItemDialog(page, ITEM, language)
  await form.getByRole("textbox", { name: copy.title }).fill(EDITED)
  await form.getByRole("button", { name: copy.done }).click()
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

function reconnectDialog(page: Page, name = "Your session has expired") {
  return page.getByRole("alertdialog", { name })
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
  await expect(dialog).toContainText(
    "Reconnect to Google to carry on. Your changes are kept in this tab.",
  )
  const reconnect = dialog.getByRole("button", { name: "Reconnect" })
  await expect(reconnect).toBeFocused()
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible()

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
  await confirm.getByRole("button", { name: "Publish changes" }).click()
  await expect(main.getByText(/^Changes published\./).first()).toBeVisible()
  expect(sheets.writes).toHaveLength(1)
})

test("a refusal or a closed window says why, and Cancel keeps every change, focus back on Publish (S4)", async ({
  page,
  gis,
  sheets,
}) => {
  const main = await expireWithAChange(page)
  const publish = main.getByRole("button", { name: "Publish changes" })
  await publish.click()
  const dialog = reconnectDialog(page)
  const reconnect = dialog.getByRole("button", { name: "Reconnect" })

  gis.respondWith({ type: "access-denied" })
  await reconnect.click()
  const why = dialog.getByRole("alert")
  await expect(why).toContainText("Couldn't reconnect")
  await expect(why).toContainText(
    "Access wasn't granted, so your roadmaps can't be loaded.",
  )
  await expect(reconnect).toBeFocused()

  gis.respondWith({ type: "popup-closed" })
  await reconnect.click()
  await expect(why).toContainText(
    "The Google window was closed before connecting finished.",
  )

  await dialog.getByRole("button", { name: "Cancel" }).click()

  await expect(dialog).toBeHidden()
  await expect(publish).toBeFocused()
  await expect(main.getByText("1 unpublished change")).toBeVisible()
  await expect(
    main.getByRole("heading", { level: 3, name: EDITED }),
  ).toBeVisible()
  expect(sheets.writes).toEqual([])
})

test("Refresh asks to reconnect, then reads the page once (S1, D1)", async ({
  page,
  sheets,
}) => {
  const main = await expireWithAChange(page)
  const reads = sheets.reads.length

  await main.getByRole("button", { name: "Refresh" }).click()
  await reconnectDialog(page).getByRole("button", { name: "Reconnect" }).click()

  // Reconnecting reads the page again, and Refresh joins those reads: the items are
  // read once.
  await expect(main.getByRole("button", { name: "Refresh" })).toBeFocused()
  await expect
    .poll(() => sheets.reads.slice(reads))
    .toContain("values:ProductA")
  await expect(main.getByRole("button", { name: "Refresh" })).toHaveAttribute(
    "aria-busy",
    "false",
  )
  expect(
    sheets.reads.slice(reads).filter((read) => read === "values:ProductA"),
  ).toHaveLength(1)
  await expect(main.getByText("1 unpublished change")).toBeVisible()
})

test("in Welsh, by keyboard: the dialog keeps focus, and Escape gives it back (S6)", async ({
  page,
}) => {
  await useLanguage(page, "cy")
  const main = await expireWithAChange(page, "cy")
  const publish = main.getByRole("button", { name: "Cyhoeddi'r newidiadau" })
  await publish.focus()
  await expect(publish).toBeFocused()

  await page.keyboard.press("Enter")

  const dialog = reconnectDialog(page, "Mae eich sesiwn wedi dod i ben")
  await expect(dialog).toContainText(
    "Ailgysylltwch â Google i barhau. Mae eich newidiadau wedi'u cadw yn y tab hwn.",
  )
  const reconnect = dialog.getByRole("button", { name: "Ailgysylltu" })
  await expect(reconnect).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(dialog.getByRole("button", { name: "Canslo" })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(reconnect).toBeFocused()

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(publish).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(reconnect).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("alertdialog", { name: "Cyhoeddi'r newidiadau hyn?" }),
  ).toBeVisible()
})
