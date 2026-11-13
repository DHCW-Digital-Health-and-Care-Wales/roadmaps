/**
 * Reads a roadmap's tab the way the public site reads it (ADR-011,
 * `docs/analysis/roadmap-tab-format.md`): row 1 is the header, and every other
 * non-blank row with a title is one roadmap item, in row order. Unlike the public site,
 * an item with no recognised horizon is kept, unplaced, so the Product Lead can fix it;
 * every other mistake the public site warns about, bar its translation-quality
 * warnings, is recorded as a problem.
 */

import type { LocalisedText } from "@/domain/roadmap/localised-text"
import { ORGANISATIONS, type Organisation } from "@/domain/roadmap/organisation"
import type {
  RoadmapItem,
  RoadmapItemDetail,
} from "@/domain/roadmap/roadmap-item"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"
import { AppError } from "@/lib/errors"

import {
  columnIndexes,
  headerReader,
  matchKey,
  type HeaderCell,
  type HeaderProblemCode,
  type SheetHeader,
} from "./sheet-header"
import { ProblemLog, type SheetProblem } from "./sheet-problem-log"

/** A mistake in a roadmap tab, as data for a later sheet-health view (no prose). */
export type RoadmapTabProblem = SheetProblem<RoadmapTabProblemCode>

export type RoadmapTabProblemCode =
  | HeaderProblemCode
  /** A column other than `Title` has no header. */
  | "missing-column"
  /** An `Item ID` already on an earlier kept row; the later item has no ID. */
  | "duplicate-item-id"
  /** A row with no English title; skipped. */
  | "missing-title"
  /** A blank `Horizon`; the item is kept unplaced. */
  | "missing-horizon"
  /** A `Horizon` that is not a placement; the item is kept unplaced. */
  | "unknown-horizon"
  /** An organisation code not in the list; left out. */
  | "unknown-organisation"
  /** Welsh tags or details whose count differs from the English; the Welsh is ignored. */
  | "welsh-count-mismatch"
  /** Welsh text with no English; dropped. */
  | "welsh-without-english"

export interface RoadmapTab {
  /** In row order. */
  items: RoadmapItem[]
  /** The spreadsheet row (1 is the header) each of `items` came from, in step with it. */
  rows: number[]
  /** The 0-based place of each English column the header has, to write to. */
  columns: ReadonlyMap<RoadmapTabColumn, number>
  /** In row order, problems of the whole tab first. */
  problems: RoadmapTabProblem[]
}

// The columns after `Title`, in the order a missing one is recorded.
const OPTIONAL_COLUMNS = [
  "Horizon",
  "Description",
  "Outcome",
  "Phase",
  "Labels",
  "Organisations",
  "Details",
] as const

// Every tab predates it, so a missing `Item ID` column is not a problem.
export type RoadmapTabColumn =
  "Title" | "Item ID" | (typeof OPTIONAL_COLUMNS)[number]
type Column = RoadmapTabColumn

/** The columns that may have a Welsh version, such as `Title (cy)`. */
const WELSH_COLUMNS = [
  "Title",
  "Description",
  "Outcome",
  "Phase",
  "Labels",
  "Details",
] as const satisfies readonly Column[]

type TextColumn = (typeof WELSH_COLUMNS)[number]

const readHeader = headerReader<Column, TextColumn>(
  ["Title", "Item ID", ...OPTIONAL_COLUMNS],
  WELSH_COLUMNS,
)

type Header = SheetHeader<Column, TextColumn>
type TabProblemLog = ProblemLog<RoadmapTabProblemCode>

/**
 * Each placement's `Horizon` value, as the public site writes it
 * (`docs/analysis/roadmap-tab-format.md`, _Horizon values_): what a move writes (ADR-014).
 */
export const HORIZON_VALUES = {
  "recently-delivered": "Recently delivered",
  now: "Now",
  next: "Next",
  later: "Later",
  "delivered-this-year": "Delivered this year",
  "not-doing": "Not doing",
} as const satisfies Record<RoadmapPlacement, string>

/** `Horizon` values match like headers: `recently  delivered` is `recently-delivered`. */
const PLACEMENTS_BY_KEY = new Map<string, RoadmapPlacement>(
  ROADMAP_PLACEMENTS.map((placement) => [
    matchKey(HORIZON_VALUES[placement]),
    placement,
  ]),
)

/** Organisation codes match like headers: `C.A.V.U.H.B` is `cavuhb`. */
const ORGANISATIONS_BY_KEY = new Map<string, Organisation>(
  ORGANISATIONS.map((organisation) => [matchKey(organisation), organisation]),
)

/**
 * Parses a roadmap tab's rows (`rows[0]` being spreadsheet row 1) into items and
 * problems. Rows may be shorter than the header, as the Sheets API drops trailing blank
 * cells. Throws `AppError('invalid-data')` when the tab has no rows or its header has no
 * `Title` column.
 */
export function parseRoadmapTab(
  rows: readonly (readonly string[])[],
): RoadmapTab {
  const [headerRow, ...bodyRows] = rows
  if (headerRow === undefined) {
    throw new AppError("invalid-data", { message: "The roadmap tab is empty" })
  }
  const problems: TabProblemLog = new ProblemLog()
  const header = readHeader(headerRow, problems)
  if (!header.english.has("Title")) {
    throw new AppError("invalid-data", {
      message: "The roadmap tab has no Title column",
    })
  }
  for (const column of OPTIONAL_COLUMNS) {
    if (!header.english.has(column)) {
      problems.record("missing-column", { column })
    }
  }

  const seenIds = new Set<string>()
  const items: RoadmapItem[] = []
  const itemRows: number[] = []
  bodyRows.forEach((cells, i) => {
    const row = new ItemRow(header, cells, i + 2, problems)
    const item = toItem(row, seenIds)
    if (item) {
      items.push(item)
      itemRows.push(row.row)
    }
  })
  return {
    items,
    rows: itemRows,
    columns: columnIndexes(header),
    problems: problems.sorted(),
  }
}

/** One spreadsheet row, trimmed, read through the header. */
class ItemRow {
  readonly #header: Header
  readonly #cells: readonly string[]
  readonly #problems: TabProblemLog
  readonly row: number

  constructor(
    header: Header,
    cells: readonly string[],
    row: number,
    problems: TabProblemLog,
  ) {
    this.#header = header
    this.#cells = cells
    this.row = row
    this.#problems = problems
  }

  /** Whether every column read is blank: the public site skips the row silently. */
  get isBlank(): boolean {
    return this.#header.readIndexes.every((index) => this.#at(index) === "")
  }

  hasColumn(column: Column): boolean {
    return this.#header.english.has(column)
  }

  read(column: Column): string {
    return this.#at(this.#header.english.get(column)?.index)
  }

  readWelsh(column: TextColumn): string {
    return this.#at(this.#header.welsh.get(column)?.index)
  }

  /** Records a problem with this row's cell in `column`. */
  record(code: RoadmapTabProblemCode, column: Column, value: string): void {
    this.#recordAt(code, this.#header.english.get(column), column, value)
  }

  /** Records a problem with this row's cell in `column`'s Welsh column. */
  recordWelsh(
    code: RoadmapTabProblemCode,
    column: TextColumn,
    value: string,
  ): void {
    this.#recordAt(code, this.#header.welsh.get(column), column, value)
  }

  #recordAt(
    code: RoadmapTabProblemCode,
    cell: HeaderCell | undefined,
    column: Column,
    value: string,
  ): void {
    this.#problems.record(code, {
      row: this.row,
      column: cell?.header ?? column,
      value,
    })
  }

  #at(index: number | undefined): string {
    return index === undefined ? "" : (this.#cells[index] ?? "").trim()
  }
}

/** Reads one row's item, or returns `null` for a blank row or one with no title. */
function toItem(row: ItemRow, seenIds: Set<string>): RoadmapItem | null {
  if (row.isBlank) return null
  const title = row.read("Title")
  if (title === "") {
    row.record("missing-title", "Title", "")
    return null
  }
  return {
    id: readId(row, seenIds),
    title: { en: title, cy: row.readWelsh("Title") },
    ...readPlacement(row),
    description: readText(row, "Description"),
    expectedOutcome: readText(row, "Outcome"),
    phase: readText(row, "Phase"),
    tags: readTags(row),
    organisations: readOrganisations(row),
    details: readDetails(row),
  }
}

/**
 * The row's ID, compared exactly: it is a machine-made token. A repeat of an earlier kept
 * row's ID is recorded and left out, so the first row keeps it.
 */
function readId(row: ItemRow, seenIds: Set<string>): string | null {
  const id = row.read("Item ID")
  if (id === "") return null
  if (seenIds.has(id)) {
    row.record("duplicate-item-id", "Item ID", id)
    return null
  }
  seenIds.add(id)
  return id
}

/** An unrecognised horizon leaves the item unplaced, keeping what was written. */
function readPlacement(
  row: ItemRow,
): Pick<RoadmapItem, "placement" | "writtenHorizon"> {
  const written = row.read("Horizon")
  const placement = PLACEMENTS_BY_KEY.get(matchKey(written))
  if (placement !== undefined) return { placement, writtenHorizon: null }
  if (row.hasColumn("Horizon")) {
    const code = written === "" ? "missing-horizon" : "unknown-horizon"
    row.record(code, "Horizon", written)
  }
  return { placement: null, writtenHorizon: written }
}

/** The English and Welsh of a text column; Welsh with no English is dropped. */
function readCells(row: ItemRow, column: TextColumn): LocalisedText {
  const en = row.read(column)
  const cy = row.readWelsh(column)
  if (en === "" && cy !== "") {
    row.recordWelsh("welsh-without-english", column, cy)
    return { en, cy: "" }
  }
  return { en, cy }
}

/** Optional text: `null` with no English. */
function readText(row: ItemRow, column: TextColumn): LocalisedText | null {
  const text = readCells(row, column)
  return text.en === "" ? null : text
}

/** Comma or line separated; blank and repeated English tags are dropped after pairing. */
function readTags(row: ItemRow): LocalisedText[] {
  const { en, cy } = readCells(row, "Labels")
  const seen = new Set<string>()
  return pairByPosition(
    row,
    "Labels",
    cy,
    splitEntries(en, LIST_SEPARATOR),
    splitEntries(cy, LIST_SEPARATOR).map(orBlank),
  ).filter((tag) => {
    if (tag.en === "" || seen.has(tag.en)) return false
    seen.add(tag.en)
    return true
  })
}

/** Comma or line separated codes, in `ORGANISATIONS` order; unknown codes left out. */
function readOrganisations(row: ItemRow): Organisation[] {
  const found = new Set<Organisation>()
  for (const value of splitEntries(row.read("Organisations"), LIST_SEPARATOR)) {
    if (value === "") continue
    const organisation = ORGANISATIONS_BY_KEY.get(matchKey(value))
    if (organisation === undefined) {
      row.record("unknown-organisation", "Organisations", value)
    } else {
      found.add(organisation)
    }
  }
  return ORGANISATIONS.filter((organisation) => found.has(organisation))
}

/**
 * One entry per line; each leading `-` nests it a level deeper. A Welsh line takes its
 * nesting from the English line in the same position. Blank entries are dropped after
 * pairing.
 */
function readDetails(row: ItemRow): RoadmapItemDetail[] {
  const { en, cy } = readCells(row, "Details")
  const lines = splitEntries(en, LINE_SEPARATOR)
  const levels = lines.map(levelOf)
  const texts = pairByPosition(
    row,
    "Details",
    cy,
    lines.map((line) => line.replace(/^-+\s*/, "")),
    splitEntries(cy, LINE_SEPARATOR).map((line, index) =>
      stripWelshDashes(line, levels[index] ?? 0),
    ),
  )
  return texts.flatMap((text, index) =>
    text.en === "" ? [] : [{ text, level: levels[index] ?? 0 }],
  )
}

const LIST_SEPARATOR = /[,\n]/
const LINE_SEPARATOR = /\r?\n/

/**
 * Splits a cell into trimmed entries. Blank entries keep their place so the languages
 * line up; only trailing blanks (such as a trailing comma) are dropped.
 */
function splitEntries(text: string, separator: RegExp): string[] {
  const entries = text.split(separator).map((entry) => entry.trim())
  while (entries.at(-1) === "") entries.pop()
  return entries
}

/**
 * Pairs English and Welsh entries by position; a blank Welsh entry shows the English.
 * When the counts differ the Welsh can't be matched up, so it is ignored and recorded.
 */
function pairByPosition(
  row: ItemRow,
  column: "Labels" | "Details",
  welshCell: string,
  en: readonly string[],
  cy: readonly string[],
): LocalisedText[] {
  const matched = cy.length === 0 || cy.length === en.length
  if (!matched) {
    row.recordWelsh("welsh-count-mismatch", column, welshCell)
  }
  return en.map((text, index) => ({
    en: text,
    cy: matched ? (cy[index] ?? "") : "",
  }))
}

/** A Welsh entry of only dashes means "use the English here". */
const orBlank = (text: string) => (/^-*$/.test(text) ? "" : text)

const levelOf = (line: string) => /^-*/.exec(line)?.[0].length ?? 0

/**
 * Strips nesting dashes from a Welsh line: any dashes followed by a space, or up to as
 * many as the English line has, so `-5 gradd` under a top-level line keeps its dash.
 */
const stripWelshDashes = (line: string, level: number) =>
  orBlank(
    /^-+\s/.test(line)
      ? line.replace(/^-+\s+/, "")
      : line.slice(Math.min(level, levelOf(line))),
  )
