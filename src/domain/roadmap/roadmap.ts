import type { LocalisedText } from "./localised-text"

/** A roadmap's own copy of its family and category, as its row holds them (ADR-013). */
export interface RoadmapCopiedCells {
  family: LocalisedText | null
  /** Lower-case `#rrggbb`, or `null` when blank or not a colour. */
  colour: string | null
  /** The category's English name as written, `""` for none. */
  category: string
}

/** A roadmap's own copy of its family and category, as its row holds them (ADR-013). */
export interface RoadmapCopiedCells {
  family: LocalisedText | null
  /** Lower-case `#rrggbb`, or `null` when blank or not a colour. */
  colour: string | null
  /** The category's English name as written, `""` for none. */
  category: string
}

/**
 * A roadmap the user can open, with what the roadmap list holds about it (ADR-009).
 * Optional text is `null` when it has no English, so no screen renders an empty part.
 */
export interface Roadmap {
  /** URL-safe and stable for a given data source. */
  id: string
  /**
   * Where its items are kept, as the data source names them; several roadmap rows may
   * share an id but not this. Compared to find the roadmap again, never shown.
   */
  itemsLocation: string
  /** Its English is never empty. */
  title: LocalisedText
  /** Whether the public site shows it. */
  published: boolean
  /**
   * As shown: the listed category's name, else `null` (none, or one not in the list).
   * With no category list, a public-site spelling, in English only (ADR-013).
   */
  category: LocalisedText | null
  /** The listed category's id; `null` with no category list. */
  categoryId: string | null
  /** As shown: the listed family's name, else the row's own (ADR-013). */
  family: LocalisedText | null
  /** The listed family's id; `null` for a family not in the list, or no list. */
  familyId: string | null
  /**
   * What its row's own copied cells hold, as read, whatever the lists say: the base a
   * "Make it match" is refused against when a co-lead edits one (STY-030 S4).
   */
  copied: RoadmapCopiedCells
  /**
   * Its row's copied family or category cells differ from the list's values, which are
   * the ones shown (ADR-013).
   */
  outOfStep: boolean
  /** Its row names a family the family list doesn't have (STY-027 S8). */
  familyNotListed: boolean
  statusLabel: LocalisedText | null
  /** Free text as written, never split into names, e.g. "Alex Jones, Sam Evans". */
  productLead: string | null
  /** A calendar date, `YYYY-MM-DD`. */
  lastUpdated: string | null
  /**
   * Lower-case `#rrggbb`, decorative only: the listed family's, else the row's own;
   * `null`: the interface's default.
   */
  colour: string | null
  vision: LocalisedText | null
  serviceDescription: LocalisedText | null
}
