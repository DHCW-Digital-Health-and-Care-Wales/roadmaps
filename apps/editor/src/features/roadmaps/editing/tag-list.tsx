import { Badge } from "@/components/ui/badge"

/** An item's tags on one line, wrapping, each as a tag. */
export function TagList({ tags }: { tags: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag, index) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- Two tags may read alike, so only the place is an identity.
        <li key={index} className="flex max-w-full">
          <Badge>{tag}</Badge>
        </li>
      ))}
    </ul>
  )
}
