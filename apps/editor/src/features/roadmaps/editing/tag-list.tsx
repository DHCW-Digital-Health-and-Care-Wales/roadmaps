import { Badge } from "@/components/ui/badge"

import type { ShownContent } from "../shown-content"

/** A tag as shown, with its English name, which no two of an item's tags share. */
export interface ShownTag extends ShownContent {
  name: string
}

/**
 * An item's tags on one line, wrapping, each as a tag, known by its English name:
 * reading drops a repeat, and editing refuses one.
 */
export function TagList({ tags }: { tags: readonly ShownTag[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map(({ name, text, lang }) => (
        <li key={name} className="flex max-w-full">
          <Badge lang={lang}>{text}</Badge>
        </li>
      ))}
    </ul>
  )
}
