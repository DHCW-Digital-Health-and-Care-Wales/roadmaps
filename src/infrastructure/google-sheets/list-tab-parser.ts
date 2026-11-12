/**
 * Reads the family and category lists, the `Families` and `Categories` tabs (ADR-013):
 * row 1 is the header, matched as the roadmap index's is (ADR-009), and every other
 * non-blank row is one family or category. A missing tab or column makes no list, so
 * roadmaps are read as before the lists; a bad row is skipped and recorded.
 */

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import { nameKey } from "@/lib/text"

import {
  headerReader,
  type HeaderCell,
  type HeaderProblemCode,
} from "./sheet-header"
import { ProblemLog, type SheetProblem } from "./sheet-problem-log"

/** The tabs' titles, matched exactly. */
export const FAMILIES_TAB = "Families"
export const CATEGORIES_TAB = "Categories"

/** A mistake in a list tab, as data for a later sheet-health view (no prose). */
export type ListTabProblem = SheetProblem<ListTabProblemCode>

export type ListTabProblemCode =
  | HeaderProblemCode
  /** No tab has the list's title; no list. */
  | "missing-tab"
  /** A column has no header: no list, except for `Name (cy)`. */
  | "missing-column"
  /** A row with no `ID`; skipped. */
  | "blank-id"
  /** A row with no `Name`; skipped. */
  | "blank-name"
  /** An `ID` an earlier row has; skipped. */
  | "duplicate-id"
  /** A `Name` an earlier row has, folded as names match; skipped. */
  | "duplicate-name"
  /** A `Colour` that is not `#rrggbb`; skipped. */
  | "invalid-colour"

export interface ListTab<T> {
  /** In row order; `null` when the tab or a column it needs is missing. */
  list: T[] | null
  /** In row order, problems of the whole tab first. */
  problems: ListTabProblem[]
}

type Rows = readonly (readonly string[])[]
type ListColumn = "ID" | "Name" | "Colour"

/** One kept row's cells, trimmed. */
interface ListRow {
  id: string
  name: { en: string; cy: string }
  read(column: ListColumn): string
  /** Records a problem with this row's cell in `column` and skips the row. */
  skip(code: ListTabProblemCode, column: ListColumn): null
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/

/**
 * Parses the `Families` tab's rows, `null` when there is no such tab, into families.
 * Colours are lower case.
 */
export function parseFamilies(rows: Rows | null): ListTab<Family> {
  return parseListTab(rows, ["ID", "Name", "Colour"], (row) => {
    const colour = row.read("Colour").toLowerCase()
    if (!HEX_COLOUR.test(colour)) return row.skip("invalid-colour", "Colour")
    return { id: row.id, name: row.name, colour }
  })
}

/** Parses the `Categories` tab's rows, `null` when there is no such tab. */
export function parseCategories(rows: Rows | null): ListTab<Category> {
  return parseListTab(rows, ["ID", "Name"], ({ id, name }) => ({ id, name }))
}

function parseListTab<T>(
  rows: Rows | null,
  columns: readonly ListColumn[],
  toItem: (row: ListRow) => T | null,
): ListTab<T> {
  const problems = new ProblemLog<ListTabProblemCode>()
  if (rows === null) {
    problems.record("missing-tab", {})
    return { list: null, problems: problems.sorted() }
  }

  const [headerRow = [], ...bodyRows] = rows
  const header = headerReader(columns, ["Name"])(headerRow, problems)
  const missing = columns.filter((column) => !header.english.has(column))
  for (const column of missing) problems.record("missing-column", { column })
  if (missing.length > 0) return { list: null, problems: problems.sorted() }
  if (!header.welsh.has("Name")) {
    problems.record("missing-column", { column: "Name (cy)" })
  }

  const ids = new Set<string>()
  const names = new Set<string>()
  const list: T[] = []
  /** The row's item, or `null` for a row to skip (recorded) or ignore (blank). */
  const readRow = (cells: readonly string[], row: number) => {
    const cellAt = (cell: HeaderCell | undefined) =>
      cell === undefined ? "" : (cells[cell.index] ?? "").trim()
    if (
      header.readIndexes.every((index) => (cells[index] ?? "").trim() === "")
    ) {
      return null
    }
    const read = (column: ListColumn) => cellAt(header.english.get(column))
    const skip = (code: ListTabProblemCode, column: ListColumn) => {
      problems.record(code, {
        row,
        column: header.english.get(column)?.header ?? column,
        value: read(column),
      })
      return null
    }

    const id = read("ID")
    const name = { en: read("Name"), cy: cellAt(header.welsh.get("Name")) }
    if (id === "") return skip("blank-id", "ID")
    if (name.en === "") return skip("blank-name", "Name")
    const value = toItem({ id, name, read, skip })
    if (value === null) return null
    if (ids.has(id)) return skip("duplicate-id", "ID")
    if (names.has(nameKey(name.en))) return skip("duplicate-name", "Name")
    return { id, name, value }
  }
  for (const [i, cells] of bodyRows.entries()) {
    const item = readRow(cells, i + 2)
    if (item === null) continue
    ids.add(item.id)
    names.add(nameKey(item.name.en))
    list.push(item.value)
  }
  return { list, problems: problems.sorted() }
}
