import { TriangleAlertIcon, Undo2Icon } from "lucide-react"
import { useId, useMemo, useRef, useState, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import { ItemDialog } from "../dialogs/item-dialog"
import { ChangedTag } from "../editing/edit-controls"
import {
  type CardControl,
  EditableItemCard,
} from "../editing/editable-item-card"
import type { PageItem } from "../editing/page-items"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "../editing/pending-changes-context"
import { discardable } from "../editing/pending-changes-store"
import { undoOrder } from "../editing/placement-orders"
import type { PageItemDialog } from "../editing/use-item-dialog"
import { groupRoadmapItems, type Positioned } from "../group-roadmap-items"
import { AddItemButton } from "./add-item-button"
import { StatusPanel } from "./status-panel"

/** One, two, then three columns of item cards, as the roadmap cards are laid out. */
const itemGridClassName =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"

export interface RoadmapItemsProps {
  roadmapId: string
  /** The roadmap's items as last read. */
  items: readonly RoadmapItem[]
  organisations: readonly Organisation[]
  /** Those items as the page shows them, then the items new to it (`usePageItems`). */
  pageItems: readonly PageItem[]
  /** The page's one item dialog (`useItemDialog`). */
  itemDialog: PageItemDialog
  /** A new item was removed, its card with it: focus needs somewhere to go (S6). */
  onItemRemoved: () => void
}

/**
 * A roadmap's items: those the public site leaves out first, flagged (D4), then all six
 * placements in the public site's order, each under its heading, saying when it has
 * none (D1). A roadmap with no items, and none pending, has one dashed panel instead,
 * saying what to add, with "Add an item" (D5, STY-042 S2, STY-046 S8). Each item can be
 * moved, and shows its pending changes, in its pending placement (STY-025, STY-031),
 * last there, in the order moved (STY-051 S1); an item added and not yet published
 * shows after those (STY-046 S3). A placement whose order is pending shows its items
 * in it, with "Order changed" and "Undo order" beside its heading, which takes focus
 * once the order is undone (STY-050 S3); what a move within a placement and "Undo
 * order" came to is said in a status line. Edit on a card, and "Add an item", open the
 * page's one item dialog, which is drawn here.
 */
export function RoadmapItems({
  roadmapId,
  items,
  organisations,
  pageItems,
  itemDialog,
  onItemRemoved,
}: RoadmapItemsProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const reordered = new Set(
    snapshot.changes.get(roadmapId)?.orders.map(({ placement }) => placement),
  )
  const { unplaced, placements } = useMemo(
    () =>
      groupRoadmapItems(
        pageItems,
        ({ shown }) => shown.placement,
        ({ turn }) => turn,
      ),
    [pageItems],
  )
  const [said, setSaid] = useState<{ serial: number; text: string }>()
  const headings = useRef(new Map<RoadmapPlacement, HTMLHeadingElement>())
  // A moved item's card is a new one, in another list, so focus is handed to it here.
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const cardHandlers = useMemo(
    () => ({
      requestFocus: (position: number, control: CardControl) => {
        setFocus({ position, control })
      },
      focused: () => {
        setFocus(null)
      },
      removed: onItemRemoved,
      announce: (text: string) => {
        setSaid((last) => ({ serial: (last?.serial ?? 0) + 1, text }))
      },
    }),
    [onItemRemoved],
  )
  const panelAddButton = useRef<HTMLButtonElement>(null)

  const undo = (placement: RoadmapPlacement) => {
    if (!discardable(snapshot, roadmapId)) return
    store.update(roadmapId, (changes) => undoOrder(changes, placement))
    // "Undo order" goes with the order, so focus goes to the heading it sat beside.
    headings.current.get(placement)?.focus()
    cardHandlers.announce(
      t("roadmaps.edit.order.undone", {
        placement: t(`roadmaps.items.placements.${placement}`),
      }),
    )
  }

  const list = (
    placed: readonly Positioned<PageItem>[],
    labelledBy: string,
    ordered: boolean,
  ) => (
    <ItemList
      roadmapId={roadmapId}
      items={items}
      organisations={organisations}
      placed={placed}
      ordered={ordered}
      labelledBy={labelledBy}
      focus={focus}
      cardHandlers={cardHandlers}
      onEdit={itemDialog.edit}
      dialogAt={itemDialog.cardAt}
      dialogOpener={itemDialog.cardOpener}
    />
  )

  const unplacedId = `${headingId}-unplaced`
  return (
    <>
      {pageItems.length === 0 ? (
        <StatusPanel
          compact
          title={t("roadmaps.items.empty.title")}
          description={t("roadmaps.items.empty.description")}
          action={
            <AddItemButton
              ref={panelAddButton}
              onAdd={() => {
                itemDialog.add(panelAddButton)
              }}
            />
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {/* There from the start, so what a move came to is announced. */}
          <p role="status" className="sr-only">
            {/* A new node each time, so a message said twice is announced twice. */}
            <span key={said?.serial}>{said?.text}</span>
          </p>
          {unplaced.length > 0 && (
            <div className="flex flex-col gap-3 border-l-8 border-status-warning-border pl-4 sm:pl-6">
              <h2
                id={unplacedId}
                className="flex items-center gap-2 text-heading-m [&>svg]:size-6 [&>svg]:shrink-0"
              >
                <TriangleAlertIcon aria-hidden="true" />
                {t("roadmaps.items.unplaced.title")}
              </h2>
              <p className="text-pretty">
                {t("roadmaps.items.unplaced.description")}
              </p>
              {list(unplaced, unplacedId, false)}
            </div>
          )}
          {placements.map(({ placement, items: placed }) => {
            const id = `${headingId}-${placement}`
            const name = t(`roadmaps.items.placements.${placement}`)
            return (
              <div key={placement} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2
                    id={id}
                    ref={(heading) => {
                      if (heading) headings.current.set(placement, heading)
                      else headings.current.delete(placement)
                    }}
                    tabIndex={-1}
                    className="text-heading-m outline-none focus-visible:focus-ring"
                  >
                    {name}
                  </h2>
                  {reordered.has(placement) && (
                    <>
                      <ChangedTag label={t("roadmaps.edit.order.changed")} />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!discardable(snapshot, roadmapId)}
                        focusableWhenDisabled
                        onClick={() => {
                          undo(placement)
                        }}
                      >
                        <Undo2Icon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {t("roadmaps.edit.order.undo")}{" "}
                        <span className="sr-only">{name}</span>
                      </Button>
                    </>
                  )}
                </div>
                {placed.length > 0 ? (
                  list(placed, id, true)
                ) : (
                  <p className="text-muted-foreground">
                    {t("roadmaps.items.noneInPlacement")}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* After either, so it stays as the first item added takes the panel's place. */}
      {itemDialog.drawn && (
        <ItemDialog key={itemDialog.drawn.key} {...itemDialog.drawn.props} />
      )}
    </>
  )
}

/** The control of the card at `position` that focus goes to as it next renders. */
interface FocusRequest {
  position: number
  control: CardControl
}

interface ItemListProps {
  roadmapId: string
  items: readonly RoadmapItem[]
  organisations: readonly Organisation[]
  /** The items listed, each with its position among the page's items. */
  placed: readonly Positioned<PageItem>[]
  /** Whether they are a placement's, in its order: the unplaced items are in none. */
  ordered: boolean
  labelledBy: string
  focus: FocusRequest | null
  cardHandlers: {
    requestFocus: (position: number, control: CardControl) => void
    focused: () => void
    removed: () => void
    announce: (text: string) => void
  }
  onEdit: (position: number) => void
  /** Where, among the page's items, the one is whose card holds `dialogOpener`. */
  dialogAt: number
  /** The ref that item's card gives its Edit (`EditableItemCard`). */
  dialogOpener: RefObject<HTMLButtonElement | null>
}

function ItemList({
  roadmapId,
  items,
  organisations,
  placed,
  ordered,
  labelledBy,
  focus,
  cardHandlers,
  onEdit,
  dialogAt,
  dialogOpener,
}: ItemListProps) {
  return (
    <ul aria-labelledby={labelledBy} className={itemGridClassName}>
      {placed.map(({ item: pageItem, position }, at) => (
        <EditableItemCard
          key={pageItem.key}
          roadmapId={roadmapId}
          items={items}
          pageItem={pageItem}
          organisations={organisations}
          position={position}
          order={ordered ? { at, count: placed.length } : undefined}
          onAnnounce={cardHandlers.announce}
          focusRequest={
            focus?.position === position ? focus.control : undefined
          }
          onFocusRequest={cardHandlers.requestFocus}
          onFocused={cardHandlers.focused}
          onEdit={onEdit}
          onRemoved={cardHandlers.removed}
          dialogOpener={dialogAt === position ? dialogOpener : undefined}
        />
      ))}
    </ul>
  )
}

/** Stands in for the items while they are read, announced once as loading. */
export function RoadmapItemsSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status">
      <span className="sr-only">{t("roadmaps.items.loading")}</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        <div className={itemGridClassName}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex flex-col gap-2.5 border bg-card p-4 shadow-card-bar"
            >
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
