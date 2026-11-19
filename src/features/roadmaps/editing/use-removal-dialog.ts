import { useState } from "react"

import { removeItem } from "@/domain/roadmap/item-removal"
import { localise } from "@/domain/roadmap/localised-text"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"

import type { ItemControl } from "./editable-item"
import type { MarkMoved } from "./moved-mark"
import { dropPageItem, editPageItem, type PageItem } from "./page-items"
import { usePendingChangesStore } from "./pending-changes-context"
import type { PublishAction } from "./pending-changes-store"
import type { RemovalDialogProps } from "./removal-dialog"

/** What the dialog's choice was, which says where focus goes as it closes. */
type Choice = "remove" | "not-doing" | null

/** An opening of the dialog, kept while it closes. */
interface Opening {
  /** The key of the card of the item it asks about. */
  readonly key: string
  /** Which opening it is: each draws a dialog of its own. */
  readonly count: number
  readonly open: boolean
  readonly choice: Choice
  /**
   * The item as the dialog last showed it: while it is open, it follows the page's
   * item, and as it closes it shows what it did, though Remove has dropped a new item,
   * card and all, or "Move to Not doing" has put it there (DEF-010).
   */
  readonly asked: PageItem
}

export interface RemovalDialogOptions {
  roadmapId: string
  /** Whether the roadmap's changes are published or saved. */
  action: PublishAction
  /** The roadmap's items as last read. */
  items: readonly RoadmapItem[]
  /** The page's items, by position (`usePageItems`). */
  pageItems: readonly PageItem[]
  /** Sends focus to a control of the item at `position` once the page has rendered. */
  onFocusRequest: (position: number, control: ItemControl) => void
  /** A new item was removed, its card or row with it: focus needs somewhere to go. */
  onNewItemRemoved: () => void
  /**
   * "Move to Not doing" moved the item: it takes the moved mark, with nothing new said
   * (STY-071 D16); the Move menu's own also says where it lands.
   */
  onMoved: MarkMoved
}

/** The page's one removal dialog, as `useRemovalDialog` gives it. */
export interface PageRemovalDialog {
  /** The dialog to draw, `null` until it first opens; `key` is new each time it opens. */
  readonly drawn: {
    readonly key: number
    readonly props: RemovalDialogProps
  } | null
  /** Opens the dialog on the page's item at `position`. */
  readonly ask: (position: number) => void
}

/**
 * The question an item's Remove asks first (STY-049 S1, S10), which the page holds, not
 * a card, as it does the item dialog: it finds its item again by its card's key after
 * every read, so it stays open on an item whose card moves to another list, and closes
 * when the item has gone. "Move to Not doing" makes a pending move, as the Move menu
 * does, marked as moved (STY-071), with focus then on the item's Move; Remove removes
 * an item the roadmap holds, pending, with focus on its "Undo removal" (S2), or drops a
 * new one at once (S10); Cancel, the close button and Escape change nothing, with focus
 * back on its Remove.
 */
export function useRemovalDialog({
  roadmapId,
  action,
  items,
  pageItems,
  onFocusRequest,
  onNewItemRemoved,
  onMoved,
}: RemovalDialogOptions): PageRemovalDialog {
  const store = usePendingChangesStore()
  const language = useLanguage()
  const [opening, setOpening] = useState<Opening | null>(null)
  const at = opening
    ? pageItems.findIndex(({ key }) => key === opening.key)
    : -1
  const found = pageItems[at]
  // Adjusting state while rendering, as React documents for state that follows props.
  if (opening?.open && opening.choice === null && !found) setOpening(null)
  const asked = opening?.open ? found : opening?.asked

  const choose = (choice: Exclude<Choice, null>) => {
    if (!opening?.open || !found) return
    store.update(roadmapId, (changes) => {
      if (choice === "not-doing") {
        return editPageItem(changes, items, found, at, {
          placement: "not-doing",
        })
      }
      return found.newItemId === undefined
        ? removeItem(changes, found.item, at)
        : dropPageItem(changes, items, found, at)
    })
    if (choice === "not-doing") {
      onMoved(
        found,
        { kind: "placement", from: found.shown.placement },
        "not-doing",
      )
    }
    setOpening({ ...opening, open: false, choice, asked: found })
  }
  const closed = () => {
    if (!opening) return
    const wasNew = opening.asked.newItemId !== undefined
    if (wasNew && opening.choice === "remove") onNewItemRemoved()
    else if (at >= 0) {
      const control: ItemControl =
        opening.choice === "remove"
          ? "undo-removal"
          : opening.choice === "not-doing"
            ? "move"
            : "remove"
      onFocusRequest(at, control)
    }
  }

  const placement = asked?.shown.placement ?? null
  return {
    drawn:
      opening && asked
        ? {
            key: opening.count,
            props: {
              open: opening.open,
              title: localise(asked.shown.title, language),
              action,
              isNew: asked.newItemId !== undefined,
              offersNotDoing: placement !== null && placement !== "not-doing",
              onMoveToNotDoing: () => {
                choose("not-doing")
              },
              onRemove: () => {
                choose("remove")
              },
              onClose: () => {
                if (opening.open && found) {
                  setOpening({ ...opening, open: false, asked: found })
                }
              },
              onClosed: closed,
            },
          }
        : null,
    ask: (position) => {
      const target = pageItems[position]
      if (!target) return
      setOpening((last) => ({
        key: target.key,
        count: (last?.count ?? 0) + 1,
        open: true,
        choice: null,
        asked: target,
      }))
    },
  }
}
