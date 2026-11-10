import type { LocalisedText } from "./localised-text"
import type { RoadmapCategory } from "./roadmap-category"

/**
 * A roadmap the user can open, with what the roadmap list holds about it (ADR-009).
 * Optional text is `null` when it has no English, so no screen renders an empty part.
 */
export interface Roadmap {
  /** URL-safe and stable for a given data source. */
  id: string
  /** Its English is never empty. */
  title: LocalisedText
  /** Whether the public site shows it. */
  published: boolean
  /** `null`: no category, or one not in the list. */
  category: RoadmapCategory | null
  family: LocalisedText | null
  statusLabel: LocalisedText | null
  /** Free text as written, never split into names, e.g. "Alex Jones, Sam Evans". */
  productLead: string | null
  /** A calendar date, `YYYY-MM-DD`. */
  lastUpdated: string | null
  /** Lower-case `#rrggbb`, decorative only; `null`: the interface's default. */
  colour: string | null
  vision: LocalisedText | null
  serviceDescription: LocalisedText | null
}
