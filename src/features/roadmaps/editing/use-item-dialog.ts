import { useMemo, useRef, useState, type RefObject } from "react"

import { addNewItem } from "@/domain/roadmap/new-item"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { ItemValues, NewItem } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { isRoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import type { AfterAdding, ItemDialogProps } from "../dialogs/item-dialog"
import type { OpenedItem } from "../dialogs/item-form"
import { tagsInUse } from "./item-tags"
import type { MarkMoved } from "./moved-mark"
import { editPageItem, newItemCardKey, type PageItem } from "./page-items"
import { usePendingChangesStore } from "./pending-changes-context"
import { publishAction } from "./pending-changes-store"

/** What the dialog is opened to do: edit an item, or add one or more. */
type Target =
  | {
      readonly form: "edit"
      /** The key of the card of the item it edits. */
      readonly key: string
      readonly opened: OpenedItem
    }
  | {
      readonly form: "add"
      /** The "Add an item" that opened it: the page's own, or an empty roadmap's. */
      readonly from: RefObject<HTMLElement | null>
      /** The key of the card of the item "Add item" added as it closed the dialog. */
      readonly addedKey: string | null
    }

/**
 * An opening of the dialog, kept once it has closed, so the card that takes focus as
 * it closes is still known.
 */
type Opening = Target & {
  /** Which opening it is: each draws a dialog of its own. */
  readonly count: number
  readonly open: boolean
}

export interface ItemDialogOptions {
  /** The roadmap as last read. */
  roadmap: Roadmap
  /** The roadmap's items as last read; `undefined` until they are. */
  items: readonly RoadmapItem[] | undefined
  /** The organisation list, which the dialog names an item's organisations from. */
  organisations: readonly Organisation[] | undefined
  /** The page's items (`usePageItems`). */
  pageItems: readonly PageItem[]
  /** "Add an item" with the page's actions: the one that is always there. */
  addItemButton: RefObject<HTMLElement | null>
  /**
   * Done moved the item to another placement: it takes the moved mark, with nothing new
   * said, as focus goes back to its Edit (STY-071 D2, D11).
   */
  onMoved: MarkMoved
}

/** The page's one item dialog, as `useItemDialog` gives it. */
export interface PageItemDialog {
  /**
   * The dialog to draw, `null` until it first opens: what `ItemDialog` takes, and
   * `key`, which is new each time it opens.
   */
  readonly drawn: {
    readonly key: number
    readonly props: ItemDialogProps
  } | null
  /** Whether an item can be added: once the items and the organisation list are read. */
  readonly canAdd: boolean
  /**
   * Where, among the page's items, the one is whose card takes focus as the dialog
   * closes: the item it edits, or the one "Add item" just added; -1 for none.
   */
  readonly cardAt: number
  /** For that card's Edit, wherever the card now is. */
  readonly cardOpener: RefObject<HTMLButtonElement | null>
  /** Opens the dialog to edit the page's item at `position`. */
  readonly edit: (position: number) => void
  /**
   * Opens the dialog to add an item, from "Add an item" with the page's actions, or
   * from `from`, an empty roadmap's own.
   */
  readonly add: (from?: RefObject<HTMLElement | null>) => void
}

/**
 * The one item dialog of a roadmap's page (STY-044, STY-046), which the page holds,
 * not a card. Editing, it finds its item again by its card's key after every read, so
 * it stays open on an item whose card moves to another list (STY-044 S7) and closes
 * when the item has gone or another has taken its place, as its card does; Done keeps
 * the values pending, each edited from the item as the dialog opened on it, or as part
 * of a new item (STY-046 S6), and marks an item it moves (STY-071 S2). Adding, it is on
 * no item: "Add item" and "Add and start another" keep a new item pending, and the
 * first closes the dialog with focus going to the new item's card. Cancel, the close
 * button and Escape send focus back to the "Add an item" that opened it, or to the
 * page's own once an item has taken an empty roadmap's panel's place, and its button
 * with it.
 */
export function useItemDialog({
  roadmap,
  items,
  organisations,
  pageItems,
  addItemButton,
  onMoved,
}: ItemDialogOptions): PageItemDialog {
  const store = usePendingChangesStore()
  const [opening, setOpening] = useState<Opening | null>(null)
  const cardOpener = useRef<HTMLButtonElement>(null)
  const cardKey =
    opening?.form === "edit" ? opening.key : (opening?.addedKey ?? null)
  const cardAt =
    cardKey === null ? -1 : pageItems.findIndex(({ key }) => key === cardKey)
  // Adjusting state while rendering, as React documents for state that follows props.
  if (opening?.form === "edit" && cardAt < 0) setOpening(null)
  const edited = opening?.form === "edit" ? pageItems[cardAt] : undefined
  // Tags stay English. The roadmap's other items' tags are counted only for the dialog.
  const othersTags = useMemo(
    () =>
      opening === null
        ? []
        : tagsInUse(
            pageItems
              .filter((_, position) => position !== cardAt)
              .map(({ shown }) => shown.tags.map(({ en }) => en)),
          ),
    [opening, pageItems, cardAt],
  )

  const open = (target: Target) => {
    setOpening((last) => ({
      ...target,
      count: (last?.count ?? 0) + 1,
      open: true,
    }))
  }
  const close = () => {
    setOpening((current) => current && { ...current, open: false })
  }
  /** Keeps `values` pending, as the edits of the item the dialog is on, and closes it. */
  const done = (values: ItemValues) => {
    if (opening?.form !== "edit" || !edited || !items) return
    const { read, shown } = opening.opened
    store.update(roadmap.id, (changes) =>
      editPageItem(changes, items, edited, cardAt, values, {
        read,
        since: { shown, latest: edited.item },
      }),
    )
    const to = values.placement
    if (
      to !== undefined &&
      isRoadmapPlacement(to) &&
      to !== edited.shown.placement
    ) {
      onMoved(edited, { kind: "placement", from: edited.shown.placement }, to)
    }
    close()
  }
  /** Keeps a new item with `values` pending; closing, focus goes to its card's Edit. */
  const added = (values: ItemValues, then: AfterAdding) => {
    // A closing dialog's form can still be pressed: a double click adds one item.
    if (!items || !opening?.open) return
    let newItem: NewItem | undefined
    store.update(roadmap.id, (changes) => {
      const next = addNewItem(changes, values, items)
      newItem = next.newItems.at(-1)
      return next
    })
    const addedKey =
      then === "close" && newItem ? newItemCardKey(newItem.id) : null
    setOpening((current) =>
      current?.form === "add"
        ? { ...current, addedKey, open: then !== "close" }
        : current,
    )
  }

  const shared = organisations && {
    onClose: close,
    tagsInUse: othersTags,
    organisations,
  }
  const props: ItemDialogProps | null =
    !opening || !shared
      ? null
      : opening.form === "add"
        ? {
            ...shared,
            open: opening.open,
            // The card of the item "Add item" has just added, else the "Add an item"
            // that opened it. An empty roadmap's panel, and its button, go once the
            // page has an item, added here or read meanwhile: the page's own stays.
            opener:
              opening.addedKey !== null
                ? cardOpener
                : pageItems.length === 0
                  ? opening.from
                  : addItemButton,
            action: publishAction(roadmap),
            onAdd: added,
          }
        : edited
          ? {
              ...shared,
              open: opening.open,
              opener: cardOpener,
              opened: opening.opened,
              item: edited.shown,
              onDone: done,
            }
          : null
  const canAdd = items !== undefined && organisations !== undefined

  return {
    drawn: opening && props ? { key: opening.count, props } : null,
    canAdd,
    cardAt,
    cardOpener,
    edit: (position) => {
      const target = pageItems[position]
      if (!target) return
      open({
        form: "edit",
        key: target.key,
        opened: { read: target.item, shown: target.shown },
      })
    },
    add: (from = addItemButton) => {
      if (canAdd) open({ form: "add", from, addedKey: null })
    },
  }
}
