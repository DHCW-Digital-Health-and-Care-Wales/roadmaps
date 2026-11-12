import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "@/domain/roadmap/publish-plan"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  EditableItemField,
  RoadmapTextField,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  CO_LEAD_VALUE,
  type ContractWrite,
} from "@/domain/roadmap/testing/contract-write"
import { categoriesOf, familiesOf } from "@/domain/roadmap/testing/linked-lists"
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
}

export interface InMemoryRoadmapRepository extends RoadmapRepository {
  /**
   * A co-lead's change in the data source, which later calls read: `edit` may change
   * the roadmaps listed, and the items of any roadmap that has some, in place.
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
 * Pass an `AppError` instead of roadmaps to make every call fail with it. A publish
 * changes what later calls read, by the same rules as the Google adapter (ADR-012).
 */
export function createInMemoryRoadmapRepository(
  source: readonly Roadmap[] | AppError = [],
  items: InMemoryRoadmapItems = {},
  {
    write,
    families = source instanceof AppError ? [] : familiesOf(source),
    categories = source instanceof AppError ? [] : categoriesOf(source),
  }: InMemoryRoadmapRepositoryOptions = {},
): InMemoryRoadmapRepository {
  const roadmaps =
    source instanceof AppError ? source : structuredClone([...source])
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
    return stored
  }

  /** As the Google adapter's `snapshotOf` reads rows; the shared contract holds both. */
  const snapshotOf = (
    list: readonly Roadmap[],
    roadmapId: string,
  ): RoadmapSnapshot | null => {
    const roadmap = list.find(({ id }) => id === roadmapId)
    if (roadmap === undefined) return null
    const stored = storedItems(roadmapId)
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
      if (item) setItemText(item, field, value)
    }
    for (const { index, id } of writes.ids) {
      const item = stored[index]
      if (item) item.id = id
    }
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
    if (firstItem && item) setItemText(item, firstItem.field, CO_LEAD_VALUE)
  }

  return {
    coLead(edit) {
      if (roadmaps instanceof AppError) throw roadmaps
      edit(roadmaps, storedItems)
    },
    listRoadmaps: ({ signal } = {}) =>
      respond(signal, (list) => {
        if (rereadFails) throw new AppError("network")
        return list.map((roadmap) => structuredClone(roadmap))
      }),
    listFamilies: ({ signal } = {}) =>
      respond(signal, () => cloneList(lists.families)),
    listCategories: ({ signal } = {}) =>
      respond(signal, () => cloneList(lists.categories)),
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
        const snapshot = snapshotOf(list, roadmapId)
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
        switch (heldWrites(plan.writes, snapshotOf(list, roadmapId))) {
          case "all":
            return { status: "published" as const }
          case "none":
            throw new AppError("network")
          case "some":
            return { status: "unconfirmed" as const }
        }
      }),
  }
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
}

/** Sets a roadmap's category as a later read gives it. */
function setCategory(roadmap: Roadmap, category: Category | null): void {
  roadmap.categoryId = category?.id ?? null
  roadmap.category = category ? { ...category.name } : null
}

/** Sets a roadmap's English as a later read gives it: blank optional text is none. */
function setRoadmapText(
  roadmap: Roadmap,
  field: RoadmapTextField,
  value: string,
): void {
  switch (field) {
    case "title":
      roadmap.title = { ...roadmap.title, en: value }
      return
    case "productLead":
      roadmap.productLead = value === "" ? null : value
      return
    default:
      roadmap[field] =
        value === "" ? null : { en: value, cy: roadmap[field]?.cy ?? "" }
  }
}

/** Sets an item's English as a later read gives it: blank optional text is none. */
function setItemText(
  item: RoadmapItem,
  field: EditableItemField,
  value: string,
): void {
  if (field === "title") {
    item.title = { ...item.title, en: value }
  } else {
    item[field] = value === "" ? null : { en: value, cy: item[field]?.cy ?? "" }
  }
}

function cloneList<T>(list: readonly T[] | null): T[] | null {
  return list?.map((entry) => structuredClone(entry)) ?? null
}
