import { useResolved } from "../i18n"
import type { Localised } from "../lib/types"

/**
 * Roadmap content in the page's language. English shown in place of empty Welsh
 * is marked `lang="en"`, so screen readers switch pronunciation (WCAG 2.2 SC
 * 3.1.2); text in the page's language carries no `lang` of its own. Interface
 * text comes from `useStrings()` instead; an attribute takes `localise()`,
 * unmarked.
 */
export function ContentText({ value }: { value: Localised }) {
  const { text, lang } = useResolved(value)
  return lang ? <span lang={lang}>{text}</span> : text
}
