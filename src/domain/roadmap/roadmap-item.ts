import type { LocalisedText } from "./localised-text"
import type { RoadmapPlacement } from "./roadmap-placement"

/** One entry of a roadmap item's details. */
export interface RoadmapItemDetail {
  text: LocalisedText
  /** 0 is the top level; a deeper entry nests under the previous shallower one. */
  level: number
}

/**
 * One piece of work on a roadmap (ADR-011). Optional text is `null` when it has no
 * English; text keeps its line breaks. A roadmap's items are in the order its data source
 * holds them (ADR-012).
 */
export interface RoadmapItem {
  /**
   * Its identity within its roadmap, never shown; `null` until the data source gives it
   * one (a row with no ID yet, or a repeat of an earlier row's).
   */
  id: string | null
  /** Its English is never empty. */
  title: LocalisedText
  /** `null` for an unplaced item: no recognised horizon, so the public site skips it. */
  placement: RoadmapPlacement | null
  /** For an unplaced item, its horizon as written (`""` when blank); otherwise `null`. */
  writtenHorizon: string | null
  description: LocalisedText | null
  expectedOutcome: LocalisedText | null
  phase: LocalisedText | null
  /** In the order written, no English repeated. */
  tags: LocalisedText[]
  /**
   * Whether the data source holds any Welsh for its tags, shown in `tags` or not: Welsh
   * that can't be paired with the English is left out of them. While it does, the tags
   * are not edited (STY-037 D14, D16).
   */
  hasWelshTags: boolean
  /**
   * The ids of the organisations the work is for (ADR-014), no repeats, in no promised
   * order: a screen sorts them. Only ids the organisation list holds.
   */
  organisationIds: string[]
  /**
   * The organisation codes the data source names that the list doesn't hold, as written,
   * in the order written, no repeats: they are not shown, and the public site drops
   * them too.
   */
  unknownOrganisationCodes: string[]
  details: RoadmapItemDetail[]
}
