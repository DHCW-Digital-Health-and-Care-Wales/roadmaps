import { createElement, Fragment, type ReactNode } from "react"

/**
 * A catalogue sentence with elements in it, such as roadmap content or a `<time>`, so
 * the catalogue owns the words and punctuation around them. The parts are children of
 * one fragment, so they need no keys.
 */
export const sentence = (...parts: ReactNode[]): ReactNode =>
  createElement(Fragment, null, ...parts)
