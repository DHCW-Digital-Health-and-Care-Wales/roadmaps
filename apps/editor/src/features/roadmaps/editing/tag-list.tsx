import { Badge } from "@/components/ui/badge"

import type { ShownContent } from "../shown-content"

/** An item's tags on one line, wrapping, each as a tag. */
export function TagList({ tags }: { tags: readonly ShownContent[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map(({ text, lang }, index) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- Two tags may read alike, so only the place is an identity.
        <li key={index} className="flex max-w-full">
          <Badge lang={lang}>{text}</Badge>
        </li>
      ))}
    </ul>
  )
}
