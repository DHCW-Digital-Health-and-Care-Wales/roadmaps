import { useMemo, useRef, useState } from "react"

import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { tagsInUse } from "./item-tags"
import { editItem, matchItemChanges, type ItemValues } from "./pending-changes"
import { usePendingChangesStore } from "./pending-changes-context"

/**
 * An item as read and as shown when the dialog opened on it, which its edits are made
 * from: a co-lead's change read while it is open never changes what Done keeps.
 */
export interface OpenedItem {
  readonly read: RoadmapItem
  readonly shown: RoadmapItem
}

/**
 * The item the dialog edits, by its card's key. It is kept once the dialog has closed,
 * so its card's Edit is still known as focus goes back to it.
 */
interface EditedItem extends OpenedItem {
  readonly key: string
  readonly open: boolean
}

export interface ItemDialogOptions {
  roadmapId: string
  /** The roadmap's items as last read. */
  items: readonly RoadmapItem[]
  /** The same items as the page shows them, pending changes applied. */
  shownItems: readonly RoadmapItem[]
  /** Each item's card key, by its position (`useItemCardKeys`). */
  keys: readonly string[]
}

/**
 * The one item dialog of a roadmap's page (STY-044), which the page holds, not a card:
 * which item it edits, found again by its card's key after every read, so the dialog
 * stays open on an item whose card moves to another list (S7) and closes when the item
 * has gone or another has taken its place, as its card does. Done keeps the values
 * pending, each edited from the item as the dialog opened on it.
 */
export function useItemDialog({
  roadmapId,
  items,
  shownItems,
  keys,
}: ItemDialogOptions) {
  const store = usePendingChangesStore()
  const [edited, setEdited] = useState<EditedItem | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const at = edited ? keys.indexOf(edited.key) : -1
  // Adjusting state while rendering, as React documents for state that follows props.
  if (edited && at < 0) setEdited(null)
  const latest = items[at]
  const shown = shownItems[at]
  // Tags stay English. The roadmap's other items' tags are counted only for the dialog.
  const othersTags = useMemo(
    () =>
      at < 0
        ? []
        : tagsInUse(
            shownItems
              .filter((_, position) => position !== at)
              .map(({ tags }) => tags.map(({ en }) => en)),
          ),
    [shownItems, at],
  )
  const close = () => {
    setEdited((current) => current && { ...current, open: false })
  }

  return {
    /**
     * The item it edits: its card's key, whether the dialog is open, where the item now
     * is among `items`, the item as the dialog opened on it and as the page now shows
     * it. `null` for none.
     */
    edited:
      edited && latest && shown
        ? {
            key: edited.key,
            open: edited.open,
            at,
            opened: edited,
            item: shown,
          }
        : null,
    /**
     * For the Edit of that item's card, wherever the card now is: focus goes there as
     * the dialog closes.
     */
    opener,
    /** The tags the roadmap's other items carry, which the dialog offers (STY-037 S3). */
    tagsInUse: othersTags,
    /** Opens the dialog on the item at `position`. */
    edit: (position: number) => {
      const key = keys[position]
      const read = items[position]
      const shownNow = shownItems[position]
      if (key === undefined || !read || !shownNow) return
      setEdited({ key, read, shown: shownNow, open: true })
    },
    close,
    /** Keeps `values` pending and closes the dialog. */
    done: (values: ItemValues) => {
      if (!edited || !latest) return
      // Finds the item's entry afresh, so the edit never builds on a stale one.
      store.update(roadmapId, (changes) =>
        editItem(
          changes,
          matchItemChanges(items, changes).get(at),
          edited.read,
          at,
          values,
          { shown: edited.shown, latest },
        ),
      )
      close()
    },
  }
}
