import { z } from "zod/mini"

/**
 * One tab of a faked spreadsheet, with its grid's size, as a write sees it. Tabs are
 * held in tab order: the first is the roadmap index.
 */
export interface GridTab {
  title: string
  sheetId: number
  rows: string[][]
  rowCount: number
  columnCount: number
  hidden?: boolean
  /** The rows frozen at the top; none unless given. */
  frozenRowCount?: number
}

const cellSchema = z.object({
  userEnteredValue: z.optional(z.record(z.string(), z.unknown())),
})
const rowsSchema = z.array(
  z.object({ values: z._default(z.array(cellSchema), []) }),
)
/** The `spreadsheets.batchUpdate` requests the editor sends (ADR-012, STY-023 D6, STY-040, STY-051, STY-050). */
const requestSchema = z.union([
  z.object({
    appendDimension: z.object({
      sheetId: z.int(),
      dimension: z.string(),
      length: z.int(),
    }),
  }),
  z.object({
    updateCells: z.object({
      start: z.object({
        sheetId: z.int(),
        rowIndex: z._default(z.int(), 0),
        columnIndex: z._default(z.int(), 0),
      }),
      rows: rowsSchema,
      fields: z.string(),
    }),
  }),
  // With a range and no rows: the range's cells are cleared of `fields`.
  z.object({
    updateCells: z.object({
      range: z.object({
        sheetId: z.int(),
        startRowIndex: z.int(),
        endRowIndex: z.int(),
      }),
      fields: z.string(),
    }),
  }),
  z.object({
    appendCells: z.object({
      sheetId: z.int(),
      rows: rowsSchema,
      fields: z.string(),
    }),
  }),
  z.object({
    duplicateSheet: z.object({
      sourceSheetId: z.int(),
      insertSheetIndex: z.int(),
      newSheetId: z.int(),
      newSheetName: z.string(),
    }),
  }),
  z.object({
    updateSheetProperties: z.object({
      properties: z.object({
        sheetId: z.int(),
        hidden: z.optional(z.boolean()),
        gridProperties: z.optional(z.object({ frozenRowCount: z.int() })),
      }),
      fields: z.string(),
    }),
  }),
  z.object({
    deleteDimension: z.object({
      range: z.object({
        sheetId: z.int(),
        dimension: z.string(),
        startIndex: z.int(),
        endIndex: z.int(),
      }),
    }),
  }),
  z.object({
    moveDimension: z.object({
      source: z.object({
        sheetId: z.int(),
        dimension: z.string(),
        startIndex: z.int(),
        endIndex: z.int(),
      }),
      destinationIndex: z.int(),
    }),
  }),
  z.object({
    insertDimension: z.object({
      range: z.object({
        sheetId: z.int(),
        dimension: z.string(),
        startIndex: z.int(),
        endIndex: z.int(),
      }),
      inheritFromBefore: z._default(z.boolean(), false),
    }),
  }),
])
const bodySchema = z.object({ requests: z.array(requestSchema) })

export type BatchUpdateBody = z.output<typeof bodySchema>
type BatchRequest = BatchUpdateBody["requests"][number]
/** The request of one kind, such as `RequestOf<"appendCells">`. */
type RequestOf<Kind extends string> =
  Extract<BatchRequest, Record<Kind, unknown>> extends Record<Kind, infer R>
    ? R
    : never

export type BatchUpdateResult =
  /** Applied: the tabs as they now are, and any misuse the real API would accept. */
  | { tabs: GridTab[]; violations: string[] }
  /** Rejected as the real API would (HTTP 400), nothing applied. */
  | { error: string; violations: string[] }

/**
 * A Welsh column's header, as the parsers read it (`sheet-header.ts`), kept apart so
 * the fakes check the app rather than share its code.
 */
const WELSH_HEADER = /^(.+?)[\s([\-_]+(?:cy|cym|cymraeg|welsh)[\s)\]]*$/i

/** The one Welsh column the editor writes: the family's name, copied from its list (ADR-013). */
const FAMILY_WELSH = /^family$/i

/**
 * The tab the editor never changes (ADR-012) and copies to start a roadmap (STY-040),
 * kept apart from the adapter's like `WELSH_HEADER`: the fakes and their tests share it.
 */
export const TEMPLATE_TAB = "Template"

/** The tab the editor appends a new family's row to (STY-029). */
const FAMILIES_TAB = "Families"

/** The tab that, with `Template` and `Families`, is never a roadmap's own (ADR-013). */
const CATEGORIES_TAB = "Categories"

/**
 * A header as the parsers match one (ADR-009, ADR-011): ignoring case, accents, spaces
 * and punctuation, so `Item-ID` is the `Item ID` column. Kept apart from the adapter's,
 * like `WELSH_HEADER`.
 */
const headerKey = (header: string) =>
  header
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

/** Where the first column headed `key`, a `headerKey`, is in a header row; -1 for none. */
const columnAt = (header: readonly string[], key: string) =>
  header.findIndex((name) => headerKey(name) === key)

/** The index column the editor writes only as a `YYYY-MM-DD` date or blank (STY-036 D2). */
const LAST_UPDATED = "lastupdated"
const LAST_UPDATED_VALUE = /^(\d{4}-\d{2}-\d{2})?$/

/** The index columns a new roadmap's row is checked by (STY-040 S2). */
const SHEET = "sheet"
const ENABLED = "enabled"

/** The roadmap tab columns a new item's row is checked by (STY-045 S2). */
const ITEM_ID = "itemid"
const TITLE = "title"
const HORIZON = "horizon"

/**
 * An `Item ID` as the editor makes one (ADR-012), which a new item's row holds: the
 * fake's own copy of the format, kept apart from `createItemId` like `HORIZON_VALUES`.
 */
const ITEM_ID_VALUE = /^[bcdfghjkmnpqrstvwxz][bcdfghjkmnpqrstvwxz2-9]{7}$/

/**
 * The `Horizon` values the public site writes, which a new item's row holds one of:
 * the fake's own list, kept apart from the adapter's so it checks what the adapter writes.
 */
const HORIZON_VALUES = new Set([
  "Recently delivered",
  "Now",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
])

/**
 * Applies a `batchUpdate` body to `tabs`, all or nothing as Google does: a request it
 * can't apply rejects the whole body and changes nothing. Beyond what Google rejects, it
 * records as violations what the editor must never write (STY-023 S11, STY-040):
 *
 * - the `Template` tab, but as the source of a copy;
 * - anything but a plain string or a cleared cell, a Welsh column but `Family (cy)`,
 *   `Last updated` but as `YYYY-MM-DD` or blank, an unchanged cell;
 * - a row appended to a tab but `Families`, the roadmap index and a roadmap's own tab,
 *   one the index names; one appended to the index that is published or names no tab
 *   the same body copied; and one appended to a roadmap's tab without a title, a
 *   `Horizon` the public site reads or an `Item ID`, in the editor's format, that no
 *   other row of the tab holds, or with a cell under no header;
 * - a copy of a tab but `Template`, or placed anywhere but after the last tab;
 * - a tab unhidden or its frozen rows changed, but in a tab the same body copied; that
 *   tab hidden or its header row unfrozen;
 * - rows deleted or cleared, but in a tab the same body copied or a roadmap's own tab
 *   (STY-070); a header row deleted or cleared;
 * - rows moved in a tab but a roadmap's own, a header row moved or rows moved above
 *   it, or columns moved (STY-051);
 * - a row inserted in a tab but a roadmap's own, above its header row, several at once,
 *   columns, or one that takes after the row before it; and a row inserted that the
 *   body leaves without what a row appended to that tab must hold (STY-050).
 */
export function applyBatchUpdate(
  tabs: readonly GridTab[],
  body: unknown,
): BatchUpdateResult {
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return {
      error: "Invalid batchUpdate body",
      violations: [`batchUpdate body: ${z.prettifyError(parsed.error)}`],
    }
  }
  const batch = new Batch(tabs)
  try {
    for (const request of parsed.data.requests) batch.apply(request)
    batch.checkInsertedRows()
  } catch (error) {
    if (!(error instanceof Rejection)) throw error
    return { error: error.message, violations: batch.violations }
  }
  return { tabs: batch.tabs, violations: batch.violations }
}

/** A request Google can't apply, which rejects the whole body. */
class Rejection extends Error {}

/** One body's requests, applied in order to a copy of the tabs. */
class Batch {
  readonly tabs: GridTab[]
  readonly violations: string[] = []
  /** The tabs this body copied: the only ones it may unhide, delete rows from or clear. */
  readonly #copies = new Set<number>()
  /** The rows this body inserted in a roadmap's tab, each a new item's once it is done. */
  readonly #inserted: { tab: GridTab; row: string[] }[] = []

  constructor(tabs: readonly GridTab[]) {
    this.tabs = tabs.map((tab) => ({
      ...tab,
      rows: tab.rows.map((row) => [...row]),
    }))
  }

  apply(request: BatchRequest): void {
    if ("appendDimension" in request) {
      this.#appendDimension(request.appendDimension)
    } else if ("appendCells" in request) {
      this.#appendCells(request.appendCells)
    } else if ("duplicateSheet" in request) {
      this.#duplicateSheet(request.duplicateSheet)
    } else if ("updateSheetProperties" in request) {
      this.#updateSheetProperties(request.updateSheetProperties)
    } else if ("deleteDimension" in request) {
      this.#deleteDimension(request.deleteDimension)
    } else if ("moveDimension" in request) {
      this.#moveDimension(request.moveDimension)
    } else if ("insertDimension" in request) {
      this.#insertDimension(request.insertDimension)
    } else if ("range" in request.updateCells) {
      this.#clearCells(request.updateCells)
    } else {
      this.#updateCells(request.updateCells)
    }
  }

  /** The tab with this ID, or rejects the body as `request` on a tab that is not there. */
  #tab(sheetId: number, request: string): GridTab {
    const tab = this.tabs.find((each) => each.sheetId === sheetId)
    if (tab === undefined) {
      throw new Rejection(`${request} on ${String(sheetId)}`)
    }
    return tab
  }

  /** The tab this body copied, recording `request` on any other as a violation. */
  #copy(sheetId: number, request: string): GridTab {
    const tab = this.#tab(sheetId, request)
    if (!this.#copies.has(sheetId)) {
      this.violations.push(
        `${request} on ${tab.title}, not a tab this batchUpdate copied`,
      )
    }
    return tab
  }

  /**
   * The tab whose rows `request` deletes or clears: one this body copied, or a roadmap's
   * own, whose removed items' rows go (STY-070); any other is a violation.
   */
  #rowsTab(sheetId: number, request: string): GridTab {
    const tab = this.#tab(sheetId, request)
    if (!this.#copies.has(sheetId) && !this.#isRoadmapTab(tab)) {
      this.violations.push(
        `${request} on ${tab.title}, not a tab this batchUpdate copied or a roadmap's own`,
      )
    }
    return tab
  }

  #appendDimension({
    sheetId,
    dimension,
    length,
  }: RequestOf<"appendDimension">): void {
    const tab = this.#tab(sheetId, "appendDimension")
    if (length < 1) throw new Rejection(`appendDimension of ${String(length)}`)
    if (tab.title === TEMPLATE_TAB) {
      this.violations.push("appendDimension on Template")
    }
    if (dimension !== "COLUMNS") {
      this.violations.push(`appendDimension of ${dimension}, not COLUMNS`)
    }
    if (dimension === "ROWS") tab.rowCount += length
    else tab.columnCount += length
  }

  #appendCells({ sheetId, rows, fields }: RequestOf<"appendCells">): void {
    const tab = this.#tab(sheetId, "appendCells")
    const isFamilies = tab.title === FAMILIES_TAB
    const isIndex =
      !isFamilies && tab === this.tabs[0] && tab.title !== TEMPLATE_TAB
    const isRoadmapTab = !isFamilies && !isIndex && this.#isRoadmapTab(tab)
    if (!isFamilies && !isIndex && !isRoadmapTab) {
      this.violations.push(`appendCells on ${tab.title}`)
    }
    if (fields !== "userEnteredValue") {
      this.violations.push(`appendCells fields ${fields}, not userEnteredValue`)
    }
    // As Google does: after the last row any value uses, the grid growing to fit.
    const after = tab.rows.findLastIndex((row) => row.some(Boolean)) + 1
    tab.rows.length = Math.min(tab.rows.length, after)
    tab.rowCount = Math.max(tab.rowCount, after + rows.length)
    for (const [r, { values }] of rows.entries()) {
      const row = values.map((cell) => cellValue(cell.userEnteredValue))
      if (row.includes(null)) {
        this.violations.push(
          `${tab.title} row appended with ${JSON.stringify(values)}`,
        )
      }
      const written = row.map((value) => value ?? "")
      const rowNumber = String(after + r + 1)
      for (const [c, value] of written.entries()) {
        if (value === "") continue
        const where = `${tab.title}!R${rowNumber}C${String(c + 1)}`
        this.#checkColumn(where, tab.rows[0]?.[c] ?? "", value, false)
      }
      if (isIndex) this.#checkNewRoadmapRow(tab, written)
      if (isRoadmapTab) this.#checkNewItemRow(tab, written)
      tab.rows[after + r] = written
    }
  }

  /**
   * Whether a row of the roadmap index names `tab` as a roadmap's own, by its exact
   * title: never the `Template`, `Families` or `Categories` tab, whatever a row names.
   */
  #isRoadmapTab(tab: GridTab): boolean {
    if ([TEMPLATE_TAB, FAMILIES_TAB, CATEGORIES_TAB].includes(tab.title)) {
      return false
    }
    const [header = [], ...rows] = this.tabs[0]?.rows ?? []
    const sheet = columnAt(header, SHEET)
    return rows.some((row) => row[sheet]?.trim() === tab.title)
  }

  /**
   * A row added to a roadmap's tab, a new item's, `appended` or `inserted`: its title,
   * a `Horizon` the public site reads and an `Item ID`, as the editor makes one, that
   * no other row of the tab holds; and no cell under a column with no header.
   */
  #checkNewItemRow(
    tab: GridTab,
    row: readonly string[],
    added: "appended" | "inserted" = "appended",
  ): void {
    const [header = [], ...rows] = tab.rows
    const cell = (key: string) => row[columnAt(header, key)] ?? ""
    const id = cell(ITEM_ID)
    const idAt = columnAt(header, ITEM_ID)
    const what = `${tab.title} row ${added}`
    if (id === "") {
      this.violations.push(`${what} without an Item ID`)
    } else if (!ITEM_ID_VALUE.test(id)) {
      this.violations.push(
        `${what} with the Item ID ${id}, not in the Item ID format`,
      )
    } else if (
      rows.some((other) => other !== row && other[idAt]?.trim() === id)
    ) {
      this.violations.push(
        `${what} with the Item ID ${id}, which another row has`,
      )
    }
    if (cell(TITLE) === "") {
      this.violations.push(`${what} without a Title`)
    }
    if (row.some((value, c) => value !== "" && !header[c]?.trim())) {
      this.violations.push(`${what} with a cell under no header`)
    }
    const horizon = cell(HORIZON)
    if (!HORIZON_VALUES.has(horizon)) {
      this.violations.push(
        `${what} with the Horizon ${JSON.stringify(horizon)}, not one the public site reads`,
      )
    }
  }

  /**
   * Each row inserted in a roadmap's tab, checked as a row appended to it is, once
   * every request is applied: its cells are written after it is inserted.
   */
  checkInsertedRows(): void {
    for (const { tab, row } of this.#inserted) {
      this.#checkNewItemRow(tab, row, "inserted")
    }
  }

  /** A row appended to the roadmap index: not published, its tab copied by this body. */
  #checkNewRoadmapRow(index: GridTab, row: readonly string[]): void {
    const [header = []] = index.rows
    const cell = (key: string) => row[columnAt(header, key)] ?? ""
    const sheet = cell(SHEET)
    if (cell(ENABLED) !== "No") {
      this.violations.push(`${sheet} appended to the index without Enabled No`)
    }
    const copied = this.tabs.some(
      (tab) => this.#copies.has(tab.sheetId) && tab.title === sheet,
    )
    if (!copied) {
      this.violations.push(
        `${sheet} appended to the index without its tab copied`,
      )
    }
  }

  #duplicateSheet({
    sourceSheetId,
    insertSheetIndex,
    newSheetId,
    newSheetName,
  }: RequestOf<"duplicateSheet">): void {
    const source = this.#tab(sourceSheetId, "duplicateSheet")
    if (this.tabs.some(({ sheetId }) => sheetId === newSheetId)) {
      throw new Rejection(`A tab with the ID ${String(newSheetId)} exists`)
    }
    const name = newSheetName.toLowerCase()
    if (this.tabs.some(({ title }) => title.toLowerCase() === name)) {
      throw new Rejection(`A tab named ${newSheetName} exists`)
    }
    if (insertSheetIndex < 0 || insertSheetIndex > this.tabs.length) {
      throw new Rejection(`duplicateSheet at ${String(insertSheetIndex)}`)
    }
    if (source.title !== TEMPLATE_TAB) {
      this.violations.push(`duplicateSheet of ${source.title}, not Template`)
    }
    if (insertSheetIndex !== this.tabs.length) {
      this.violations.push(
        `duplicateSheet at ${String(insertSheetIndex)}, not after the last tab`,
      )
    }
    // Its grid, its frozen rows and whether it is hidden are copied with its cells.
    this.tabs.splice(insertSheetIndex, 0, {
      ...source,
      title: newSheetName,
      sheetId: newSheetId,
      rows: source.rows.map((row) => [...row]),
    })
    this.#copies.add(newSheetId)
  }

  /** The copy shown (`hidden`), or left with its header alone frozen. */
  #updateSheetProperties({
    properties: { sheetId, hidden, gridProperties },
    fields,
  }: RequestOf<"updateSheetProperties">): void {
    const tab = this.#copy(sheetId, "updateSheetProperties")
    if (fields === "hidden" && hidden !== undefined) {
      if (hidden) {
        this.violations.push(`updateSheetProperties hides ${tab.title}`)
        tab.hidden = true
      } else {
        delete tab.hidden
      }
      return
    }
    if (fields === "gridProperties.frozenRowCount" && gridProperties) {
      const { frozenRowCount } = gridProperties
      // As Google refuses: a tab keeps at least one row that is not frozen.
      if (frozenRowCount < 0 || frozenRowCount >= tab.rowCount) {
        throw new Rejection(
          `${tab.title} can't freeze ${String(frozenRowCount)} of its rows`,
        )
      }
      if (frozenRowCount !== 1) {
        this.violations.push(
          `updateSheetProperties freezes ${String(frozenRowCount)} rows of ${tab.title}, not its header alone`,
        )
      }
      tab.frozenRowCount = frozenRowCount
      return
    }
    this.violations.push(
      `updateSheetProperties ${fields} of ${tab.title}, not hidden or gridProperties.frozenRowCount`,
    )
  }

  #deleteDimension({
    range: { sheetId, dimension, startIndex, endIndex },
  }: RequestOf<"deleteDimension">): void {
    const tab = this.#rowsTab(sheetId, "deleteDimension")
    if (dimension !== "ROWS") {
      this.violations.push(`deleteDimension of ${dimension}, not ROWS`)
      return
    }
    if (startIndex < 0 || startIndex >= endIndex || endIndex > tab.rowCount) {
      throw new Rejection(
        `${tab.title} has no rows ${String(startIndex)} to ${String(endIndex)}`,
      )
    }
    const frozen = tab.frozenRowCount ?? 0
    const frozenLeft =
      frozen - Math.max(0, Math.min(endIndex, frozen) - startIndex)
    const left = tab.rowCount - (endIndex - startIndex)
    // As Google refuses: a tab keeps at least one row that is not frozen.
    if (left - frozenLeft < 1) {
      throw new Rejection(
        `Sorry, it is not possible to delete all non-frozen rows of ${tab.title}`,
      )
    }
    if (startIndex < 1) {
      this.violations.push(`deleteDimension of ${tab.title}'s header row`)
    }
    tab.rows.splice(startIndex, endIndex - startIndex)
    tab.rowCount = left
    if (tab.frozenRowCount !== undefined) tab.frozenRowCount = frozenLeft
  }

  /**
   * Rows taken out and put back at `destinationIndex`, which counts rows before they
   * are taken out, as Google does: moving up to index `f` is `f`, moving down to it
   * `f + 1`. Each row carries every cell it has. As Google refuses: a destination within
   * the rows moved or just after them, which would leave them where they are (seen for
   * the first, map ticket #109; the second is refused here too, as the editor sends
   * neither).
   */
  #moveDimension({
    source: { sheetId, dimension, startIndex, endIndex },
    destinationIndex,
  }: RequestOf<"moveDimension">): void {
    const tab = this.#tab(sheetId, "moveDimension")
    if (dimension !== "ROWS") {
      this.violations.push(`moveDimension of ${dimension}, not ROWS`)
      return
    }
    if (startIndex < 0 || startIndex >= endIndex || endIndex > tab.rowCount) {
      throw new Rejection(
        `${tab.title} has no rows ${String(startIndex)} to ${String(endIndex)}`,
      )
    }
    if (destinationIndex < 0 || destinationIndex > tab.rowCount) {
      throw new Rejection(
        `${tab.title} has no row ${String(destinationIndex)} to move rows to`,
      )
    }
    if (destinationIndex >= startIndex && destinationIndex <= endIndex) {
      throw new Rejection(
        `destinationIndex[${String(destinationIndex)}] must be outside the requested range[${String(startIndex)}-${String(endIndex)}]`,
      )
    }
    if (!this.#isRoadmapTab(tab)) {
      this.violations.push(`moveDimension on ${tab.title}`)
    }
    if (startIndex < 1) {
      this.violations.push(`moveDimension of ${tab.title}'s header row`)
    }
    if (destinationIndex < 1) {
      this.violations.push(`moveDimension above ${tab.title}'s header row`)
    }
    // Every row the move reaches, blank or not, so each index is a row's.
    while (tab.rows.length < Math.max(endIndex, destinationIndex)) {
      tab.rows.push([])
    }
    const moved = tab.rows.splice(startIndex, endIndex - startIndex)
    const to =
      destinationIndex > startIndex
        ? destinationIndex - moved.length
        : destinationIndex
    tab.rows.splice(to, 0, ...moved)
  }

  /**
   * Blank rows put in before the row at `startIndex`, the grid growing by them. As
   * Google refuses: rows that take after the row before them where there is none.
   */
  #insertDimension({
    range: { sheetId, dimension, startIndex, endIndex },
    inheritFromBefore,
  }: RequestOf<"insertDimension">): void {
    const tab = this.#tab(sheetId, "insertDimension")
    if (dimension !== "ROWS") {
      this.violations.push(`insertDimension of ${dimension}, not ROWS`)
      return
    }
    if (startIndex < 0 || startIndex >= endIndex || startIndex > tab.rowCount) {
      throw new Rejection(
        `${tab.title} has no rows ${String(startIndex)} to ${String(endIndex)} to insert`,
      )
    }
    if (inheritFromBefore && startIndex === 0) {
      throw new Rejection(
        "inheritFromBefore must be false when inserting at index 0",
      )
    }
    const count = endIndex - startIndex
    if (!this.#isRoadmapTab(tab)) {
      this.violations.push(`insertDimension on ${tab.title}`)
    }
    if (startIndex < 1) {
      this.violations.push(`insertDimension above ${tab.title}'s header row`)
    }
    if (count !== 1) {
      this.violations.push(
        `insertDimension of ${String(count)} rows in ${tab.title}, not 1`,
      )
    }
    if (inheritFromBefore) {
      this.violations.push(
        `insertDimension in ${tab.title} taking after the row before`,
      )
    }
    // Every row above it, blank or not, so each index is a row's.
    while (tab.rows.length < startIndex) tab.rows.push([])
    const rows = Array.from({ length: count }, (): string[] => [])
    tab.rows.splice(startIndex, 0, ...rows)
    tab.rowCount += count
    if (this.#isRoadmapTab(tab)) {
      this.#inserted.push(...rows.map((row) => ({ tab, row })))
    }
  }

  /** `updateCells` over a range, with no rows: every cell in it cleared of `fields`. */
  #clearCells({
    range: { sheetId, startRowIndex, endRowIndex },
    fields,
  }: Extract<RequestOf<"updateCells">, { range: unknown }>): void {
    const tab = this.#rowsTab(sheetId, "updateCells over a range")
    if (
      startRowIndex < 0 ||
      startRowIndex >= endRowIndex ||
      endRowIndex > tab.rowCount
    ) {
      throw new Rejection(
        `${tab.title} has no rows ${String(startRowIndex)} to ${String(endRowIndex)}`,
      )
    }
    if (fields !== "*") {
      this.violations.push(`updateCells over a range fields ${fields}, not *`)
    }
    if (startRowIndex < 1) {
      this.violations.push(`updateCells over ${tab.title}'s header row`)
    }
    for (let r = startRowIndex; r < endRowIndex; r++) {
      if (r < tab.rows.length) tab.rows[r] = []
    }
  }

  #updateCells({
    start,
    rows,
    fields,
  }: Extract<RequestOf<"updateCells">, { start: unknown }>): void {
    const tab = this.#tab(start.sheetId, "updateCells")
    if (fields !== "userEnteredValue") {
      this.violations.push(`updateCells fields ${fields}, not userEnteredValue`)
    }
    for (const [r, { values }] of rows.entries()) {
      for (const [c, cell] of values.entries()) {
        const rowIndex = start.rowIndex + r
        const columnIndex = start.columnIndex + c
        if (rowIndex >= tab.rowCount || columnIndex >= tab.columnCount) {
          throw new Rejection(
            `${tab.title} has no cell at row ${String(rowIndex)}, column ${String(columnIndex)}`,
          )
        }
        const where = `${tab.title}!R${String(rowIndex + 1)}C${String(columnIndex + 1)}`
        const value = cellValue(cell.userEnteredValue)
        if (value === null) {
          this.violations.push(
            `${where} written as ${JSON.stringify(cell.userEnteredValue)}`,
          )
          continue
        }
        if (tab.title === TEMPLATE_TAB) {
          this.violations.push(`${where} in Template`)
        }
        const header = tab.rows[0]?.[columnIndex] ?? ""
        this.#checkColumn(
          where,
          rowIndex === 0 ? value : header,
          value,
          rowIndex === 0,
        )
        while (tab.rows.length <= rowIndex) tab.rows.push([])
        // Never undefined: the rows were just padded to reach it.
        const row = tab.rows[rowIndex] ?? []
        while (row.length <= columnIndex) row.push("")
        if (row[columnIndex] === value) {
          this.violations.push(`${where} unchanged`)
        }
        row[columnIndex] = value
      }
    }
  }

  /** What a cell under the `column` header must never hold: Welsh, or a date written another way. */
  #checkColumn(
    where: string,
    column: string,
    value: string,
    isHeader: boolean,
  ): void {
    const welsh = WELSH_HEADER.exec(column)?.[1]?.trim()
    if (welsh !== undefined && !FAMILY_WELSH.test(welsh)) {
      this.violations.push(`${where} in a Welsh column`)
    }
    if (
      !isHeader &&
      headerKey(column) === LAST_UPDATED &&
      !LAST_UPDATED_VALUE.test(value)
    ) {
      this.violations.push(`${where} in Last updated, not YYYY-MM-DD`)
    }
  }
}

/** A cell's new text: a plain string, or `""` for a cleared cell; `null` otherwise. */
function cellValue(entered: Readonly<Record<string, unknown>> | undefined) {
  if (entered === undefined) return ""
  const keys = Object.keys(entered)
  const { stringValue } = entered
  return keys.length === 1 && typeof stringValue === "string"
    ? stringValue
    : null
}
