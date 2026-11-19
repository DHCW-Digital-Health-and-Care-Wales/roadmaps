import { useState } from "react"

import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import type { PageItem } from "./page-items"
import { usePendingChanges } from "./pending-changes-context"
import type { PublishNotice } from "./pending-changes-store"
import type { OrderMove } from "./pending-orders"

/**
 * How an item was moved: within its placement, by the Move menu's choice of position, or
 * to another placement, `from` the one it showed in, `null` for an unplaced item.
 */
export type ItemMove =
  | { readonly kind: OrderMove }
  | { readonly kind: "placement"; readonly from: RoadmapPlacement | null }

/** The moved mark (STY-071): the item a Product Lead moved last, and how. */
export interface MovedMark {
  /** The item's card key, which it keeps across reads (`PageItem.key`). */
  readonly key: string
  readonly move: ItemMove
  /** The placement the move left it in. */
  readonly to: RoadmapPlacement
}

/** The page's moved mark, as `useMovedMark` gives it. */
export interface PageMovedMark {
  /** The item marked, if one is. */
  readonly mark: MovedMark | null
  /** An item was moved, to `to`: it takes the mark, from any other (S6). */
  readonly moved: (item: PageItem, move: ItemMove, to: RoadmapPlacement) => void
  /** "Undo order" undid `placement`'s order: an item marked there loses its mark. */
  readonly orderUndone: (placement: RoadmapPlacement) => void
}

interface MarkState {
  readonly mark: MovedMark
  /**
   * Whether its move has been seen pending. A move can be no change, one that puts an
   * item back in the order or the placement it was read in: that mark is kept until
   * something else clears it, where one whose move was pending goes with the move.
   */
  readonly held: boolean
  /** The roadmap's publish notice as the move was made: a new "published" clears it. */
  readonly notice: PublishNotice | undefined
}

/**
 * The moved mark of a roadmap's page (STY-071): display state, held by the page, never
 * a pending edit, so it goes as the page does (S8). Every move marks its item, from the
 * Move menu, the item dialog or Remove's question (D2). It stays through a change of
 * view, edits, opened rows and a read that leaves its move pending (S7, D9), and goes
 * with the next move (S6); with "Undo order" on the placement it is in, even one the
 * item was moved into and stays last in (D12); once its move is no longer pending, as
 * "Undo changes" that puts the item back, "Discard all" or a read that holds the move
 * leave it; once the item is removed or gone; and once the roadmap is published (S8).
 */
export function useMovedMark(
  roadmapId: string,
  pageItems: readonly PageItem[],
): PageMovedMark {
  const snapshot = usePendingChanges()
  const notice = snapshot.notices.get(roadmapId)
  const changes = snapshot.changes.get(roadmapId)
  const [state, setState] = useState<MarkState | null>(null)

  if (state) {
    const item = marked(pageItems, state.mark)
    const shown = item !== undefined && item.removal === undefined
    const where = shown && item.shown.placement === state.mark.to
    const pending =
      where &&
      (state.mark.move.kind === "placement"
        ? // A new item's placement is its own; one read has a pending move to it.
          item.newItemId !== undefined ||
          item.entry?.fields.placement !== undefined
        : changes?.orders.some(({ placement }) => placement === state.mark.to))
    const published = notice !== state.notice && notice?.kind === "published"
    // Adjusting state while rendering, as React documents for state that follows props.
    if (!shown || published || (state.held && !pending)) setState(null)
    else if (pending && !state.held) setState({ ...state, held: true })
  }

  const moved = (item: PageItem, move: ItemMove, to: RoadmapPlacement) => {
    setState({ mark: { key: item.key, move, to }, held: false, notice })
  }
  const orderUndone = (placement: RoadmapPlacement) => {
    if (state && marked(pageItems, state.mark)?.shown.placement === placement) {
      setState(null)
    }
  }
  return { mark: state?.mark ?? null, moved, orderUndone }
}

/** The page's item that carries `mark`, if it is still there. */
function marked(
  pageItems: readonly PageItem[],
  mark: MovedMark,
): PageItem | undefined {
  return pageItems.find(({ key }) => key === mark.key)
}

/** How long a reveal follows the pinned bars as they settle after a move. */
const SETTLING_MS = 1000

/**
 * Scrolls the page until `item`, just moved, is in the room between the pinned header
 * and foot bar, which `scroll-padding` keeps clear: gliding, or in one jump where the
 * system asks for reduced motion (STY-071 S4, D8). The bars may still be settling: a
 * menu or dialog closing lets go of the page's scroll a moment later, and a foot bar the
 * move brought, or a header sticking as the page glides, sets its height on the document
 * (`usePinnedInset`) a few frames on. So the page is scrolled two frames on, and again
 * as the document's style changes, for a second.
 */
export function revealMoved(item: Element) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const reveal = () => {
    item.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "instant" : "smooth",
    })
  }
  const settling = new MutationObserver(reveal)
  settling.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  })
  setTimeout(() => {
    settling.disconnect()
  }, SETTLING_MS)
  requestAnimationFrame(() => {
    requestAnimationFrame(reveal)
  })
}
