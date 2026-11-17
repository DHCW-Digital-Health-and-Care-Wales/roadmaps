import { AppError } from "@/lib/errors"

import type { TabProperties } from "./sheets-schemas"

/** A tab's every row as displayed, with its properties, to write back to. */
export interface TabRows {
  properties: TabProperties
  rows: string[][]
}

/** One cell's new value: plain text, or `{}` to leave it blank (ADR-012 D6). */
interface CellData {
  userEnteredValue?: { stringValue: string }
}

/** One `spreadsheets.batchUpdate` request (ADR-012 D6, STY-040). */
export type BatchRequest =
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
      /** With no rows: every cell of the range cleared, its format and checks too. */
      updateCells: {
        range: { sheetId: number; startRowIndex: number; endRowIndex: number }
        fields: "*"
      }
    }
  | {
      /** Google adds the rows after the last row any value uses (STY-029, STY-045). */
      appendCells: {
        sheetId: number
        rows: [{ values: CellData[] }]
        fields: "userEnteredValue"
      }
    }
  | {
      /** A copy of a tab, with the ID given, so later requests can change it. */
      duplicateSheet: {
        sourceSheetId: number
        insertSheetIndex: number
        newSheetId: number
        newSheetName: string
      }
    }
  | {
      updateSheetProperties: {
        properties: { sheetId: number; hidden: false }
        fields: "hidden"
      }
    }
  | {
      updateSheetProperties: {
        properties: { sheetId: number; gridProperties: { frozenRowCount: 1 } }
        fields: "gridProperties.frozenRowCount"
      }
    }
  | {
      /**
       * One row taken out and put back at `destinationIndex`, which counts rows before
       * it is taken out (STY-051): the row moves with all it holds, nothing rewritten.
       */
      moveDimension: {
        source: {
          sheetId: number
          dimension: "ROWS"
          startIndex: number
          endIndex: number
        }
        destinationIndex: number
      }
    }
  | {
      /**
       * One blank row put in before the row at `startIndex`, formatted as the row after
       * it, never as the one before, which may be the header (STY-050).
       */
      insertDimension: {
        range: {
          sheetId: number
          dimension: "ROWS"
          startIndex: number
          endIndex: number
        }
        inheritFromBefore: false
      }
    }
  | {
      deleteDimension: {
        range: {
          sheetId: number
          dimension: "ROWS"
          startIndex: number
          endIndex: number
        }
      }
    }

/** Where a row is moved to: just after another row, or just before it. */
export type RowDestination = { after: number } | { before: number }

/** The place, among the rows in their order, of a row inserted: no row as read is 0. */
const INSERTED_ROW = 0

/**
 * Collects one tab's cell writes, row moves, inserted rows and appended rows. A column
 * the header lacks is added after the last column any row uses, with its English header
 * (ADR-012 Option 9), the grid growing to hold it; no existing column moves.
 */
export class TabWriter<Column extends string> {
  readonly #sheetId: number
  readonly #columnCount: number
  readonly #columns: Map<Column, number>
  #width: number
  readonly #headers: BatchRequest[] = []
  readonly #cells: BatchRequest[] = []
  readonly #moves: BatchRequest[] = []
  /**
   * The rows as read, by number, in the order the moves and inserts so far leave them,
   * with `INSERTED_ROW` for each row inserted.
   */
  readonly #order: number[]
  readonly #inserted: BatchRequest[] = []
  readonly #appended: BatchRequest[] = []

  constructor(
    { properties, rows }: TabRows,
    columns: ReadonlyMap<Column, number>,
  ) {
    this.#sheetId = properties.sheetId
    this.#columns = new Map(columns)
    // Google drops trailing blank cells, so a row's length is where its last value ends.
    this.#width = Math.max(0, ...rows.map((row) => row.length))
    this.#columnCount = properties.gridProperties?.columnCount ?? this.#width
    this.#order = rows.map((_, index) => index + 1)
  }

  /** Writes `value` to `column` of spreadsheet row `row` (1 is the header). */
  write(row: number, column: Column, value: string): void {
    this.#cells.push(this.#cell(row, this.#columnIndex(column), value))
  }

  /**
   * Moves spreadsheet row `row` to just after another, or just before it, each a row
   * as the tab was read, numbered as `write` numbers it. The row itself is moved, by
   * `moveDimension`, so no cell is rewritten and it keeps its formatting, its dropdown
   * and the references to it (ADR-012, _STY-051 amendments_). Moves are made in the
   * order of the calls, after every cell is written, so each is worked out over what
   * the moves before it left. A move that would leave the row where it is is not sent:
   * Google refuses one, and the whole write with it. Every move is made before any row
   * is inserted, as they are sent.
   */
  move(row: number, to: RowDestination): void {
    if (this.#inserted.length > 0) {
      throw new AppError("unknown", {
        message: "A row is moved before any row is inserted",
      })
    }
    const from = this.#order.indexOf(row)
    const beside = this.#order.indexOf("after" in to ? to.after : to.before)
    if (from < 0 || beside < 0) {
      throw new AppError("unknown", {
        message:
          "A row to move, or to move it beside, is none the tab was read with",
      })
    }
    // Counted before the row is taken out: up to index `f` is `f`, down to it `f + 1`.
    const destinationIndex = "after" in to ? beside + 1 : beside
    if (destinationIndex === from || destinationIndex === from + 1) return
    this.#moves.push({
      moveDimension: {
        source: {
          sheetId: this.#sheetId,
          dimension: "ROWS",
          startIndex: from,
          endIndex: from + 1,
        },
        destinationIndex,
      },
    })
    this.#order.splice(from, 1)
    this.#order.splice(
      destinationIndex > from ? destinationIndex - 1 : destinationIndex,
      0,
      row,
    )
  }

  /**
   * Inserts a row just before spreadsheet row `before`, a row as the tab was read,
   * where the moves and the inserts before it leave that row, and writes each cell
   * under its column there (ADR-012, _STY-050 amendments_). The new row is formatted
   * as the row after it. A blank cell is left out. Rows are inserted in the order of
   * the calls, after every move.
   */
  insert(before: number, cells: Iterable<readonly [Column, string]>): void {
    const at = this.#order.indexOf(before)
    if (at < 0) {
      throw new AppError("unknown", {
        message: "A row to insert a row before is none the tab was read with",
      })
    }
    this.#inserted.push({
      insertDimension: {
        range: {
          sheetId: this.#sheetId,
          dimension: "ROWS",
          startIndex: at,
          endIndex: at + 1,
        },
        inheritFromBefore: false,
      },
    })
    for (const [column, value] of cells) {
      if (value === "") continue
      this.#inserted.push(this.#cell(at + 1, this.#columnIndex(column), value))
    }
    this.#order.splice(at, 0, INSERTED_ROW)
  }

  /**
   * Appends a row holding each cell under its column, after the last row any value
   * uses: Google picks the row as it applies the write, so a row a co-lead added
   * meanwhile is never overwritten (STY-029), and no row in use moves. A blank cell is
   * left out, adding no column. Rows are appended in the order of the calls.
   */
  append(cells: Iterable<readonly [Column, string]>): void {
    const values: CellData[] = []
    for (const [column, value] of cells) {
      if (value === "") continue
      const columnIndex = this.#columnIndex(column)
      while (values.length < columnIndex) values.push({})
      values[columnIndex] = textCell(value)
    }
    this.#appended.push({
      appendCells: {
        sheetId: this.#sheetId,
        rows: [{ values }],
        fields: "userEnteredValue",
      },
    })
  }

  /**
   * Growing the grid first, then headers, then cells, then row moves, then inserted
   * rows, each with its cells, then appended rows (STY-050 S8).
   */
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
      ...this.#moves,
      ...this.#inserted,
      ...this.#appended,
    ]
  }

  /** Where `column` is, adding it with its header when the tab has none. */
  #columnIndex(column: Column): number {
    let columnIndex = this.#columns.get(column)
    if (columnIndex === undefined) {
      columnIndex = this.#width++
      this.#columns.set(column, columnIndex)
      this.#headers.push(this.#cell(1, columnIndex, column))
    }
    return columnIndex
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
