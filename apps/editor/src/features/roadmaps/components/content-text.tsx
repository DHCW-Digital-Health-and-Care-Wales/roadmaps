import type { LocalisedText } from "@/domain/roadmap/localised-text"

import { useContent } from "../hooks/use-content"
import type { ShownContent } from "../shown-content"

/**
 * Roadmap content in the interface's language. English shown in place of empty Welsh
 * is marked `lang="en"`, so a screen reader reads it as English (WCAG 2.2 SC 3.1.2);
 * text in the interface's language carries no `lang` of its own. Inside a sentence it
 * is a `<Trans>` component, so only it is marked; an attribute takes `localise()`,
 * unmarked (ADR-008).
 */
export function ContentText({ value }: { value: LocalisedText }) {
  return <ShownText content={useContent()(value)} />
}

/** Content already resolved (`useContent`), marked as `ContentText` marks it. */
export function ShownText({
  content: { text, lang },
}: {
  content: ShownContent
}) {
  return lang ? <span lang={lang}>{text}</span> : text
}
