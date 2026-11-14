import { isCalendarDate } from "@/domain/roadmap/calendar-date"
import { englishDetails } from "@/domain/roadmap/item-details"
import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import {
  familyHeld,
  planFamilyChange,
  planNewFamily,
  type FamilyOutcome,
} from "@/domain/roadmap/family-changes"
import { planListMatch } from "@/domain/roadmap/list-match"
import {
  planNewRoadmap,
  settleLostNewRoadmap,
  type NewRoadmapOutcome,
} from "@/domain/roadmap/new-roadmap"
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
  type PublishedStateOutcome,
  type PublishedStateRow,
  type PublishProblem,
} from "@/domain/roadmap/published-state"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  type EditableItemField,
  type EditableRoadmapField,
  organisationIdsOf,
  type RoadmapChoiceField,
  tagsOf,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  CO_LEAD_VALUE,
  type ContractWrite,
} from "@/domain/roadmap/testing/contract-write"
import { categoriesOf, familiesOf } from "@/domain/roadmap/testing/linked-lists"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"
import type { SyncFault } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { inStep } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"

/**
 * Each roadmap's items by roadmap id, or the `AppError` reading them fails with. A
 * listed roadmap with no entry has no items. Items may repeat an ID, as copied rows do;
 * reads give a repeat no ID, as the Google adapter does.
 */
export type InMemoryRoadmapItems = Readonly<
  Record<string, readonly RoadmapItem[] | AppError>
>

export interface InMemoryRoadmapRepositoryOptions {
  /** How a publish's write goes; defaults to writes that succeed. */
  write?: ContractWrite | undefined
  /** Defaults to the families the roadmaps are linked to; `null`: no family list. */
  families?: readonly Family[] | null | undefined
  /** Defaults to the categories the roadmaps are linked to; `null`: no category list. */
  categories?: readonly Category[] | null | undefined
  /**
   * Defaults to `TEST_ORGANISATIONS`, served in the order given; an `AppError` makes
   * reading the list fail with it.
   */
  organisations?: readonly Organisation[] | AppError | undefined
  /**
   * What would fail the public site's sync were a roadmap published, by roadmap id
   * (STY-035 S4); a roadmap whose items are an `AppError` has no tab. Without a title
   * column its items can't be read.
   */
  syncFaults?: Readonly<Record<string, readonly SyncFault[]>> | undefined
  /** Nothing usable to start a roadmap from: adding one fails (STY-040 S6). */
  noStartingPoint?: boolean | undefined
  /** Names kept for something else, which no roadmap's short name may take (STY-040 S4). */
  otherNames?: readonly string[] | undefined
}

export interface InMemoryRoadmapRepository extends RoadmapRepository {
  /**
   * A co-lead's change in the data source, which later calls read: `edit` may change
   * the roadmap index's rows, and the items of any roadmap that has some, in place.
   */
  readonly coLead: (
    edit: (
      roadmaps: Roadmap[],
      itemsOf: (roadmapId: string) => RoadmapItem[],
    ) => void,
  ) => void
}

/**
 * A `RoadmapRepository` holding roadmaps and their items in memory (test code only).
 * `source` is the roadmap index's rows: several may share an id, a draft beside its
 * live roadmap, and the list keeps one per id, as ADR-009 does. Pass an `AppError`
 * instead of roadmaps to make every call fail with it. A publish
 * changes what later calls read, by the same rules as the Google adapter (ADR-012). It
 * serves `TEST_ORGANISATIONS`; a hand-made double needs `listOrganisations` too, as a
 * roadmap's items show only once the list is read, so a bare `vi.fn()` leaves the page
 * loading.
 */
export function createInMemoryRoadmapRepository(
  source: readonly Roadmap[] | AppError = [],
  items: InMemoryRoadmapItems = {},
  {
    write,
    families = source instanceof AppError ? [] : familiesOf(source),
    categories = source instanceof AppError ? [] : categoriesOf(source),
    organisations = TEST_ORGANISATIONS,
    syncFaults = {},
    noStartingPoint = false,
    otherNames = [],
  }: InMemoryRoadmapRepositoryOptions = {},
): InMemoryRoadmapRepository {
  const roadmaps =
    source instanceof AppError
      ? source
      : // Each row cloned apart: a test may pass one roadmap twice, as a copied row.
        source.map((row) => structuredClone(row))
  const lists = {
    families: cloneList(families),
    categories: cloneList(categories),
  }
  const held = new Map(
    Object.entries(items).map(([id, value]) => [
      id,
      // Each item cloned apart: a test may pass one item twice, as a copied row.
      value instanceof AppError
        ? value
        : value.map((item) => structuredClone(item)),
    ]),
  )
  let rereadFails = false
  /**
   * A row's published state as written, where it isn't `Yes` or `No` by `published`:
   * a co-lead's text over it (D9).
   */
  const writtenOver = new WeakMap<Roadmap, null>()

  /** Reads the roadmaps after a tick, as a real data source would, honouring `signal`. */
  const respond = <T>(
    signal: AbortSignal | undefined,
    read: (roadmaps: Roadmap[]) => T,
  ) =>
    Promise.resolve().then(() => {
      signal?.throwIfAborted()
      if (roadmaps instanceof AppError) throw roadmaps
      return read(roadmaps)
    })

  /** The roadmap's items as stored (a repeated ID kept), or throws as a read does. */
  const storedItems = (roadmapId: string): RoadmapItem[] => {
    const stored = held.get(roadmapId) ?? []
    if (stored instanceof AppError) throw stored
    if (syncFaults[roadmapId]?.includes("no-title-column")) {
      throw new AppError("invalid-data", { message: "No Title column" })
    }
    return stored
  }

  /** As the Google adapter's `snapshotOf` reads rows; the shared contract holds both. */
  const snapshotOf = (roadmap: Roadmap | undefined): RoadmapSnapshot | null => {
    if (roadmap === undefined) return null
    const stored = storedItems(roadmap.id)
    const read = readItems(stored)
    return {
      roadmap,
      items: read,
      repeatedIds: new Set(
        stored.flatMap(({ id }, i) =>
          id !== null && read[i]?.id === null ? [id] : [],
        ),
      ),
      takenIds: new Set(stored.flatMap(({ id }) => (id === null ? [] : [id]))),
      missingLists: new Set([
        ...(lists.families === null ? (["familyId"] as const) : []),
        ...(lists.categories === null ? (["categoryId"] as const) : []),
      ]),
      organisationIds: new Set(
        organisations instanceof AppError
          ? []
          : organisations.map(({ id }) => id),
      ),
    }
  }

  /** As the Google adapter copies a chosen family or category from its list (ADR-013). */
  const listed = <T extends { id: string }>(
    list: readonly T[] | null,
    id: string,
  ): T | null => {
    if (id === "") return null
    const found = list?.find((each) => each.id === id)
    if (found === undefined) throw new AppError("invalid-data")
    return found
  }

  const apply = (roadmap: Roadmap, writes: PublishWrites) => {
    const stored = storedItems(roadmap.id)
    // Each resolved first, so an unlisted choice fails the publish before anything is written.
    const setters = writes.roadmap.map(({ field, value }) => {
      if (field === "familyId") {
        const family = listed(lists.families, value)
        return () => {
          setFamily(roadmap, family)
        }
      }
      if (field === "categoryId") {
        const category = listed(lists.categories, value)
        return () => {
          setCategory(roadmap, category)
        }
      }
      return () => {
        setRoadmapText(roadmap, field, value)
      }
    })
    for (const set of setters) set()
    for (const { index, field, value } of writes.items) {
      const item = stored[index]
      if (item) setItemValue(item, field, value)
    }
    for (const { index, id } of writes.ids) {
      const item = stored[index]
      if (item) item.id = id
    }
  }

  /** A row as `findPublishedStateRow` reads it. */
  const stateRow = (roadmap: Roadmap): PublishedStateRow => ({
    roadmap,
    written: writtenOver.has(roadmap) ? null : roadmap.published,
  })

  /** As the Google adapter finds what the public site's sync would fail on (S4). */
  const problemsOf = (roadmap: Roadmap): PublishProblem[] => {
    const location = roadmap.id
    if (held.get(roadmap.id) instanceof AppError) {
      return [{ code: "items-missing", location }]
    }
    const faults = syncFaults[roadmap.id] ?? []
    return [
      ...(faults.includes("no-title-column")
        ? [{ code: "items-field-missing", location, field: "title" } as const]
        : []),
      ...(faults.includes("no-horizon-column")
        ? [
            {
              code: "items-field-missing",
              location,
              field: "placement",
            } as const,
          ]
        : []),
      ...(faults.includes("short-colour")
        ? [
            {
              code: "short-colour",
              colour: shortColour(roadmap.copied.colour),
            } as const,
          ]
        : []),
    ]
  }

  /** A co-lead's change to the first value written, after the write landed. */
  const overwriteFirst = (roadmap: Roadmap, writes: PublishWrites) => {
    const [first] = writes.roadmap
    if (first !== undefined) {
      if (first.field === "familyId" || first.field === "categoryId") {
        roadmap[first.field] = CO_LEAD_VALUE
      } else {
        setRoadmapText(roadmap, first.field, CO_LEAD_VALUE)
      }
      return
    }
    const [firstItem] = writes.items
    const item = firstItem && storedItems(roadmap.id)[firstItem.index]
    if (!firstItem || !item) return
    if (firstItem.field === "organisationIds") {
      // As the Google adapter reads a cell a co-lead typed over: a code it doesn't know.
      item.organisationIds = []
      item.unknownOrganisationCodes = [CO_LEAD_VALUE]
    } else {
      setItemValue(item, firstItem.field, CO_LEAD_VALUE)
    }
  }

  /**
   * Writes a family change as a `batchUpdate` would, by `write`: an unconfirmed lost
   * write throws `network`, since a family change has no partial outcome.
   */
  const writeFamily = (family: Family, apply: () => void): FamilyOutcome => {
    if (write !== undefined && "fails" in write) throw new AppError(write.fails)
    if (write?.lost !== "not-applied") apply()
    if (write === undefined) return { status: "saved", family }
    if (write.lost === "reread-fails") rereadFails = true
    if (rereadFails || !familyHeld(family, lists.families)) {
      throw new AppError("network")
    }
    return { status: "saved", family }
  }

  /** The family list, or `invalid-data` without one, as the Google adapter refuses. */
  const familyList = (): Family[] => {
    if (lists.families === null) {
      throw new AppError("invalid-data", { message: "No family list" })
    }
    return lists.families
  }

  return {
    coLead(edit) {
      if (roadmaps instanceof AppError) throw roadmaps
      edit(roadmaps, storedItems)
    },
    listRoadmaps: ({ signal } = {}) =>
      respond(signal, (list) => {
        if (rereadFails) throw new AppError("network")
        return keptRows(list).map((roadmap) => structuredClone(roadmap))
      }),
    listFamilies: ({ signal } = {}) =>
      respond(signal, () => cloneList(lists.families)),
    listCategories: ({ signal } = {}) =>
      respond(signal, () => cloneList(lists.categories)),
    listOrganisations: ({ signal } = {}) =>
      respond(signal, () => {
        if (organisations instanceof AppError) throw organisations
        return structuredClone([...organisations])
      }),
    listRoadmapItems: (roadmapId, { signal } = {}) =>
      respond(signal, (list) => {
        if (rereadFails) throw new AppError("network")
        if (!list.some(({ id }) => id === roadmapId)) {
          throw new AppError("not-found", {
            message: `No roadmap has the id ${roadmapId}`,
          })
        }
        return readItems(storedItems(roadmapId)).map((item) =>
          structuredClone(item),
        )
      }),
    publishRoadmapChanges: (roadmapId, changes, { signal } = {}) =>
      respond(signal, (list) => {
        const snapshot = snapshotOf(kept(list, roadmapId))
        const plan = planRoadmapPublish(changes, snapshot)
        if (plan.kind === "settled") return plan.outcome
        // A plan to write is made only over a snapshot.
        const roadmap = snapshot?.roadmap
        if (roadmap === undefined) throw new AppError("unknown")
        signal?.throwIfAborted()

        if (write !== undefined && "fails" in write) {
          throw new AppError(write.fails)
        }
        if (write?.lost !== "not-applied") apply(roadmap, plan.writes)
        if (write === undefined) return { status: "published" as const }
        if (write.lost === "partly-applied")
          overwriteFirst(roadmap, plan.writes)
        if (write.lost === "reread-fails") {
          rereadFails = true
          return { status: "unconfirmed" as const }
        }
        switch (heldWrites(plan.writes, snapshotOf(kept(list, roadmapId)))) {
          case "all":
            return { status: "published" as const }
          case "none":
            throw new AppError("network")
          case "some":
            return { status: "unconfirmed" as const }
        }
      }),
    addRoadmap: (input, { signal } = {}) =>
      respond(signal, (list): NewRoadmapOutcome => {
        if (noStartingPoint) {
          throw new AppError("invalid-data", {
            message: "Nothing to start a roadmap from",
          })
        }
        /** Every name in use: those its roadmaps' items are under, and those kept apart. */
        const inUse = () => ({
          roadmaps: list,
          names: [
            ...list.map(({ itemsLocation }) => itemsLocation),
            ...otherNames,
          ],
        })
        const plan = planNewRoadmap(input, { ...inUse(), ...lists })
        if (plan.kind === "settled") return plan.outcome
        signal?.throwIfAborted()

        if (write !== undefined && "fails" in write) {
          throw new AppError(write.fails)
        }
        const row = structuredClone(plan.roadmap)
        if (write?.lost !== "not-applied") list.push(row)
        if (write === undefined) {
          return { status: "added", roadmap: plan.roadmap }
        }
        if (write.lost === "reread-fails") {
          rereadFails = true
          return { status: "unconfirmed" }
        }
        const settled = settleLostNewRoadmap(
          plan.roadmap,
          list.includes(row),
          inUse(),
        )
        if (settled === null) throw new AppError("network")
        return settled
      }),
    addFamily: (input, { signal } = {}) =>
      respond(signal, () => {
        const families = familyList()
        const plan = planNewFamily(input, families)
        if (plan.kind === "settled") return plan.outcome
        return writeFamily(plan.family, () => {
          families.push(structuredClone(plan.family))
        })
      }),
    changeFamily: (edit, { signal } = {}) =>
      respond(signal, (list) => {
        const families = familyList()
        const plan = planFamilyChange(edit, { families, roadmaps: list })
        if (plan.kind === "settled") return plan.outcome
        const { family, members } = plan
        return writeFamily(family, () => {
          const at = families.findIndex(({ id }) => id === family.id)
          families[at] = structuredClone(family)
          for (const roadmap of members) setFamily(roadmap, family)
        })
      }),
    matchRoadmapToLists: (loaded, { signal } = {}) =>
      respond(signal, (list) => {
        familyList()
        const current = kept(list, loaded.id)
        const plan = planListMatch(loaded, current)
        if (plan.kind === "settled") {
          return plan.outcome.status === "changed"
            ? {
                ...plan.outcome,
                roadmap: structuredClone(plan.outcome.roadmap),
              }
            : plan.outcome
        }
        // A plan to write is made only over a listed roadmap.
        if (current === undefined) throw new AppError("unknown")
        if (write !== undefined && "fails" in write) {
          throw new AppError(write.fails)
        }
        // Its shown values are the lists' already: matching clears the flag.
        if (write?.lost !== "not-applied") {
          current.outOfStep = false
          current.copied = inStep(current).copied
        }
        if (write === undefined) return { status: "matched" as const }
        if (write.lost === "reread-fails") rereadFails = true
        if (rereadFails || current.outOfStep) throw new AppError("network")
        return { status: "matched" as const }
      }),
    setRoadmapPublished: (loaded, change, { signal } = {}) =>
      respond(signal, (list): PublishedStateOutcome => {
        const rowsOf = () => list.filter(({ id }) => id === loaded.id)
        const rows = rowsOf()
        const found = findPublishedStateRow(loaded, change, rows.map(stateRow))
        if (found.kind === "settled") return structuredClone(found.outcome)
        const row = rows[found.index]
        // The found row is one of those given.
        if (row === undefined) throw new AppError("unknown")
        const problems = found.check ? problemsOf(row) : []
        const plan = planPublishedStateWrite(
          found,
          change,
          problems,
          needsItems(found, change, problems) ? snapshotOf(row) : null,
        )
        if (plan.kind === "settled") return plan.outcome
        signal?.throwIfAborted()

        if (write !== undefined && "fails" in write) {
          throw new AppError(write.fails)
        }
        if (write?.lost !== "not-applied") {
          if (plan.writeState) {
            row.published = change.published
            writtenOver.delete(row)
          }
          if (plan.writes) apply(row, plan.writes)
        }
        if (write === undefined) return { status: "set" }
        if (write.lost === "partly-applied") {
          // A co-lead's text over the state, the first value written.
          if (plan.writeState) {
            row.published = false
            writtenOver.set(row, null)
          } else if (plan.writes) overwriteFirst(row, plan.writes)
        }
        if (write.lost === "reread-fails") {
          rereadFails = true
          return { status: "unconfirmed" }
        }
        const again = rowsOf()
        const at = again[findLoadedRow(loaded, change, again.map(stateRow))]
        switch (
          heldPublishedState(
            change,
            plan,
            at && stateRow(at),
            plan.writes ? snapshotOf(at) : null,
          )
        ) {
          case "all":
            return { status: "set" }
          case "none":
            throw new AppError("network")
          case "some":
            return { status: "unconfirmed" }
        }
      }),
  }
}

/** The rows the list keeps, in row order: per id, the first published, else the first. */
function keptRows(rows: readonly Roadmap[]): Roadmap[] {
  return rows.filter((row) => kept(rows, row.id) === row)
}

/** The row the list keeps for this id (ADR-009). */
function kept(rows: readonly Roadmap[], id: string): Roadmap | undefined {
  const withId = rows.filter((row) => row.id === id)
  return withId.find(({ published }) => published) ?? withId[0]
}

/** `#aabbcc` as the three-digit colour it expands from, `#abc`. */
function shortColour(colour: string | null): string {
  const [, r = "", , g = "", , b = ""] = colour ?? ""
  return `#${r}${g}${b}`
}

/** Items as a read gives them: a repeat of an earlier item's ID has no ID. */
function readItems(stored: readonly RoadmapItem[]): RoadmapItem[] {
  const seen = new Set<string>()
  return stored.map((item) => {
    if (item.id === null) return item
    if (seen.has(item.id)) return { ...item, id: null }
    seen.add(item.id)
    return item
  })
}

/**
 * Sets a roadmap's family as a later read gives it: the family's names and colour, or,
 * for none, no family and the colour left as it was.
 */
function setFamily(roadmap: Roadmap, family: Family | null): void {
  roadmap.familyId = family?.id ?? null
  roadmap.family = family ? { ...family.name } : null
  roadmap.familyNotListed = false
  if (family) roadmap.colour = family.colour
  // The row's copies are written with it (ADR-013).
  roadmap.copied.family = roadmap.family
  roadmap.copied.colour = roadmap.colour
}

/** Sets a roadmap's category as a later read gives it. */
function setCategory(roadmap: Roadmap, category: Category | null): void {
  roadmap.categoryId = category?.id ?? null
  roadmap.category = category ? { ...category.name } : null
  roadmap.copied.category = roadmap.category?.en ?? ""
}

/**
 * Sets a roadmap's English or date as a later read gives it: blank optional text is
 * none, and so is a date that is no `YYYY-MM-DD` date, such as a co-lead's text.
 */
function setRoadmapText(
  roadmap: Roadmap,
  field: Exclude<EditableRoadmapField, RoadmapChoiceField>,
  value: string,
): void {
  switch (field) {
    case "title":
      roadmap.title = { ...roadmap.title, en: value }
      return
    case "productLead":
      roadmap.productLead = value === "" ? null : value
      return
    case "lastUpdated":
      roadmap.lastUpdated = isCalendarDate(value) ? value : null
      return
    default:
      roadmap[field] =
        value === "" ? null : { en: value, cy: roadmap[field]?.cy ?? "" }
  }
}

/**
 * Sets an item's English, placement, tags, organisations or details as a later read
 * gives it: blank optional text is none, a value no placement has leaves the item
 * unplaced with it as its horizon, written tags and details are English alone, and
 * written organisations hold known codes only.
 */
function setItemValue(
  item: RoadmapItem,
  field: EditableItemField,
  value: string,
): void {
  if (field === "placement") {
    const placed = isRoadmapPlacement(value)
    item.placement = placed ? value : null
    item.writtenHorizon = placed ? null : value
  } else if (field === "tags") {
    // The plan writes tags only to an item with no Welsh ones (STY-037 S22).
    item.tags = tagsOf(value).map((en) => ({ en, cy: "" }))
  } else if (field === "organisationIds") {
    item.organisationIds = organisationIdsOf(value)
    item.unknownOrganisationCodes = []
  } else if (field === "details") {
    // The plan writes details only to an item with no Welsh ones (STY-039 S19).
    item.details = englishDetails(value)
  } else if (field === "title") {
    item.title = { ...item.title, en: value }
  } else {
    item[field] = value === "" ? null : { en: value, cy: item[field]?.cy ?? "" }
  }
}

function cloneList<T>(list: readonly T[] | null): T[] | null {
  return list?.map((entry) => structuredClone(entry)) ?? null
}
