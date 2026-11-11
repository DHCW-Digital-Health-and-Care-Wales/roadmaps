import { readFileSync } from "node:fs"
import path from "node:path"

import type { Page, Route } from "@playwright/test"

import { parseCsv } from "../../fixtures/sheets/parse-csv"

import { appConfig } from "./app-config"
import type { FakeGis } from "./fake-gis"

const SPREADSHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets"

/** The partial-response mask of the tab list read, exactly. */
const METADATA_FIELDS = "sheets(properties(sheetId,title,index,hidden))"

/** The query of every values read, exactly (ADR-009, ADR-011). */
const VALUES_QUERY: Readonly<Record<string, string>> = {
  majorDimension: "ROWS",
  valueRenderOption: "FORMATTED_VALUE",
  fields: "values",
}

/** One tab of the fake spreadsheet: its title, whether it is hidden, and its cells. */
export interface FakeTab {
  title: string
  hidden?: boolean
  rows: readonly (readonly string[])[]
}

/**
 * A read the app makes: the tab list (`metadata`), or the values of the tab with this
 * title (`values:Roadmaps`). A list load is the tab list, then the first tab's values;
 * a roadmap's items add its own tab's values (ADR-011).
 */
export type SheetsRead = "metadata" | `values:${string}`

const FIXTURES = path.resolve(import.meta.dirname, "../../fixtures/sheets")

function readCsv(file: string): string[][] {
  return parseCsv(readFileSync(path.join(FIXTURES, file), "utf8"))
}

/** The example spreadsheet's roadmap index (`tests/fixtures/sheets/Roadmaps.csv`). */
export const EXAMPLE_INDEX_ROWS: readonly (readonly string[])[] =
  readCsv("Roadmaps.csv")

/**
 * The spreadsheet tests see unless they say otherwise: the example spreadsheet, its
 * roadmap index first and a tab per roadmap (`tests/fixtures/sheets/`).
 */
export const EXAMPLE_SPREADSHEET: readonly FakeTab[] = [
  { title: "Roadmaps", rows: EXAMPLE_INDEX_ROWS },
  { title: "ProductA", rows: readCsv("ProductA.csv") },
  { title: "ProductB", rows: readCsv("ProductB.csv") },
  { title: "ProductC", rows: readCsv("ProductC.csv") },
]

/**
 * One row of the roadmap index, in the example header's column order, from the cells to
 * set by header name (the rest blank): `roadmapRow({ Sheet: "x", Colour: "#ffffff" })`.
 */
export function roadmapRow(cells: Readonly<Record<string, string>>): string[] {
  const [header = []] = EXAMPLE_INDEX_ROWS
  const unknown = Object.keys(cells).filter((name) => !header.includes(name))
  if (unknown.length > 0) {
    throw new Error(`Not columns of the example index: ${unknown.join(", ")}`)
  }
  return header.map((name) => cells[name] ?? "")
}

/** The example spreadsheet with its roadmap index's rows replaced. */
export function withRoadmapIndex(
  rows: readonly (readonly string[])[],
): FakeTab[] {
  const [index, ...tabs] = EXAMPLE_SPREADSHEET
  return [{ title: index?.title ?? "Roadmaps", rows }, ...tabs]
}

/** A request the fake answers: the tab list, or one tab's values. */
type Read = { kind: "metadata" } | { kind: "values"; tab: FakeTab }

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
 * The Google Sheets API, faked: answers the configured spreadsheet's tab list and any of
 * its tabs' values, and checks every request the way the real API would (path, query,
 * bearer token). Reading a tab that does not exist is a violation too: the app checks
 * the tab list first.
 */
export class FakeSheets {
  /** The bearer token of every request, in order (`null` without one). */
  readonly tokens: (string | null)[] = []
  /** The reads answered or failed, in order. */
  readonly reads: SheetsRead[] = []
  /** Requests the real API would reject; the fixture fails the test if there are any. */
  readonly violations: string[] = []
  /** What the spreadsheet holds; replace it to change what later reads see. */
  spreadsheet: readonly FakeTab[] = EXAMPLE_SPREADSHEET

  readonly #failures: number[] = []
  readonly #gis: FakeGis
  #held: Promise<void> | undefined

  constructor(gis: FakeGis) {
    this.#gis = gis
  }

  /** Fails the next requests, whichever read, with these HTTP statuses, one each. */
  failWith(...statuses: number[]): void {
    this.#failures.push(...statuses)
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

    const read = this.#readOf(request.method(), url)
    if ("status" in read) {
      return this.#reject(route, read.status, read.detail)
    }
    const query =
      read.kind === "metadata" ? { fields: METADATA_FIELDS } : VALUES_QUERY
    if (!hasQuery(url, query)) {
      return this.#reject(route, 400, `query ${url.search}`)
    }
    if (!token || !this.#gis.accepts(token)) {
      return this.#reject(route, 401, `Authorization: ${authorization ?? "-"}`)
    }

    await this.#held
    this.reads.push(
      read.kind === "metadata" ? "metadata" : `values:${read.tab.title}`,
    )
    const failure = this.#failures.shift()
    if (failure !== undefined) {
      return fulfil(route, failure, errorBody(failure))
    }
    if (read.kind === "metadata") {
      return fulfil(route, 200, {
        // The `fields` mask: only these properties. Google omits `0` and `false`.
        sheets: this.spreadsheet.map(({ title, hidden }, index) => ({
          properties: {
            sheetId: index * 1_000,
            title,
            ...(index > 0 && { index }),
            ...(hidden && { hidden }),
          },
        })),
      })
    }
    const rows = trimRows(read.tab.rows)
    // Google omits `values` for a tab with no cells.
    return fulfil(route, 200, rows.length > 0 ? { values: rows } : {})
  }

  /** Which read a request is, or how the real API (or the app's contract) rejects it. */
  #readOf(method: string, url: URL): Read | { status: number; detail: string } {
    const spreadsheetPath = `/v4/spreadsheets/${appConfig.spreadsheetId}`
    const valuesPrefix = `${spreadsheetPath}/values/`
    if (method === "GET" && url.pathname === spreadsheetPath) {
      return { kind: "metadata" }
    }
    if (method !== "GET" || !url.pathname.startsWith(valuesPrefix)) {
      return { status: 404, detail: `${method} ${url.pathname}` }
    }
    const range = decodeURIComponent(url.pathname.slice(valuesPrefix.length))
    // A whole tab, its title quoted with any quote doubled, as one path segment.
    const tab = this.spreadsheet.find(
      ({ title }) => range === `'${title.replaceAll("'", "''")}'`,
    )
    if (tab === undefined) {
      return { status: 400, detail: `values of ${range}, not a tab` }
    }
    return { kind: "values", tab }
  }

  #reject(route: Route, status: number, detail: string): Promise<void> {
    this.violations.push(`Unexpected Sheets request (${detail})`)
    return fulfil(route, status, errorBody(status))
  }
}

/** Whether the URL's query is exactly these parameters, in any order. */
function hasQuery(
  url: URL,
  expected: Readonly<Record<string, string>>,
): boolean {
  const query = [...url.searchParams]
  return (
    query.length === Object.keys(expected).length &&
    query.every(([name, value]) => expected[name] === value)
  )
}

/** The rows as Google sends them: trailing blank cells and rows dropped. */
function trimRows(rows: readonly (readonly string[])[]): string[][] {
  const trimmed = rows.map((row) => {
    const cells = [...row]
    while (cells.at(-1) === "") cells.pop()
    return cells
  })
  while (trimmed.at(-1)?.length === 0) trimmed.pop()
  return trimmed
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
