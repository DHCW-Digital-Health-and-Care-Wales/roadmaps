import type { Roadmap } from "./roadmap"

export interface ListRoadmapsOptions {
  /** Cancels the underlying request; the promise then rejects with the abort reason. */
  signal?: AbortSignal | undefined
}

/**
 * The application's only view of where roadmaps come from (ADR-0002). Implementations
 * reject with an `AppError` for every data-source failure, except cancellation via
 * `signal`, which rejects with the signal's abort reason.
 */
export interface RoadmapRepository {
  /** Lists the visible roadmaps in the data source's own order. */
  listRoadmaps(options?: ListRoadmapsOptions): Promise<Roadmap[]>
}
