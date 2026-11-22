/**
 * Reads a tab's row-1 header the way the public site does (ADR-009, ADR-011): a column
 * is found by its header, never its position. Headers match ignoring case, accents,
 * spaces and punctuation; the first header of a column wins; a Welsh column is the
 * English header plus a Welsh suffix; unknown columns are ignored.
 */

import { foldText } from "@/lib/text"

import type { ProblemPlace } from "./sheet-problem-log"

/** Headers and sheet values match ignoring case, accents, spaces and punctuation. */
export const matchKey = (value: string) =>
  foldText(value).replace(/[^a-z0-9]/g, "")

/** `Title (cy)`, `Title(CY)`, `Title - Cymraeg`, `Title (Welsh)`, `Title_cym`. */
const WELSH_HEADER = /^(.+?)[\s([\-_]+(?:cy|cym|cymraeg|welsh)[\s)\]]*$/i

export type HeaderProblemCode =
  /** A second header for a column already read; the column is ignored. */
  | "duplicate-column"
  /** A Welsh header for a column with no Welsh; the column is ignored. */
  | "welsh-column-not-allowed"

/** A header cell: where its column is, and the header as written (trimmed). */
export interface HeaderCell {
  index: number
  header: string
}

/** Where each column's cells are. */
export interface SheetHeader<
  Column extends string,
  WelshColumn extends Column,
> {
  english: ReadonlyMap<Column, HeaderCell>
  welsh: ReadonlyMap<WelshColumn, HeaderCell>
  /** Every column read, known or not: a row is blank when all of these are blank. */
  readIndexes: readonly number[]
}

/** Anything that can record a header problem, such as a `ProblemLog`. */
export interface HeaderProblems {
  record(code: HeaderProblemCode, place: ProblemPlace): void
}

/**
 * Makes a reader for a tab's header row: `columns` are the tab's English headers,
 * `welshColumns` those that may have a Welsh version.
 */
export function headerReader<Column extends string, WelshColumn extends Column>(
  columns: readonly Column[],
  welshColumns: readonly WelshColumn[],
) {
  const columnsByKey = new Map(
    columns.map((column) => [matchKey(column), column]),
  )
  const welshByKey = new Map(
    welshColumns.map((column) => [matchKey(column), column]),
  )

  return function readHeader(
    cells: readonly string[],
    problems: HeaderProblems,
  ): SheetHeader<Column, WelshColumn> {
    const english = new Map<Column, HeaderCell>()
    const welsh = new Map<WelshColumn, HeaderCell>()
    const readIndexes: number[] = []
    const seen = new Set<string>()
    /** Claims a column for this header, or records the header as a repeat. */
    const claim = (key: string, cell: HeaderCell) => {
      if (seen.has(key)) {
        problems.record("duplicate-column", { row: 1, column: cell.header })
        return false
      }
      seen.add(key)
      readIndexes.push(cell.index)
      return true
    }

    cells.forEach((written, index) => {
      const cell = { index, header: written.trim() }
      const welshBase = WELSH_HEADER.exec(cell.header)?.[1]
      if (welshBase !== undefined) {
        const column = welshByKey.get(matchKey(welshBase))
        if (column === undefined) {
          problems.record("welsh-column-not-allowed", {
            row: 1,
            column: cell.header,
          })
        } else if (claim(`${column}:cy`, cell)) {
          welsh.set(column, cell)
        }
        return
      }
      const key = matchKey(cell.header)
      if (key === "" || !claim(key, cell)) return
      const column = columnsByKey.get(key)
      if (column !== undefined) english.set(column, cell)
    })
    return { english, welsh, readIndexes }
  }
}

/** Where each English column of `header` is, 0-based. */
export function columnIndexes<Column extends string>({
  english,
}: {
  english: ReadonlyMap<Column, HeaderCell>
}): ReadonlyMap<Column, number> {
  return new Map([...english].map(([column, { index }]) => [column, index]))
}
