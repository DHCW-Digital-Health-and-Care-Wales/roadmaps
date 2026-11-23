import { nestItemDetails, type NestedItemDetail } from "../nest-item-details"
import type { ShownDetail } from "../shown-content"

export interface DetailListProps {
  details: readonly ShownDetail[]
  /**
   * A class for the text of the detail at this place in the order it is drawn, the
   * nested ones after the one above them: how a card cuts one (STY-066).
   */
  textClass?: ((index: number) => string | undefined) | undefined
}

/**
 * Details as the nested list a card shows: each under the last one shallower than it.
 * The card, the shut Details field and the conflict review share it, so a list reads
 * the same wherever it is shown (STY-039 S15, S17). Each detail's text is a block of its
 * own, so a card can measure the lines it takes, and a list of n lines is n lines tall.
 */
export function DetailList({ details, textClass }: DetailListProps) {
  return (
    <DetailNodes
      nodes={nestItemDetails(details)}
      start={0}
      textClass={textClass}
    />
  )
}

/** How many details a node holds, itself and those nested in it. */
function countDetails(node: NestedItemDetail<ShownDetail>): number {
  return 1 + node.children.reduce((sum, child) => sum + countDetails(child), 0)
}

function DetailNodes({
  nodes,
  start,
  textClass,
}: {
  nodes: readonly NestedItemDetail<ShownDetail>[]
  /** The place in the order drawn of the first of `nodes`. */
  start: number
  textClass: DetailListProps["textClass"]
}) {
  // Each node's place: after the details of those before it.
  const places = nodes.map(
    (_, at) =>
      start +
      nodes.slice(0, at).reduce((sum, before) => sum + countDetails(before), 0),
  )
  return (
    <ul className="list-disc pl-5">
      {nodes.map((node, at) => {
        const own = places[at] ?? start
        return (
          // Details have no identity; their order is fixed for a render.
          <li key={own}>
            <div
              data-detail=""
              lang={node.detail.lang}
              className={textClass?.(own)}
            >
              {node.detail.text}
            </div>
            {node.children.length > 0 && (
              <DetailNodes
                nodes={node.children}
                start={own + 1}
                textClass={textClass}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
