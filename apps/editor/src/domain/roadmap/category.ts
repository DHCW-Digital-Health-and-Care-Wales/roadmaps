import type { LocalisedText } from "./localised-text"

/**
 * An area of care a roadmap can belong to, defined once in the category list (ADR-013).
 * The list holds the public site's six.
 */
export interface Category {
  /** The `Item ID` format; unique in the list, and never changes. */
  id: string
  name: LocalisedText
}
