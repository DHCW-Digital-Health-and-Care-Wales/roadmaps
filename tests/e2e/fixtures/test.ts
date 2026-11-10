import { test as base, expect, type Page } from "@playwright/test"

import { FakeGis } from "./fake-gis"
import { FakeSheets } from "./fake-sheets"
import { recordPersistence, snapshotPersistence } from "./persistence-recorder"

export { expect }

interface Fakes {
  /** Google Identity Services: queue consent outcomes, inspect token requests. */
  gis: FakeGis
  /** The Google Sheets API: queue replies, inspect the tokens requests carried. */
  sheets: FakeSheets
}

/**
 * The E2E `test`: a hermetic page whose only outside world is the fake GIS script and
 * fake Sheets API. Any other request is blocked and fails the test, as do uncaught page
 * errors and requests the real Google APIs would reject.
 */
export const test = base.extend<Fakes>({
  context: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error("baseURL is not configured")
    const appOrigin = new URL(baseURL).origin
    const external = (url: URL) => url.origin !== appOrigin
    const blocked: string[] = []

    // On the context, so popups are covered too. Page routes (the fakes) take precedence.
    // Service workers, which bypass routing, are blocked in playwright.config.ts.
    await context.route(external, (route) => {
      blocked.push(route.request().url())
      return route.abort("blockedbyclient")
    })
    await context.routeWebSocket(external, (socket) => {
      blocked.push(socket.url())
      return socket.close()
    })

    await use(context)

    expect.soft(blocked, "requests outside the app and its fakes").toEqual([])
  },
  page: async ({ page }, use) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))

    await use(page)

    expect.soft(pageErrors, "uncaught errors in the page").toEqual([])
  },
  gis: [
    async ({ page }, use) => {
      const gis = new FakeGis()
      await gis.install(page)
      const persisted = await recordPersistence(page)

      await use(gis)

      expect
        .soft(gis.violations, "misuses of Google Identity Services")
        .toEqual([])
      // Tokens live in memory only (ADR-0003): never in storage, the URL, cookies or logs.
      const leaks = [...persisted, ...(await snapshotPersistence(page))].filter(
        (text) => gis.issuedTokens.some((token) => text.includes(token)),
      )
      expect.soft(leaks, "access tokens outside memory").toEqual([])
    },
    { auto: true },
  ],
  sheets: [
    async ({ page, gis }, use) => {
      const sheets = new FakeSheets(gis)
      await sheets.install(page)
      await use(sheets)
      expect
        .soft(sheets.violations, "requests the Sheets API would reject")
        .toEqual([])
    },
    { auto: true },
  ],
})

/** The roadmap cards on the page, in order. */
export function roadmapCards(page: Page) {
  return page.getByRole("main").getByRole("list").getByRole("link")
}

/** Clicks the page's own Connect button (the header has another). */
export async function connect(page: Page): Promise<void> {
  await page
    .getByRole("main")
    .getByRole("button", { name: "Connect Google" })
    .click()
}
