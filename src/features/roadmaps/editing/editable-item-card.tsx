import { useLayoutEffect, useRef, type RefObject } from "react"

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
import { awaitingRefresh, discardable } from "./pending-changes-store"

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
 * (STY-031 S1, S2) and, while it has pending changes, "Undo changes". An item added
 * and not yet published is tagged "New" instead, with Remove, which drops it without
 * asking; what Edit and Move change is part of it (STY-046 S6). Nothing is written
 * until the roadmap is published.
 */
export function EditableItemCard({
  roadmapId,
  items,
  pageItem,
  organisations,
  position,
  focusRequest,
  onFocusRequest,
  onFocused,
  onEdit,
  onRemoved,
  dialogOpener,
}: EditableItemCardProps) {
  const language = useLanguage()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const { shown, entry } = pageItem
  const isNew = pageItem.newItemId !== undefined
  // Nothing is behind a new item: once it is sent, or may be or was published unseen,
  // a change to it would be lost as the item read takes its place, so it waits, as
  // "Discard all" does.
  const changeable =
    !isNew || discardable(snapshot, roadmapId, pageItem.newItemId)
  const droppable = isNew ? changeable : !awaitingRefresh(snapshot, roadmapId)
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
  const drop = () => {
    if (!droppable) return
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
          droppable={droppable}
          editable={changeable}
          editButton={editButton}
          move={
            <MoveMenu
              subject={title}
              placement={shown.placement}
              button={moveButton}
              disabled={!changeable}
              onMove={move}
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
