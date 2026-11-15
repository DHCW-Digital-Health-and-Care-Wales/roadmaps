/**
 * Publishing or unpublishing a roadmap (STY-035): its published state written at once,
 * apart from its pending edits, or with them when it is published ("Save and publish").
 * Decided against a fresh read of every index row with the roadmap's id. Pure, so every
 * `RoadmapRepository` applies the same rules; each finds the rows and their problems.
 */

import { AppError } from "@/lib/errors"

import type { LocalisedText } from "./localised-text"
import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "./publish-plan"
import type { Roadmap } from "./roadmap"
import type {
  EditableRoadmapField,
  FieldConflict,
  ItemChanges,
  RoadmapChanges,
} from "./roadmap-changes"

/**
 * Why publishing a roadmap would fail the public site's nightly sync, which then keeps
 * the previous site live for everyone (STY-035 S4). As data: the page words it.
 */
export type PublishProblem =
  /** Its row says its items are at `location`, and nothing is there. */
  | { code: "items-missing"; location: string }
  /** Its items at `location` have no column for this field. */
  | {
      code: "items-field-missing"
      location: string
      field: "title" | "placement"
    }
  /** Its colour is written with three digits, as `colour`. */
  | { code: "short-colour"; colour: string }
  /** Another published roadmap, `title`, has its id, so its web address (D4). */
  | { code: "id-taken"; title: LocalisedText }

/**
 * What to write: the roadmap published, with any pending edits ("Save and publish",
 * S5), or unpublished, its pending edits left pending (S7).
 */
export type PublishedStateChange =
  | { published: true; changes?: RoadmapChanges | undefined }
  | { published: false }

/** What publishing or unpublishing came to. Only `set` and `unconfirmed` wrote anything. */
export type PublishedStateOutcome =
  /** The roadmap is now published or not, as asked, with every pending edit sent. */
  | { status: "set" }
  /**
   * The write's answer never arrived and a re-read could not settle whether it was
   * applied (S10): the roadmap may have changed.
   */
  | { status: "unconfirmed" }
  /** No roadmap has the id now. */
  | { status: "roadmap-not-found" }
  /** It no longer holds what the page showed: this is how it is now. */
  | { status: "changed"; roadmap: Roadmap }
  /** Publishing it would fail the public site's sync (S4). */
  | { status: "unpublishable"; problems: PublishProblem[] }
  /** A co-lead's change conflicts with a pending edit, or an edited item is gone (S6). */
  | {
      status: "refused"
      conflicts: FieldConflict[]
      missingItems: ItemChanges[]
    }

/** One index row with the roadmap's id, as just read, kept by the list or not. */
export interface PublishedStateRow {
  roadmap: Roadmap
  /**
   * Its published state as written: exactly published (`Yes`), exactly not (`No`), or
   * `null` for anything else, such as blank or `yes`, which is overwritten (D9).
   */
  written: boolean | null
}

interface Settled {
  kind: "settled"
  outcome: PublishedStateOutcome
}

/** The row the page loaded, among those given, and what writing it needs. */
export interface FoundRow {
  kind: "found"
  /** Its place among the rows given. */
  index: number
  /** Its state is written: it doesn't already read exactly as asked (D9). */
  writeState: boolean
  /**
   * The public site's sync is checked: it is being published (S4). Unpublishing, or a
   * row a co-lead already published, is never checked (D2).
   */
  check: boolean
  /** Each other published row with its id, a problem when `check` is (D4). */
  taken: PublishProblem[]
}

/**
 * Finds the row the page loaded among `rows`, every index row with the roadmap's id in
 * row order: the first that holds what `loaded` showed, whatever its published state,
 * apart from fields with pending edits, which publishing settles (ADR-012). Settled when
 * none does (`changed`, with the roadmap the list now keeps), when there are none, or
 * when it already reads as asked and no pending edit is sent (D9).
 */
export function findPublishedStateRow(
  loaded: Roadmap,
  change: PublishedStateChange,
  rows: readonly PublishedStateRow[],
): Settled | FoundRow {
  const kept = rows.find(({ roadmap }) => roadmap.published) ?? rows[0]
  if (kept === undefined) {
    return { kind: "settled", outcome: { status: "roadmap-not-found" } }
  }
  const index = findLoadedRow(loaded, change, rows)
  const row = rows[index]
  if (row === undefined) {
    return {
      kind: "settled",
      outcome: { status: "changed", roadmap: kept.roadmap },
    }
  }
  const writeState = row.written !== change.published
  if (!writeState && !hasChanges(change)) {
    return { kind: "settled", outcome: { status: "set" } }
  }
  const check = change.published && writeState
  return {
    kind: "found",
    index,
    writeState,
    check,
    taken: check
      ? rows.flatMap(({ roadmap }, i) =>
          i !== index && roadmap.published
            ? [{ code: "id-taken" as const, title: roadmap.title }]
            : [],
        )
      : [],
  }
}

/**
 * The place among `rows` of the row that holds what `loaded` showed, from its own
 * cells: where its items are and every field but its published state and those with a
 * pending edit sent, which publishing settles (ADR-012). Of several, the one the list
 * kept when the page loaded it (ADR-009): for a published roadmap the first published,
 * so a disabled copy of a live row is never taken for it; else the first. `-1` for none.
 */
export function findLoadedRow(
  loaded: Roadmap,
  change: PublishedStateChange,
  rows: readonly PublishedStateRow[],
): number {
  const edited = editedFields(change)
  const holding = rows.flatMap(({ roadmap }, i) =>
    holdsLoaded(loaded, roadmap, edited) ? [i] : [],
  )
  const kept = loaded.published
    ? holding.find((i) => rows[i]?.roadmap.published)
    : undefined
  return kept ?? holding[0] ?? -1
}

/**
 * Whether the row's items must be read to plan the write: pending edits are sent, and
 * no problem found stops them being read.
 */
export function needsItems(
  found: FoundRow,
  change: PublishedStateChange,
  problems: readonly PublishProblem[],
): boolean {
  return (
    change.published &&
    change.changes !== undefined &&
    !(found.check && problems.some(blocksItems))
  )
}

/** What to send: the row's state, its pending edits, or both. */
export interface PublishedStateWrite {
  kind: "write"
  writeState: boolean
  /** `null` when no pending edit needs writing. */
  writes: PublishWrites | null
}

/**
 * Decides the write for the found row: refused when publishing it would fail the sync
 * as it would read after the write (`problems` are the row's own, as read, given when
 * `found.check`), or when its pending edits are refused as a publish of them is
 * (ADR-012). `snapshot` is the row's roadmap and items, read when `needsItems` says.
 */
export function planPublishedStateWrite(
  found: FoundRow,
  change: PublishedStateChange,
  problems: readonly PublishProblem[],
  snapshot: RoadmapSnapshot | null,
  createId?: () => string,
): Settled | PublishedStateWrite {
  const all = found.check ? [...problems, ...found.taken] : []
  if (all.some(blocksItems)) return unpublishable(all)

  let writes: PublishWrites | null = null
  if (change.published && change.changes !== undefined) {
    if (snapshot === null) {
      throw new AppError("unknown", {
        message: "Pending edits are planned over the row's items",
      })
    }
    const plan = planRoadmapPublish(change.changes, snapshot, createId)
    if (plan.kind === "write") writes = plan.writes
    else if (plan.outcome.status === "refused") {
      return { kind: "settled", outcome: plan.outcome }
    }
  }

  const remaining = all.filter((problem) => !fixedBy(problem, writes))
  if (remaining.length > 0) return unpublishable(remaining)
  if (!found.writeState && writes === null) {
    return { kind: "settled", outcome: { status: "set" } }
  }
  return { kind: "write", writeState: found.writeState, writes }
}

/**
 * How much of `write` the row now holds, to settle a write whose answer was lost (S10):
 * `row` is the row found again by `findLoadedRow`, if any, and
 * `snapshot` its roadmap and items, read when pending edits were sent.
 */
export function heldPublishedState(
  change: PublishedStateChange,
  write: PublishedStateWrite,
  row: PublishedStateRow | undefined,
  snapshot: RoadmapSnapshot | null,
): "all" | "none" | "some" {
  if (row === undefined) return "some"
  const held: ("all" | "none" | "some")[] = []
  if (write.writeState) {
    held.push(row.written === change.published ? "all" : "none")
  }
  if (write.writes !== null) held.push(heldWrites(write.writes, snapshot))
  if (held.every((part) => part === "all")) return "all"
  if (held.every((part) => part === "none")) return "none"
  return "some"
}

/** The roadmap fields with a pending edit sent. */
function editedFields(
  change: PublishedStateChange,
): ReadonlySet<EditableRoadmapField> {
  if (!change.published || change.changes === undefined) return new Set()
  const { roadmap } = change.changes
  return new Set(
    (Object.keys(roadmap) as EditableRoadmapField[]).filter(
      (field) => roadmap[field] !== undefined,
    ),
  )
}

/** Whether any pending edit is sent: a field of the roadmap's, of an item's, or a new item. */
function hasChanges(change: PublishedStateChange): boolean {
  if (!change.published || change.changes === undefined) return false
  const { items, newItems } = change.changes
  return (
    editedFields(change).size > 0 || items.length > 0 || newItems.length > 0
  )
}

/**
 * Whether `current` holds what `loaded` showed, but for its state and `edited`: an
 * edited field is left out whole, Welsh too, as a conflict compares only its English.
 */
function holdsLoaded(
  loaded: Roadmap,
  current: Roadmap,
  edited: ReadonlySet<EditableRoadmapField>,
): boolean {
  const text = (
    field: "title" | "statusLabel" | "vision" | "serviceDescription",
  ) => edited.has(field) || sameText(loaded[field], current[field])
  const family =
    edited.has("familyId") ||
    (loaded.familyId === current.familyId &&
      sameText(loaded.copied.family, current.copied.family) &&
      loaded.copied.colour === current.copied.colour)
  const category =
    edited.has("categoryId") ||
    (loaded.categoryId === current.categoryId &&
      loaded.copied.category === current.copied.category)
  return (
    loaded.itemsLocation === current.itemsLocation &&
    text("title") &&
    text("statusLabel") &&
    text("vision") &&
    text("serviceDescription") &&
    (edited.has("productLead") || loaded.productLead === current.productLead) &&
    (edited.has("lastUpdated") || loaded.lastUpdated === current.lastUpdated) &&
    family &&
    category
  )
}

function sameText(a: LocalisedText | null, b: LocalisedText | null): boolean {
  return a?.en === b?.en && a?.cy === b?.cy
}

/** A problem that stops the row's items being read, so no pending edit is planned. */
function blocksItems(problem: PublishProblem): boolean {
  return (
    problem.code === "items-missing" ||
    (problem.code === "items-field-missing" && problem.field === "title")
  )
}

/**
 * Whether `writes` clears the problem: a family chosen writes its six-digit colour, and
 * a placement written, a moved item's or a new item's, adds the missing column for it
 * (ADR-012).
 */
function fixedBy(problem: PublishProblem, writes: PublishWrites | null) {
  if (writes === null) return false
  switch (problem.code) {
    case "short-colour":
      return writes.roadmap.some(
        ({ field, value }) => field === "familyId" && value !== "",
      )
    case "items-field-missing":
      return (
        problem.field === "placement" &&
        (writes.newItems.length > 0 ||
          writes.items.some(({ field }) => field === "placement"))
      )
    default:
      return false
  }
}

function unpublishable(problems: PublishProblem[]): Settled {
  return { kind: "settled", outcome: { status: "unpublishable", problems } }
}
