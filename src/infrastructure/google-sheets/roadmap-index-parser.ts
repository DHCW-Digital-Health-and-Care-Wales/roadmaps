/**
 * Reads the roadmap index, the first worksheet, the way the public site reads it
 * (ADR-009, `docs/analysis/roadmaps-tab-format.md`): row 1 is the header, every other
 * non-blank row is one roadmap, and its `Sheet` cell names the worksheet holding the
 * roadmap's items. Mistakes the public site would fail its sync on are recorded as
 * problems and the list stays usable.
 */

import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  ROADMAP_CATEGORIES,
  type RoadmapCategory,
} from "@/domain/roadmap/roadmap-category"
import { AppError } from "@/lib/errors"
import { foldText } from "@/lib/text"

import {
  columnIndexes,
  headerReader,
  matchKey,
  type HeaderCell,
  type HeaderProblemCode,
  type SheetHeader,
} from "./sheet-header"
import { ProblemLog, type SheetProblem } from "./sheet-problem-log"

/** A mistake in the roadmap index, as data for a later sheet-health view (no prose). */
export type RoadmapIndexProblem = SheetProblem<RoadmapIndexProblemCode>

export type RoadmapIndexProblemCode =
  | HeaderProblemCode
  /** A column other than `Sheet` has no header. */
  | "missing-column"
  /** `Enabled` is neither exactly `Yes`, `No` nor blank; not published. */
  | "enabled-not-yes"
  /** A category not in the list; read as no category. */
  | "unknown-category"
  /** Not a real `YYYY-MM-DD` or `DD/MM/YYYY` date; read as no date. */
  | "invalid-date"
  /** Not a `#rgb` or `#rrggbb` colour; read as no colour. */
  | "invalid-colour"
  /** A `#rgb` colour, expanded; the public site's sync rejects it. */
  | "short-colour"
  /** Welsh text with no English; dropped. */
  | "welsh-without-english"
  /** The `Sheet` value has no letters or digits to make an id from; skipped. */
  | "invalid-id"
  /** Another row has the same id and was kept; skipped. */
  | "duplicate-id"
  /** No roadmap is published, which fails the public site's sync. */
  | "no-published-roadmap"
  /** `Sheet` names no tab of the spreadsheet; the roadmap is kept. */
  | "missing-tab"

export interface RoadmapIndexEntry {
  roadmap: Roadmap
  /** The worksheet holding the roadmap's items: its `Sheet` value, trimmed. */
  tabName: string
  /** The spreadsheet row it came from (1 is the header), to write it back. */
  row: number
}

export interface RoadmapIndex {
  /** In row order. */
  entries: RoadmapIndexEntry[]
  /** The 0-based place of each English column the header has, to write to. */
  columns: ReadonlyMap<RoadmapIndexColumn, number>
  /** In row order, problems of the whole list first. */
  problems: RoadmapIndexProblem[]
}

// The columns after `Sheet`, in the order a missing one is recorded.
const OPTIONAL_COLUMNS = [
  "Enabled",
  "Title",
  "Category",
  "Family",
  "Status label",
  "Last updated",
  "Colour",
  "Vision",
  "Service description",
  "Product Lead",
] as const

export type RoadmapIndexColumn = "Sheet" | (typeof OPTIONAL_COLUMNS)[number]
type Column = RoadmapIndexColumn
type TextColumn =
  "Title" | "Family" | "Status label" | "Vision" | "Service description"

/** The columns that may have a Welsh version, such as `Title (cy)`. */
const WELSH_COLUMNS: readonly TextColumn[] = [
  "Title",
  "Family",
  "Status label",
  "Vision",
  "Service description",
]

/**
 * How the public site's `Category` values are spelled (its `CATEGORY_SHEET_VALUES`).
 * Exported for tests that write roadmap index rows.
 */
export const CATEGORY_SHEET_VALUES: Readonly<Record<RoadmapCategory, string>> =
  {
    "public-health-apps": "Public Health & Apps",
    "gp-community-services": "GP & Community Services",
    "tests-scans-results": "Tests, Scans & Results",
    "urgent-emergency-care": "Urgent & Emergency Care",
    "hospital-specialist-care": "Hospital & Specialist Care",
    "national-systems-data": "National Systems & Data",
  }

/** The public site's URL slug: `Product A` becomes `product-a`. */
const slugify = (value: string) =>
  foldText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const readHeader = headerReader<Column, TextColumn>(
  ["Sheet", ...OPTIONAL_COLUMNS],
  WELSH_COLUMNS,
)

const CATEGORIES_BY_KEY = new Map<string, RoadmapCategory>(
  ROADMAP_CATEGORIES.map((category) => [
    matchKey(CATEGORY_SHEET_VALUES[category]),
    category,
  ]),
)

type Header = SheetHeader<Column, TextColumn>
type IndexProblemLog = ProblemLog<RoadmapIndexProblemCode>

/** One spreadsheet row, trimmed, read through the header. */
interface IndexRow {
  row: number
  sheet: string
  /** The public site's slug of `sheet`; `""` when it has no letters or digits. */
  id: string
  read(column: Column): string
  readWelsh(column: TextColumn): string
}

export interface ParseRoadmapIndexOptions {
  /**
   * The spreadsheet's tab titles. When given, a kept roadmap whose `Sheet` matches none
   * of them exactly records `missing-tab`.
   */
  tabTitles?: Iterable<string> | undefined
}

/**
 * Parses the roadmap index's rows (`rows[0]` being spreadsheet row 1) into roadmaps
 * and problems. Rows may be shorter than the header, as the Sheets API drops trailing
 * blank cells. Throws `AppError('invalid-data')` when the list has no rows or its
 * header has no `Sheet` column.
 */
export function parseRoadmapIndex(
  rows: readonly (readonly string[])[],
  { tabTitles }: ParseRoadmapIndexOptions = {},
): RoadmapIndex {
  const [headerRow, ...bodyRows] = rows
  if (headerRow === undefined) {
    throw new AppError("invalid-data", {
      message: "The roadmap index is empty",
    })
  }
  const problems = new ProblemLog<RoadmapIndexProblemCode>()
  const header = readHeader(headerRow, problems)
  if (!header.english.has("Sheet")) {
    throw new AppError("invalid-data", {
      message: "The roadmap index has no Sheet column",
    })
  }
  for (const column of OPTIONAL_COLUMNS) {
    if (!header.english.has(column)) {
      problems.record("missing-column", { column })
    }
  }

  const indexRows = bodyRows.flatMap((cells, i) => {
    const row = toIndexRow(header, cells, i + 2)
    return row ? [row] : []
  })
  const keptRows = keepOneRowPerId(indexRows, header, problems)
  if (tabTitles !== undefined) {
    recordMissingTabs(keptRows, new Set(tabTitles), header, problems)
  }
  const entries = keptRows.map((indexRow) =>
    toEntry(indexRow, header, problems),
  )

  if (
    header.english.has("Enabled") &&
    !entries.some(({ roadmap }) => roadmap.published)
  ) {
    problems.record("no-published-roadmap", {})
  }
  return {
    entries,
    columns: columnIndexes(header),
    problems: problems.sorted(),
  }
}

/** Reads one row, or returns `null` for a row to ignore: blank, or a blank `Sheet`. */
function toIndexRow(
  header: Header,
  cells: readonly string[],
  row: number,
): IndexRow | null {
  const cellAt = (cell: HeaderCell | undefined) =>
    cell === undefined ? "" : (cells[cell.index] ?? "").trim()
  const read = (column: Column) => cellAt(header.english.get(column))
  const sheet = read("Sheet")
  if (sheet === "") return null
  return {
    row,
    sheet,
    id: slugify(sheet),
    read,
    readWelsh: (column) => cellAt(header.welsh.get(column)),
  }
}

/**
 * Among rows sharing an id, keeps the first published one, else the first (ADR-009):
 * the public site drops unpublished rows before checking ids, so a draft may share
 * the live roadmap's id. Rows with no id, and the others sharing one, are skipped.
 */
function keepOneRowPerId(
  rows: readonly IndexRow[],
  header: Header,
  problems: IndexProblemLog,
): IndexRow[] {
  const column = header.english.get("Sheet")?.header ?? null
  const skip = (code: RoadmapIndexProblemCode, { row, sheet }: IndexRow) => {
    problems.record(code, { row, column, value: sheet })
  }

  const withIds = rows.filter((indexRow) => {
    if (indexRow.id !== "") return true
    skip("invalid-id", indexRow)
    return false
  })
  const keptById = new Map<string, IndexRow>()
  for (const indexRow of withIds) {
    const kept = keptById.get(indexRow.id)
    if (kept === undefined || (!isPublished(kept) && isPublished(indexRow))) {
      keptById.set(indexRow.id, indexRow)
    }
  }
  return withIds.filter((indexRow) => {
    if (keptById.get(indexRow.id) === indexRow) return true
    skip("duplicate-id", indexRow)
    return false
  })
}

/** A missing tab never fails the list (ADR-009): the roadmap is kept. */
function recordMissingTabs(
  rows: readonly IndexRow[],
  tabTitles: ReadonlySet<string>,
  header: Header,
  problems: IndexProblemLog,
): void {
  const column = header.english.get("Sheet")?.header ?? null
  for (const { row, sheet } of rows) {
    if (!tabTitles.has(sheet)) {
      problems.record("missing-tab", { row, column, value: sheet })
    }
  }
}

/** Only an `Enabled` of exactly `Yes` publishes. */
const isPublished = (indexRow: IndexRow) => indexRow.read("Enabled") === "Yes"

function toEntry(
  indexRow: IndexRow,
  header: Header,
  problems: IndexProblemLog,
): RoadmapIndexEntry {
  const { row, sheet, id } = indexRow
  /** Records a problem with a cell of this row. */
  const recordCell = (
    code: RoadmapIndexProblemCode,
    cell: HeaderCell | undefined,
    value: string,
  ) => {
    problems.record(code, { row, column: cell?.header ?? null, value })
  }

  const text = (column: TextColumn, fallback = ""): LocalisedText | null => {
    const en = indexRow.read(column) || fallback
    const cy = indexRow.readWelsh(column)
    if (en === "") {
      if (cy !== "") {
        recordCell("welsh-without-english", header.welsh.get(column), cy)
      }
      return null
    }
    return { en, cy }
  }
  /** Reads an optional cell, recording a value it can't use. */
  const parsed = <T>(
    column: Column,
    parse: (value: string) => {
      value: T | null
      problem?: RoadmapIndexProblemCode
    },
  ): T | null => {
    const value = indexRow.read(column)
    if (value === "") return null
    const result = parse(value)
    if (result.problem !== undefined) {
      recordCell(result.problem, header.english.get(column), value)
    }
    return result.value
  }

  const enabled = indexRow.read("Enabled")
  if (enabled !== "" && enabled !== "Yes" && enabled !== "No") {
    recordCell("enabled-not-yes", header.english.get("Enabled"), enabled)
  }

  return {
    tabName: sheet,
    row,
    roadmap: {
      id,
      // `sheet` is never blank, so neither is the title.
      title: text("Title", sheet) ?? { en: sheet, cy: "" },
      published: enabled === "Yes",
      category: parsed("Category", parseCategory),
      family: text("Family"),
      statusLabel: text("Status label"),
      productLead: indexRow.read("Product Lead") || null,
      lastUpdated: parsed("Last updated", parseDate),
      colour: parsed("Colour", parseColour),
      vision: text("Vision"),
      serviceDescription: text("Service description"),
    },
  }
}

function parseCategory(value: string) {
  const category = CATEGORIES_BY_KEY.get(matchKey(value))
  return category === undefined
    ? { value: null, problem: "unknown-category" as const }
    : { value: category }
}

const ISO_DATE = /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})$/
const UK_DATE = /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/

/** A real date written `YYYY-MM-DD` or `DD/MM/YYYY`, as `YYYY-MM-DD`. */
function parseDate(value: string) {
  const { year, month, day } =
    (ISO_DATE.exec(value) ?? UK_DATE.exec(value))?.groups ?? {}
  if (year !== undefined && month !== undefined && day !== undefined) {
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    )
    if (
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
    ) {
      return { value: date.toISOString().slice(0, 10) }
    }
  }
  return { value: null, problem: "invalid-date" as const }
}

/** Only hex colours, so sheet text can't inject CSS; `#rgb` is expanded. */
function parseColour(value: string) {
  const colour = value.toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(colour)) return { value: colour }
  if (/^#[0-9a-f]{3}$/.test(colour)) {
    const [, r = "", g = "", b = ""] = colour
    return {
      value: `#${r}${r}${g}${g}${b}${b}`,
      problem: "short-colour" as const,
    }
  }
  return { value: null, problem: "invalid-colour" as const }
}
