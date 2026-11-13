import type { LocalisedText } from "./localised-text"

/**
 * An NHS Wales body a roadmap item's work can be for, or All Wales for national work,
 * served by the repository's organisation list (ADR-014; shared with the public site,
 * ADR-011).
 */
export interface Organisation {
  /** Unique in the list, and never changes: items name their organisations by it. */
  id: string
  /** Its standard code, as a Product Lead types it: `CAVUHB`. The same in both languages. */
  code: string
  /** The name a card shows, in English in both languages: `Cardiff and Vale`. */
  shortName: string
  /** The full name: `Cardiff and Vale University Health Board`. */
  name: LocalisedText
  /** True for All Wales only, which screens show before the others. */
  national: boolean
}
