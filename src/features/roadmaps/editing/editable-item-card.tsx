import { useLayoutEffect, useRef, type RefObject } from "react"

import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { ItemChanges } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { RoadmapItemCard } from "../components/roadmap-item-card"
import { EditControls } from "./edit-controls"
import { MoveMenu } from "./move-menu"
import {
  applyItemChanges,
  editItem,
  matchItemChanges,
  undoItem,
} from "./pending-changes"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { awaitingRefresh } from "./pending-changes-store"

export interface EditableItemCardProps {
  roadmapId: string
  /** The roadmap's items as last read, to find the item's pending changes by. */
  items: readonly RoadmapItem[]
  item: RoadmapItem
  /** The organisation list the item's organisations are named from (ADR-014). */
  organisations: readonly Organisation[]
  /** Its 0-based place in `items`. */
  position: number
  /** Its pending changes, if any. */
  entry: ItemChanges | undefined
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
  /**
   * Given to the card of the item the dialog edits, to hold its Edit: focus goes there
   * as the dialog closes, whichever list the card is then in.
   */
  dialogOpener?: RefObject<HTMLButtonElement | null> | undefined
}

/** A control on an item's card that focus can return to. */
export type CardControl = "edit" | "move"

/**
 * An item's card with its pending English, placement, tags, organisations and details
 * shown and tagged, an Edit that opens the item dialog on it (STY-044), a Move menu
 * (STY-031 S1, S2) and, while it has pending changes, "Undo changes". Nothing is
 * written until the roadmap is published.
 */
export function EditableItemCard({
  roadmapId,
  items,
  item,
  organisations,
  position,
  entry,
  focusRequest,
  onFocusRequest,
  onFocused,
  onEdit,
  dialogOpener,
}: EditableItemCardProps) {
  const language = useLanguage()
  const store = usePendingChangesStore()
  const undoable = !awaitingRefresh(usePendingChanges(), roadmapId)
  const ownEditButton = useRef<HTMLButtonElement>(null)
  const editButton = dialogOpener ?? ownEditButton
  const moveButton = useRef<HTMLButtonElement>(null)
  const shown = applyItemChanges(item, entry)
  const title = localise(shown.title, language)

  // A layout effect, so focus lands before the shell would rescue it to `<main>`.
  useLayoutEffect(() => {
    if (focusRequest === undefined) return
    const control = focusRequest === "move" ? moveButton : editButton
    control.current?.focus()
    onFocused()
  }, [focusRequest, editButton, onFocused])

  // Each change finds the item's entry afresh, so it never builds on a stale one.
  const move = (placement: RoadmapPlacement) => {
    store.update(roadmapId, (changes) =>
      editItem(
        changes,
        matchItemChanges(items, changes).get(position),
        item,
        position,
        { placement },
      ),
    )
    onFocusRequest(position, "move")
  }
  const undo = () => {
    if (!undoable) return
    store.update(roadmapId, (changes) => {
      const current = matchItemChanges(items, changes).get(position)
      return current ? undoItem(changes, current) : changes
    })
    // "Undo changes" goes with the changes, and the card may go to another list.
    onFocusRequest(position, "edit")
  }

  return (
    <RoadmapItemCard
      item={shown}
      organisations={organisations}
      actions={
        <EditControls
          subject={title}
          changed={entry !== undefined}
          undoable={undoable}
          editButton={editButton}
          move={
            <MoveMenu
              subject={title}
              placement={shown.placement}
              button={moveButton}
              onMove={move}
            />
          }
          onEdit={() => {
            onEdit(position)
          }}
          onUndo={undo}
        />
      }
    />
  )
}
