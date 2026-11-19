import { useLayoutEffect, useRef, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { undoRemoval } from "@/domain/roadmap/item-removal"
import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { useLanguage } from "@/i18n"

import { CompactItemRow } from "../components/compact-item-row"
import { RoadmapItemCard } from "../components/roadmap-item-card"
import type { ItemsView } from "../hooks/use-items-view"
import {
  DropButton,
  EditButton,
  EditControls,
  PendingTag,
  RemoveButton,
} from "./edit-controls"
import { MoveMenu } from "./move-menu"
import { dropPageItem, editPageItem, type PageItem } from "./page-items"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { discardable } from "./pending-changes-store"
import { type OrderMove, positionAfter, reorderItem } from "./pending-orders"

export interface EditableItemProps {
  roadmapId: string
  /** The roadmap's items as last read, to find the item's pending changes by. */
  items: readonly RoadmapItem[]
  /** The item, as the page has it (`usePageItems`). */
  pageItem: PageItem
  /** The organisation list the item's organisations are named from (ADR-014). */
  organisations: readonly Organisation[]
  /** Whether it is drawn as a card or as a row of the compact view (STY-067). */
  view: ItemsView
  /** Its 0-based place among the page's items. */
  position: number
  /**
   * Its place among its placement's items as the page shows them, and how many they
   * are; none for an unplaced item, which is in no order (STY-050 S1).
   */
  order?: { at: number; count: number } | undefined
  /** Says a status message: where the item now is in its placement's order (S2). */
  onAnnounce: (message: string) => void
  /** Which control takes focus as the item renders, once; see `onFocusRequest`. */
  focusRequest?: ItemControl | undefined
  /**
   * Asks for focus on a control of the item once the page has re-rendered: a change may
   * move it to another placement's list, as a new card or row.
   */
  onFocusRequest: (position: number, control: ItemControl) => void
  /** Called once a `focusRequest` has been met. */
  onFocused: () => void
  /** Edit was chosen: the page opens the item dialog on the item at `position`. */
  onEdit: (position: number) => void
  /** Remove was chosen: the page asks first, about the item at `position` (STY-049). */
  onRemove: (position: number) => void
  /**
   * Given to the item the dialog edits, or has just added, to hold its Edit: focus goes
   * there as the dialog closes, whichever list the item is then in.
   */
  dialogOpener?: RefObject<HTMLButtonElement | null> | undefined
}

/** A control of an item's card or row that focus can return to. */
export type ItemControl = "edit" | "move" | "remove" | "undo-removal"

/**
 * An item, as a card or as a row of the compact view (`view`, STY-067 S8, S9), with its
 * pending English, placement, tags, organisations and details shown and tagged, an
 * Edit that opens the item dialog on it (STY-044), a Move menu (STY-031 S1, S2), Remove,
 * which the page asks about first (STY-049 S1), and, while it has pending changes,
 * "Undo changes": in an opened row, for a row, as Remove is. The Move menu also puts it
 * elsewhere in its placement's order, at once, which is the placement's change, not the
 * item's: it is not tagged for it (STY-050 S2, S3), and the choices wait while the
 * roadmap is being published (S15). An item added and not yet published is tagged
 * "New" instead; what Edit and Move change is part of it (STY-046 S6). An item removed
 * shows where it did, struck through and tagged "Removed", with "Undo removal", which
 * brings back its edits too, and its Move and Edit held (STY-049 S2, S3, D6). Nothing
 * is written until the roadmap is published.
 */
export function EditableItem({
  roadmapId,
  items,
  pageItem,
  organisations,
  view,
  position,
  order,
  onAnnounce,
  focusRequest,
  onFocusRequest,
  onFocused,
  onEdit,
  onRemove,
  dialogOpener,
}: EditableItemProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const { shown, entry, removal } = pageItem
  const isNew = pageItem.newItemId !== undefined
  // Nothing is behind a new item, or a removal: once it is sent, a change to it would be
  // lost as the read after the publish settles it, so it waits, as "Discard all" does.
  const publishing = !discardable(snapshot, roadmapId)
  const changeable = !isNew || !publishing
  const editable = changeable && !removal
  const ownEditButton = useRef<HTMLButtonElement>(null)
  const editButton = dialogOpener ?? ownEditButton
  const moveButton = useRef<HTMLButtonElement>(null)
  const removeButton = useRef<HTMLButtonElement>(null)
  const undoRemovalButton = useRef<HTMLButtonElement>(null)
  const title = localise(shown.title, language)
  const pending = isNew ? "new" : removal ? "removed" : entry && "changed"
  // A layout effect, so focus lands before the shell would rescue it to `<main>`.
  useLayoutEffect(() => {
    if (focusRequest === undefined) return
    const control = {
      edit: editButton,
      move: moveButton,
      remove: removeButton,
      "undo-removal": undoRemovalButton,
    }[focusRequest]
    control.current?.focus()
    onFocused()
  }, [focusRequest, editButton, onFocused])

  const move = (placement: RoadmapPlacement) => {
    if (!editable) return
    store.update(roadmapId, (changes) =>
      editPageItem(changes, items, pageItem, position, { placement }),
    )
    onFocusRequest(position, "move")
  }
  const reorder = (to: OrderMove) => {
    if (!order || publishing || removal) return
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
    // It is drawn again in its new place: focus goes back to its Move.
    onFocusRequest(position, "move")
  }
  const drop = () => {
    if (removal) {
      if (publishing) return
      store.update(roadmapId, (changes) => undoRemoval(changes, removal))
      onFocusRequest(position, "remove")
      return
    }
    store.update(roadmapId, (changes) =>
      dropPageItem(changes, items, pageItem, position),
    )
    // "Undo changes" goes with the changes, and the item may go to another list.
    onFocusRequest(position, "edit")
  }
  const remove = () => {
    if (changeable) onRemove(position)
  }

  const moveMenu = (iconOnly: boolean) => (
    <MoveMenu
      subject={title}
      placement={shown.placement}
      position={
        order && order.count > 1 ? { ...order, held: publishing } : undefined
      }
      button={moveButton}
      disabled={!editable}
      iconOnly={iconOnly}
      onMove={move}
      onReorder={reorder}
    />
  )
  const edit = () => {
    if (editable) onEdit(position)
  }
  const removeControl = !removal && (
    <RemoveButton
      subject={title}
      disabled={!changeable}
      size="sm"
      button={removeButton}
      onRemove={remove}
    />
  )
  const dropControl = (
    <DropButton
      subject={title}
      pending={pending}
      disabled={removal ? publishing : !changeable}
      size="sm"
      button={removal ? undoRemovalButton : undefined}
      onDrop={drop}
    />
  )

  if (view === "compact") {
    return (
      <CompactItemRow
        item={shown}
        organisations={organisations}
        struck={removal !== undefined}
        tag={pending && <PendingTag pending={pending} subject={title} />}
        actions={(wide) => (
          <>
            {moveMenu(!wide)}
            <EditButton
              subject={title}
              disabled={!editable}
              size="sm"
              iconOnly={!wide}
              button={editButton}
              onEdit={edit}
            />
          </>
        )}
        drop={
          <div className="flex flex-wrap gap-2">
            {dropControl}
            {removeControl}
          </div>
        }
      />
    )
  }
  return (
    <RoadmapItemCard
      item={shown}
      organisations={organisations}
      struck={removal !== undefined}
      actions={
        <EditControls
          subject={title}
          pending={pending}
          editable={editable}
          droppable={removal ? !publishing : changeable}
          editButton={editButton}
          dropButton={removal ? undoRemovalButton : undefined}
          remove={removeControl}
          move={moveMenu(false)}
          onEdit={edit}
          onDrop={drop}
        />
      }
    />
  )
}
