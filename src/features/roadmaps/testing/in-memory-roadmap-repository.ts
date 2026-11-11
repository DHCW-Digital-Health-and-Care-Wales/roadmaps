import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "@/domain/roadmap/publish-plan"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type {
  EditableItemField,
  EditableRoadmapField,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  CO_LEAD_VALUE,
  type ContractWrite,
} from "@/domain/roadmap/testing/roadmap-repository-contract"
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
}

/**
 * A `RoadmapRepository` holding roadmaps and their items in memory (test code only).
 * Pass an `AppError` instead of roadmaps to make every call fail with it. A publish
 * changes what later calls read, by the same rules as the Google adapter (ADR-012).
 */
export function createInMemoryRoadmapRepository(
  source: readonly Roadmap[] | AppError = [],
  items: InMemoryRoadmapItems = {},
  { write }: InMemoryRoadmapRepositoryOptions = {},
): RoadmapRepository {
  const roadmaps =
    source instanceof AppError ? source : structuredClone([...source])
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
    }
  }

  const apply = (roadmap: Roadmap, writes: PublishWrites) => {
    const stored = storedItems(roadmap.id)
    for (const { field, value } of writes.roadmap) {
      setRoadmapText(roadmap, field, value)
    }
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
      setRoadmapText(roadmap, first.field, CO_LEAD_VALUE)
      return
    }
    const [firstItem] = writes.items
    const item = firstItem && storedItems(roadmap.id)[firstItem.index]
    if (firstItem && item) setItemText(item, firstItem.field, CO_LEAD_VALUE)
  }

  return {
    listRoadmaps: ({ signal } = {}) =>
      respond(signal, (list) => {
        if (rereadFails) throw new AppError("network")
        return list.map((roadmap) => structuredClone(roadmap))
      }),
    listRoadmapItems: (roadmapId, { signal } = {}) =>
      respond(signal, (list) => {
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

/** Sets a roadmap's English as a later read gives it: blank optional text is none. */
function setRoadmapText(
  roadmap: Roadmap,
  field: EditableRoadmapField,
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
