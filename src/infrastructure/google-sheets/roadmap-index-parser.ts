/**
 * Reads the roadmap index, the first worksheet, the way the public site reads it
 * (ADR-009, `docs/analysis/roadmaps-tab-format.md`): row 1 is the header, every other
 * non-blank row is one roadmap, and its `Sheet` cell names the worksheet holding the
 * roadmap's items. Mistakes the public site would fail its sync on are recorded as
 * problems and the list stays usable. A row's family and category are linked to the
 * family and category lists, whose values are shown (ADR-013).
 */

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { shortNameAddress } from "@/domain/roadmap/short-name"
import { AppError } from "@/lib/errors"
import { nameKey } from "@/lib/text"

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
  /** A `Category ID` not in the list; the row is linked by its `Category`. */
  | "unknown-category-id"
  /** A family not in the list; shown as the row names it (STY-027 S8). */
  | "unknown-family"
  /** A `Family ID` not in the list; the row is linked by its `Family`. */
  | "unknown-family-id"
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
  /**
   * Every row with an id, in row order: `entries`, and those skipped as sharing an id
   * with one of them (`duplicate-id`), whose own problems are not recorded (STY-035).
   */
  everyEntry: RoadmapIndexEntry[]
  /** The 0-based place of each column the header has that may be written to. */
  columns: ReadonlyMap<RoadmapIndexWriteColumn, number>
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

/** The editor's own columns, which the public site ignores: none is a mistake to miss. */
const EDITOR_COLUMNS = ["Family ID", "Category ID"] as const

export type RoadmapIndexColumn =
  "Sheet" | (typeof OPTIONAL_COLUMNS)[number] | (typeof EDITOR_COLUMNS)[number]

export const FAMILY_WELSH = "Family (cy)"

/**
 * A column a publish may write: an English one, or the family's Welsh name, copied from
 * the family list (ADR-013), the one Welsh column ever written.
 */
export type RoadmapIndexWriteColumn = RoadmapIndexColumn | typeof FAMILY_WELSH
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
 * How the public site's `Category` values are spelled (its `CATEGORY_SHEET_VALUES`),
 * read when there is no category list (STY-027 D5).
 */
const PUBLIC_SITE_CATEGORIES = [
  "Public Health & Apps",
  "GP & Community Services",
  "Tests, Scans & Results",
  "Urgent & Emergency Care",
  "Hospital & Specialist Care",
  "National Systems & Data",
]

const readHeader = headerReader<Column, TextColumn>(
  ["Sheet", ...OPTIONAL_COLUMNS, ...EDITOR_COLUMNS],
  WELSH_COLUMNS,
)

const PUBLIC_SITE_CATEGORIES_BY_KEY = new Map(
  PUBLIC_SITE_CATEGORIES.map((name) => [matchKey(name), name]),
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
  /** The family list; without one, a row's family is its own cells (ADR-013). */
  families?: readonly Family[] | null | undefined
  /** The category list; without one, a row's category is a public-site spelling. */
  categories?: readonly Category[] | null | undefined
}

/** A list, found by ID or by name as names match. */
interface Lookup<T> {
  byId: ReadonlyMap<string, T>
  byName: ReadonlyMap<string, T>
}

function lookupOf<T extends { id: string; name: LocalisedText }>(
  list: readonly T[] | null | undefined,
): Lookup<T> | null {
  if (list == null) return null
  return {
    byId: new Map(list.map((item) => [item.id, item])),
    byName: new Map(list.map((item) => [nameKey(item.name.en), item])),
  }
}

interface Lookups {
  families: Lookup<Family> | null
  categories: Lookup<Category> | null
}

/**
 * Parses the roadmap index's rows (`rows[0]` being spreadsheet row 1) into roadmaps
 * and problems. Rows may be shorter than the header, as the Sheets API drops trailing
 * blank cells. Throws `AppError('invalid-data')` when the list has no rows or its
 * header has no `Sheet` column.
 */
export function parseRoadmapIndex(
  rows: readonly (readonly string[])[],
  { tabTitles, families, categories }: ParseRoadmapIndexOptions = {},
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
  const { kept, withIds } = keepOneRowPerId(indexRows, header, problems)
  if (tabTitles !== undefined) {
    recordMissingTabs(kept, new Set(tabTitles), header, problems)
  }
  const lookups = {
    families: lookupOf(families),
    categories: lookupOf(categories),
  }
  const entries = kept.map((indexRow) =>
    toEntry(indexRow, header, lookups, problems),
  )
  const keptEntries = new Map(kept.map((indexRow, i) => [indexRow, entries[i]]))
  const everyEntry = withIds.map(
    (indexRow) =>
      keptEntries.get(indexRow) ??
      toEntry(indexRow, header, lookups, new ProblemLog()),
  )

  if (
    header.english.has("Enabled") &&
    !entries.some(({ roadmap }) => roadmap.published)
  ) {
    problems.record("no-published-roadmap", {})
  }
  const familyWelsh = header.welsh.get("Family")
  return {
    entries,
    everyEntry,
    columns: new Map<RoadmapIndexWriteColumn, number>([
      ...columnIndexes(header),
      ...(familyWelsh ? [[FAMILY_WELSH, familyWelsh.index] as const] : []),
    ]),
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
    id: shortNameAddress(sheet),
    read,
    readWelsh: (column) => cellAt(header.welsh.get(column)),
  }
}

/**
 * Among rows sharing an id, keeps the first published one, else the first (ADR-009):
 * the public site drops unpublished rows before checking ids, so a draft may share
 * the live roadmap's id. Rows with no id, and the others sharing one, are skipped:
 * `withIds` holds every row but those with no id.
 */
function keepOneRowPerId(
  rows: readonly IndexRow[],
  header: Header,
  problems: IndexProblemLog,
): { kept: IndexRow[]; withIds: IndexRow[] } {
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
  const kept = withIds.filter((indexRow) => {
    if (keptById.get(indexRow.id) === indexRow) return true
    skip("duplicate-id", indexRow)
    return false
  })
  return { kept, withIds }
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
  lookups: Lookups,
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

  /**
   * The listed family or category the row names: by its ID column, else by name. An
   * unknown ID is recorded.
   */
  const link = <T>(
    lookup: Lookup<T>,
    idColumn: "Family ID" | "Category ID",
    name: string,
    unknownId: RoadmapIndexProblemCode,
  ): T | null => {
    const id = indexRow.read(idColumn)
    const byId = id === "" ? undefined : lookup.byId.get(id)
    if (id !== "" && byId === undefined) {
      recordCell(unknownId, header.english.get(idColumn), id)
    }
    return (
      byId ?? (name === "" ? null : (lookup.byName.get(nameKey(name)) ?? null))
    )
  }

  const ownFamily = text("Family")
  const ownColour = parsed("Colour", parseColour)
  const family =
    lookups.families &&
    link(
      lookups.families,
      "Family ID",
      ownFamily?.en ?? "",
      "unknown-family-id",
    )
  const familyNotListed =
    lookups.families !== null && family === null && ownFamily !== null
  if (familyNotListed) {
    recordCell("unknown-family", header.english.get("Family"), ownFamily.en)
  }
  const familyOutOfStep =
    family !== null &&
    (indexRow.read("Family") !== family.name.en ||
      indexRow.readWelsh("Family") !== family.name.cy ||
      indexRow.read("Colour").toLowerCase() !== family.colour)

  const ownCategory = indexRow.read("Category")
  let category: LocalisedText | null = null
  let categoryId: string | null = null
  let categoryOutOfStep = false
  if (lookups.categories === null) {
    category = parsed("Category", parsePublicSiteCategory)
  } else {
    const listed = link(
      lookups.categories,
      "Category ID",
      ownCategory,
      "unknown-category-id",
    )
    if (listed !== null) {
      category = listed.name
      categoryId = listed.id
      categoryOutOfStep = ownCategory !== listed.name.en
    } else if (ownCategory !== "") {
      recordCell(
        "unknown-category",
        header.english.get("Category"),
        ownCategory,
      )
    }
  }

  return {
    tabName: sheet,
    row,
    roadmap: {
      id,
      itemsLocation: sheet,
      // `sheet` is never blank, so neither is the title.
      title: text("Title", sheet) ?? { en: sheet, cy: "" },
      published: enabled === "Yes",
      category,
      categoryId,
      family: family?.name ?? ownFamily,
      familyId: family?.id ?? null,
      copied: { family: ownFamily, colour: ownColour, category: ownCategory },
      outOfStep: familyOutOfStep || categoryOutOfStep,
      familyNotListed,
      statusLabel: text("Status label"),
      productLead: indexRow.read("Product Lead") || null,
      lastUpdated: parsed("Last updated", parseDate),
      colour: family?.colour ?? ownColour,
      vision: text("Vision"),
      serviceDescription: text("Service description"),
    },
  }
}

/** One of the public site's spellings, in English only (STY-027 D5). */
function parsePublicSiteCategory(value: string) {
  const name = PUBLIC_SITE_CATEGORIES_BY_KEY.get(matchKey(value))
  return name === undefined
    ? { value: null, problem: "unknown-category" as const }
    : { value: { en: name, cy: "" } }
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
