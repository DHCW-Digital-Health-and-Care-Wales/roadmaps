import { sessionMs, type TokenOutcome } from "./fixtures/fake-gis"
import { EXAMPLE_INDEX_ROWS, withRoadmapIndex } from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

const [HEADER = [], , PRODUCT_B = []] = EXAMPLE_INDEX_ROWS

const failures: {
  name: string
  outcome: TokenOutcome
  status: string
  notice: string
  /** The callout's role: an alert, unless the user closed the popup themselves. */
  role: "alert" | "note"
}[] = [
  {
    name: "access is denied",
    outcome: { type: "access-denied" },
    status: "Connection failed",
    notice: "Access wasn't granted, so your roadmaps can't be loaded.",
    role: "alert",
  },
  {
    name: "the Sheets scope is not granted",
    outcome: { type: "grant", scope: "email" },
    status: "Connection failed",
    notice:
      "Access to Google Sheets is needed to load your roadmaps. Connect again and allow it.",
    role: "alert",
  },
  {
    // No usable time is left after the 60 s safety margin (ADR-003).
    name: "the token is too short-lived",
    outcome: { type: "grant", expiresIn: 60 },
    status: "Connection failed",
    notice:
      "Something went wrong while connecting to Google. Please try again.",
    role: "alert",
  },
  {
    name: "the popup is blocked",
    outcome: { type: "popup-blocked" },
    status: "Not connected",
    notice:
      "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    role: "alert",
  },
  {
    name: "the popup is closed",
    outcome: { type: "popup-closed" },
    status: "Not connected",
    notice: "The Google window was closed before connecting finished.",
    role: "note",
  },
]

for (const { name, outcome, status, notice, role } of failures) {
  for (const from of ["the start page", "the header"] as const) {
    test(`connecting from ${from} fails gracefully when ${name}`, async ({
      page,
      gis,
      sheets,
    }) => {
      gis.respondWith(outcome)
      await page.goto("./")
      const button =
        from === "the header"
          ? page
              .getByRole("banner")
              .getByRole("button", { name: "Connect Google" })
          : page
              .getByRole("main")
              .getByRole("button", { name: "Connect Google" })
      await button.click()

      // The reason stays on the page in view, above its heading; no toast.
      const main = page.getByRole("main")
      await expect(page.getByRole("status")).toHaveText(status)
      const callout = main.getByRole(role)
      await expect(callout).toHaveText(notice)
      await expect(
        page.getByRole("region", { name: /^Notifications/ }),
      ).toHaveCount(0)
      expect(sheets.tokens).toEqual([])

      // It stays until dismissed.
      await callout.getByRole("button", { name: "Dismiss message" }).click()
      await expect(main.getByText(notice)).toHaveCount(0)
      await expect(main).toBeFocused()

      // Trying again works.
      await button.click()
      await expect(roadmapCards(page)).toHaveCount(3)
    })
  }
}

test("a failed reconnect from the header shows why over the expired roadmaps", async ({
  page,
  gis,
}) => {
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  await expect(roadmapCards(page)).toHaveCount(3)
  await page.clock.fastForward(sessionMs())
  const main = page.getByRole("main")
  await expect(main.getByText("Your session has expired")).toBeVisible()

  gis.respondWith({ type: "popup-blocked" })
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Reconnect" })
    .click()

  await expect(
    main
      .getByRole("alert")
      .filter({ hasText: "Your browser blocked the Google window." }),
  ).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(3)
})

/** A confirmation's dwell before it clears itself (`CONFIRMATION_DWELL_MS`). */
const CONFIRMATION_DWELL_MS = 8_000

test("a confirmation clears itself; a failure stays", async ({ page, gis }) => {
  await page.clock.install()
  await page.goto("./")
  await connect(page)
  const main = page.getByRole("main")
  const confirmation = main.getByRole("note")
  await expect(confirmation).toHaveText("Connected to Google")

  await page.clock.fastForward(CONFIRMATION_DWELL_MS)
  await expect(confirmation).toHaveCount(0)
  // The header keeps the state.
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    "Google connected",
  )

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Disconnect" })
    .click()
  gis.respondWith({ type: "access-denied" })
  await connect(page)
  const failure = main.getByRole("alert")
  await expect(failure).toHaveText(
    "Access wasn't granted, so your roadmaps can't be loaded.",
  )
  await page.clock.fastForward(10 * CONFIRMATION_DWELL_MS)
  await expect(failure).toBeVisible()
})

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
    page.getByRole("heading", { level: 1, name: "DHCW Roadmap Editor" }),
  ).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Not connected")
  await expect(page.getByRole("main").getByRole("note")).toHaveText(
    "Disconnected from Google",
  )
  expect(gis.revokedTokens).toEqual(["e2e-token-1"])

  // Nothing was kept: connecting again loads afresh, showing no old roadmaps meanwhile.
  const release = sheets.hold()
  sheets.spreadsheet = withRoadmapIndex([HEADER, PRODUCT_B])
  await connect(page)
  await expect(
    page.getByRole("status").filter({ hasText: "Loading roadmaps…" }),
  ).toBeVisible()
  await expect(roadmapCards(page)).toHaveCount(0)
  release()
  await expect(roadmapCards(page)).toHaveText(["Product B roadmap"])
  expect(sheets.tokens).toEqual([
    "e2e-token-1",
    "e2e-token-1",
    "e2e-token-2",
    "e2e-token-2",
  ])
})
