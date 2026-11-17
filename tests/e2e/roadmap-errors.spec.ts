import type { Locator, Page } from "@playwright/test"

import { sessionMs } from "./fixtures/fake-gis"
import { withRoadmapIndex } from "./fixtures/fake-sheets"
import { useLanguage } from "./fixtures/look"
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
  sheets.failWith(500, 500, 500)
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
  sheets.failWith(403)
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
  sheets.failWith(401)
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
  // A quiet re-grant, then the same load, both reads, with the new token.
  expect(gis.tokenRequests.map(({ prompt }) => prompt)).toEqual([undefined, ""])
  expect(sheets.tokens).toEqual(["e2e-token-1", "e2e-token-2", "e2e-token-2"])
})

test("an expired token keeps the roadmaps on screen until reconnected", async ({
  page,
  gis,
  sheets,
}) => {
  // A short session. Its warning opens on the way, at two minutes left, and closes as
  // it ends.
  const expiresIn = 300
  gis.respondWith({ type: "grant", expiresIn })
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)

  await page.clock.fastForward(sessionMs(expiresIn))

  const alert = page.getByRole("main").getByRole("alert")
  await expect(alert).toContainText("Your session has expired")
  await expect(page.getByRole("status")).toHaveText("Session expired")
  await expect(roadmapCards(page)).toHaveCount(3)
  // Still on offer: it asks to reconnect first (STY-057).
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled()

  await alert.getByRole("button", { name: "Reconnect" }).click()

  await expect(alert).toBeHidden()
  await expect(roadmapCards(page)).toHaveCount(3)
  expect(gis.tokenRequests.map(({ prompt }) => prompt)).toEqual([undefined, ""])
  // The cached cards stay on screen, so wait for the reload's two reads.
  await expect.poll(() => sheets.tokens.length).toBe(4)
  expect(sheets.tokens).toEqual([
    "e2e-token-1",
    "e2e-token-1",
    "e2e-token-2",
    "e2e-token-2",
  ])
})

const UNREADABLE_LIST =
  "The list of roadmaps in the spreadsheet isn't in the expected format. Ask the spreadsheet owner to check it."

test("a roadmap index with no Sheet column can't be read, and retrying can't help (S5)", async ({
  page,
  sheets,
}) => {
  sheets.spreadsheet = withRoadmapIndex([
    ["Title", "Enabled"],
    ["Product A roadmap", "Yes"],
  ])
  await page.goto("./")
  await connect(page)

  const panel = page.getByRole("alert").filter({
    hasText: "Couldn't load your roadmaps",
  })
  await expect(panel).toContainText(UNREADABLE_LIST)
  await expect(panel.getByRole("button")).toHaveCount(0)
  expect(sheets.reads).toEqual(["metadata", "values:Roadmaps"])
})

test("an empty roadmap index can't be read, in Welsh too (S5)", async ({
  page,
  sheets,
}) => {
  await useLanguage(page, "cy")
  sheets.spreadsheet = withRoadmapIndex([])
  await page.goto("./")
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cysylltu â Google" })
    .click()

  const panel = page.getByRole("alert")
  await expect(panel).toContainText(
    "Nid yw'r rhestr o fapiau trywydd yn y daenlen yn y fformat disgwyliedig. Gofynnwch i berchennog y daenlen ei gwirio.",
  )
  await expect(panel.getByRole("button")).toHaveCount(0)
  await expect(roadmapCards(page)).toHaveCount(0)
})
