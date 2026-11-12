import { HttpResponse } from "msw"
import { http } from "msw/http"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { CO_LEAD_VALUE } from "@/domain/roadmap/testing/contract-write"
import { categoriesOf, familiesOf } from "@/domain/roadmap/testing/linked-lists"
import {
  type ContractOptions,
  describeRoadmapRepositoryContract,
} from "@/domain/roadmap/testing/roadmap-repository-contract"
import { AppError } from "@/lib/errors"
import { server } from "@/test/msw-server"

import productACsv from "../../../tests/fixtures/sheets/ProductA.csv?raw"
import productBCsv from "../../../tests/fixtures/sheets/ProductB.csv?raw"
import productCCsv from "../../../tests/fixtures/sheets/ProductC.csv?raw"
import roadmapsCsv from "../../../tests/fixtures/sheets/Roadmaps.csv?raw"
import {
  applyBatchUpdate,
  type BatchUpdateBody,
  type GridTab,
} from "../../../tests/fixtures/sheets/apply-batch-update"
import { parseCsv } from "../../../tests/fixtures/sheets/parse-csv"
import { GoogleSheetsRoadmapRepository } from "./google-sheets-roadmap-repository"
import { parseRoadmapIndex } from "./roadmap-index-parser"
import { parseRoadmapTab } from "./roadmap-tab-parser"
import { createSheetsClient, type SheetsClient } from "./sheets-client"

/** IDs the next publishes are given, in turn, before random ones. */
const nextItemIds = vi.hoisted((): string[] => [])
vi.mock("@/domain/roadmap/item-id", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/domain/roadmap/item-id")>()
  return {
    ...actual,
    createItemId: () => nextItemIds.shift() ?? actual.createItemId(),
  }
})

const SPREADSHEET_ID = "spreadsheet-1"
const ENDPOINT = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`
const VALUES_ENDPOINT = `${ENDPOINT}/values/*`
// A RegExp, as MSW would read `:batchUpdate` in a path as a parameter.
const BATCH_UPDATE_ENDPOINT = new RegExp(
  `^${ENDPOINT.replaceAll(".", "\\.")}:batchUpdate$`,
)
const METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount)))"
const VALUES_PARAMS = [
  ["majorDimension", "ROWS"],
  ["valueRenderOption", "FORMATTED_VALUE"],
  ["fields", "values"],
]

/** The example spreadsheet's roadmap index (`tests/fixtures/sheets/Roadmaps.csv`). */
const EXAMPLE_ROWS = parseCsv(roadmapsCsv)

/** The example spreadsheet's roadmap tabs' rows, by tab title. */
const EXAMPLE_TAB_ROWS: Readonly<Record<string, string[][]>> = {
  ProductA: parseCsv(productACsv),
  ProductB: parseCsv(productBCsv),
  ProductC: parseCsv(productCCsv),
}

interface Tab {
  title: string
  index?: number
  hidden?: boolean
}

/** The example spreadsheet's tabs, the roadmap index first. */
const EXAMPLE_TABS: readonly Tab[] = [
  { title: "Roadmaps" },
  { title: "ProductA", index: 1 },
  { title: "ProductB", index: 2 },
  { title: "ProductC", index: 3 },
]

/** The metadata response for these tabs: Google omits a `0` index and `false` hidden. */
function metadataFor(tabs: readonly Tab[]) {
  return {
    sheets: tabs.map((tab, i) => ({ properties: { sheetId: i * 10, ...tab } })),
  }
}

interface Spreadsheet {
  tabs?: readonly Tab[]
  /** The values response of any tab `tabValues` leaves out: the roadmap index's. */
  values?: unknown
  /** The values response of each roadmap tab, by tab title. */
  tabValues?: Readonly<Record<string, unknown>>
}

/** Serves every read over HTTP; records each request. */
function serveSpreadsheet({
  tabs = EXAMPLE_TABS,
  values = { values: EXAMPLE_ROWS },
  tabValues = Object.fromEntries(
    Object.entries(EXAMPLE_TAB_ROWS).map(([title, rows]) => [
      title,
      { values: rows },
    ]),
  ),
}: Spreadsheet = {}) {
  const requests: Request[] = []
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      requests.push(request)
      return HttpResponse.json(metadataFor(tabs))
    }),
    http.get(VALUES_ENDPOINT, ({ request }) => {
      requests.push(request)
      const title = tabTitleOf(request)
      const response = Object.hasOwn(tabValues, title)
        ? tabValues[title]
        : values
      return HttpResponse.json(response as Record<string, unknown>)
    }),
  )
  return requests
}

/** The title of the tab a values request reads, unquoted. */
function tabTitleOf(request: Request): string {
  const range = decodeURIComponent(
    new URL(request.url).pathname.split("/values/")[1] ?? "",
  )
  return range.slice(1, -1).replaceAll("''", "'")
}

/** A repository over the real client, talking to MSW. */
function httpRepository(getAccessToken = (): string | null => "token-123") {
  return new GoogleSheetsRoadmapRepository({
    client: createSheetsClient({ getAccessToken }),
    spreadsheetId: SPREADSHEET_ID,
  })
}

/** A repository over a stub client that answers each read in turn. */
function stubRepository(metadata: unknown, ...values: unknown[]) {
  const getJson = vi
    .fn<SheetsClient["getJson"]>()
    .mockResolvedValueOnce(metadata)
  for (const response of values) getJson.mockResolvedValueOnce(response)
  const repository = new GoogleSheetsRoadmapRepository({
    client: { getJson, postJson: vi.fn<SheetsClient["postJson"]>() },
    spreadsheetId: SPREADSHEET_ID,
  })
  return { repository, getJson }
}

/** The values path of the tab with this title, as Google expects it. */
function valuesPath(title: string): string {
  return `/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}`
}

/** A roadmap index holding exactly these roadmaps, one row each, its tab named by the id. */
function indexRowsFor(roadmaps: readonly Roadmap[]): string[][] {
  const text = (value: { en: string; cy: string } | null) => [
    value?.en ?? "",
    value?.cy ?? "",
  ]
  return [
    [
      "Sheet",
      "Enabled",
      "Category",
      "Product Lead",
      "Last updated",
      "Colour",
      "Title",
      "Title (cy)",
      "Family",
      "Family (cy)",
      "Status label",
      "Status label (cy)",
      "Vision",
      "Vision (cy)",
      "Service description",
      "Service description (cy)",
      "Family ID",
      "Category ID",
    ],
    ...roadmaps.map((roadmap) => [
      roadmap.id,
      roadmap.published ? "Yes" : "No",
      roadmap.category?.en ?? "",
      roadmap.productLead ?? "",
      roadmap.lastUpdated ?? "",
      roadmap.colour ?? "",
      ...text(roadmap.title),
      ...text(roadmap.family),
      ...text(roadmap.statusLabel),
      ...text(roadmap.vision),
      ...text(roadmap.serviceDescription),
      roadmap.familyId ?? "",
      roadmap.categoryId ?? "",
    ]),
  ]
}

/** A `Families` tab holding exactly these families (ADR-013). */
function familyRowsFor(families: readonly Family[]): string[][] {
  return [
    ["ID", "Name", "Name (cy)", "Colour"],
    ...families.map(({ id, name, colour }) => [id, name.en, name.cy, colour]),
  ]
}

/** A `Categories` tab holding exactly these categories (ADR-013). */
function categoryRowsFor(categories: readonly Category[]): string[][] {
  return [
    ["ID", "Name", "Name (cy)"],
    ...categories.map(({ id, name }) => [id, name.en, name.cy]),
  ]
}

/** The English, then the Welsh, of each text column of a roadmap tab. */
const ITEM_TEXT_COLUMNS = [
  ["Title", (item: RoadmapItem) => item.title],
  ["Description", (item: RoadmapItem) => item.description],
  ["Outcome", (item: RoadmapItem) => item.expectedOutcome],
  ["Phase", (item: RoadmapItem) => item.phase],
] as const

/** A roadmap tab holding exactly these items, one row each, in the public site's format. */
function tabRowsFor(items: readonly RoadmapItem[]): string[][] {
  /** Entries joined by `separator`, or blank when every entry is. */
  const join = (entries: readonly string[], separator: string) =>
    entries.every((entry) => entry === "") ? "" : entries.join(separator)
  const nest = (level: number, text: string) =>
    level === 0 ? text : `${"-".repeat(level)} ${text}`
  const language = (lang: keyof LocalisedText) => (item: RoadmapItem) => [
    ...ITEM_TEXT_COLUMNS.map(([, read]) => read(item)?.[lang] ?? ""),
    join(
      item.tags.map((tag) => tag[lang]),
      ", ",
    ),
    join(
      item.details.map(({ text, level }) => nest(level, text[lang])),
      "\n",
    ),
  ]
  const textHeaders = [
    ...ITEM_TEXT_COLUMNS.map(([header]) => header),
    "Labels",
    "Details",
  ]
  return [
    [
      "Item ID",
      ...textHeaders,
      ...textHeaders.map((header) => `${header} (cy)`),
      "Horizon",
      "Organisations",
    ],
    ...items.map((item) => [
      item.id ?? "",
      ...language("en")(item),
      ...language("cy")(item),
      item.placement ?? item.writtenHorizon ?? "",
      item.organisations.map((code) => code.toUpperCase()).join(", "),
    ]),
  ]
}

/** What the batchUpdate fake recorded that the editor must never write (STY-023 S11). */
const writeViolations: string[] = []

afterEach(() => {
  nextItemIds.length = 0
  const violations = writeViolations.splice(0)
  expect(violations).toEqual([])
})

/** A tab as the stateful fake holds it: its rows and grid, and its place in the tab list. */
type FakeTab = GridTab & { index?: number }

/** A tab whose grid is exactly as wide and tall as its rows. */
function gridTab(
  title: string,
  rows: string[][],
  sheetId: number,
  index?: number,
): FakeTab {
  return {
    title,
    sheetId,
    rows,
    rowCount: Math.max(1, rows.length),
    columnCount: Math.max(1, ...rows.map((row) => row.length)),
    ...(index === undefined ? {} : { index }),
  }
}

/** Rows as the values API answers them: trailing blank cells and rows dropped. */
function trimRows(rows: readonly (readonly string[])[]): string[][] {
  const trimmed = rows.map((row) => {
    let end = row.length
    while (end > 0 && row[end - 1] === "") end--
    return row.slice(0, end)
  })
  while (trimmed.length > 0 && trimmed.at(-1)?.length === 0) trimmed.pop()
  return trimmed
}

/**
 * Serves a spreadsheet that publishing changes, as Google does: reads give the tabs as
 * they now are and a `batchUpdate` applies all or nothing (`applyBatchUpdate`).
 */
function serveStatefulSpreadsheet(
  initial: readonly FakeTab[],
  { write }: Pick<ContractOptions, "write"> = {},
) {
  let tabs: FakeTab[] = [...initial]
  let readsFail = false
  const requests: Request[] = []
  const bodies: unknown[] = []
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      requests.push(request)
      if (readsFail) return HttpResponse.json({}, { status: 500 })
      return HttpResponse.json({
        sheets: tabs.map(
          ({ sheetId, title, index, rowCount, columnCount }) => ({
            properties: {
              sheetId,
              title,
              ...(index ? { index } : {}),
              gridProperties: { rowCount, columnCount },
            },
          }),
        ),
      })
    }),
    http.get(VALUES_ENDPOINT, ({ request }) => {
      requests.push(request)
      if (readsFail) return HttpResponse.json({}, { status: 500 })
      const tab = tabs.find(({ title }) => title === tabTitleOf(request))
      if (tab === undefined) return HttpResponse.json({}, { status: 400 })
      return HttpResponse.json({ values: trimRows(tab.rows) })
    }),
    http.post(BATCH_UPDATE_ENDPOINT, async ({ request }) => {
      requests.push(request)
      const body: unknown = await request.json()
      bodies.push(body)
      if (write !== undefined && "fails" in write) {
        const status = write.fails === "forbidden" ? 403 : 401
        return HttpResponse.json({}, { status })
      }
      if (write?.lost === "not-applied") return HttpResponse.error()
      const result = applyBatchUpdate(tabs, body)
      writeViolations.push(...result.violations)
      if ("error" in result) return HttpResponse.json({}, { status: 400 })
      tabs = result.tabs.map((tab, i) => ({ ...tabs[i], ...tab }))
      if (write === undefined) return HttpResponse.json({})
      if (write.lost === "partly-applied") overwriteFirstValue(tabs, body)
      if (write.lost === "reread-fails") readsFail = true
      return HttpResponse.error()
    }),
  )
  return {
    requests,
    /** Each `batchUpdate` body sent. */
    bodies,
    /** The tabs as they now are. */
    tabs: () => tabs,
  }
}

/** A co-lead's change, after the write, to the first value it wrote below a header. */
function overwriteFirstValue(tabs: readonly FakeTab[], body: unknown) {
  const { requests } = body as BatchUpdateBody
  for (const request of requests) {
    if (!("updateCells" in request)) continue
    const { sheetId, rowIndex, columnIndex } = request.updateCells.start
    const row = tabs.find((tab) => tab.sheetId === sheetId)?.rows[rowIndex]
    if (rowIndex > 0 && row !== undefined) {
      row[columnIndex] = CO_LEAD_VALUE
      return
    }
  }
}

describeRoadmapRepositoryContract("GoogleSheetsRoadmapRepository", {
  withRoadmaps(
    roadmaps,
    items = {},
    {
      write,
      unreadableItems = [],
      families = familiesOf(roadmaps),
      categories = categoriesOf(roadmaps),
    } = {},
  ) {
    const lastIndex = roadmaps.length
    serveStatefulSpreadsheet(
      [
        gridTab("Roadmaps", indexRowsFor(roadmaps), 0),
        ...roadmaps.flatMap(({ id }, i) =>
          unreadableItems.includes(id)
            ? []
            : [gridTab(id, tabRowsFor(items[id] ?? []), (i + 1) * 10, i + 1)],
        ),
        ...(families === null
          ? []
          : [gridTab("Families", familyRowsFor(families), 1, lastIndex + 1)]),
        ...(categories === null
          ? []
          : [
              gridTab(
                "Categories",
                categoryRowsFor(categories),
                2,
                lastIndex + 2,
              ),
            ]),
      ],
      { write },
    )
    return httpRepository()
  },
  failing() {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({}, { status: 500 })))
    return httpRepository()
  },
})

describe("GoogleSheetsRoadmapRepository", () => {
  describe("what it reads", () => {
    it("reads the tab list, then the first tab's formatted values, with exact parameters", async () => {
      const requests = serveSpreadsheet()

      await httpRepository().listRoadmaps()

      const [metadata, values] = requests.map(({ url }) => new URL(url))
      expect(requests).toHaveLength(2)
      expect(metadata?.origin).toBe("https://sheets.googleapis.com")
      expect(metadata?.pathname).toBe(`/v4/spreadsheets/${SPREADSHEET_ID}`)
      expect([...(metadata?.searchParams ?? [])]).toEqual([
        ["fields", METADATA_FIELDS],
      ])
      expect(values?.origin).toBe("https://sheets.googleapis.com")
      expect(values?.pathname).toBe(valuesPath("'Roadmaps'"))
      expect([...(values?.searchParams ?? [])]).toEqual(VALUES_PARAMS)
      for (const request of requests) {
        expect(request.headers.get("Authorization")).toBe("Bearer token-123")
      }
    })

    it("passes the abort signal to both reads", async () => {
      const { repository, getJson } = stubRepository(
        metadataFor(EXAMPLE_TABS),
        { values: EXAMPLE_ROWS },
      )
      const { signal } = new AbortController()

      await repository.listRoadmaps({ signal })

      expect(getJson.mock.calls).toEqual([
        [
          `/${SPREADSHEET_ID}`,
          { searchParams: { fields: METADATA_FIELDS }, signal },
        ],
        [
          `/${SPREADSHEET_ID}/values/'Roadmaps'`,
          {
            searchParams: {
              majorDimension: "ROWS",
              valueRenderOption: "FORMATTED_VALUE",
              fields: "values",
            },
            signal,
          },
        ],
      ])
    })

    it("does not start the second read once the load is cancelled (S6)", async () => {
      const controller = new AbortController()
      const reason = new DOMException("Superseded", "AbortError")
      const requests: Request[] = []
      server.use(
        http.get(ENDPOINT, ({ request }) => {
          requests.push(request)
          controller.abort(reason)
          return HttpResponse.json(metadataFor(EXAMPLE_TABS))
        }),
        http.get(VALUES_ENDPOINT, ({ request }) => {
          requests.push(request)
          return HttpResponse.json({ values: EXAMPLE_ROWS })
        }),
      )

      await expect(
        httpRepository().listRoadmaps({ signal: controller.signal }),
      ).rejects.toBe(reason)
      expect(requests).toHaveLength(1)
    })
  })

  describe("the family and category lists (STY-027)", () => {
    const LIST_TABS: readonly Tab[] = [
      ...EXAMPLE_TABS,
      { title: "Families", index: 4 },
      { title: "Categories", index: 5, hidden: true },
    ]
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12A3C9"],
    ]
    const CATEGORY_ROWS = [
      ["ID", "Name", "Name (cy)"],
      ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
    ]
    const serveLists = (tabs = LIST_TABS) =>
      serveSpreadsheet({
        tabs,
        tabValues: {
          Families: { values: FAMILY_ROWS },
          Categories: { values: CATEGORY_ROWS },
        },
      })

    it("reads both list tabs alongside the index, and links each roadmap to them (S2, S5)", async () => {
      const requests = serveLists()

      const [productA] = await httpRepository().listRoadmaps()

      expect(requests.map((request) => tabTitleOf(request)).sort()).toEqual(
        ["", "Categories", "Families", "Roadmaps"].sort(),
      )
      for (const request of requests.slice(1)) {
        expect([...new URL(request.url).searchParams]).toEqual(VALUES_PARAMS)
      }
      expect(productA).toMatchObject({
        family: { en: "Single Record", cy: "Cofnod Sengl" },
        familyId: "fc29g5b9",
        colour: "#12a3c9",
        category: { en: "GP & Community Services", cy: "Meddygon Teulu" },
        categoryId: "khzpchkh",
        outOfStep: true,
      })
    })

    it("lists each from the tab list and its own tab only", async () => {
      const requests = serveLists()

      await expect(httpRepository().listFamilies()).resolves.toStrictEqual([
        {
          id: "fc29g5b9",
          name: { en: "Single Record", cy: "Cofnod Sengl" },
          colour: "#12a3c9",
        },
      ])
      await expect(httpRepository().listCategories()).resolves.toStrictEqual([
        {
          id: "khzpchkh",
          name: { en: "GP & Community Services", cy: "Meddygon Teulu" },
        },
      ])
      expect(requests.map((request) => tabTitleOf(request))).toEqual([
        "",
        "Families",
        "",
        "Categories",
      ])
    })

    it("reads no list from a missing tab, or from the first tab (S6)", async () => {
      const requests = serveLists([
        { title: "Families" },
        ...EXAMPLE_TABS.slice(1),
      ])

      await expect(httpRepository().listFamilies()).resolves.toBeNull()
      await expect(httpRepository().listCategories()).resolves.toBeNull()
      expect(requests.map((request) => tabTitleOf(request))).toEqual(["", ""])
    })
  })

  describe("the listed roadmaps (S1)", () => {
    it("lists the example roadmap index's roadmaps in row order, published or not", async () => {
      serveSpreadsheet()

      const roadmaps = await httpRepository().listRoadmaps()

      expect(
        roadmaps.map(({ id, title, published }) => [id, title.en, published]),
      ).toEqual([
        ["producta", "Product A roadmap", true],
        ["productb", "Product B roadmap", true],
        ["productc", "Product C roadmap", false],
      ])
      expect(roadmaps).toStrictEqual(
        parseRoadmapIndex(EXAMPLE_ROWS).entries.map(({ roadmap }) => roadmap),
      )
    })

    it("lists no tab as a roadmap, not even the list's own", async () => {
      serveSpreadsheet({
        tabs: [{ title: "Roadmaps" }, { title: "Scratch", index: 1 }],
        values: { values: [["Sheet", "Enabled"]] },
      })

      await expect(httpRepository().listRoadmaps()).resolves.toEqual([])
    })
  })

  describe("which tab is the list (S3)", () => {
    it("reads the tab with the lowest index, whatever the response order or its name", async () => {
      const requests = serveSpreadsheet({
        tabs: [
          { title: "ProductA", index: 1 },
          { title: "Index" },
          { title: "ProductB", index: 2 },
        ],
      })

      const roadmaps = await httpRepository().listRoadmaps()

      expect(new URL(requests[1]?.url ?? "").pathname).toBe(
        valuesPath("'Index'"),
      )
      expect(roadmaps).toHaveLength(3)
    })

    it("reads the first tab even when it is hidden", async () => {
      const requests = serveSpreadsheet({
        tabs: [
          { title: "Index", index: 0, hidden: true },
          { title: "ProductA", index: 1 },
        ],
      })

      await httpRepository().listRoadmaps()

      expect(new URL(requests[1]?.url ?? "").pathname).toBe(
        valuesPath("'Index'"),
      )
    })

    it.each([
      ["a space", "Roadmap index", "'Roadmap%20index'"],
      ["an apostrophe", "Dai's roadmaps", "'Dai''s%20roadmaps'"],
      ["a slash and a hash", "Now/Next #1", "'Now%2FNext%20%231'"],
    ])("quotes a tab title with %s", async (_, title, path) => {
      const requests = serveSpreadsheet({ tabs: [{ title }] })

      await httpRepository().listRoadmaps()

      expect(new URL(requests[1]?.url ?? "").pathname).toBe(valuesPath(path))
    })

    it("fails with invalid-data, without reading values, when the spreadsheet has no tabs", async () => {
      const requests = serveSpreadsheet({ tabs: [] })

      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "invalid-data",
        retryable: false,
      })
      expect(requests).toHaveLength(1)
    })
  })

  describe("a roadmap whose tab is missing (S4)", () => {
    it("is listed like the others", async () => {
      serveSpreadsheet({
        tabs: [{ title: "Roadmaps" }, { title: "ProductA", index: 1 }],
      })

      const roadmaps = await httpRepository().listRoadmaps()

      expect(roadmaps.map(({ id }) => id)).toEqual([
        "producta",
        "productb",
        "productc",
      ])
    })
  })

  describe("an unreadable list (S5)", () => {
    it.each([
      ["an empty first tab", {}],
      ["a first tab with no rows", { values: [] }],
      [
        "a header with no Sheet column",
        {
          values: [
            ["Title", "Enabled"],
            ["Product A roadmap", "Yes"],
          ],
        },
      ],
    ])("fails with invalid-data, not retryable, for %s", async (_, values) => {
      serveSpreadsheet({ values })

      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "invalid-data",
        retryable: false,
      })
    })

    it("lists nothing, without failing, for a header with no rows", async () => {
      serveSpreadsheet({ values: { values: [EXAMPLE_ROWS[0]] } })

      await expect(httpRepository().listRoadmaps()).resolves.toEqual([])
    })
  })

  describe("failures (S6)", () => {
    const googleError = (status: number) =>
      HttpResponse.json(
        { error: { code: status, status: "ERROR", message: "Failed" } },
        { status },
      )

    it.each([
      [401, "unauthenticated", false],
      [403, "forbidden", false],
      [404, "not-found", false],
      [429, "rate-limited", true],
      [500, "unknown", true],
      [503, "unknown", true],
    ])(
      "maps HTTP %i from either read to %s (retryable: %s)",
      async (status, kind, retryable) => {
        server.use(http.get(ENDPOINT, () => googleError(status)))
        await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
          kind,
          retryable,
          status,
        })

        serveSpreadsheet()
        server.use(http.get(VALUES_ENDPOINT, () => googleError(status)))
        await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
          kind,
          retryable,
          status,
        })
      },
    )

    it("maps a network failure of either read to a retryable network error", async () => {
      server.use(http.get(ENDPOINT, () => HttpResponse.error()))
      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "network",
        retryable: true,
      })

      serveSpreadsheet()
      server.use(http.get(VALUES_ENDPOINT, () => HttpResponse.error()))
      await expect(httpRepository().listRoadmaps()).rejects.toMatchObject({
        kind: "network",
        retryable: true,
      })
    })

    it.each([
      [
        "metadata",
        { sheets: [{ properties: { title: "A" } }] },
        { values: [] },
      ],
      ["values", metadataFor(EXAMPLE_TABS), { values: [["Sheet"], [7]] }],
    ])(
      "rejects a malformed %s response as invalid-response",
      async (_, metadata, values) => {
        const { repository } = stubRepository(metadata, values)

        await expect(repository.listRoadmaps()).rejects.toMatchObject({
          kind: "invalid-response",
        })
      },
    )

    it("propagates client failures unchanged", async () => {
      const failure = new AppError("forbidden", { status: 403 })
      const repository = new GoogleSheetsRoadmapRepository({
        client: {
          getJson: () => Promise.reject(failure),
          postJson: () => Promise.reject(failure),
        },
        spreadsheetId: SPREADSHEET_ID,
      })

      await expect(repository.listRoadmaps()).rejects.toBe(failure)
    })
  })
  describe("a roadmap's items", () => {
    const itemsOf = (roadmapId: string, signal?: AbortSignal) =>
      httpRepository().listRoadmapItems(roadmapId, { signal })

    it("reads the tab list, the index, then the roadmap's own tab, with the list's parameters and token (S1)", async () => {
      const requests = serveSpreadsheet()

      const items = await itemsOf("producta")

      expect(items).toHaveLength(9)
      expect(items).toStrictEqual(
        parseRoadmapTab(EXAMPLE_TAB_ROWS.ProductA ?? []).items,
      )
      const urls = requests.map(({ url }) => new URL(url))
      expect(urls.map(({ pathname }) => pathname)).toEqual([
        `/v4/spreadsheets/${SPREADSHEET_ID}`,
        valuesPath("'Roadmaps'"),
        valuesPath("'ProductA'"),
      ])
      expect([...(urls[0]?.searchParams ?? [])]).toEqual([
        ["fields", METADATA_FIELDS],
      ])
      for (const url of urls.slice(1)) {
        expect([...url.searchParams]).toEqual(VALUES_PARAMS)
      }
      for (const request of requests) {
        expect(request.headers.get("Authorization")).toBe("Bearer token-123")
      }
    })

    it("passes the abort signal to all three reads", async () => {
      const { repository, getJson } = stubRepository(
        metadataFor(EXAMPLE_TABS),
        { values: EXAMPLE_ROWS },
        { values: EXAMPLE_TAB_ROWS.ProductB },
      )
      const { signal } = new AbortController()

      await repository.listRoadmapItems("productb", { signal })

      expect(
        getJson.mock.calls.map(([path, options]) => [path, options?.signal]),
      ).toEqual([
        [`/${SPREADSHEET_ID}`, signal],
        [`/${SPREADSHEET_ID}/values/'Roadmaps'`, signal],
        [`/${SPREADSHEET_ID}/values/'ProductB'`, signal],
      ])
    })

    it("reads an unpublished roadmap's items too (S2)", async () => {
      serveSpreadsheet()

      const items = await itemsOf("productc")

      expect(items).toHaveLength(1)
      expect(items[0]?.organisations).toEqual([])
    })

    it("fails with not-found, not retryable, for an id the index does not list, after reading only the list (S3)", async () => {
      const requests = serveSpreadsheet()

      await expect(itemsOf("0")).rejects.toMatchObject({
        kind: "not-found",
        retryable: false,
      })
      expect(requests).toHaveLength(2)
    })

    describe("a missing or unreadable tab (S4)", () => {
      // ProductA's tab has no Title column; ProductB's tab does not exist.
      const brokenSpreadsheet = () =>
        serveSpreadsheet({
          tabs: [{ title: "Roadmaps" }, { title: "ProductA", index: 1 }],
          values: { values: EXAMPLE_ROWS.slice(0, 3) },
          tabValues: { ProductA: { values: [["Horizon"], ["Now"]] } },
        })

      it("fails with invalid-data, not retryable, without requesting a tab that does not exist", async () => {
        const requests = brokenSpreadsheet()

        await expect(itemsOf("productb")).rejects.toMatchObject({
          kind: "invalid-data",
          retryable: false,
        })
        expect(requests).toHaveLength(2)
      })

      it("fails with invalid-data, not retryable, for a tab with no Title column", async () => {
        brokenSpreadsheet()

        await expect(itemsOf("producta")).rejects.toMatchObject({
          kind: "invalid-data",
          retryable: false,
        })
      })

      it("fails with invalid-data for an empty tab", async () => {
        serveSpreadsheet({ tabValues: { ProductA: {} } })

        await expect(itemsOf("producta")).rejects.toMatchObject({
          kind: "invalid-data",
        })
      })

      it("still lists both roadmaps", async () => {
        brokenSpreadsheet()

        const roadmaps = await httpRepository().listRoadmaps()

        expect(roadmaps.map(({ id }) => id)).toEqual(["producta", "productb"])
      })
    })

    describe("which tab (S5)", () => {
      it("reads a tab whose title needs quoting, the quote doubled, as one encoded segment", async () => {
        const title = `Product's "B" & co`
        const [header = []] = EXAMPLE_ROWS
        const requests = serveSpreadsheet({
          tabs: [{ title: "Roadmaps" }, { title, index: 1 }],
          values: {
            values: [
              header,
              header.map((name) => (name === "Sheet" ? title : "")),
            ],
          },
          tabValues: { [title]: { values: EXAMPLE_TAB_ROWS.ProductC } },
        })
        const [roadmap] = await httpRepository().listRoadmaps()

        const items = await itemsOf(roadmap?.id ?? "")

        expect(items).toHaveLength(1)
        expect(new URL(requests.at(-1)?.url ?? "").pathname).toBe(
          valuesPath("'Product''s%20%22B%22%20%26%20co'"),
        )
      })

      it("does not match a tab whose title differs only in case", async () => {
        const requests = serveSpreadsheet({
          tabs: [{ title: "Roadmaps" }, { title: "producta", index: 1 }],
        })

        await expect(itemsOf("producta")).rejects.toMatchObject({
          kind: "invalid-data",
        })
        expect(requests).toHaveLength(2)
      })
    })

    describe("failures and cancellation (S6)", () => {
      const googleError = (status: number) =>
        HttpResponse.json(
          { error: { code: status, status: "ERROR", message: "Failed" } },
          { status },
        )
      /** Serves the example spreadsheet with the read at `position` (0–2) failing. */
      const failingRead = (position: number, failure: () => Response) => {
        serveSpreadsheet()
        if (position === 0) {
          server.use(http.get(ENDPOINT, failure))
        } else {
          const title = position === 1 ? "Roadmaps" : "ProductA"
          server.use(
            http.get(VALUES_ENDPOINT, ({ request }) =>
              tabTitleOf(request) === title ? failure() : undefined,
            ),
          )
        }
      }
      const reads = [
        ["the tab list", 0],
        ["the index", 1],
        ["the roadmap's tab", 2],
      ] as const

      describe.each(reads)("when %s fails", (_, position) => {
        it.each([
          [401, "unauthenticated", false],
          [403, "forbidden", false],
          [429, "rate-limited", true],
          [500, "unknown", true],
          [503, "unknown", true],
        ])(
          "maps HTTP %i to %s (retryable: %s), as the list does",
          async (status, kind, retryable) => {
            failingRead(position, () => googleError(status))

            await expect(itemsOf("producta")).rejects.toMatchObject({
              kind,
              retryable,
              status,
            })
          },
        )

        it("maps a network failure to a retryable network error", async () => {
          failingRead(position, () => HttpResponse.error())

          await expect(itemsOf("producta")).rejects.toMatchObject({
            kind: "network",
            retryable: true,
          })
        })
      })

      it("rejects with the abort reason, reading no further, when cancelled mid-read", async () => {
        const controller = new AbortController()
        const reason = new DOMException("Superseded", "AbortError")
        const requests = serveSpreadsheet()
        server.use(
          http.get(VALUES_ENDPOINT, ({ request }) => {
            requests.push(request)
            controller.abort(reason)
            return HttpResponse.json({ values: EXAMPLE_ROWS })
          }),
        )

        await expect(itemsOf("producta", controller.signal)).rejects.toBe(
          reason,
        )
        expect(requests).toHaveLength(2)
      })

      it("rejects a malformed roadmap tab response as invalid-response", async () => {
        const { repository } = stubRepository(
          metadataFor(EXAMPLE_TABS),
          { values: EXAMPLE_ROWS },
          { values: [["Title"], [7]] },
        )

        await expect(
          repository.listRoadmapItems("producta"),
        ).rejects.toMatchObject({ kind: "invalid-response" })
      })
    })
  })

  describe("publishing a roadmap's changes", () => {
    /** The example spreadsheet as the stateful fake holds it, with its `Template` tab. */
    const exampleTabs = (): FakeTab[] => [
      gridTab("Roadmaps", EXAMPLE_ROWS, 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      gridTab("Template", [["Title", "Item ID", "Horizon"]], 20, 2),
    ]

    /** Every cell that differs between two spreadsheets, as `tab!R1C1 value`. */
    function changedCells(
      before: readonly FakeTab[],
      after: readonly FakeTab[],
    ): string[] {
      return after.flatMap((tab, t) => {
        const old = before[t]?.rows ?? []
        return tab.rows.flatMap((row, r) =>
          row.flatMap((value, c) =>
            (old[r]?.[c] ?? "") === value
              ? []
              : [`${tab.title}!R${String(r + 1)}C${String(c + 1)} ${value}`],
          ),
        )
      })
    }

    const titleChange = {
      roadmap: { title: { base: "Product A roadmap", value: "Product A" } },
      items: [],
    }

    it("sends one batchUpdate after the three reads, as JSON with the token (S2)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(exampleTabs())

      await expect(
        httpRepository().publishRoadmapChanges("producta", titleChange),
      ).resolves.toEqual({ status: "published" })

      const [, , , write, ...rest] = spreadsheet.requests
      expect(rest).toEqual([])
      expect(write?.method).toBe("POST")
      expect(write?.url).toBe(`${ENDPOINT}:batchUpdate`)
      expect(write?.headers.get("authorization")).toBe("Bearer token-123")
      expect(write?.headers.get("content-type")).toBe("application/json")
      expect(
        spreadsheet.requests.slice(0, 3).map(({ method }) => method),
      ).toEqual(["GET", "GET", "GET"])
    })

    it("writes only the changed cell, an Item ID column and every item's ID, leaving all else as it was (S1, S6, S7)", async () => {
      const before = exampleTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await httpRepository().publishRoadmapChanges("producta", titleChange)

      const changes = changedCells(before, spreadsheet.tabs())
      expect(changes).toEqual([
        "Roadmaps!R2C3 Product A",
        "ProductA!R1C15 Item ID",
        ...Array.from(
          { length: 9 },
          (_, i) =>
            expect.stringMatching(
              new RegExp(`^ProductA!R${String(i + 2)}C15 \\S+$`),
            ) as string,
        ),
      ])
      const ids = changes.slice(2).map((change) => change.split(" ")[1])
      expect(new Set(ids).size).toBe(9)
      expect(spreadsheet.tabs()[1]).toMatchObject({ columnCount: 15 })
      const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
      expect(requests).toHaveLength(12)
      expect(requests.slice(0, 3)).toMatchObject([
        {
          updateCells: {
            start: { sheetId: 0, rowIndex: 1, columnIndex: 2 },
            rows: [
              {
                values: [{ userEnteredValue: { stringValue: "Product A" } }],
              },
            ],
            fields: "userEnteredValue",
          },
        },
        {
          appendDimension: { sheetId: 10, dimension: "COLUMNS", length: 1 },
        },
        {
          updateCells: {
            start: { sheetId: 10, rowIndex: 0, columnIndex: 14 },
            rows: [
              { values: [{ userEnteredValue: { stringValue: "Item ID" } }] },
            ],
          },
        },
      ])
    })

    it("sends every value as text and a cleared field as an empty cell (S3)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
      const [item] = await httpRepository().listRoadmapItems("producta")
      if (item === undefined) throw new Error("Product A has items")

      await httpRepository().publishRoadmapChanges("producta", {
        roadmap: { statusLabel: { base: "Beta", value: "=SUM(A1)" } },
        items: [
          {
            item,
            position: 0,
            fields: {
              phase: { base: item.phase?.en ?? "", value: " 42 " },
              expectedOutcome: {
                base: item.expectedOutcome?.en ?? "",
                value: "",
              },
            },
          },
        ],
      })

      const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
      const values = requests.flatMap((request) =>
        "updateCells" in request
          ? request.updateCells.rows.flatMap(({ values }) => values)
          : [],
      )
      expect(values).toContainEqual({
        userEnteredValue: { stringValue: "=SUM(A1)" },
      })
      expect(values).toContainEqual({ userEnteredValue: { stringValue: "42" } })
      expect(values).toContainEqual({})
      expect(spreadsheet.tabs()[1]?.rows[1]?.[2]).toBe("")
    })

    describe("a missing column (S7)", () => {
      it("goes after the last used column, inside a grid wide enough for it", async () => {
        const rows = EXAMPLE_ROWS.map((row) => [
          ...row.slice(0, 8),
          ...row.slice(9),
        ])
        const index = { ...gridTab("Roadmaps", rows, 0), columnCount: 26 }
        const before = [index, ...exampleTabs().slice(1)]
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          roadmap: { vision: { base: "", value: "Where we are heading" } },
          items: [],
        })

        expect(
          changedCells(before, spreadsheet.tabs()).filter((change) =>
            change.startsWith("Roadmaps!"),
          ),
        ).toEqual([
          "Roadmaps!R1C15 Vision",
          "Roadmaps!R2C15 Where we are heading",
        ])
        expect(spreadsheet.tabs()[0]?.columnCount).toBe(26)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(
          requests.filter(
            (request) =>
              "appendDimension" in request &&
              request.appendDimension.sheetId === 0,
          ),
        ).toEqual([])
      })

      it("grows a grid that ends at the last used column, in the same request", async () => {
        const [header = [], ...body] = EXAMPLE_TAB_ROWS.ProductB ?? []
        const phase = header.indexOf("Phase")
        const withoutPhase = [header, ...body].map((row) =>
          row.filter((_, c) => c !== phase),
        )
        const before = [
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab("ProductB", withoutPhase, 10, 1),
        ]
        const spreadsheet = serveStatefulSpreadsheet(before)
        const [item] = await httpRepository().listRoadmapItems("productb")
        if (item === undefined) throw new Error("Product B has items")

        await httpRepository().publishRoadmapChanges("productb", {
          roadmap: {},
          items: [
            {
              item,
              position: 0,
              fields: { phase: { base: "", value: "Beta" } },
            },
          ],
        })

        expect(changedCells(before, spreadsheet.tabs())).toEqual([
          "ProductB!R1C8 Phase",
          "ProductB!R1C9 Item ID",
          "ProductB!R2C8 Beta",
          ...body.map(
            (_, i) =>
              expect.stringMatching(
                new RegExp(`^ProductB!R${String(i + 2)}C9 \\S+$`),
              ) as string,
          ),
        ])
        expect(spreadsheet.tabs()[1]?.columnCount).toBe(9)
        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests[0]).toEqual({
          appendDimension: { sheetId: 10, dimension: "COLUMNS", length: 2 },
        })
      })
    })

    describe("which tabs it writes (S1)", () => {
      /** The example spreadsheet with Product A's index row naming `sheet`. */
      function naming(sheet: string): FakeTab[] {
        const [indexTab, ...rest] = exampleTabs()
        if (indexTab === undefined) throw new Error("The example has an index")
        const rows = indexTab.rows.map((row, r) =>
          r === 1 ? [sheet, ...row.slice(1)] : row,
        )
        return [{ ...indexTab, rows }, ...rest]
      }

      it.each([
        ["Template", "template"],
        ["Roadmaps", "roadmaps"],
      ])(
        "fails with invalid-data, writing nothing, for a roadmap whose tab is %s",
        async (sheet, roadmapId) => {
          const spreadsheet = serveStatefulSpreadsheet(naming(sheet))

          await expect(
            httpRepository().publishRoadmapChanges(roadmapId, {
              roadmap: { title: { base: "Product A roadmap", value: "New" } },
              items: [],
            }),
          ).rejects.toMatchObject({ kind: "invalid-data", retryable: false })
          await expect(
            httpRepository().listRoadmapItems(roadmapId),
          ).rejects.toMatchObject({ kind: "invalid-data" })
          expect(spreadsheet.bodies).toEqual([])
        },
      )

      it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
        const [indexTab, ...rest] = exampleTabs()
        if (indexTab === undefined) throw new Error("The example has an index")
        const spreadsheet = serveStatefulSpreadsheet([
          { ...indexTab, title: "Template" },
          ...rest.filter(({ title }) => title !== "Template"),
        ])

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange),
        ).rejects.toMatchObject({ kind: "invalid-data", retryable: false })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("gives no new ID that a skipped row already holds", async () => {
        const spreadsheet = serveStatefulSpreadsheet([
          gridTab("Roadmaps", EXAMPLE_ROWS, 0),
          gridTab(
            "ProductA",
            [
              ["Title", "Horizon", "Item ID"],
              ["", "Now", "skipped2"],
              ["Kept", "Now", ""],
            ],
            10,
            1,
          ),
        ])
        nextItemIds.push("skipped2", "fresh234")

        await httpRepository().publishRoadmapChanges("producta", titleChange)

        expect(spreadsheet.tabs()[1]?.rows.map((row) => row[2])).toEqual([
          "Item ID",
          "skipped2",
          "fresh234",
        ])
      })
    })

    describe("failures and cancellation (S10)", () => {
      it("rejects with unauthenticated, writing nothing, when the session ends before the write", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        let reads = 0
        const repository = httpRepository(() =>
          ++reads <= 3 ? "token-123" : null,
        )

        await expect(
          repository.publishRoadmapChanges("producta", titleChange),
        ).rejects.toMatchObject({ kind: "unauthenticated" })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("rejects with the abort reason, writing nothing, when cancelled during the reads", async () => {
        const controller = new AbortController()
        const reason = new DOMException("Left the page", "AbortError")
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        server.use(
          http.get(VALUES_ENDPOINT, ({ request }) => {
            // Returns nothing, so the stateful fake answers.
            if (tabTitleOf(request) === "ProductA") controller.abort(reason)
          }),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange, {
            signal: controller.signal,
          }),
        ).rejects.toBe(reason)
        expect(spreadsheet.bodies).toEqual([])
      })

      it("publishes regardless once the write is sent, as it can't be taken back", async () => {
        const controller = new AbortController()
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        server.use(
          http.post(BATCH_UPDATE_ENDPOINT, () => {
            controller.abort()
          }),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange, {
            signal: controller.signal,
          }),
        ).resolves.toEqual({ status: "published" })
        expect(spreadsheet.tabs()[0]?.rows[1]?.[2]).toBe("Product A")
      })

      it("does not retry a failed write", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        let writes = 0
        server.use(
          http.post(BATCH_UPDATE_ENDPOINT, () => {
            writes++
            return HttpResponse.json({}, { status: 503 })
          }),
        )

        await expect(
          httpRepository().publishRoadmapChanges("producta", titleChange),
        ).rejects.toMatchObject({ kind: "unknown", status: 503 })
        expect(writes).toBe(1)
        expect(
          spreadsheet.requests.filter(({ method }) => method === "GET"),
        ).toHaveLength(3)
      })
    })
  })
})
