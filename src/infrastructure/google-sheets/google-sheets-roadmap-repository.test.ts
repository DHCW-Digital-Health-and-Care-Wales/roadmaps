import { HttpResponse } from "msw"
import { http } from "msw/http"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { markedUpdated } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { CO_LEAD_VALUE } from "@/domain/roadmap/testing/contract-write"
import { categoriesOf, familiesOf } from "@/domain/roadmap/testing/linked-lists"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
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
      [
        ...item.organisationIds.map((id) => id.toUpperCase()),
        ...item.unknownOrganisationCodes,
      ].join(", "),
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
  {
    write,
    beforeWrite,
  }: Pick<ContractOptions, "write"> & {
    /** A co-lead's change, made after the reads and before the write lands. */
    beforeWrite?: (tabs: FakeTab[]) => FakeTab[]
  } = {},
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
      if (beforeWrite) tabs = beforeWrite(tabs)
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

/** Every cell that differs, as `tab!R1C1 value`. */
function changedCells(before: FakeTab[], after: FakeTab[]): string[] {
  return after.flatMap((tab, t) =>
    tab.rows.flatMap((row, r) =>
      row.flatMap((value, c) =>
        (before[t]?.rows[r]?.[c] ?? "") === value
          ? []
          : [`${tab.title}!R${String(r + 1)}C${String(c + 1)} ${value}`],
      ),
    ),
  )
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
      twins = [],
      syncFaults = {},
    } = {},
  ) {
    const lastIndex = roadmaps.length
    const indexRows = indexRowsFor([...roadmaps, ...twins])
    const colourAt = indexRows[0]?.indexOf("Colour") ?? -1
    for (const row of indexRows.slice(1)) {
      const [id = ""] = row
      // `#aabbcc` written as the `#abc` it expands from.
      if (syncFaults[id]?.includes("short-colour")) {
        const [, r, , g, , b] = row[colourAt] ?? ""
        row[colourAt] = `#${r ?? ""}${g ?? ""}${b ?? ""}`
      }
    }
    /** The roadmap's tab, its header without the columns its faults remove. */
    const tabRows = (id: string) => {
      const [header = [], ...rows] = tabRowsFor(items[id] ?? [])
      const renamed: Readonly<Record<string, string>> = {
        ...(syncFaults[id]?.includes("no-title-column") && { Title: "Name" }),
        ...(syncFaults[id]?.includes("no-horizon-column") && {
          Horizon: "When",
        }),
      }
      return [header.map((cell) => renamed[cell] ?? cell), ...rows]
    }
    serveStatefulSpreadsheet(
      [
        gridTab("Roadmaps", indexRows, 0),
        ...roadmaps.flatMap(({ id }, i) =>
          unreadableItems.includes(id)
            ? []
            : [gridTab(id, tabRows(id), (i + 1) * 10, i + 1)],
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

    it("serves the built-in twelve organisations, by short name, without a request (S2)", async () => {
      const requests = serveLists()

      const organisations = await httpRepository().listOrganisations()

      expect(requests).toEqual([])
      expect(
        organisations.map(({ id, code, shortName }) => [id, code, shortName]),
      ).toEqual([
        ["national", "National", "All Wales"],
        ["abuhb", "ABUHB", "Aneurin Bevan"],
        ["bcuhb", "BCUHB", "Betsi Cadwaladr"],
        ["cavuhb", "CAVUHB", "Cardiff and Vale"],
        ["ctmuhb", "CTMUHB", "Cwm Taf Morgannwg"],
        ["hduhb", "HDUHB", "Hywel Dda"],
        ["pthb", "PTHB", "Powys"],
        ["sbuhb", "SBUHB", "Swansea Bay"],
        ["vunhst", "VUNHST", "Velindre"],
        ["wast", "WAST", "Welsh Ambulance"],
        ["phw", "PHW", "Public Health Wales"],
        ["heiw", "HEIW", "Health Education and Improvement Wales"],
      ])
      expect(
        organisations.filter(({ national }) => national).map(({ id }) => id),
      ).toEqual(["national"])
      expect(organisations[0]?.name).toEqual({
        en: "All Wales",
        cy: "Cymru gyfan",
      })
      expect(organisations[3]?.name).toEqual({
        en: "Cardiff and Vale University Health Board",
        cy: "Bwrdd Iechyd Prifysgol Caerdydd a’r Fro",
      })
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
      expect(items[0]?.organisationIds).toEqual([])
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

    it.each([
      ["sets", "2026-11-13", "Roadmaps!R2C7 2026-11-13"],
      ["clears", "", "Roadmaps!R2C7 "],
    ])(
      "%s Last updated as YYYY-MM-DD text, whatever format the cell held (STY-036 S5, S8)",
      async (_case, value, cell) => {
        const before = exampleTabs()
        const index = before[0]?.rows[1]
        if (index) index[6] = "01/10/2026"
        const spreadsheet = serveStatefulSpreadsheet(before)

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            roadmap: { lastUpdated: { base: "2026-10-01", value } },
            items: [],
          }),
        ).resolves.toEqual({ status: "published" })

        const { requests } = spreadsheet.bodies[0] as BatchUpdateBody
        expect(requests[0]).toEqual({
          updateCells: {
            start: { sheetId: 0, rowIndex: 1, columnIndex: 6 },
            rows: [
              {
                values: [
                  value === ""
                    ? {}
                    : { userEnteredValue: { stringValue: value } },
                ],
              },
            ],
            fields: "userEnteredValue",
          },
        })
        expect(changedCells(before, spreadsheet.tabs())[0]).toBe(cell)
      },
    )

    it("writes a move as the public site's Horizon value, in that cell alone (STY-031 S6)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
      const items = await httpRepository().listRoadmapItems("producta")
      const later = items.findIndex(({ placement }) => placement === "later")
      const item = items[later]
      if (item === undefined) throw new Error("Product A has a Later item")
      const before = spreadsheet.tabs()

      await httpRepository().publishRoadmapChanges("producta", {
        roadmap: {},
        items: [
          {
            item,
            position: later,
            fields: {
              placement: { base: "later", value: "recently-delivered" },
            },
          },
        ],
      })

      const horizon = EXAMPLE_TAB_ROWS.ProductA?.[0]?.indexOf("Horizon") ?? -1
      expect(
        changedCells(before, spreadsheet.tabs()).filter(
          (change) => !change.includes("C15 "),
        ),
      ).toEqual([
        `ProductA!R${String(later + 2)}C${String(horizon + 1)} Recently delivered`,
      ])
    })

    describe("an item's organisations (STY-034)", () => {
      const organisationsColumn = (rows: readonly string[][] | undefined) =>
        (rows?.[0]?.indexOf("Organisations") ?? -1) + 1

      /** Publishes a choice for the first item of the roadmap with `id`. */
      async function choose(id: string, base: string, value: string) {
        const [item] = await httpRepository().listRoadmapItems(id)
        if (item === undefined) throw new Error(`${id} has an item`)
        return httpRepository().publishRoadmapChanges(id, {
          roadmap: {},
          items: [
            { item, position: 0, fields: { organisationIds: { base, value } } },
          ],
        })
      }

      it("writes the codes, national first then by code, in that cell alone (S5)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())
        const before = spreadsheet.tabs()

        await choose("producta", "cavuhb,sbuhb", "national,sbuhb")

        const column = organisationsColumn(EXAMPLE_TAB_ROWS.ProductA)
        expect(
          changedCells(before, spreadsheet.tabs()).filter(
            (change) => !change.includes("C15 "),
          ),
        ).toEqual([`ProductA!R2C${String(column)} National, SBUHB`])
      })

      it("writes none chosen as an empty cell (S5)", async () => {
        const spreadsheet = serveStatefulSpreadsheet(exampleTabs())

        await choose("producta", "cavuhb,sbuhb", "")

        const column = organisationsColumn(EXAMPLE_TAB_ROWS.ProductA)
        expect(spreadsheet.tabs()[1]?.rows[1]?.[column - 1] ?? "").toBe("")
      })

      it("takes a co-lead's same set, respelt as `sbuhb,CAVUHB`, as no conflict and no write (S7)", async () => {
        const tabs = exampleTabs()
        const column = organisationsColumn(EXAMPLE_TAB_ROWS.ProductA)
        const row = tabs[1]?.rows[1]
        if (row === undefined) throw new Error("Product A has an item")
        row[column - 1] = "CAVUHB"
        const spreadsheet = serveStatefulSpreadsheet(tabs)
        const [item] = await httpRepository().listRoadmapItems("producta")
        if (item === undefined) throw new Error("Product A has an item")
        row[column - 1] = "sbuhb,CAVUHB"

        const outcome = await httpRepository().publishRoadmapChanges(
          "producta",
          {
            roadmap: {},
            items: [
              {
                item,
                position: 0,
                fields: {
                  organisationIds: { base: "cavuhb", value: "cavuhb,sbuhb" },
                },
              },
            ],
          },
        )

        expect(outcome).toEqual({ status: "published" })
        expect(spreadsheet.bodies).toEqual([])
      })

      it("adds an Organisations column to a tab with none, then writes the cell (S6)", async () => {
        const productC = EXAMPLE_TAB_ROWS.ProductC ?? []
        expect(productC[0]).not.toContain("Organisations")
        const width = Math.max(...productC.map((row) => row.length))
        const before = [
          ...exampleTabs(),
          gridTab(
            "ProductC",
            productC.map((row) => [...row]),
            30,
            3,
          ),
        ]
        const spreadsheet = serveStatefulSpreadsheet(before)

        await choose("productc", "", "pthb")

        expect(
          changedCells(before, spreadsheet.tabs()).filter((change) =>
            change.startsWith("ProductC!"),
          ),
        ).toEqual(
          expect.arrayContaining([
            `ProductC!R1C${String(width + 1)} Organisations`,
            `ProductC!R2C${String(width + 1)} PTHB`,
          ]),
        )
      })
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

    describe("a family or category (STY-028)", () => {
      const FAMILY_ROWS = [
        ["ID", "Name", "Name (cy)", "Colour"],
        ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12a3c9"],
        [
          "vdkxj63m",
          "Medicines & Diagnostics",
          "Meddyginiaethau a Diagnosteg",
          "#006747",
        ],
      ]
      const CATEGORY_ROWS = [
        ["ID", "Name", "Name (cy)"],
        ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
        ["w7vrv5kn", "Tests, Scans & Results", "Profion"],
      ]
      /** The example spreadsheet, its index's columns given by header, with both lists. */
      const listTabs = (index: string[][] = EXAMPLE_ROWS): FakeTab[] => [
        gridTab("Roadmaps", index, 0),
        gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
        gridTab("Families", FAMILY_ROWS, 30, 2),
        gridTab("Categories", CATEGORY_ROWS, 40, 3),
      ]
      /** The example index with Family ID and Category ID columns holding these. */
      const withIds = (familyId: string, categoryId: string) =>
        EXAMPLE_ROWS.map((row, r) =>
          r === 0
            ? [...row, "Family ID", "Category ID"]
            : r === 1
              ? [...row, familyId, categoryId]
              : row,
        )
      const indexChanges = (before: FakeTab[], after: FakeTab[]) =>
        changedCells(before, after).filter((change) =>
          change.startsWith("Roadmaps!"),
        )

      it("writes the chosen family's ID, names and colour, appending the ID columns (S2, S4)", async () => {
        const before = listTabs()
        const spreadsheet = serveStatefulSpreadsheet(before)

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            roadmap: { familyId: { base: "fc29g5b9", value: "vdkxj63m" } },
            items: [],
          }),
        ).resolves.toEqual({ status: "published" })

        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R1C16 Family ID",
          "Roadmaps!R1C17 Category ID",
          "Roadmaps!R2C5 Medicines & Diagnostics",
          "Roadmaps!R2C8 #006747",
          "Roadmaps!R2C13 Meddyginiaethau a Diagnosteg",
          "Roadmaps!R2C16 vdkxj63m",
          "Roadmaps!R2C17 khzpchkh",
        ])
        expect(spreadsheet.bodies).toHaveLength(1)
      })

      it("blanks the family's ID and names for no family, leaving its colour (S2)", async () => {
        const before = listTabs(withIds("fc29g5b9", "khzpchkh"))
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          roadmap: { familyId: { base: "fc29g5b9", value: "" } },
          items: [],
        })

        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R2C5 ",
          "Roadmaps!R2C16 ",
        ])
        expect(spreadsheet.tabs()[0]?.rows[1]?.[7]).toBe("#325083")
      })

      it("writes no blank over a trailing cell Google leaves out of the row", async () => {
        const before = listTabs()
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          roadmap: { familyId: { base: "fc29g5b9", value: "" } },
          items: [],
        })

        // Family (cy), column 13, is a trailing blank the row's array leaves out.
        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R1C16 Category ID",
          "Roadmaps!R2C5 ",
          "Roadmaps!R2C16 khzpchkh",
        ])
      })

      it("writes the chosen category's ID and English name, and blanks both for none (S3)", async () => {
        const before = listTabs(withIds("fc29g5b9", "khzpchkh"))
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", {
          roadmap: { categoryId: { base: "khzpchkh", value: "w7vrv5kn" } },
          items: [],
        })
        const chosen = spreadsheet.tabs()
        await httpRepository().publishRoadmapChanges("producta", {
          roadmap: { categoryId: { base: "w7vrv5kn", value: "" } },
          items: [],
        })

        expect(indexChanges(before, chosen)).toEqual([
          "Roadmaps!R2C4 Tests, Scans & Results",
          "Roadmaps!R2C17 w7vrv5kn",
        ])
        expect(indexChanges(chosen, spreadsheet.tabs())).toEqual([
          "Roadmaps!R2C4 ",
          "Roadmaps!R2C17 ",
        ])
      })

      it("adds only a missing ID to a row linked by name, on any publish that writes (S4)", async () => {
        const index = withIds("", "unknown1")
        const before = listTabs(index)
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().publishRoadmapChanges("producta", titleChange)

        expect(indexChanges(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R2C3 Product A",
          "Roadmaps!R2C16 fc29g5b9",
        ])
      })

      it("fails with invalid-data, writing nothing, for a family no longer listed", async () => {
        const spreadsheet = serveStatefulSpreadsheet(listTabs())

        await expect(
          httpRepository().publishRoadmapChanges("producta", {
            roadmap: { familyId: { base: "fc29g5b9", value: "gone0000" } },
            items: [],
          }),
        ).rejects.toMatchObject({ kind: "invalid-data" })
        expect(spreadsheet.bodies).toEqual([])
      })
    })

    describe("which tabs it writes (S1)", () => {
      /**
       * The example spreadsheet, with its family and category lists, and Product A's
       * index row naming `sheet`.
       */
      function naming(sheet: string): FakeTab[] {
        const [indexTab, ...rest] = exampleTabs()
        if (indexTab === undefined) throw new Error("The example has an index")
        const rows = indexTab.rows.map((row, r) =>
          r === 1 ? [sheet, ...row.slice(1)] : row,
        )
        return [
          { ...indexTab, rows },
          ...rest,
          gridTab("Families", [["ID", "Name", "Colour"]], 70),
          gridTab("Categories", [["ID", "Name"]], 71),
        ]
      }

      it.each([
        ["Template", "template"],
        ["Roadmaps", "roadmaps"],
        ["Families", "families"],
        ["Categories", "categories"],
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
          ).rejects.toMatchObject({
            kind: "invalid-data",
            message: `Roadmap ${roadmapId} names the ${sheet} tab`,
          })
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

  describe("adding or changing a family (STY-029)", () => {
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12A3C9"],
      ["vdkxj63m", "Medicines & Diagnostics", "", "#006747"],
      ["skipped1", "Bad colour", "", "teal"],
    ]
    /** The example index, as the first tab with this title, and the family list. */
    const familyTabs = (indexTitle = "Roadmaps"): FakeTab[] => [
      gridTab(indexTitle, EXAMPLE_ROWS, 0),
      gridTab("Families", FAMILY_ROWS, 30, 1),
    ]
    const singleRecord = {
      id: "fc29g5b9",
      name: { en: "Single Record", cy: "Cofnod Sengl" },
      colour: "#12a3c9",
    }
    const rename = {
      family: singleRecord,
      changes: { name: "Shared Care Record", colour: "#00796b" },
      members: ["producta"],
    }

    it("appends a row after the last, with an ID no row holds, after two reads (S2)", async () => {
      const before = familyTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)
      nextItemIds.push("fc29g5b9", "skipped1", "newfamxx")

      await expect(
        httpRepository().addFamily({ name: "Screening", colour: "#00796b" }),
      ).resolves.toEqual({
        status: "saved",
        family: {
          id: "newfamxx",
          name: { en: "Screening", cy: "" },
          colour: "#00796b",
        },
      })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Families!R5C1 newfamxx",
        "Families!R5C2 Screening",
        "Families!R5C4 #00796b",
      ])
      expect(spreadsheet.bodies).toEqual([
        {
          requests: [
            {
              appendCells: {
                sheetId: 30,
                rows: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "newfamxx" } },
                      { userEnteredValue: { stringValue: "Screening" } },
                      {},
                      { userEnteredValue: { stringValue: "#00796b" } },
                    ],
                  },
                ],
                fields: "userEnteredValue",
              },
            },
          ],
        },
      ])
      expect(
        spreadsheet.requests.filter(({ method }) => method === "GET"),
      ).toHaveLength(2)
    })

    it("keeps a family a co-lead added after the read, appending after it (S2)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(familyTabs(), {
        beforeWrite: (tabs) =>
          tabs.map((tab) =>
            tab.title === "Families"
              ? {
                  ...tab,
                  rows: [
                    ...tab.rows,
                    ["colead01", "Screening Wales", "", "#123456"],
                  ],
                  rowCount: tab.rowCount + 1,
                }
              : tab,
          ),
      })

      await httpRepository().addFamily({ name: "Screening", colour: "#00796b" })

      const families = spreadsheet
        .tabs()
        .find(({ title }) => title === "Families")
      expect(families?.rows.slice(-2).map((row) => row[1])).toEqual([
        "Screening Wales",
        "Screening",
      ])
    })

    it("writes the family's changed cells and its roadmaps' rows, linking each by ID, in one batchUpdate (S4, S9)", async () => {
      const before = familyTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(httpRepository().changeFamily(rename)).resolves.toEqual({
        status: "saved",
        family: {
          ...singleRecord,
          name: { en: "Shared Care Record", cy: "Cofnod Sengl" },
          colour: "#00796b",
        },
      })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R1C16 Family ID",
        "Roadmaps!R2C5 Shared Care Record",
        "Roadmaps!R2C8 #00796b",
        "Roadmaps!R2C13 Cofnod Sengl",
        "Roadmaps!R2C16 fc29g5b9",
        "Families!R2C2 Shared Care Record",
        "Families!R2C4 #00796b",
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("writes only the field changed", async () => {
      const before = familyTabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await httpRepository().changeFamily({
        ...rename,
        changes: { name: "Shared Care Record" },
      })

      expect(
        changedCells(before, spreadsheet.tabs()).filter((change) =>
          change.startsWith("Families!"),
        ),
      ).toEqual(["Families!R2C2 Shared Care Record"])
    })

    it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
      const spreadsheet = serveStatefulSpreadsheet(familyTabs("Template"))

      await expect(httpRepository().changeFamily(rename)).rejects.toMatchObject(
        { kind: "invalid-data" },
      )
      expect(spreadsheet.bodies).toEqual([])
    })

    it("rethrows a lost write's network error when the family holds the change but its roadmaps don't (S4)", async () => {
      const [index, families] = familyTabs()
      if (index === undefined || families === undefined) throw new Error()
      serveStatefulSpreadsheet(
        [
          index,
          {
            ...families,
            rows: families.rows.map((row) =>
              row[0] === "fc29g5b9" ? [...row.slice(0, 3), "#00796b"] : row,
            ),
          },
        ],
        { write: { lost: "not-applied" } },
      )

      await expect(
        httpRepository().changeFamily({
          family: singleRecord,
          changes: { colour: "#00796b" },
          members: ["producta"],
        }),
      ).rejects.toMatchObject({ kind: "network" })
    })

    it("rethrows a lost write's network error when a co-lead's rename unlinked a roadmap it named (S4)", async () => {
      serveStatefulSpreadsheet(familyTabs(), {
        write: { lost: "not-applied" },
        beforeWrite: (tabs) =>
          tabs.map((tab) =>
            tab.title === "Families"
              ? {
                  ...tab,
                  rows: tab.rows.map((row) =>
                    row[0] === "fc29g5b9"
                      ? [row[0], "Shared Care Record", ...row.slice(2)]
                      : row,
                  ),
                }
              : tab,
          ),
      })

      await expect(
        httpRepository().changeFamily({
          family: singleRecord,
          changes: { name: "Shared Care Record" },
          members: ["producta"],
        }),
      ).rejects.toMatchObject({ kind: "network" })
    })

    it("rethrows a lost write's network error when the re-read fails", async () => {
      serveStatefulSpreadsheet(familyTabs(), {
        write: { lost: "reread-fails" },
      })

      await expect(httpRepository().changeFamily(rename)).rejects.toMatchObject(
        { kind: "network" },
      )
    })
  })

  describe("making a roadmap match its lists (STY-030)", () => {
    const FAMILY_ROWS = [
      ["ID", "Name", "Name (cy)", "Colour"],
      ["fc29g5b9", "Single Record", "Cofnod Sengl", "#12a3c9"],
    ]
    const CATEGORY_ROWS = [
      ["ID", "Name", "Name (cy)"],
      ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
    ]
    /** The example index with these IDs and the colour it names, apart from the lists. */
    const index = (colour: string) =>
      EXAMPLE_ROWS.map((row, r) => {
        const cells =
          r === 0
            ? [...row, "Family ID", "Category ID"]
            : r === 1
              ? [...row, "fc29g5b9", "khzpchkh"]
              : row
        return r === 1
          ? cells.map((cell, c) => (c === 7 ? colour : cell))
          : cells
      })
    const tabs = (colour = "#325083"): FakeTab[] => [
      gridTab("Roadmaps", index(colour), 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      gridTab("Families", FAMILY_ROWS, 30, 2),
      gridTab("Categories", CATEGORY_ROWS, 40, 3),
    ]
    const loaded = (overrides: Partial<Roadmap> = {}): Roadmap => ({
      ...createTestRoadmap("producta", "Product A roadmap"),
      family: { en: "Single Record", cy: "Cofnod Sengl" },
      familyId: "fc29g5b9",
      colour: "#12a3c9",
      category: { en: "GP & Community Services", cy: "Meddygon Teulu" },
      categoryId: "khzpchkh",
      outOfStep: true,
      // What the example row holds, whatever the lists say.
      copied: {
        family: { en: "Single Record", cy: "" },
        colour: "#325083",
        category: "GP & Community Services",
      },
      ...overrides,
    })

    it("writes the row's copied cells from the lists in one batchUpdate, nothing else (S1)", async () => {
      const before = tabs()
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).resolves.toEqual({ status: "matched" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R2C8 #12a3c9",
        "Roadmaps!R2C13 Cofnod Sengl",
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("writes nothing when a co-lead edited one of the row's own copied cells meanwhile, though it is still out of step (S4)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(tabs("#ff0000"))

      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).resolves.toMatchObject({ status: "changed" })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("writes nothing when the roadmap is no longer out of step, or changed since it loaded (S4)", async () => {
      const spreadsheet = serveStatefulSpreadsheet(tabs("#12a3c9"))

      await expect(
        httpRepository().matchRoadmapToLists(loaded({ colour: "#ff0000" })),
      ).resolves.toMatchObject({ status: "changed" })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
      const spreadsheet = serveStatefulSpreadsheet(
        tabs().map((tab) =>
          tab.title === "Roadmaps" ? { ...tab, title: "Template" } : tab,
        ),
      )

      await expect(
        httpRepository().matchRoadmapToLists(loaded()),
      ).rejects.toMatchObject({ kind: "invalid-data" })
      expect(spreadsheet.bodies).toEqual([])
    })
  })

  describe("publishing or unpublishing a roadmap (STY-035)", () => {
    /** The example spreadsheet, with its index's rows as `edit` leaves them. */
    const tabs = (edit = (rows: string[][]) => rows): FakeTab[] => [
      gridTab("Roadmaps", edit(EXAMPLE_ROWS.map((row) => [...row])), 0),
      gridTab("ProductA", EXAMPLE_TAB_ROWS.ProductA ?? [], 10, 1),
      gridTab("ProductC", EXAMPLE_TAB_ROWS.ProductC ?? [], 20, 2),
    ]
    /** The roadmap with this id as a page loads it from `before`. */
    const loadedFrom = async (before: FakeTab[], id: string) => {
      serveStatefulSpreadsheet(before)
      const roadmap = (await httpRepository().listRoadmaps()).find(
        (each) => each.id === id,
      )
      if (roadmap === undefined) throw new Error(`No ${id}`)
      return roadmap
    }
    /** The `Item ID` column added to Product C's tab, and its one item's new ID. */
    const productCItemId = [
      "ProductC!R1C8 Item ID",
      expect.stringMatching(/^ProductC!R2C8 \S+$/) as string,
    ]
    /** Product C's `Enabled` cell (row 4, column 2) set to `value`. */
    const enabled = (value: string) => (rows: string[][]) => {
      const row = rows[3]
      if (row) row[1] = value
      return rows
    }

    it("writes the row's Enabled cell as exactly Yes, alone, in one batchUpdate (S2)", async () => {
      const before = tabs()
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C2 Yes",
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it.each(["yes", "", "TRUE"])(
      "overwrites an Enabled cell of %j with exactly Yes (D9)",
      async (value) => {
        const before = tabs(enabled(value))
        const productC = await loadedFrom(before, "productc")
        const spreadsheet = serveStatefulSpreadsheet(before)

        await httpRepository().setRoadmapPublished(productC, {
          published: true,
        })

        expect(changedCells(before, spreadsheet.tabs())).toEqual([
          "Roadmaps!R4C2 Yes",
        ])
      },
    )

    it("unpublishes by writing exactly No, reading no roadmap's tab (S3)", async () => {
      const before = tabs()
      const productA = await loadedFrom(before, "producta")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productA, { published: false }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R2C2 No",
      ])
      expect(
        spreadsheet.requests.map((request) => tabTitleOf(request)),
      ).not.toContain("ProductA")
    })

    it("writes exactly No over a blank Enabled cell (D9)", async () => {
      const before = tabs(enabled(""))
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await httpRepository().setRoadmapPublished(productC, {
        published: false,
      })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C2 No",
      ])
    })

    it("writes Enabled and today's date, ticked, in one batchUpdate (STY-036 S6)", async () => {
      const before = tabs()
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, {
          published: true,
          changes: markedUpdated({ roadmap: {}, items: [] }, "2026-11-13"),
        }),
      ).resolves.toEqual({ status: "set" })

      // Each item without an ID gets one, as with any write of a publish (ADR-012).
      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C2 Yes",
        "Roadmaps!R4C7 2026-11-13",
        ...productCItemId,
      ])
      expect(spreadsheet.bodies).toHaveLength(1)
    })

    it("still writes today's date, ticked, when Enabled already reads Yes (STY-036 D10)", async () => {
      const productC = await loadedFrom(tabs(), "productc")
      const before = tabs(enabled("Yes"))
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, {
          published: true,
          changes: markedUpdated({ roadmap: {}, items: [] }, "2026-11-13"),
        }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R4C7 2026-11-13",
        ...productCItemId,
      ])
    })

    it("adds an Enabled column, headed, when the index has none (D10)", async () => {
      const before = tabs((rows) => rows.map((row) => row.toSpliced(1, 1)))
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).resolves.toEqual({ status: "set" })

      expect(changedCells(before, spreadsheet.tabs())).toEqual([
        "Roadmaps!R1C15 Enabled",
        "Roadmaps!R4C15 Yes",
      ])
    })

    it("refuses a three-digit colour however it is cased, naming it as written (S4)", async () => {
      const before = tabs((rows) => {
        const row = rows[3]
        if (row) row[7] = "#9A8"
        return rows
      })
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(before)

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).resolves.toEqual({
        status: "unpublishable",
        problems: [{ code: "short-colour", colour: "#9A8" }],
      })
      expect(spreadsheet.bodies).toEqual([])
    })

    it("fails with invalid-data, writing nothing, when the index is the Template tab", async () => {
      const before = tabs()
      const productC = await loadedFrom(before, "productc")
      const spreadsheet = serveStatefulSpreadsheet(
        before.map((tab) =>
          tab.title === "Roadmaps" ? { ...tab, title: "Template" } : tab,
        ),
      )

      await expect(
        httpRepository().setRoadmapPublished(productC, { published: true }),
      ).rejects.toMatchObject({ kind: "invalid-data" })
      expect(spreadsheet.bodies).toEqual([])
    })
  })
})
