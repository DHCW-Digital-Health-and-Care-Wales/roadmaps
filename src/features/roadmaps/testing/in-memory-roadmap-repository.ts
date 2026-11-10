import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { AppError } from "@/lib/errors"

/**
 * A `RoadmapRepository` holding roadmaps in memory (test code only). Pass an `AppError`
 * instead of roadmaps to make every call fail with it.
 */
export function createInMemoryRoadmapRepository(
  source: readonly Roadmap[] | AppError = [],
): RoadmapRepository {
  return {
    listRoadmaps: ({ signal } = {}) =>
      Promise.resolve().then(() => {
        signal?.throwIfAborted()
        if (source instanceof AppError) throw source
        return source.map((roadmap) => ({ ...roadmap }))
      }),
  }
}
