import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "@/domain/roadmap/publish-plan"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  EditableItemField,
  PublishOutcome,
  RoadmapChanges,
  RoadmapTextField,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type {
  RepositoryReadOptions,
  RoadmapRepository,
} from "@/domain/roadmap/roadmap-repository"
import { AppError, isAppError } from "@/lib/errors"

import {
  CATEGORIES_TAB,
  FAMILIES_TAB,
  parseCategories,
  parseFamilies,
} from "./list-tab-parser"
import {
  FAMILY_WELSH,
  parseRoadmapIndex,
  type RoadmapIndex,
  type RoadmapIndexEntry,
  type RoadmapIndexWriteColumn,
} from "./roadmap-index-parser"
import {
  parseRoadmapTab,
  type RoadmapTab,
  type RoadmapTabColumn,
} from "./roadmap-tab-parser"
import type { SheetsClient } from "./sheets-client"
import {
  parseSheetValues,
  parseSpreadsheetMetadata,
  type SpreadsheetMetadata,
} from "./sheets-schemas"

/**
 * Partial-response mask: only the tab properties we use (ADR-002, ADR-009), with each
 * grid's size so a publish can grow it (ADR-012).
 */
const SPREADSHEET_METADATA_FIELDS =
  "sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount)))"

/** Every cell as displayed, as the public site's CSV export reads it (ADR-009, ADR-011). */
const SHEET_VALUES_PARAMS = {
  majorDimension: "ROWS",
  valueRenderOption: "FORMATTED_VALUE",
  fields: "values",
} as const

/** The public site's tab of permitted columns: never read or written (ADR-011, ADR-012). */
const TEMPLATE_TAB = "Template"
/** The tabs a roadmap's index row may never name as its items. */
const NOT_ITEM_TABS = new Set([TEMPLATE_TAB, FAMILIES_TAB, CATEGORIES_TAB])

/** The roadmap index's column each roadmap text field is written to (ADR-012). */
const ROADMAP_COLUMNS: Readonly<
  Record<RoadmapTextField, RoadmapIndexWriteColumn>
> = {
  title: "Title",
  statusLabel: "Status label",
  productLead: "Product Lead",
  vision: "Vision",
  serviceDescription: "Service description",
}

/** The roadmap tab's column each editable item field is written to (ADR-012). */
const ITEM_COLUMNS: Readonly<Record<EditableItemField, RoadmapTabColumn>> = {
  title: "Title",
  description: "Description",
  expectedOutcome: "Outcome",
  phase: "Phase",
}

export interface GoogleSheetsRoadmapRepositoryOptions {
  client: SheetsClient
  spreadsheetId: string
}

type TabProperties = SpreadsheetMetadata["sheets"][number]["properties"]

/** A tab's every row as displayed, with its properties, to write back to. */
interface TabRows {
  properties: TabProperties
  rows: string[][]
}

/** Every tab by its exact title, hidden or not, and the first: the roadmap index. */
interface TabList {
  tabs: ReadonlyMap<string, TabProperties>
  first: TabProperties
}

/** The roadmap index as read, linked to the family and category lists (ADR-013). */
interface IndexRead {
  tabs: TabList["tabs"]
  index: RoadmapIndex
  indexTab: TabRows
  /** `null` without a usable list. */
  families: Family[] | null
  categories: Category[] | null
}

/** One roadmap as read: its index row and its tab, parsed and as displayed. */
interface RoadmapRead extends IndexRead {
  entry: RoadmapIndexEntry
  itemTab: TabRows
  items: RoadmapTab
}

/** One `spreadsheets.batchUpdate` request (ADR-012 D6). */
type BatchRequest =
  | {
      appendDimension: {
        sheetId: number
        dimension: "COLUMNS"
        length: number
      }
    }
  | {
      updateCells: {
        start: { sheetId: number; rowIndex: number; columnIndex: number }
        rows: [{ values: [{ userEnteredValue?: { stringValue: string } }] }]
        fields: "userEnteredValue"
      }
    }

/**
 * The roadmaps one spreadsheet lists in its roadmap index, its first tab, as the public
 * site reads them (ADR-009): the tab list, then that tab's values, read with the
 * `Families` and `Categories` tabs that link each roadmap to its family and category
 * (ADR-013). A roadmap's items take one more read, of the tab its index row names
 * (ADR-011). A publish makes those reads, then one all-or-nothing `batchUpdate`
 * (ADR-012).
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

  /** Reads the tab list, then the `Families` tab; `null` without a usable one. */
  async listFamilies(
    options: RepositoryReadOptions = {},
  ): Promise<Family[] | null> {
    const tabList = await this.#readTabList(options)
    return parseFamilies(
      await this.#readListTab(tabList, FAMILIES_TAB, options),
    ).list
  }

  /** Reads the tab list, then the `Categories` tab; `null` without a usable one. */
  async listCategories(
    options: RepositoryReadOptions = {},
  ): Promise<Category[] | null> {
    const tabList = await this.#readTabList(options)
    return parseCategories(
      await this.#readListTab(tabList, CATEGORIES_TAB, options),
    ).list
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
    const read = await this.#readRoadmap(roadmapId, options)
    if (read === null) {
      throw new AppError("not-found", {
        message: `No roadmap has the id ${roadmapId}`,
      })
    }
    return read.items.items
  }

  /**
   * Re-reads the roadmap as `listRoadmapItems` does, plans the publish over it, then
   * sends every write in one `batchUpdate`, which Google applies all or nothing
   * (ADR-012). A write whose answer is lost is settled by one more read (Option 16).
   */
  async publishRoadmapChanges(
    roadmapId: string,
    changes: RoadmapChanges,
    { signal }: RepositoryReadOptions = {},
  ): Promise<PublishOutcome> {
    const read = await this.#readRoadmap(roadmapId, { signal })
    if (read === null) return { status: "roadmap-not-found" }
    // Never written, even as the index (ADR-012).
    if (read.indexTab.properties.title === TEMPLATE_TAB) {
      throw new AppError("invalid-data", {
        message: `The roadmap index is the ${TEMPLATE_TAB} tab`,
      })
    }
    const plan = planRoadmapPublish(changes, snapshotOf(read))
    if (plan.kind === "settled") return plan.outcome
    signal?.throwIfAborted()

    try {
      await this.#client.postJson(`${this.#spreadsheetPath}:batchUpdate`, {
        requests: batchRequests(read, plan.writes),
      })
    } catch (error) {
      if (isAppError(error) && error.kind === "network") {
        return this.#settleLostWrite(roadmapId, plan.writes, error)
      }
      throw error
    }
    return { status: "published" }
  }

  /**
   * Re-reads the roadmap once after a write whose answer was lost: every write held is
   * published, none rethrows `lost`, and anything else, or a failed read, is unconfirmed.
   */
  async #settleLostWrite(
    roadmapId: string,
    writes: PublishWrites,
    lost: AppError,
  ): Promise<PublishOutcome> {
    let snapshot: RoadmapSnapshot | null
    try {
      const read = await this.#readRoadmap(roadmapId, {})
      snapshot = read && snapshotOf(read)
    } catch {
      return { status: "unconfirmed" }
    }
    switch (heldWrites(writes, snapshot)) {
      case "all":
        return { status: "published" }
      case "none":
        throw lost
      case "some":
        return { status: "unconfirmed" }
    }
  }

  /**
   * The roadmap with this id and its items, or `null` when the index lists none. Throws
   * `AppError('invalid-data')` when its tab is missing or can't be read.
   */
  async #readRoadmap(
    roadmapId: string,
    options: RepositoryReadOptions,
  ): Promise<RoadmapRead | null> {
    const indexRead = await this.#readRoadmapIndex(options)
    const entry = indexRead.index.entries.find(
      ({ roadmap }) => roadmap.id === roadmapId,
    )
    if (entry === undefined) return null
    // Matched exactly, as the index's `missing-tab` problem is (STY-020 D3).
    const properties = indexRead.tabs.get(entry.tabName)
    if (properties === undefined) {
      throw new AppError("invalid-data", {
        message: `Roadmap ${roadmapId} names a tab that does not exist`,
      })
    }
    // None is a roadmap's items, and none may be written as one (ADR-011 to ADR-013).
    if (
      NOT_ITEM_TABS.has(entry.tabName) ||
      properties.sheetId === indexRead.indexTab.properties.sheetId
    ) {
      throw new AppError("invalid-data", {
        message: `Roadmap ${roadmapId} names the ${entry.tabName} tab`,
      })
    }
    const rows = await this.#readTab(entry.tabName, options)
    return {
      ...indexRead,
      entry,
      itemTab: { properties, rows },
      items: parseRoadmapTab(rows),
    }
  }

  /**
   * The parsed roadmap index, linked to the family and category lists, read alongside
   * it. Its problems and theirs are not shown yet (ADR-009).
   */
  async #readRoadmapIndex(options: RepositoryReadOptions): Promise<IndexRead> {
    const tabList = await this.#readTabList(options)
    const [rows, familyRows, categoryRows] = await Promise.all([
      this.#readTab(tabList.first.title, options),
      this.#readListTab(tabList, FAMILIES_TAB, options),
      this.#readListTab(tabList, CATEGORIES_TAB, options),
    ])
    const families = parseFamilies(familyRows).list
    const categories = parseCategories(categoryRows).list
    return {
      tabs: tabList.tabs,
      index: parseRoadmapIndex(rows, {
        tabTitles: new Set(tabList.tabs.keys()),
        families,
        categories,
      }),
      indexTab: { properties: tabList.first, rows },
      families,
      categories,
    }
  }

  async #readTabList({ signal }: RepositoryReadOptions): Promise<TabList> {
    const { sheets } = parseSpreadsheetMetadata(
      await this.#client.getJson(this.#spreadsheetPath, {
        searchParams: { fields: SPREADSHEET_METADATA_FIELDS },
        signal,
      }),
    )
    return {
      tabs: new Map(
        sheets.map(({ properties }) => [properties.title, properties]),
      ),
      first: firstTab(sheets),
    }
  }

  /**
   * The rows of the list tab with exactly this title, or `null` when there is none: the
   * roadmap index is never a list (ADR-013).
   */
  async #readListTab(
    { tabs, first }: TabList,
    title: string,
    options: RepositoryReadOptions,
  ): Promise<string[][] | null> {
    const properties = tabs.get(title)
    if (properties === undefined || properties.sheetId === first.sheetId) {
      return null
    }
    return this.#readTab(title, options)
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
 * The tab with the lowest index, hidden or not: the public site's first tab. Google
 * omits an index of 0. Throws `AppError('invalid-data')` with no tabs.
 */
function firstTab(sheets: SpreadsheetMetadata["sheets"]): TabProperties {
  const [first] = sheets
    .map(({ properties }) => properties)
    .toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0))
  if (first === undefined) {
    throw new AppError("invalid-data", {
      message: "The spreadsheet has no tabs",
    })
  }
  return first
}

/** A1 notation for a whole tab: its title in single quotes, any quote doubled. */
function quoteTabTitle(title: string): string {
  return `'${title.replaceAll("'", "''")}'`
}

/** The roadmap as the publish plan needs it. */
function snapshotOf({
  entry,
  items,
  itemTab,
  families,
  categories,
}: RoadmapRead): RoadmapSnapshot {
  const idColumn = items.columns.get("Item ID")
  return {
    roadmap: entry.roadmap,
    items: items.items,
    repeatedIds: new Set(
      items.problems.flatMap(({ code, value }) =>
        code === "duplicate-item-id" && value !== null ? [value] : [],
      ),
    ),
    // Every row's ID, kept or not, so a new ID never repeats one a skipped row holds.
    takenIds: new Set(
      idColumn === undefined
        ? []
        : itemTab.rows.slice(1).flatMap((row) => {
            const id = row[idColumn]?.trim() ?? ""
            return id === "" ? [] : [id]
          }),
    ),
    missingLists: new Set([
      ...(families === null ? (["familyId"] as const) : []),
      ...(categories === null ? (["categoryId"] as const) : []),
    ]),
  }
}

/** The requests that make `writes`: growing grids first, then headers, then cells. */
function batchRequests(read: RoadmapRead, writes: PublishWrites) {
  const index = new TabWriter(read.indexTab, read.index.columns)
  const indexRow = new IndexRowWriter(read, index)
  for (const { field, value } of writes.roadmap) {
    switch (field) {
      case "familyId":
        indexRow.writeFamily(value)
        break
      case "categoryId":
        indexRow.writeCategory(value)
        break
      default:
        index.write(read.entry.row, ROADMAP_COLUMNS[field], value)
    }
  }
  indexRow.linkIds(writes)
  const tab = new TabWriter(read.itemTab, read.items.columns)
  const rowOf = (i: number) => {
    const row = read.items.rows[i]
    // The plan's indexes are into the items read, each with its row.
    if (row === undefined) throw new AppError("unknown")
    return row
  }
  for (const { index: i, field, value } of writes.items) {
    tab.write(rowOf(i), ITEM_COLUMNS[field], value)
  }
  for (const { index: i, id } of writes.ids) {
    tab.write(rowOf(i), "Item ID", id)
  }
  return [...index.requests(), ...tab.requests()]
}

/**
 * Writes the roadmap's index row's family and category cells, copied from the lists as
 * re-read for the publish (ADR-013), each only when it changes: a cell already holding
 * its value, or a blank for a column the header lacks, is left alone.
 */
class IndexRowWriter {
  readonly #read: RoadmapRead
  readonly #index: TabWriter<RoadmapIndexWriteColumn>
  readonly #cells: readonly string[]

  constructor(read: RoadmapRead, index: TabWriter<RoadmapIndexWriteColumn>) {
    this.#read = read
    this.#index = index
    this.#cells = read.indexTab.rows[read.entry.row - 1] ?? []
  }

  /**
   * `Family ID`, `Family`, `Family (cy)` and `Colour` from the chosen family; `""` (no
   * family) blanks all but `Colour`, which is never written without a family.
   */
  writeFamily(id: string): void {
    const family = id === "" ? null : listed(this.#read.families, id, "family")
    this.#write("Family ID", id)
    this.#write("Family", family?.name.en ?? "")
    this.#write(FAMILY_WELSH, family?.name.cy ?? "")
    if (family) this.#write("Colour", family.colour)
  }

  /** `Category ID` and `Category`, the category's English name; `""` blanks both. */
  writeCategory(id: string): void {
    const category =
      id === "" ? null : listed(this.#read.categories, id, "category")
    this.#write("Category ID", id)
    this.#write("Category", category?.name.en ?? "")
  }

  /**
   * The ID of the family and category the row is linked to by name, where its ID cell is
   * blank and `writes` doesn't choose another (STY-028 S4).
   */
  linkIds({ roadmap }: PublishWrites): void {
    const { familyId, categoryId } = this.#read.entry.roadmap
    const chosen = new Set(roadmap.map(({ field }) => field))
    if (familyId !== null && !chosen.has("familyId")) {
      this.#link("Family ID", familyId)
    }
    if (categoryId !== null && !chosen.has("categoryId")) {
      this.#link("Category ID", categoryId)
    }
  }

  #link(column: "Family ID" | "Category ID", id: string): void {
    if (this.#cell(column).trim() === "") this.#write(column, id)
  }

  #write(column: RoadmapIndexWriteColumn, value: string): void {
    if (this.#cell(column) === value) return
    this.#index.write(this.#read.entry.row, column, value)
  }

  #cell(column: RoadmapIndexWriteColumn): string {
    const at = this.#read.index.columns.get(column)
    return at === undefined ? "" : (this.#cells[at] ?? "")
  }
}

/**
 * The list's entry with this ID. Throws `AppError('invalid-data')` when the list, as
 * re-read for the publish, has none: removed since it was chosen, or no list at all.
 */
function listed<T extends { id: string }>(
  list: readonly T[] | null,
  id: string,
  what: string,
): T {
  const found = list?.find((each) => each.id === id)
  if (found === undefined) {
    throw new AppError("invalid-data", {
      message: `The ${what} list has no ${id}`,
    })
  }
  return found
}

/**
 * Collects one tab's cell writes. A column the header lacks is added after the last
 * column any row uses, with its English header (ADR-012 Option 9), the grid growing
 * to hold it; no existing column moves.
 */
class TabWriter<Column extends string> {
  readonly #sheetId: number
  readonly #columnCount: number
  readonly #columns: Map<Column, number>
  #width: number
  readonly #headers: BatchRequest[] = []
  readonly #cells: BatchRequest[] = []

  constructor(
    { properties, rows }: TabRows,
    columns: ReadonlyMap<Column, number>,
  ) {
    this.#sheetId = properties.sheetId
    this.#columns = new Map(columns)
    // Google drops trailing blank cells, so a row's length is where its last value ends.
    this.#width = Math.max(0, ...rows.map((row) => row.length))
    this.#columnCount = properties.gridProperties?.columnCount ?? this.#width
  }

  /** Writes `value` to `column` of spreadsheet row `row` (1 is the header). */
  write(row: number, column: Column, value: string): void {
    let columnIndex = this.#columns.get(column)
    if (columnIndex === undefined) {
      columnIndex = this.#width++
      this.#columns.set(column, columnIndex)
      this.#headers.push(this.#cell(1, columnIndex, column))
    }
    this.#cells.push(this.#cell(row, columnIndex, value))
  }

  requests(): BatchRequest[] {
    const grow = this.#width - this.#columnCount
    return [
      ...(grow > 0
        ? [
            {
              appendDimension: {
                sheetId: this.#sheetId,
                dimension: "COLUMNS" as const,
                length: grow,
              },
            },
          ]
        : []),
      ...this.#headers,
      ...this.#cells,
    ]
  }

  /** Sets one cell to `value` as plain text, never a formula or number (ADR-012 D6). */
  #cell(row: number, columnIndex: number, value: string): BatchRequest {
    return {
      updateCells: {
        start: { sheetId: this.#sheetId, rowIndex: row - 1, columnIndex },
        rows: [
          {
            values: [
              value === "" ? {} : { userEnteredValue: { stringValue: value } },
            ],
          },
        ],
        fields: "userEnteredValue",
      },
    }
  }
}
