import type { LocalisedText } from "./localised-text"
import type { Organisation } from "./organisation"
import type { RoadmapPlacement } from "./roadmap-placement"

/** One entry of a roadmap item's details. */
export interface RoadmapItemDetail {
  text: LocalisedText
  /** 0 is the top level; a deeper entry nests under the previous shallower one. */
  level: number
}

/**
 * One piece of work on a roadmap (ADR-011). Optional text is `null` when it has no
 * English; text keeps its line breaks. Items have no identity yet: a roadmap's items are
 * in the order its data source holds them.
 */
export interface RoadmapItem {
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
  /** In `ORGANISATIONS` order, no repeats. */
  organisations: Organisation[]
  details: RoadmapItemDetail[]
}
