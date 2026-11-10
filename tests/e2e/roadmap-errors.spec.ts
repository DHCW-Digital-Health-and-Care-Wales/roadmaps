import type { Locator, Page } from "@playwright/test"

import { connect, expect, roadmapCards, test } from "./fixtures/test"

/** Lets fake time pass until `locator` shows, so back-off between retries costs nothing. */
async function fastForwardUntilVisible(page: Page, locator: Locator) {
  await expect(async () => {
    await page.clock.fastForward(1_000)
    await expect(locator).toBeVisible({ timeout: 100 })
  }).toPass()
}

test("a failed load can be retried", async ({ page, sheets }) => {
  // The first load and both automatic retries fail.
  sheets.respondWith({ status: 500 }, { status: 500 }, { status: 500 })
  await page.clock.install()
  await page.goto("./")
  await connect(page)

  const panel = page.getByRole("alert").filter({
    hasText: "Couldn't load your roadmaps",
  })
  await fastForwardUntilVisible(page, panel)
  await expect(panel).toContainText("Something went wrong. Please try again.")
  expect(sheets.tokens).toHaveLength(3)

  await panel.getByRole("button", { name: "Retry" }).click()

  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(panel).toBeHidden()
})

test("a permission error explains how to get access", async ({
  page,
  sheets,
}) => {
  sheets.respondWith({ status: 403 })
  await page.goto("./")
  await connect(page)

  const panel = page.getByRole("alert").filter({
    hasText: "Couldn't load your roadmaps",
  })
  await expect(panel).toContainText(
    "You don't have access to this spreadsheet. Ask the spreadsheet owner for access.",
  )
  // Retrying cannot help, so it is neither offered nor done automatically.
  await expect(panel.getByRole("button")).toHaveCount(0)
  expect(sheets.tokens).toHaveLength(1)
})

test("a rejected token expires the session until reconnected", async ({
  page,
  gis,
  sheets,
}) => {
  sheets.respondWith({ status: 401 })
  await page.goto("./")
  await connect(page)

  const main = page.getByRole("main")
  await expect(
    main.getByRole("heading", { name: "Your session has expired" }),
  ).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Session expired")

  await main.getByRole("button", { name: "Reconnect" }).click()

  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(page.getByRole("status")).toHaveText("Google connected")
  // A quiet re-grant, then the same request with the new token.
  expect(gis.tokenRequests.map(({ prompt }) => prompt)).toEqual([undefined, ""])
  expect(sheets.tokens).toEqual(["e2e-token-1", "e2e-token-2"])
})

test("an expired token keeps the roadmaps on screen until reconnected", async ({
  page,
  gis,
  sheets,
}) => {
  // Usable for one minute: the app stops 60 s before Google's expiry (ADR-003).
  gis.respondWith({ type: "grant", expiresIn: 120 })
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)

  await page.clock.fastForward("01:00")

  const alert = page.getByRole("main").getByRole("alert")
  await expect(alert).toContainText("Your session has expired")
  await expect(page.getByRole("status")).toHaveText("Session expired")
  await expect(roadmapCards(page)).toHaveCount(3)
  await expect(page.getByRole("button", { name: "Refresh" })).toBeDisabled()

  await alert.getByRole("button", { name: "Reconnect" }).click()

  await expect(alert).toBeHidden()
  await expect(roadmapCards(page)).toHaveCount(3)
  expect(gis.tokenRequests.map(({ prompt }) => prompt)).toEqual([undefined, ""])
  expect(sheets.tokens).toEqual(["e2e-token-1", "e2e-token-2"])
})
