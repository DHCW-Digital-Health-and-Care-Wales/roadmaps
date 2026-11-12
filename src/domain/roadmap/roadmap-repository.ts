import type { Category } from "./category"
import type { Family } from "./family"
import type { Roadmap } from "./roadmap"
import type { PublishOutcome, RoadmapChanges } from "./roadmap-changes"
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
   * Lists the product families, in the list's order (ADR-013); `null` when the data
   * source has no usable family list, so families can't be managed or chosen.
   */
  listFamilies(options?: RepositoryReadOptions): Promise<Family[] | null>
  /**
   * Lists the categories, in the list's order (ADR-013); `null` when the data source has
   * no usable category list, so categories can't be chosen.
   */
  listCategories(options?: RepositoryReadOptions): Promise<Category[] | null>
  /**
   * Lists one roadmap's items, published or not, in its own order (ADR-011). Rejects
   * with `AppError('not-found')` when no roadmap has the id, and with
   * `AppError('invalid-data')` when that roadmap's items can't be read.
   */
  listRoadmapItems(
    roadmapId: string,
    options?: RepositoryReadOptions,
  ): Promise<RoadmapItem[]>
  /**
   * Publishes one roadmap's pending changes, all or nothing (ADR-012): re-reads the
   * roadmap, then writes every changed field and an ID for each item without one, unless
   * a co-lead's change conflicts or something edited is gone. Rejects with
   * `AppError('invalid-data')` when the roadmap's items can't be read, as
   * `listRoadmapItems` does, and never retries. `signal` cancels only the reads: once the
   * write is sent, the call waits for its answer.
   */
  publishRoadmapChanges(
    roadmapId: string,
    changes: RoadmapChanges,
    options?: RepositoryReadOptions,
  ): Promise<PublishOutcome>
}
