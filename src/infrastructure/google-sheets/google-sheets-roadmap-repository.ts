import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  ListRoadmapsOptions,
  RoadmapRepository,
} from "@/domain/roadmap/roadmap-repository"
import { AppError } from "@/lib/errors"

import { parseRoadmapIndex, type RoadmapIndex } from "./roadmap-index-parser"
import type { SheetsClient } from "./sheets-client"
import {
  parseSheetValues,
  parseSpreadsheetMetadata,
  type SpreadsheetMetadata,
} from "./sheets-schemas"

/** Partial-response mask: only the tab properties we use (ADR-002, ADR-009). */
const SPREADSHEET_METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden))"

/** Every cell as displayed, as the public site's CSV export reads it (ADR-009). */
const SHEET_VALUES_PARAMS = {
  majorDimension: "ROWS",
  valueRenderOption: "FORMATTED_VALUE",
  fields: "values",
} as const

export interface GoogleSheetsRoadmapRepositoryOptions {
  client: SheetsClient
  spreadsheetId: string
}

/**
 * The roadmaps one spreadsheet lists in its roadmap index, its first tab, as the public
 * site reads them (ADR-009): two reads, the tab list and then that tab's values.
 */
export class GoogleSheetsRoadmapRepository implements RoadmapRepository {
  readonly #client: SheetsClient
  readonly #spreadsheetPath: string

  constructor({ client, spreadsheetId }: GoogleSheetsRoadmapRepositoryOptions) {
    this.#client = client
    this.#spreadsheetPath = `/${encodeURIComponent(spreadsheetId)}`
  }

  async listRoadmaps(options: ListRoadmapsOptions = {}): Promise<Roadmap[]> {
    const { entries } = await this.#readRoadmapIndex(options)
    return entries.map(({ roadmap }) => roadmap)
  }

  /** The parsed roadmap index, with its problems (not shown yet; ADR-009). */
  async #readRoadmapIndex({
    signal,
  }: ListRoadmapsOptions): Promise<RoadmapIndex> {
    const { sheets } = parseSpreadsheetMetadata(
      await this.#client.getJson(this.#spreadsheetPath, {
        searchParams: { fields: SPREADSHEET_METADATA_FIELDS },
        signal,
      }),
    )
    const tabTitles = sheets.map(({ properties }) => properties.title)
    const rows = parseSheetValues(
      await this.#client.getJson(
        `${this.#spreadsheetPath}/values/${encodeURIComponent(quoteTabTitle(firstTabTitle(sheets)))}`,
        { searchParams: SHEET_VALUES_PARAMS, signal },
      ),
    )
    return parseRoadmapIndex(rows, { tabTitles })
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
