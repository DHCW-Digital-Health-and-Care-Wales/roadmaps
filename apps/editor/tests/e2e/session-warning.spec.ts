import type { Page } from "@playwright/test"

import { SESSION_WARNING_MS, sessionMs } from "./fixtures/fake-gis"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

/**
 * The warning's countdown, a failed renewal and dismissing it are held by
 * `session-warning.test.tsx` and `google-auth-client.test.ts`; what only a browser shows
 * is renewing in a real click, and the next request carrying the renewed token.
 */

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

test("staying connected renews in one click and keeps the page (S4)", async ({
  page,
  gis,
  sheets,
}) => {
  const warning = await reachWarning(page)
  const statuses = await recordStatuses(page)
  expect(sheets.reads).toHaveLength(2)
  await expect(
    warning.getByRole("button", { name: "Stay connected" }),
  ).toBeFocused()

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
