import type { Roadmap } from "./roadmap"
import type { RoadmapItem } from "./roadmap-item"

export interface RepositoryReadOptions {
  /** Cancels the underlying requests; the promise then rejects with the abort reason. */
  signal?: AbortSignal | undefined
}

/**
 * The application's only view of where roadmaps come from (ADR-002). Implementations
 * reject with an `AppError` for every data-source failure, except cancellation via
 * `signal`, which rejects with the signal's abort reason.
 */
export interface RoadmapRepository {
  /** Lists every roadmap the data source holds, published or not, in its own order. */
  listRoadmaps(options?: RepositoryReadOptions): Promise<Roadmap[]>
  /**
   * Lists one roadmap's items, published or not, in its own order (ADR-011). Rejects
   * with `AppError('not-found')` when no roadmap has the id, and with
   * `AppError('invalid-data')` when that roadmap's items can't be read.
   */
  listRoadmapItems(
    roadmapId: string,
    options?: RepositoryReadOptions,
  ): Promise<RoadmapItem[]>
}
