import type { Page } from "@playwright/test"

import type { TokenOutcome } from "./fixtures/fake-gis"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

function toasts(page: Page) {
  return page.getByRole("region", { name: /^Notifications/ })
}

const failures: {
  name: string
  outcome: TokenOutcome
  status: string
  notice: string
  /** Absence is checked precisely in src/app/app.test.tsx, where Sonner can be flushed. */
  toast: boolean
}[] = [
  {
    name: "access is denied",
    outcome: { type: "access-denied" },
    status: "Connection failed",
    notice: "Access wasn't granted, so your roadmaps can't be loaded.",
    toast: true,
  },
  {
    name: "the Sheets scope is not granted",
    outcome: { type: "grant", scope: "email" },
    status: "Connection failed",
    notice:
      "Access to Google Sheets is needed to load your roadmaps. Connect again and allow it.",
    toast: true,
  },
  {
    // No usable time is left after the 60 s safety margin (ADR-003).
    name: "the token is too short-lived",
    outcome: { type: "grant", expiresIn: 60 },
    status: "Connection failed",
    notice:
      "Something went wrong while connecting to Google. Please try again.",
    toast: true,
  },
  {
    name: "the popup is blocked",
    outcome: { type: "popup-blocked" },
    status: "Not connected",
    notice:
      "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    toast: true,
  },
  {
    name: "the popup is closed",
    outcome: { type: "popup-closed" },
    status: "Not connected",
    notice: "The Google window was closed before connecting finished.",
    // The user closed it on purpose: the notice is enough.
    toast: false,
  },
]

for (const { name, outcome, status, notice, toast } of failures) {
  test(`connecting fails gracefully when ${name}`, async ({
    page,
    gis,
    sheets,
  }) => {
    gis.respondWith(outcome)
    await page.goto("./")
    await connect(page)

    const main = page.getByRole("main")
    await expect(page.getByRole("status")).toHaveText(status)
    await expect(main.getByText(notice)).toBeVisible()
    if (toast) await expect(toasts(page).getByText(notice)).toBeVisible()
    expect(sheets.tokens).toEqual([])

    // Trying again works.
    await connect(page)
    await expect(roadmapCards(page)).toHaveCount(3)
  })
}

test("after a partial grant, connecting again asks for consent", async ({
  page,
  gis,
}) => {
  gis.respondWith({ type: "grant", scope: "email" })
  await page.goto("./")
  await connect(page)
  await expect(page.getByRole("status")).toHaveText("Connection failed")

  await connect(page)

  await expect(roadmapCards(page)).toHaveCount(3)
  expect(gis.tokenRequests.map(({ prompt }) => prompt)).toEqual([
    undefined,
    "consent",
  ])
})

test("connecting retries when Google's script failed to load", async ({
  page,
  gis,
}) => {
  gis.scriptAvailable = false
  await page.goto("./")
  const main = page.getByRole("main")
  await expect(
    main.getByText(
      "Google couldn't be reached. Check your internet connection and try again.",
    ),
  ).toBeVisible()

  gis.scriptAvailable = true
  // The first click reloads the script; the popup needs a click of its own.
  await connect(page)
  await expect(page.getByRole("status")).toHaveText("Not connected")
  await connect(page)

  await expect(roadmapCards(page)).toHaveCount(3)
})

test("disconnecting revokes the token and forgets the roadmaps", async ({
  page,
  gis,
  sheets,
}) => {
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Disconnect" })
    .click()

  await expect(roadmapCards(page)).toHaveCount(0)
  await expect(
    page.getByRole("heading", { level: 1, name: "Product Roadmaps" }),
  ).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Not connected")
  await expect(toasts(page).getByText("Disconnected from Google")).toBeVisible()
  expect(gis.revokedTokens).toEqual(["e2e-token-1"])

  // Nothing was kept: connecting again loads afresh, showing no old roadmaps meanwhile.
  const release = sheets.hold()
  sheets.respondWith({ worksheets: [{ sheetId: 9, title: "New plans" }] })
  await connect(page)
  await expect(
    page.getByRole("status").filter({ hasText: "Loading roadmaps…" }),
  ).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(0)
  release()
  await expect(roadmapCards(page)).toHaveText(["New plans"])
  expect(sheets.tokens).toEqual(["e2e-token-1", "e2e-token-2"])
})
