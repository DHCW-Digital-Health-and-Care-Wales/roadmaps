import type { Page } from "@playwright/test"

import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/** Connects with a fake clock, loads the roadmaps, and reaches the warning. */
async function reachWarning(page: Page) {
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  await page.clock.fastForward(sessionMs() - SESSION_WARNING_MS)
  const warning = page.getByRole("alertdialog", {
    name: "Your session is about to end",
  })
  await expect(warning).toBeVisible()
  return warning
}

/** Records every text the connection status shows from now on. */
async function recordStatuses(page: Page) {
  await page.evaluate(() => {
    const status = document.querySelector("header [role=status]")
    const seen: string[] = []
    Object.assign(window, { __statuses: seen })
    if (!status) return
    new MutationObserver(() => {
      seen.push(status.textContent)
    }).observe(status, { childList: true, subtree: true, characterData: true })
  })
  return () =>
    page.evaluate(
      () => (window as unknown as { __statuses: string[] }).__statuses,
    )
}

test("the warning counts down two minutes before the session ends (S3)", async ({
  page,
}) => {
  const warning = await reachWarning(page)

  await expect(warning).toContainText("Your session ends in 2 minutes.")
  await expect(
    warning.getByRole("button", { name: "Stay connected" }),
  ).toBeFocused()
  await page.clock.fastForward(11_000)
  await expect(warning).toContainText(
    "Your session ends in 1 minute and 49 seconds.",
  )
})

test("staying connected renews in one click and keeps the page (S4)", async ({
  page,
  gis,
  sheets,
}) => {
  const warning = await reachWarning(page)
  const statuses = await recordStatuses(page)
  expect(sheets.reads).toHaveLength(2)

  // A real click: the fake GIS records a violation if the popup opens outside it.
  await warning.getByRole("button", { name: "Stay connected" }).click()

  await expect(warning).toBeHidden()
  await expect.poll(() => gis.tokenRequests.length).toBe(2)
  expect(gis.tokenRequests[1]?.prompt).toBe("")
  await expect(page.getByRole("main")).toBeFocused()
  await expect(roadmapCards(page)).toHaveCount(3)
  expect(sheets.reads).toHaveLength(2)
  expect(await statuses()).not.toContain("Connecting…")
  await expect(page.getByRole("main").getByRole("note")).toHaveCount(0)

  // The old session's end passes; the renewed one carries on with its own token.
  await page.clock.fastForward(SESSION_WARNING_MS + 60_000)
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    "Google connected",
  )
  await expect(warning).toBeHidden()
  await page.getByRole("button", { name: "Refresh" }).click()
  await expect.poll(() => sheets.tokens.at(-1)).toBe("e2e-token-2")
})

test("a blocked renewal shows why and the session runs out as before (S5)", async ({
  page,
  gis,
}) => {
  const warning = await reachWarning(page)
  gis.respondWith({ type: "popup-blocked" })

  await warning.getByRole("button", { name: "Stay connected" }).click()

  await expect(warning).toBeHidden()
  const main = page.getByRole("main")
  const callout = main
    .getByRole("alert")
    .filter({ hasText: "Couldn't keep you connected" })
  await expect(callout).toContainText(
    "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  )
  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    "Google connected",
  )

  await page.clock.fastForward(SESSION_WARNING_MS)
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    "Session expired",
  )
  await expect(callout).toHaveCount(0)
  await expect(main.getByText("Your session has expired")).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(3)
})

test("dismissing the warning leaves the session to run out (S6)", async ({
  page,
  gis,
}) => {
  const warning = await reachWarning(page)

  await page.keyboard.press("Escape")

  await expect(warning).toBeHidden()
  await page.clock.fastForward(SESSION_WARNING_MS - 1_000)
  await expect(warning).toBeHidden()
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    "Google connected",
  )
  await page.clock.fastForward(1_000)
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    "Session expired",
  )
  await expect(
    page.getByRole("main").getByRole("button", { name: "Reconnect" }),
  ).toBeVisible()
  expect(gis.tokenRequests).toHaveLength(1)
})
