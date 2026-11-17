import { TriangleAlertIcon } from "lucide-react"
import { useMemo, useRef, useState, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { ItemDialog } from "../dialogs/item-dialog"
import {
  type CardControl,
  EditableItemCard,
} from "../editing/editable-item-card"
import type { PageItem } from "../editing/page-items"
import { PlacementHeading } from "../editing/placement-heading"
import type { PageItemDialog } from "../editing/use-item-dialog"
import {
  hasGroupedItems,
  type Positioned,
  type RoadmapItemGroups,
} from "../group-roadmap-items"
import { jumpTargetHeadingId } from "../placement-navigation/jump-targets"
import { AddItemButton } from "./add-item-button"
import { CardGrid } from "./card-grid"
import { StatusPanel } from "./status-panel"

export interface RoadmapItemsProps {
  roadmapId: string
  /** The roadmap's items as last read. */
  items: readonly RoadmapItem[]
  organisations: readonly Organisation[]
  /**
   * Those items as the page shows them, then the items new to it, by placement
   * (`groupPageItems`).
   */
  groups: RoadmapItemGroups<PageItem>
  /** The page's one item dialog (`useItemDialog`). */
  itemDialog: PageItemDialog
  /** A new item was removed, its card with it: focus needs somewhere to go (S6). */
  onItemRemoved: () => void
}

/**
 * A roadmap's items: those the public site leaves out first, flagged (D4), then all six
 * placements in the public site's order, each under its heading, saying when it has
 * none (D1); each heading is where the placement navigation jumps (STY-053). A roadmap
 * with no items, and none pending, has one dashed panel instead, saying what to add,
 * with "Add an item" (D5, STY-042 S2, STY-046 S8). Each item can be moved, and shows
 * its pending changes, in its pending placement (STY-025, STY-031), last there, in the
 * order moved (STY-051 S1); an item added and not yet published shows after those
 * (STY-046 S3). A placement whose order is pending shows its items in it, under a
 * heading that says so (`PlacementHeading`, STY-050 S3); what a move within a
 * placement and "Undo order" came to is said in a status line. Edit on a card, and
 * "Add an item", open the page's one item dialog, which is drawn here.
 */
export function RoadmapItems({
  roadmapId,
  items,
  organisations,
  groups,
  itemDialog,
  onItemRemoved,
}: RoadmapItemsProps) {
  const { t } = useTranslation()
  const { unplaced, placements } = groups
  const [said, setSaid] = useState<{ serial: number; text: string }>()
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

  const unplacedId = jumpTargetHeadingId("unplaced")
  return (
    <>
      {!hasGroupedItems(groups) ? (
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
                // Where the placement navigation moves focus (STY-053 S4).
                tabIndex={-1}
                className="flex items-center gap-2 text-heading-m outline-none focus-visible:focus-ring [&>svg]:size-6 [&>svg]:shrink-0"
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
            const id = jumpTargetHeadingId(placement)
            return (
              <div key={placement} className="flex flex-col gap-3">
                <PlacementHeading
                  roadmapId={roadmapId}
                  placement={placement}
                  id={id}
                  onAnnounce={cardHandlers.announce}
                />
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
    <CardGrid aria-labelledby={labelledBy}>
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
    </CardGrid>
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
        <CardGrid>
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              className="flex flex-col gap-2.5 border bg-card p-4 shadow-card-bar"
            >
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </li>
          ))}
        </CardGrid>
      </div>
    </div>
  )
}
