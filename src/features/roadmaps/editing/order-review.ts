/**
 * The two orders the publish review draws for a placement whose order a co-lead
 * changed (STY-050 S11), from the page's items.
 */

import { findOrderedItems } from "@/domain/roadmap/placement-order"
import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { OrderConflict } from "@/domain/roadmap/roadmap-changes"

import { groupRoadmapItems } from "../group-roadmap-items"
import type { PageItem } from "./page-items"

/** One item of an order the review shows. */
export interface OrderLine {
  /** Tells the items of one order apart, for React. */
  readonly key: string
  readonly title: LocalisedText
}

/**
 * The two orders the review shows for `conflict`, from `pageItems`, the page's items:
 * `yours`, what "Keep mine" would publish, the placement's items the Product Lead
 * knows in their order, with the items a co-lead added or moved in last and those they
 * removed or moved out gone, as are those the Product Lead removed (STY-049 S8); and
 * `theirs`, the order the publish found. An item the
 * page holds is shown by the title the page shows, so it reads the same in both.
 *
 * The page may not hold what the publish found, when the read after it failed. So an
 * item the publish found is looked for among the page's as any item of an order is
 * (`findOrderedItems`), one with no ID by what it holds and not by its place, which is
 * another read's; one not found keeps the title the publish read. An item of the
 * page's that the publish did not find in the placement is shown only if the Product
 * Lead moved or added it there, and one it did find that the page shows elsewhere is
 * shown last, unless the Product Lead moved it out.
 */
export function reviewedOrders(
  conflict: OrderConflict,
  pageItems: readonly PageItem[],
): { yours: OrderLine[]; theirs: OrderLine[] } {
  // The page's items are the roadmap's as read, each at its place, then the new ones.
  const read = pageItems.filter(({ newItemId }) => newItemId === undefined)
  const places = findOrderedItems(
    read.map(({ item }) => item),
    conflict.current.map(({ item }) => item),
    read.flatMap(({ entry }) => (entry ? [entry] : [])),
  )
  const found = conflict.current.map(({ item, title }, at) => {
    const place = places[at] ?? -1
    const known =
      read[place] ??
      // A new item whose row the publish found, though the page has not read it yet.
      pageItems.find(
        ({ newItemId }) => newItemId !== undefined && newItemId === item.id,
      )
    return {
      known,
      line: {
        key: known?.key ?? `found-${item.id ?? String(at)}`,
        title: known?.shown.title ?? title,
      },
    }
  })
  const wasFound = (pageItem: PageItem) =>
    found.some(({ known }) => known === pageItem)
  // The Product Lead's own: moved to where the page shows it, or new.
  const placedByThem = ({ entry, newItemId }: PageItem) =>
    newItemId !== undefined || entry?.fields.placement !== undefined
  // An item removed is deleted, so it is in no order "Keep mine" publishes (STY-049 S8).
  const removed = (pageItem: PageItem | undefined) =>
    pageItem?.removal !== undefined

  const shown =
    groupRoadmapItems(
      pageItems,
      ({ shown: item }) => item.placement,
      ({ turn }) => turn,
    )
      .placements.find(({ placement }) => placement === conflict.placement)
      ?.items.map(({ item }) => item)
      .filter(
        (pageItem) =>
          !removed(pageItem) && (wasFound(pageItem) || placedByThem(pageItem)),
      ) ?? []
  // One the page never read is a co-lead's; one it shows elsewhere is theirs too,
  // moved in since, unless the Product Lead moved it out.
  const added = found.filter(
    ({ known }) =>
      known === undefined ||
      (!shown.includes(known) && !placedByThem(known) && !removed(known)),
  )
  return {
    yours: [
      ...shown.map(({ key, shown: item }) => ({ key, title: item.title })),
      ...added.map(({ line }) => line),
    ],
    theirs: found.map(({ line }) => line),
  }
}
