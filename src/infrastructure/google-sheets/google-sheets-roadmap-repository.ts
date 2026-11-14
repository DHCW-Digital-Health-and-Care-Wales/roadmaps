import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import { detailsOf, detailsValue } from "@/domain/roadmap/item-details"
import {
  familyHeld,
  familyMembers,
  planFamilyChange,
  planNewFamily,
  type FamilyEdit,
  type FamilyInput,
  type FamilyOutcome,
} from "@/domain/roadmap/family-changes"
import { planListMatch, type MatchOutcome } from "@/domain/roadmap/list-match"
import type { Organisation } from "@/domain/roadmap/organisation"
import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "@/domain/roadmap/publish-plan"
import {
  findLoadedRow,
  findPublishedStateRow,
  heldPublishedState,
  needsItems,
  planPublishedStateWrite,
  type PublishedStateChange,
  type PublishedStateOutcome,
  type PublishedStateRow,
  type PublishedStateWrite,
  type PublishProblem,
} from "@/domain/roadmap/published-state"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  type EditableItemField,
  type EditableRoadmapField,
  organisationIdsOf,
  type PublishOutcome,
  type RoadmapChanges,
  type RoadmapChoiceField,
  tagsOf,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import type {
  RepositoryReadOptions,
  RoadmapRepository,
} from "@/domain/roadmap/roadmap-repository"
import { AppError, isAppError } from "@/lib/errors"

import { BUILT_IN_ORGANISATIONS } from "./built-in-organisations"
import {
  CATEGORIES_TAB,
  FAMILIES_TAB,
  parseCategories,
  parseFamilies,
  type ListColumn,
  type ListTab,
} from "./list-tab-parser"
import {
  FAMILY_WELSH,
  parseRoadmapIndex,
  type RoadmapIndex,
  type RoadmapIndexEntry,
  type RoadmapIndexWriteColumn,
} from "./roadmap-index-parser"
import {
  HORIZON_VALUES,
  parseRoadmapTab,
  roadmapTabColumns,
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

/**
 * The roadmap index's column each roadmap field but a family or category is written to
 * (ADR-012): its text, and its date as `YYYY-MM-DD` text (STY-036 D2).
 */
const ROADMAP_COLUMNS: Readonly<
  Record<
    Exclude<EditableRoadmapField, RoadmapChoiceField>,
    RoadmapIndexWriteColumn
  >
> = {
  title: "Title",
  statusLabel: "Status label",
  productLead: "Product Lead",
  vision: "Vision",
  serviceDescription: "Service description",
  lastUpdated: "Last updated",
}

/**
 * The roadmap tab's column each editable item field is written to (ADR-012, ADR-014,
 * STY-037, STY-039): the English one alone, so `Labels (cy)` and `Details (cy)` are
 * never written.
 */
const ITEM_COLUMNS: Readonly<Record<EditableItemField, RoadmapTabColumn>> = {
  title: "Title",
  description: "Description",
  expectedOutcome: "Outcome",
  phase: "Phase",
  placement: "Horizon",
  tags: "Labels",
  organisationIds: "Organisations",
  details: "Details",
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

/** The `Families` tab as read, parsed and as displayed, to write a family to. */
interface FamilyTab {
  tab: TabRows
  parsed: ListTab<Family>
}

/** The roadmap index as read, linked to the family and category lists (ADR-013). */
interface IndexRead {
  tabs: TabList["tabs"]
  index: RoadmapIndex
  indexTab: TabRows
  /** `null` when there is no `Families` tab. */
  familyTab: FamilyTab | null
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

/** One cell's new value: plain text, or `{}` to leave it blank (ADR-012 D6). */
interface CellData {
  userEnteredValue?: { stringValue: string }
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
        rows: [{ values: [CellData] }]
        fields: "userEnteredValue"
      }
    }
  | {
      /** Google adds the rows after the last row any value uses (STY-029). */
      appendCells: {
        sheetId: number
        rows: [{ values: CellData[] }]
        fields: "userEnteredValue"
      }
    }

/**
 * The roadmaps one spreadsheet lists in its roadmap index, its first tab, as the public
 * site reads them (ADR-009): the tab list, then that tab's values, read with the
 * `Families` and `Categories` tabs that link each roadmap to its family and category
 * (ADR-013). A roadmap's items take one more read, of the tab its index row names
 * (ADR-011). A publish makes those reads, then one all-or-nothing `batchUpdate`
 * (ADR-012); so does adding or changing a family (STY-029).
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
    return (await this.#readFamilyTab(tabList, options))?.parsed.list ?? null
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
   * The built-in twelve (ADR-014): the spreadsheet has no `Organisations` tab, so there
   * is nothing to request.
   */
  listOrganisations(
    options: RepositoryReadOptions = {},
  ): Promise<Organisation[]> {
    return Promise.resolve().then(() => {
      options.signal?.throwIfAborted()
      return structuredClone([...BUILT_IN_ORGANISATIONS])
    })
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
    writableIndex(read)
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
   * Re-reads the `Families` tab, then appends the new family after the last row any
   * value uses, in one `batchUpdate`. Google picks the row as it applies the write, so
   * a co-lead's family added meanwhile is never overwritten.
   */
  async addFamily(
    input: FamilyInput,
    { signal }: RepositoryReadOptions = {},
  ): Promise<FamilyOutcome> {
    const tabList = await this.#readTabList({ signal })
    const { tab, parsed, list } = usableFamilyTab(
      await this.#readFamilyTab(tabList, { signal }),
    )
    const plan = planNewFamily(input, list, idsIn(tab, parsed))
    if (plan.kind === "settled") return plan.outcome
    signal?.throwIfAborted()

    const { family } = plan
    const cells: Record<ListColumn, string> = {
      ID: family.id,
      Name: family.name.en,
      Colour: family.colour,
    }
    const row: CellData[] = []
    for (const [column, at] of parsed.columns) {
      while (row.length < at) row.push({})
      row[at] = textCell(cells[column])
    }
    return this.#writeFamily(
      [
        {
          appendCells: {
            sheetId: tab.properties.sheetId,
            rows: [{ values: row }],
            fields: "userEnteredValue",
          },
        },
      ],
      async () => familyHeld(family, await this.listFamilies()),
      family,
    )
  }

  /**
   * Re-reads the index and the lists as a publish does, then writes the family's
   * changed cells in the `Families` tab and every member's index row, copied from the
   * family as `writeFamily` copies a chosen one (STY-028), in one `batchUpdate`.
   */
  async changeFamily(
    edit: FamilyEdit,
    { signal }: RepositoryReadOptions = {},
  ): Promise<FamilyOutcome> {
    const read = await this.#readRoadmapIndex({ signal })
    const { tab, parsed, list } = usableFamilyTab(read.familyTab)
    writableIndex(read)
    const plan = planFamilyChange(edit, {
      families: list,
      roadmaps: read.index.entries.map(({ roadmap }) => roadmap),
    })
    if (plan.kind === "settled") return plan.outcome
    signal?.throwIfAborted()

    const { family } = plan
    const memberIds = familyMembers(
      read.index.entries.map(({ roadmap }) => roadmap),
      family.id,
    ).map(({ id }) => id)
    const families = new TabWriter(tab, parsed.columns)
    const row = parsed.rows.get(family.id)
    const current = list.find(({ id }) => id === family.id)
    if (row === undefined || current === undefined) {
      throw new AppError("unknown", {
        message: "A planned family has no row in its list",
      })
    }
    if (family.name.en !== current.name.en) {
      families.write(row, "Name", family.name.en)
    }
    if (family.colour !== current.colour) {
      families.write(row, "Colour", family.colour)
    }
    return this.#writeFamily(
      [...families.requests(), ...memberRowWrites(read, family, memberIds)],
      // Held only when the family and the row of every roadmap written hold it (S4),
      // those roadmaps by ID, as a co-lead's rename meanwhile can unlink one by name.
      async () => {
        const again = await this.#readRoadmapIndex({})
        const listed = new Set(
          again.index.entries.map(({ roadmap }) => roadmap.id),
        )
        return (
          familyHeld(family, again.families) &&
          memberIds.every((id) => listed.has(id)) &&
          memberRowWrites(again, family, memberIds).length === 0
        )
      },
      family,
    )
  }

  /**
   * Re-reads the index and the lists, then writes the roadmap's row's family and
   * category cells from them, in one `batchUpdate` (STY-030). A write whose answer is
   * lost is settled by one more read: matched when the roadmap is then in step.
   */
  async matchRoadmapToLists(
    loaded: Roadmap,
    { signal }: RepositoryReadOptions = {},
  ): Promise<MatchOutcome> {
    const read = await this.#readRoadmapIndex({ signal })
    usableFamilyTab(read.familyTab)
    writableIndex(read)
    const entry = read.index.entries.find(
      ({ roadmap }) => roadmap.id === loaded.id,
    )
    const plan = planListMatch(loaded, entry?.roadmap)
    if (plan.kind === "settled") return plan.outcome
    // A plan to write is made only over a listed roadmap.
    if (entry === undefined) throw new AppError("unknown")
    signal?.throwIfAborted()

    const index = new TabWriter(read.indexTab, read.index.columns)
    const row = new IndexRowWriter(read, entry, index)
    const { familyId, categoryId } = entry.roadmap
    if (familyId !== null) row.writeFamily(familyId)
    if (categoryId !== null) row.writeCategory(categoryId)
    const requests = index.requests()
    if (requests.length === 0) return { status: "matched" }

    try {
      await this.#client.postJson(`${this.#spreadsheetPath}:batchUpdate`, {
        requests,
      })
    } catch (error) {
      if (!isAppError(error) || error.kind !== "network") throw error
      const held = await this.#readRoadmapIndex({}).then(
        (again) =>
          again.index.entries.find(({ roadmap }) => roadmap.id === loaded.id)
            ?.roadmap.outOfStep === false,
        () => false,
      )
      if (!held) throw error
    }
    return { status: "matched" }
  }

  /**
   * Re-reads the index and finds the row the page loaded among those with its id, reads
   * its tab when publishing it or its pending edits, checks what the public site's sync
   * would fail on, then writes its `Enabled` cell as exactly `Yes` or `No`, with any
   * pending edits, in one `batchUpdate` (STY-035). A missing `Enabled` column is added
   * (D10). A write whose answer is lost is settled by one more read.
   */
  async setRoadmapPublished(
    loaded: Roadmap,
    change: PublishedStateChange,
    { signal }: RepositoryReadOptions = {},
  ): Promise<PublishedStateOutcome> {
    const read = await this.#readRoadmapIndex({ signal })
    writableIndex(read)
    const entries = entriesWithId(read, loaded.id)
    const found = findPublishedStateRow(
      loaded,
      change,
      entries.map((entry) => stateRowOf(read, entry)),
    )
    if (found.kind === "settled") return found.outcome
    const entry = entries[found.index]
    // The found row is one of those given.
    if (entry === undefined) throw new AppError("unknown")

    const sendsChanges = change.published && change.changes !== undefined
    const itemTab =
      found.check || sendsChanges
        ? await this.#readItemTab(read, entry, { signal })
        : null
    const problems = found.check ? syncProblems(read, entry, itemTab) : []
    const roadmapRead = needsItems(found, change, problems)
      ? roadmapReadOf(read, entry, itemTab)
      : null
    const plan = planPublishedStateWrite(
      found,
      change,
      problems,
      roadmapRead && snapshotOf(roadmapRead),
    )
    if (plan.kind === "settled") return plan.outcome
    signal?.throwIfAborted()

    const index = new TabWriter(read.indexTab, read.index.columns)
    if (plan.writeState) {
      index.write(entry.row, "Enabled", change.published ? "Yes" : "No")
    }
    try {
      await this.#client.postJson(`${this.#spreadsheetPath}:batchUpdate`, {
        requests:
          roadmapRead && plan.writes
            ? batchRequests(roadmapRead, plan.writes, index)
            : index.requests(),
      })
    } catch (error) {
      if (isAppError(error) && error.kind === "network") {
        return this.#settleLostState(loaded, change, plan, error)
      }
      throw error
    }
    return { status: "set" }
  }

  /**
   * Re-reads the index, and the row's tab when pending edits were sent, once after a
   * write whose answer was lost: all of it held is set, none rethrows `lost`, and
   * anything else, or a failed read, is unconfirmed (S10).
   */
  async #settleLostState(
    loaded: Roadmap,
    change: PublishedStateChange,
    write: PublishedStateWrite,
    lost: AppError,
  ): Promise<PublishedStateOutcome> {
    let held: ReturnType<typeof heldPublishedState>
    try {
      const read = await this.#readRoadmapIndex({})
      const entries = entriesWithId(read, loaded.id)
      const rows = entries.map((entry) => stateRowOf(read, entry))
      const at = findLoadedRow(loaded, change, rows)
      const entry = entries[at]
      const roadmapRead =
        entry && write.writes
          ? roadmapReadOf(read, entry, await this.#readItemTab(read, entry, {}))
          : null
      held = heldPublishedState(
        change,
        write,
        rows[at],
        roadmapRead && snapshotOf(roadmapRead),
      )
    } catch {
      return { status: "unconfirmed" }
    }
    switch (held) {
      case "all":
        return { status: "set" }
      case "none":
        throw lost
      case "some":
        return { status: "unconfirmed" }
    }
  }

  /**
   * Sends a family's writes in one `batchUpdate`, if any. A write whose answer is lost
   * is settled by re-reading: saved when `held` finds every write in place, else the
   * network error is rethrown.
   */
  async #writeFamily(
    requests: BatchRequest[],
    held: () => Promise<boolean>,
    family: Family,
  ): Promise<FamilyOutcome> {
    if (requests.length === 0) return { status: "saved", family }
    try {
      await this.#client.postJson(`${this.#spreadsheetPath}:batchUpdate`, {
        requests,
      })
    } catch (error) {
      if (!isAppError(error) || error.kind !== "network") throw error
      if (!(await held().catch(() => false))) throw error
    }
    return { status: "saved", family }
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
    return roadmapReadOf(
      indexRead,
      entry,
      await this.#readItemTab(indexRead, entry, options),
    )
  }

  /**
   * The tab the row names as its items, or `null` when there is none, matched exactly as
   * the index's `missing-tab` problem is (STY-020 D3). Throws `AppError('invalid-data')`
   * when it names a tab that is never a roadmap's items (ADR-011 to ADR-013).
   */
  async #readItemTab(
    read: IndexRead,
    entry: RoadmapIndexEntry,
    options: RepositoryReadOptions,
  ): Promise<TabRows | null> {
    const properties = read.tabs.get(entry.tabName)
    if (properties === undefined) return null
    if (
      NOT_ITEM_TABS.has(entry.tabName) ||
      properties.sheetId === read.indexTab.properties.sheetId
    ) {
      throw new AppError("invalid-data", {
        message: `Roadmap ${entry.roadmap.id} names the ${entry.tabName} tab`,
      })
    }
    return { properties, rows: await this.#readTab(entry.tabName, options) }
  }

  /**
   * The parsed roadmap index, linked to the family and category lists, read alongside
   * it. Its problems and theirs are not shown yet (ADR-009).
   */
  async #readRoadmapIndex(options: RepositoryReadOptions): Promise<IndexRead> {
    const tabList = await this.#readTabList(options)
    const [rows, familyTab, categoryRows] = await Promise.all([
      this.#readTab(tabList.first.title, options),
      this.#readFamilyTab(tabList, options),
      this.#readListTab(tabList, CATEGORIES_TAB, options),
    ])
    const families = familyTab?.parsed.list ?? null
    const categories = parseCategories(categoryRows).list
    return {
      tabs: tabList.tabs,
      index: parseRoadmapIndex(rows, {
        tabTitles: new Set(tabList.tabs.keys()),
        families,
        categories,
      }),
      indexTab: { properties: tabList.first, rows },
      familyTab,
      families,
      categories,
    }
  }

  /** The `Families` tab, read and parsed, or `null` when there is none. */
  async #readFamilyTab(
    tabList: TabList,
    options: RepositoryReadOptions,
  ): Promise<FamilyTab | null> {
    const properties = tabList.tabs.get(FAMILIES_TAB)
    const rows = await this.#readListTab(tabList, FAMILIES_TAB, options)
    if (properties === undefined || rows === null) return null
    return { tab: { properties, rows }, parsed: parseFamilies(rows) }
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

/** Throws `AppError('invalid-data')` when the roadmap index is the `Template` tab (ADR-012). */
function writableIndex(read: IndexRead): void {
  if (read.indexTab.properties.title === TEMPLATE_TAB) {
    throw new AppError("invalid-data", {
      message: `The roadmap index is the ${TEMPLATE_TAB} tab`,
    })
  }
}

/**
 * The roadmap with its items, from its row and the tab it names. Throws
 * `AppError('invalid-data')` without the tab, or when its items can't be read.
 */
function roadmapReadOf(
  read: IndexRead,
  entry: RoadmapIndexEntry,
  itemTab: TabRows | null,
): RoadmapRead {
  if (itemTab === null) {
    throw new AppError("invalid-data", {
      message: `Roadmap ${entry.roadmap.id} names a tab that does not exist`,
    })
  }
  return { ...read, entry, itemTab, items: parseRoadmapTab(itemTab.rows) }
}

/** Every index row with this id, kept by the list or not, in row order. */
function entriesWithId(read: IndexRead, id: string): RoadmapIndexEntry[] {
  return read.index.everyEntry.filter(({ roadmap }) => roadmap.id === id)
}

/** The row as `findPublishedStateRow` reads it: its `Enabled` cell exactly (D9). */
function stateRowOf(
  read: IndexRead,
  entry: RoadmapIndexEntry,
): PublishedStateRow {
  const enabled = indexCell(read, entry, "Enabled").trim()
  return {
    roadmap: entry.roadmap,
    written: enabled === "Yes" ? true : enabled === "No" ? false : null,
  }
}

/**
 * What the public site's sync would fail on were the row enabled, apart from another
 * enabled row with its id (STY-035 S4): a `Sheet` naming no tab, a tab without a
 * `Title` or `Horizon` column, or a `#rgb` colour (`docs/analysis/roadmaps-tab-format.md`).
 */
function syncProblems(
  read: IndexRead,
  entry: RoadmapIndexEntry,
  itemTab: TabRows | null,
): PublishProblem[] {
  const location = entry.tabName
  const problems: PublishProblem[] = []
  if (itemTab === null) {
    problems.push({ code: "items-missing", location })
  } else {
    const columns = roadmapTabColumns(itemTab.rows)
    if (!columns.has("Title")) {
      problems.push({ code: "items-field-missing", location, field: "title" })
    }
    if (!columns.has("Horizon")) {
      problems.push({
        code: "items-field-missing",
        location,
        field: "placement",
      })
    }
  }
  const colour = indexCell(read, entry, "Colour").trim()
  if (/^#[0-9a-f]{3}$/i.test(colour)) {
    problems.push({ code: "short-colour", colour })
  }
  return problems
}

/** The row's cell in `column` as written, `""` for a column the header lacks. */
function indexCell(
  read: IndexRead,
  entry: RoadmapIndexEntry,
  column: RoadmapIndexWriteColumn,
): string {
  const at = read.index.columns.get(column)
  return at === undefined ? "" : (read.indexTab.rows[entry.row - 1]?.[at] ?? "")
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

/**
 * The `Families` tab and its list, to write to. Throws `AppError('invalid-data')`
 * without a usable list (STY-029 S7).
 */
function usableFamilyTab(
  familyTab: FamilyTab | null,
): FamilyTab & { list: Family[] } {
  const list = familyTab?.parsed.list
  if (familyTab === null || list === undefined || list === null) {
    throw new AppError("invalid-data", { message: "No usable family list" })
  }
  return { ...familyTab, list }
}

/**
 * The index cells that copy `family` (STY-028's `writeFamily`) on each roadmap in it,
 * as read, where they differ: none once a change to it is in place.
 */
/** The writes copying `family` to the index rows of the roadmaps `memberIds` names. */
function memberRowWrites(
  read: IndexRead,
  family: Family,
  memberIds: readonly string[],
): BatchRequest[] {
  const changed: IndexRead = {
    ...read,
    families:
      read.families?.map((each) => (each.id === family.id ? family : each)) ??
      null,
  }
  const index = new TabWriter(read.indexTab, read.index.columns)
  const members = new Set(memberIds)
  for (const entry of read.index.entries) {
    if (!members.has(entry.roadmap.id)) continue
    new IndexRowWriter(changed, entry, index).writeFamily(family.id)
  }
  return index.requests()
}

/** Every ID the tab's rows hold, listed or skipped, so a new one repeats none. */
function idsIn({ rows }: TabRows, { columns }: ListTab<Family>): Set<string> {
  const at = columns.get("ID")
  return new Set(
    at === undefined
      ? []
      : rows.slice(1).flatMap((row) => {
          const id = row[at]?.trim() ?? ""
          return id === "" ? [] : [id]
        }),
  )
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
    organisationIds: new Set(BUILT_IN_ORGANISATIONS.map(({ id }) => id)),
  }
}

/**
 * The requests that make `writes`, after any `index` already holds: growing grids
 * first, then headers, then cells.
 */
function batchRequests(
  read: RoadmapRead,
  writes: PublishWrites,
  index = new TabWriter(read.indexTab, read.index.columns),
) {
  const indexRow = new IndexRowWriter(read, read.entry, index)
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
    tab.write(rowOf(i), ITEM_COLUMNS[field], itemCell(field, value))
  }
  for (const { index: i, id } of writes.ids) {
    tab.write(rowOf(i), "Item ID", id)
  }
  return [...index.requests(), ...tab.requests()]
}

/**
 * What an item's cell holds for `value`: a placement as its `Horizon` value, tags in
 * order separated by `, `, as the public site reads them (STY-037 D5), organisations as
 * their codes, national first, then by code, separated by `, ` (ADR-014, STY-034 D7):
 * known codes only, so an unknown one written there goes; and details as
 * `detailsValue` holds them, a line each (STY-039 S14).
 */
function itemCell(field: EditableItemField, value: string): string {
  switch (field) {
    case "placement":
      // The plan publishes one of the six placements only.
      if (!isRoadmapPlacement(value)) throw new AppError("unknown")
      return HORIZON_VALUES[value]
    case "tags":
      return tagsOf(value).join(", ")
    case "organisationIds":
      return organisationCodes(organisationIdsOf(value))
    case "details":
      return detailsValue(detailsOf(value))
    default:
      return value
  }
}

/** The cell naming the organisations with `ids`, in the order the public site writes. */
function organisationCodes(ids: readonly string[]): string {
  const chosen = BUILT_IN_ORGANISATIONS.filter(({ id }) => ids.includes(id))
  // The plan publishes organisations the list holds only.
  if (chosen.length !== ids.length) throw new AppError("unknown")
  return chosen
    .sort(
      (a, b) =>
        Number(b.national) - Number(a.national) ||
        a.code.localeCompare(b.code, "en"),
    )
    .map(({ code }) => code)
    .join(", ")
}

/**
 * Writes a roadmap's index row's family and category cells, copied from the lists as
 * re-read for the write (ADR-013), each only when it changes: a cell already holding
 * its value, or a blank for a column the header lacks, is left alone.
 */
class IndexRowWriter {
  readonly #read: IndexRead
  readonly #entry: RoadmapIndexEntry
  readonly #index: TabWriter<RoadmapIndexWriteColumn>

  constructor(
    read: IndexRead,
    entry: RoadmapIndexEntry,
    index: TabWriter<RoadmapIndexWriteColumn>,
  ) {
    this.#read = read
    this.#entry = entry
    this.#index = index
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
    const { familyId, categoryId } = this.#entry.roadmap
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
    this.#index.write(this.#entry.row, column, value)
  }

  #cell(column: RoadmapIndexWriteColumn): string {
    return indexCell(this.#read, this.#entry, column)
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
        rows: [{ values: [textCell(value)] }],
        fields: "userEnteredValue",
      },
    }
  }
}

/** A cell set to `value` as plain text, never a formula or number (ADR-012 D6). */
function textCell(value: string): CellData {
  return value === "" ? {} : { userEnteredValue: { stringValue: value } }
}
