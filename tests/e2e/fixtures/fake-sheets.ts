import type { Page, Route } from "@playwright/test"

import { appConfig } from "./app-config"
import type { FakeGis } from "./fake-gis"

const SPREADSHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets"

/** The partial-response mask the app must send, exactly. */
export const METADATA_FIELDS = "sheets(properties(sheetId,title,index,hidden))"

export interface Worksheet {
  sheetId: number
  title: string
  hidden?: boolean
}

/** How the fake answers one request: the spreadsheet's worksheets, or an HTTP error. */
export type SheetsReply =
  { worksheets: readonly Worksheet[] } | { status: number }

/**
 * The spreadsheet tests see unless they say otherwise. One worksheet is hidden, and the
 * visible ones are sorted by neither title nor id, so the app must keep Google's order.
 */
const WORKSHEETS: readonly Worksheet[] = [
  { sheetId: 0, title: "Platform" },
  { sheetId: 1_834_567, title: "Archived plans", hidden: true },
  { sheetId: 42, title: "Mobile app" },
  { sheetId: 7, title: "Data & analytics" },
]

/** Google's canonical status names, for its JSON error envelope. */
const STATUS_NAMES: Readonly<Record<number, string>> = {
  400: "INVALID_ARGUMENT",
  401: "UNAUTHENTICATED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  429: "RESOURCE_EXHAUSTED",
  500: "INTERNAL",
  503: "UNAVAILABLE",
}

/**
 * The Google Sheets API, faked: answers `spreadsheets.get` for the configured
 * spreadsheet and checks every request the way the real API would (path, `fields`,
 * bearer token). Requests get {@link WORKSHEETS} unless queued otherwise.
 */
export class FakeSheets {
  /** The bearer token of every request, in order (`null` without one). */
  readonly tokens: (string | null)[] = []
  /** Requests the real API would reject; the fixture fails the test if there are any. */
  readonly violations: string[] = []

  readonly #replies: SheetsReply[] = []
  readonly #gis: FakeGis
  #held: Promise<void> | undefined

  constructor(gis: FakeGis) {
    this.#gis = gis
  }

  /** Queues answers for the next requests; once they run out, requests get the default. */
  respondWith(...replies: SheetsReply[]): void {
    this.#replies.push(...replies)
  }

  /** Holds back replies until the returned `release` is called, to observe loading. */
  hold(): () => void {
    let resolve: () => void = () => undefined
    this.#held = new Promise<void>((done) => {
      resolve = done
    })
    return () => {
      this.#held = undefined
      resolve()
    }
  }

  async install(page: Page): Promise<void> {
    await page.route(`${SPREADSHEETS_URL}/**`, (route) => this.#handle(route))
  }

  async #handle(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const authorization = await request.headerValue("authorization")
    const token = /^Bearer (\S+)$/.exec(authorization ?? "")?.[1] ?? null
    this.tokens.push(token)

    const expectedPath = `/v4/spreadsheets/${appConfig.spreadsheetId}`
    const query = [...url.searchParams]
    const fields = query.length === 1 ? url.searchParams.get("fields") : null
    if (request.method() !== "GET" || url.pathname !== expectedPath) {
      return this.#reject(route, 404, `${request.method()} ${url.pathname}`)
    }
    if (fields !== METADATA_FIELDS) {
      return this.#reject(route, 400, `query ${url.search}`)
    }
    if (!token || !this.#gis.accepts(token)) {
      return this.#reject(route, 401, `Authorization: ${authorization ?? "-"}`)
    }

    await this.#held
    const reply = this.#replies.shift() ?? { worksheets: WORKSHEETS }
    if ("status" in reply) {
      return fulfil(route, reply.status, errorBody(reply.status))
    }
    return fulfil(route, 200, {
      // The `fields` mask: only these properties. Google omits `false` values.
      sheets: reply.worksheets.map(({ sheetId, title, hidden }, index) => ({
        properties: { sheetId, title, index, ...(hidden && { hidden }) },
      })),
    })
  }

  #reject(route: Route, status: number, detail: string): Promise<void> {
    this.violations.push(`Unexpected Sheets request (${detail})`)
    return fulfil(route, status, errorBody(status))
  }
}

function errorBody(code: number) {
  return {
    error: {
      code,
      message: `Fake Sheets API error ${String(code)}`,
      status: STATUS_NAMES[code] ?? "UNKNOWN",
    },
  }
}

async function fulfil(
  route: Route,
  status: number,
  json: unknown,
): Promise<void> {
  const origin = await route.request().headerValue("origin")
  await route.fulfill({
    status,
    json,
    // Cross-origin, like the real API.
    headers: { "access-control-allow-origin": origin ?? "*", vary: "Origin" },
  })
}
