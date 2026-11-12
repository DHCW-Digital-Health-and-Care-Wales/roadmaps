import type { LocalisedText } from "./localised-text"

/**
 * A product family, defined once in the family list (ADR-013): its roadmaps take its
 * name and colour.
 */
export interface Family {
  /** The `Item ID` format; unique in the list, and never changes. */
  id: string
  /** Unique in the list, folded as families are grouped. */
  name: LocalisedText
  /** Lower-case `#rrggbb`. */
  colour: string
}
