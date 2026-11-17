import { useLayoutEffect, useRef, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { RoadmapItemCard } from "../components/roadmap-item-card"
import { EditControls } from "./edit-controls"
import { MoveMenu } from "./move-menu"
import { dropPageItem, editPageItem, type PageItem } from "./page-items"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { discardable } from "./pending-changes-store"
import { type OrderMove, positionAfter, reorderItem } from "./pending-orders"

export interface EditableItemCardProps {
  roadmapId: string
  /** The roadmap's items as last read, to find the item's pending changes by. */
  items: readonly RoadmapItem[]
  /** The item, as the page has it (`usePageItems`). */
  pageItem: PageItem
  /** The organisation list the item's organisations are named from (ADR-014). */
  organisations: readonly Organisation[]
  /** Its 0-based place among the page's items. */
  position: number
  /**
   * Its place among its placement's items as the page shows them, and how many they
   * are; none for an unplaced item, which is in no order (STY-050 S1).
   */
  order?: { at: number; count: number } | undefined
  /** Says a status message: where the item now is in its placement's order (S2). */
  onAnnounce: (message: string) => void
  /** Which control takes focus as the card renders, once; see `onFocusRequest`. */
  focusRequest?: CardControl | undefined
  /**
   * Asks for focus on a control of the item's card once the page has re-rendered: a
   * change may move it to another placement's list, as a new card.
   */
  onFocusRequest: (position: number, control: CardControl) => void
  /** Called once a `focusRequest` has been met. */
  onFocused: () => void
  /** Edit was chosen: the page opens the item dialog on the item at `position`. */
  onEdit: (position: number) => void
  /** Remove was chosen and the item, a new one, has gone, its card with it. */
  onRemoved: () => void
  /**
   * Given to the card of the item the dialog edits, or has just added, to hold its
   * Edit: focus goes there as the dialog closes, whichever list the card is then in.
   */
  dialogOpener?: RefObject<HTMLButtonElement | null> | undefined
}

/** A control on an item's card that focus can return to. */
export type CardControl = "edit" | "move"

/**
 * An item's card with its pending English, placement, tags, organisations and details
 * shown and tagged, an Edit that opens the item dialog on it (STY-044), a Move menu
 * (STY-031 S1, S2) and, while it has pending changes, "Undo changes". The Move menu
 * also puts it elsewhere in its placement's order, at once, which is the placement's
 * change, not the item's: the card is not tagged for it (STY-050 S2, S3), and the
 * choices wait while the roadmap is being published (S15). An item added and not yet
 * published is tagged "New" instead, with Remove, which drops it without asking; what
 * Edit and Move change is part of it (STY-046 S6). Nothing is written until the
 * roadmap is published.
 */
export function EditableItemCard({
  roadmapId,
  items,
  pageItem,
  organisations,
  position,
  order,
  onAnnounce,
  focusRequest,
  onFocusRequest,
  onFocused,
  onEdit,
  onRemoved,
  dialogOpener,
}: EditableItemCardProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const { shown, entry } = pageItem
  const isNew = pageItem.newItemId !== undefined
  // Nothing is behind a new item: once it is sent, a change to it would be lost as the
  // item read takes its place, so it waits, as "Discard all" does.
  const publishing = !discardable(snapshot, roadmapId)
  const changeable = !isNew || !publishing
  const ownEditButton = useRef<HTMLButtonElement>(null)
  const editButton = dialogOpener ?? ownEditButton
  const moveButton = useRef<HTMLButtonElement>(null)
  const title = localise(shown.title, language)

  // A layout effect, so focus lands before the shell would rescue it to `<main>`.
  useLayoutEffect(() => {
    if (focusRequest === undefined) return
    const control = focusRequest === "move" ? moveButton : editButton
    control.current?.focus()
    onFocused()
  }, [focusRequest, editButton, onFocused])

  const move = (placement: RoadmapPlacement) => {
    if (!changeable) return
    store.update(roadmapId, (changes) =>
      editPageItem(changes, items, pageItem, position, { placement }),
    )
    onFocusRequest(position, "move")
  }
  const reorder = (to: OrderMove) => {
    if (!order || publishing) return
    store.update(roadmapId, (changes) =>
      reorderItem(changes, items, position, to),
    )
    const at = positionAfter(order.at, order.count, to)
    onAnnounce(
      t(`roadmaps.edit.order.moved.${to}`, {
        position: at + 1,
        count: order.count,
      }),
    )
    // Its card is drawn again in its new place: focus goes back to its Move.
    onFocusRequest(position, "move")
  }
  const drop = () => {
    if (!changeable) return
    store.update(roadmapId, (changes) =>
      dropPageItem(changes, items, pageItem, position),
    )
    // A new item's card has gone. "Undo changes" goes with the changes, and the card
    // may go to another list.
    if (isNew) onRemoved()
    else onFocusRequest(position, "edit")
  }

  return (
    <RoadmapItemCard
      item={shown}
      organisations={organisations}
      actions={
        <EditControls
          subject={title}
          pending={isNew ? "new" : entry && "changed"}
          editable={changeable}
          editButton={editButton}
          move={
            <MoveMenu
              subject={title}
              placement={shown.placement}
              position={
                order && order.count > 1
                  ? { ...order, held: publishing }
                  : undefined
              }
              button={moveButton}
              disabled={!changeable}
              onMove={move}
              onReorder={reorder}
            />
          }
          onEdit={() => {
            if (changeable) onEdit(position)
          }}
          onDrop={drop}
        />
      }
    />
  )
}
