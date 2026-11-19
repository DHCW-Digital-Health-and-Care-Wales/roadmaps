import { useState } from "react"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import type { RoadmapItemGroups } from "../group-roadmap-items"
import {
  groupPageItemsWith,
  type PageItem,
  type ShownPlace,
  shownPlace,
} from "./page-items"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import type { PublishNotice } from "./pending-changes-store"
import { hasPendingOrder, type OrderMove } from "./pending-orders"

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

/** Marks the page's item `item`, just moved `move`, to `to`. */
export type MarkMoved = (
  item: PageItem,
  move: ItemMove,
  to: RoadmapPlacement,
) => void

/** The page's moved mark, as `useMovedMark` gives it. */
export interface PageMovedMark {
  /** The item marked, if one is. */
  readonly mark: MovedMark | null
  /** An item was moved: it takes the mark, from any other (S6). */
  readonly moved: MarkMoved
  /** "Undo order" undid `placement`'s order: an item marked there loses its mark. */
  readonly orderUndone: (placement: RoadmapPlacement) => void
}

interface MarkState {
  readonly mark: MovedMark
  /** Where the item shows: as the move left it, or as the last read that kept it. */
  readonly where: ShownPlace
  /** When the roadmap's items were last read as the mark was set or kept. */
  readonly readAt: number
  /** The roadmap's publish notice as the move was made: a new "published" clears it. */
  readonly notice: PublishNotice | undefined
}

export interface MovedMarkOptions {
  roadmapId: string
  /** The roadmap's items as last read; `undefined` until they are. */
  items: readonly RoadmapItem[] | undefined
  /** When they were (the query's `dataUpdatedAt`): a new time is a read. */
  readAt: number
  /** The page's items (`usePageItems`). */
  pageItems: readonly PageItem[]
  /** Those items as the page shows them (`groupPageItems`). */
  groups: RoadmapItemGroups<PageItem>
}

/**
 * The moved mark of a roadmap's page (STY-071): display state, held by the page, never
 * a pending edit, so it goes as the page does (S8). Every move marks its item, from the
 * Move menu, the item dialog or Remove's question (D2, D16), and the next move takes it
 * (S6). It stays while the item shows where the move left it: through a change of view,
 * edits and opened rows (S7), and goes once the item shows anywhere else, as "Undo
 * changes" or "Discard all" may put it (S8). A read keeps it while its move is still
 * pending and clears it otherwise (D9), so a move that came to no change keeps its mark
 * until the next read (D17). "Undo order" on the placement it is in clears it, even
 * where the item stays last there (D12), as do removing the item, its going from the
 * page and a successful publish (S8).
 */
export function useMovedMark({
  roadmapId,
  items,
  readAt,
  pageItems,
  groups,
}: MovedMarkOptions): PageMovedMark {
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const notice = snapshot.notices.get(roadmapId)
  const changes = snapshot.changes.get(roadmapId)
  const [state, setState] = useState<MarkState | null>(null)

  if (state) {
    const { key, move, to } = state.mark
    const where = shownPlace(groups, key)
    const published = notice !== state.notice && notice?.kind === "published"
    // Adjusting state while rendering, as React documents for state that follows props.
    if (!where || published) setState(null)
    else if (readAt !== state.readAt) {
      const item = pageItems.find((each) => each.key === key)
      const pending =
        where.placement === to &&
        (move.kind === "placement"
          ? // A new item's placement is its own; one read has a pending move to it.
            item?.newItemId !== undefined ||
            item?.entry?.fields.placement !== undefined
          : hasPendingOrder(changes?.orders, to))
      setState(pending ? { ...state, where, readAt } : null)
    } else if (!samePlace(where, state.where)) setState(null)
  }

  return {
    mark: state?.mark ?? null,
    moved: (item, move, to) => {
      // Where the move put it, from the store the move has just changed: the page has
      // not drawn it yet.
      const after = groupPageItemsWith(
        items ?? [],
        store.getSnapshot().changes.get(roadmapId),
        pageItems,
      )
      const where = shownPlace(after, item.key)
      setState(
        where
          ? { mark: { key: item.key, move, to }, where, readAt, notice }
          : null,
      )
    },
    orderUndone: (placement) => {
      if (state?.where.placement === placement) setState(null)
    },
  }
}

function samePlace(a: ShownPlace, b: ShownPlace): boolean {
  return a.placement === b.placement && a.index === b.index
}
