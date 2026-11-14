import type { DetailLine } from "@/domain/roadmap/item-details"

import { nestItemDetails, type NestedItemDetail } from "../nest-item-details"

/**
 * Details as the nested list a card shows: each under the last one shallower than it.
 * The card, the shut Details field and the conflict review share it, so a list reads
 * the same wherever it is shown (STY-039 S15, S17).
 */
export function DetailList({ details }: { details: readonly DetailLine[] }) {
  return <DetailNodes nodes={nestItemDetails(details)} />
}

function DetailNodes({
  nodes,
}: {
  nodes: readonly NestedItemDetail<DetailLine>[]
}) {
  return (
    <ul className="list-disc pl-5 [&_ul]:mt-0.5">
      {nodes.map(({ detail, children }, index) => (
        // Details have no identity; their order is fixed for a render.
        <li key={index}>
          {detail.text}
          {children.length > 0 && <DetailNodes nodes={children} />}
        </li>
      ))}
    </ul>
  )
}
