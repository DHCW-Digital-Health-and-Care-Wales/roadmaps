import type { Category } from "./category"
import type { Family } from "./family"
import type { FamilyEdit, FamilyInput, FamilyOutcome } from "./family-changes"
import type { MatchOutcome } from "./list-match"
import type { NewRoadmapInput, NewRoadmapOutcome } from "./new-roadmap"
import type { Organisation } from "./organisation"
import type {
  PublishedStateChange,
  PublishedStateOutcome,
} from "./published-state"
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
   * Lists the organisations (ADR-014), in no promised order: a screen sorts them, national
   * ones first. Every id an item's `organisationIds` holds is in it. Rejects with an
   * `AppError` when the list can't be read.
   */
  listOrganisations(options?: RepositoryReadOptions): Promise<Organisation[]>
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
  /**
   * Adds a roadmap (STY-040), from input `checkNewRoadmapInput` passed: its entry at
   * the end of the roadmap list and an empty roadmap to hold its items, together or not
   * at all, not published. Re-reads first, as `planNewRoadmap` settles it, and writes
   * nothing when the short name is in use or a family or category chosen is no longer
   * listed. Rejects with `AppError('invalid-data')` when the data source has nothing
   * usable to start a roadmap from, and never retries. A write whose answer is lost is
   * settled by one re-read that looks for this very write (`settleLostNewRoadmap`);
   * `signal` cancels only the reads.
   */
  addRoadmap(
    input: NewRoadmapInput,
    options?: RepositoryReadOptions,
  ): Promise<NewRoadmapOutcome>
  /**
   * Adds a family to the end of the family list (ADR-013), from input `checkFamilyInput`
   * passed: a new ID, the English name and the colour, and no Welsh name. Re-reads the
   * list first: `name-taken` when another family now has the name. Rejects with
   * `AppError('invalid-data')` when the data source has no usable family list. A write
   * whose answer is lost is settled by a re-read, as a publish's is; `signal` cancels
   * only the reads.
   */
  addFamily(
    input: FamilyInput,
    options?: RepositoryReadOptions,
  ): Promise<FamilyOutcome>
  /**
   * Renames or recolours a family and, in the same all-or-nothing write, every roadmap
   * in it, whose family name and colour are copied from the list (ADR-013); the Welsh
   * name is never changed. Re-reads the list and the roadmaps first, as `planFamilyChange`
   * settles them. Rejects as `addFamily` does.
   */
  changeFamily(
    edit: FamilyEdit,
    options?: RepositoryReadOptions,
  ): Promise<FamilyOutcome>
  /**
   * Rewrites one roadmap's copied family and category cells from the lists (ADR-013,
   * STY-030), in one write, apart from its pending edits. Re-reads the roadmap and the
   * lists first, as `planListMatch` settles them against `loaded`, the roadmap as the
   * page showed it. Rejects with `AppError('invalid-data')` when the data source has no
   * usable family list; a write whose answer is lost is settled by a re-read, and
   * `signal` cancels only the reads.
   */
  matchRoadmapToLists(
    loaded: Roadmap,
    options?: RepositoryReadOptions,
  ): Promise<MatchOutcome>
  /**
   * Publishes or unpublishes a roadmap at once (STY-035), apart from its pending edits,
   * or with them when publishing, all or nothing as `publishRoadmapChanges` writes them.
   * Re-reads every index row with `loaded`'s id first, as `findPublishedStateRow` finds
   * the one the page showed, and refuses a publish the public site's sync would fail on
   * (`planPublishedStateWrite`). Rejects with `AppError('invalid-data')` when pending
   * edits are sent and the roadmap's items can't be read. A write whose answer is lost
   * is settled by a re-read; `signal` cancels only the reads.
   */
  setRoadmapPublished(
    loaded: Roadmap,
    change: PublishedStateChange,
    options?: RepositoryReadOptions,
  ): Promise<PublishedStateOutcome>
}
