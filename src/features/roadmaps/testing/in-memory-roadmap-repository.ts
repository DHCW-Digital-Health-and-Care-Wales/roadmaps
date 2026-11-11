import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { AppError } from "@/lib/errors"

/**
 * Each roadmap's items by roadmap id, or the `AppError` reading them fails with. A
 * listed roadmap with no entry has no items.
 */
export type InMemoryRoadmapItems = Readonly<
  Record<string, readonly RoadmapItem[] | AppError>
>

/**
 * A `RoadmapRepository` holding roadmaps and their items in memory (test code only).
 * Pass an `AppError` instead of roadmaps to make every call fail with it.
 */
export function createInMemoryRoadmapRepository(
  source: readonly Roadmap[] | AppError = [],
  items: InMemoryRoadmapItems = {},
): RoadmapRepository {
  /** Reads the roadmaps after a tick, as a real data source would, honouring `signal`. */
  const respond = <T>(
    signal: AbortSignal | undefined,
    read: (roadmaps: readonly Roadmap[]) => T,
  ) =>
    Promise.resolve().then(() => {
      signal?.throwIfAborted()
      if (source instanceof AppError) throw source
      return read(source)
    })

  return {
    listRoadmaps: ({ signal } = {}) =>
      respond(signal, (roadmaps) =>
        roadmaps.map((roadmap) => structuredClone(roadmap)),
      ),
    listRoadmapItems: (roadmapId, { signal } = {}) =>
      respond(signal, (roadmaps) => {
        if (!roadmaps.some(({ id }) => id === roadmapId)) {
          throw new AppError("not-found", {
            message: `No roadmap has the id ${roadmapId}`,
          })
        }
        const held = Object.hasOwn(items, roadmapId) ? items[roadmapId] : []
        if (held instanceof AppError) throw held
        return (held ?? []).map((item) => structuredClone(item))
      }),
  }
}
