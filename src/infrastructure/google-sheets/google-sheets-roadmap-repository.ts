import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  ListRoadmapsOptions,
  RoadmapRepository,
} from "@/domain/roadmap/roadmap-repository"

import type { SheetsClient } from "./sheets-client"
import { parseSpreadsheetMetadata } from "./sheets-schemas"

/** Partial-response mask: only the worksheet metadata we map (ADR-002). */
const SPREADSHEET_METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden))"

export interface GoogleSheetsRoadmapRepositoryOptions {
  client: SheetsClient
  spreadsheetId: string
}

/** Each visible worksheet of one spreadsheet is a roadmap. */
export class GoogleSheetsRoadmapRepository implements RoadmapRepository {
  readonly #client: SheetsClient
  readonly #spreadsheetId: string

  constructor({ client, spreadsheetId }: GoogleSheetsRoadmapRepositoryOptions) {
    this.#client = client
    this.#spreadsheetId = spreadsheetId
  }

  async listRoadmaps({ signal }: ListRoadmapsOptions = {}): Promise<Roadmap[]> {
    const json = await this.#client.getJson(
      `/${encodeURIComponent(this.#spreadsheetId)}`,
      { searchParams: { fields: SPREADSHEET_METADATA_FIELDS }, signal },
    )
    return parseSpreadsheetMetadata(json)
      .sheets.map(({ properties }) => properties)
      .filter(({ hidden }) => hidden !== true)
      .map(({ sheetId, title }) => ({ id: String(sheetId), name: title }))
  }
}
