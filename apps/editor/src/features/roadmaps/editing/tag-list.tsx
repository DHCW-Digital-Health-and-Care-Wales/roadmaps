import { Badge } from "@/components/ui/badge"

/** An item's tags on one line, wrapping, each as a tag. */
export function TagList({ tags }: { tags: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag, index) => (
        // Two tags may read alike, as two English ones with one Welsh.
        <li key={index} className="flex max-w-full">
          <Badge>{tag}</Badge>
        </li>
      ))}
    </ul>
  )
}
