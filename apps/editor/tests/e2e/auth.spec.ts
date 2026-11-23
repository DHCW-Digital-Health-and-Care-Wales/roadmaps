import type { Page } from "@playwright/test"

import {
  chooseFromAccountMenu,
  disconnectFromHeader,
} from "./fixtures/account-menu"
import type { TokenOutcome } from "./fixtures/fake-gis"
import { EXAMPLE_INDEX_ROWS, withRoadmapIndex } from "./fixtures/fake-sheets"
import { connect, expect, roadmapCards, test } from "./fixtures/test"

const [HEADER = [], , PRODUCT_B = []] = EXAMPLE_INDEX_ROWS

/**
 * Two ways connecting fails, each from a different place to press Connect. A failure's
 * notice, role, header status and dismissal are held for every kind by
 * `auth-notice.test.tsx`, `connection-status.test.tsx` and `app.test.tsx`; what only a
 * browser shows is the failure after a real click, and trying again working.
 */
const failures: {
  name: string
  from: "the start page" | "the account menu"
  outcome: TokenOutcome
  status: string
  notice: string
}[] = [
  {
    name: "access is denied",
    from: "the account menu",
    outcome: { type: "access-denied" },
    status: "Connection failed",
    notice: "Access wasn't granted, so your roadmaps can't be loaded.",
  },
  {
    name: "the popup is blocked",
    from: "the start page",
    outcome: { type: "popup-blocked" },
    status: "Not connected",
    notice:
      "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  },
]

/** Presses Connect where `from` has it: on the page, or in the header's account menu. */
function pressConnect(page: Page, from: "the start page" | "the account menu") {
  return from === "the account menu"
    ? chooseFromAccountMenu(page, "Connect Google")
    : connect(page)
}

for (const { name, from, outcome, status, notice } of failures) {
  test(`connecting from ${from} fails gracefully when ${name}`, async ({
    page,
    gis,
    sheets,
  }) => {
    gis.respondWith(outcome)
    await page.goto("./")
    await pressConnect(page, from)

    // The reason stays on the page in view, above its heading.
    const main = page.getByRole("main")
    await expect(page.getByRole("status")).toHaveText(status)
    const callout = main.getByRole("alert")
    await expect(callout).toHaveText(notice)
    expect(sheets.tokens).toEqual([])

    // It stays until dismissed.
    await callout.getByRole("button", { name: "Dismiss message" }).click()
    await expect(main.getByText(notice)).toHaveCount(0)
    await expect(main).toBeFocused()

    // Trying again works.
    await pressConnect(page, from)
    await expect(roadmapCards(page)).toHaveCount(3)
  })
}

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

  await disconnectFromHeader(page)

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
