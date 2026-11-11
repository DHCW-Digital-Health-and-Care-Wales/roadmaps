import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type {
  RepositoryReadOptions,
  RoadmapRepository,
} from "@/domain/roadmap/roadmap-repository"
import { AppError } from "@/lib/errors"

import { parseRoadmapIndex, type RoadmapIndex } from "./roadmap-index-parser"
import { parseRoadmapTab } from "./roadmap-tab-parser"
import type { SheetsClient } from "./sheets-client"
import {
  parseSheetValues,
  parseSpreadsheetMetadata,
  type SpreadsheetMetadata,
} from "./sheets-schemas"

/** Partial-response mask: only the tab properties we use (ADR-002, ADR-009). */
const SPREADSHEET_METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden))"

/** Every cell as displayed, as the public site's CSV export reads it (ADR-009, ADR-011). */
const SHEET_VALUES_PARAMS = {
  majorDimension: "ROWS",
  valueRenderOption: "FORMATTED_VALUE",
  fields: "values",
} as const

export interface GoogleSheetsRoadmapRepositoryOptions {
  client: SheetsClient
  spreadsheetId: string
}

/** The roadmap index as read, with the titles of the spreadsheet's tabs. */
interface IndexRead {
  index: RoadmapIndex
  tabTitles: ReadonlySet<string>
}

/**
 * The roadmaps one spreadsheet lists in its roadmap index, its first tab, as the public
 * site reads them (ADR-009): two reads, the tab list and then that tab's values. A
 * roadmap's items take a third, of the tab its index row names (ADR-011).
 */
export class GoogleSheetsRoadmapRepository implements RoadmapRepository {
  readonly #client: SheetsClient
  readonly #spreadsheetPath: string

  constructor({ client, spreadsheetId }: GoogleSheetsRoadmapRepositoryOptions) {
    this.#client = client
    this.#spreadsheetPath = `/${encodeURIComponent(spreadsheetId)}`
  }

  async listRoadmaps(options: RepositoryReadOptions = {}): Promise<Roadmap[]> {
    const { index } = await this.#readRoadmapIndex(options)
    return index.entries.map(({ roadmap }) => roadmap)
  }

  /**
   * Re-reads the tab list and the index on every call, so a renamed tab is found at once
   * (ADR-011 Option 3), then reads the roadmap's tab, published or not. Its problems are
   * not shown yet.
   */
  async listRoadmapItems(
    roadmapId: string,
    options: RepositoryReadOptions = {},
  ): Promise<RoadmapItem[]> {
    const { index, tabTitles } = await this.#readRoadmapIndex(options)
    const entry = index.entries.find(({ roadmap }) => roadmap.id === roadmapId)
    if (entry === undefined) {
      throw new AppError("not-found", {
        message: `No roadmap has the id ${roadmapId}`,
      })
    }
    // Matched exactly, as the index's `missing-tab` problem is (STY-020 D3).
    if (!tabTitles.has(entry.tabName)) {
      throw new AppError("invalid-data", {
        message: `Roadmap ${roadmapId} names a tab that does not exist`,
      })
    }
    return parseRoadmapTab(await this.#readTab(entry.tabName, options)).items
  }

  /** The parsed roadmap index, with its problems (not shown yet; ADR-009). */
  async #readRoadmapIndex(options: RepositoryReadOptions): Promise<IndexRead> {
    const { sheets } = parseSpreadsheetMetadata(
      await this.#client.getJson(this.#spreadsheetPath, {
        searchParams: { fields: SPREADSHEET_METADATA_FIELDS },
        signal: options.signal,
      }),
    )
    const tabTitles = new Set(sheets.map(({ properties }) => properties.title))
    const rows = await this.#readTab(firstTabTitle(sheets), options)
    return { index: parseRoadmapIndex(rows, { tabTitles }), tabTitles }
  }

  /** Every row of the tab with this title, as displayed. */
  async #readTab(
    title: string,
    { signal }: RepositoryReadOptions,
  ): Promise<string[][]> {
    return parseSheetValues(
      await this.#client.getJson(
        `${this.#spreadsheetPath}/values/${encodeURIComponent(quoteTabTitle(title))}`,
        { searchParams: SHEET_VALUES_PARAMS, signal },
      ),
    )
  }
}

/**
 * The title of the tab with the lowest index, hidden or not: the public site's first
 * tab. Google omits an index of 0. Throws `AppError('invalid-data')` with no tabs.
 */
function firstTabTitle(sheets: SpreadsheetMetadata["sheets"]): string {
  const [first] = sheets
    .map(({ properties }) => properties)
    .toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0))
  if (first === undefined) {
    throw new AppError("invalid-data", {
      message: "The spreadsheet has no tabs",
    })
  }
  return first.title
}

/** A1 notation for a whole tab: its title in single quotes, any quote doubled. */
function quoteTabTitle(title: string): string {
  return `'${title.replaceAll("'", "''")}'`
}
