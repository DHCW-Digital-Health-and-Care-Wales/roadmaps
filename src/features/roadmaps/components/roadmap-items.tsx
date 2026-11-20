import { TriangleAlertIcon } from "lucide-react"
import {
  type ReactNode,
  type RefObject,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import { ItemDialog } from "../dialogs/item-dialog"
import { EditableItem, type ItemControl } from "../editing/editable-item"
import { travelNames } from "../editing/item-travel"
import type { MarkMoved, MovedMark, PageMovedMark } from "../editing/moved-mark"
import {
  groupPageItemsWith,
  type PageItem,
  placeInOrder,
} from "../editing/page-items"
import { usePendingChangesStore } from "../editing/pending-changes-context"
import type { PublishAction } from "../editing/pending-changes-store"
import { PlacementHeading } from "../editing/placement-heading"
import { QuickAdd } from "../editing/quick-add"
import { RemovalDialog } from "../editing/removal-dialog"
import type { PageItemDialog } from "../editing/use-item-dialog"
import { useRemovalDialog } from "../editing/use-removal-dialog"
import {
  hasGroupedItems,
  type Positioned,
  type RoadmapItemGroups,
} from "../group-roadmap-items"
import type { ItemsView } from "../hooks/use-items-view"
import { jumpTargetHeadingId } from "../placement-navigation/jump-targets"
import { AddItemButton } from "./add-item-button"
import { CardGrid } from "./card-grid"
import { CompactList } from "./compact-list"
import { StatusPanel } from "./status-panel"

export interface RoadmapItemsProps {
  roadmapId: string
  /** The roadmap's items as last read. */
  items: readonly RoadmapItem[]
  organisations: readonly Organisation[]
  /** The page's items, by position (`usePageItems`). */
  pageItems: readonly PageItem[]
  /**
   * Those items as the page shows them, then the items new to it, by placement
   * (`groupPageItems`).
   */
  groups: RoadmapItemGroups<PageItem>
  /** Whether the items show as cards or as rows (STY-067). */
  view: ItemsView
  /** The page's one item dialog (`useItemDialog`). */
  itemDialog: PageItemDialog
  /** The page's moved mark (`useMovedMark`, STY-071). */
  movedMark: PageMovedMark
  /** Whether the roadmap's changes are published or saved, as Remove's question says. */
  action: PublishAction
  /** A new item was removed, its card or row with it: focus needs somewhere to go (S6). */
  onItemRemoved: () => void
}

/**
 * A roadmap's items: those the public site leaves out first, flagged (D4), then all six
 * placements in the public site's order, each under its heading and ending with its
 * quick add, which adds an item there by its title (STY-080 S1); each heading is where
 * the placement navigation jumps (STY-053). A roadmap with no items, and none pending,
 * has one dashed panel instead, saying what to add, with "Add an item" (D5, STY-042
 * S2, STY-046 S8). Each item can be moved, and shows its pending changes, in its
 * pending placement (STY-025, STY-031), last there, in the order moved (STY-051 S1);
 * an item added and not yet published shows after those (STY-046 S3). A placement
 * whose order is pending shows its items in it, under a heading that says so
 * (`PlacementHeading`, STY-050 S3); what a move within a placement and "Undo order"
 * came to is said in a status line. Edit on an item, and
 * "Add an item", open the page's one item dialog, which is drawn here. The items show
 * as cards, or as the compact view's rows, under the same headings in the same groups
 * and order (`view`, STY-067 S3). An item's Remove asks first, in the page's one
 * removal dialog, drawn here too (STY-049 S1). A removed item shows where it did, but
 * is no stop of its placement's order: the others' positions count without it (S8).
 * The item moved last carries the moved mark (STY-071); a move to another placement
 * from the Move menu is said in the status line too, with where it shows there (S5).
 * A move from the Move menu travels there first, across lists too, and "Undo order"
 * has the items travel back, each item paired with itself by its view transition name
 * (STY-072, STY-073).
 */
export function RoadmapItems({
  roadmapId,
  items,
  organisations,
  pageItems,
  groups,
  view,
  itemDialog,
  movedMark,
  action,
  onItemRemoved,
}: RoadmapItemsProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const { unplaced, placements } = groups
  const [said, setSaid] = useState<{ serial: number; text: string }>()
  // A moved item is drawn anew, in another list, so focus is handed to it here.
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const cardHandlers = useMemo(
    () => ({
      requestFocus: (position: number, control: ItemControl) => {
        setFocus({ position, control })
      },
      focused: () => {
        setFocus(null)
      },
      announce: (text: string) => {
        setSaid((last) => ({ serial: (last?.serial ?? 0) + 1, text }))
      },
    }),
    [],
  )
  const removalDialog = useRemovalDialog({
    roadmapId,
    action,
    items,
    pageItems,
    onFocusRequest: cardHandlers.requestFocus,
    onNewItemRemoved: onItemRemoved,
    onMoved: movedMark.moved,
  })
  // A move from the Move menu marks the item and, to another placement, is said with
  // where it now shows there (S5), from the store the move has just changed. A move
  // within one is said by the item (`EditableItem`); one from a dialog says nothing new
  // (D11, D16).
  const movedByMenu: MarkMoved = (item, move, to) => {
    movedMark.moved(item, move, to)
    if (move.kind !== "placement") return
    const place = placeInOrder(
      groupPageItemsWith(
        items,
        store.getSnapshot().changes.get(roadmapId),
        pageItems,
      ),
      item.key,
    )
    if (!place) return
    cardHandlers.announce(
      t(
        move.from === null ? "roadmaps.edit.placedIn" : "roadmaps.edit.movedTo",
        {
          placement: t(`roadmaps.items.placements.${to}`),
          position: place.at + 1,
          count: place.count,
        },
      ),
    )
  }
  const panelAddButton = useRef<HTMLButtonElement>(null)
  const names = useMemo(() => travelNames(pageItems), [pageItems])

  const list = (
    placed: readonly Positioned<PageItem>[],
    labelledBy: string,
    ordered: boolean,
    end?: ReactNode,
  ) => (
    <ItemList
      roadmapId={roadmapId}
      items={items}
      organisations={organisations}
      view={view}
      placed={placed}
      ordered={ordered}
      labelledBy={labelledBy}
      focus={focus}
      cardHandlers={cardHandlers}
      mark={movedMark.mark}
      travelNames={names}
      onMovedByMenu={movedByMenu}
      onEdit={itemDialog.edit}
      onRemove={removalDialog.ask}
      dialogAt={itemDialog.cardAt}
      dialogOpener={itemDialog.cardOpener}
      end={end}
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
                  onUndone={movedMark.orderUndone}
                />
                {list(
                  placed,
                  id,
                  true,
                  <QuickAdd
                    roadmapId={roadmapId}
                    items={items}
                    placement={placement}
                    view={view}
                    first={placed.length === 0}
                    onAnnounce={cardHandlers.announce}
                    onExpand={itemDialog.add}
                  />,
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
      {removalDialog.drawn && (
        <RemovalDialog
          key={removalDialog.drawn.key}
          {...removalDialog.drawn.props}
        />
      )}
    </>
  )
}

/**
 * An item's place among its placement's items, `at` of `count`: none for an unplaced
 * item, which is in no order, or a removed one, which has no place in it.
 */
function orderOf(
  ordered: boolean,
  at: number | undefined,
  count: number,
): { at: number; count: number } | undefined {
  return ordered && at !== undefined ? { at, count } : undefined
}

/** The control of the item at `position` that focus goes to as it next renders. */
interface FocusRequest {
  position: number
  control: ItemControl
}

interface ItemListProps {
  roadmapId: string
  items: readonly RoadmapItem[]
  organisations: readonly Organisation[]
  view: ItemsView
  /** The items listed, each with its position among the page's items. */
  placed: readonly Positioned<PageItem>[]
  /** Whether they are a placement's, in its order: the unplaced items are in none. */
  ordered: boolean
  labelledBy: string
  focus: FocusRequest | null
  cardHandlers: {
    requestFocus: (position: number, control: ItemControl) => void
    focused: () => void
    announce: (text: string) => void
  }
  /** The item moved last, if one is marked. */
  mark: MovedMark | null
  /** Each item's view transition name, by card key (`travelNames`, STY-072). */
  travelNames: ReadonlyMap<string, string>
  onMovedByMenu: MarkMoved
  onEdit: (position: number) => void
  onRemove: (position: number) => void
  /** Where, among the page's items, the one is that holds `dialogOpener`. */
  dialogAt: number
  /** The ref that item gives its Edit (`EditableItem`). */
  dialogOpener: RefObject<HTMLButtonElement | null>
  /** The list's last item, after the items: a placement's quick add. */
  end?: ReactNode
}

function ItemList({
  roadmapId,
  items,
  organisations,
  view,
  placed,
  ordered,
  labelledBy,
  focus,
  cardHandlers,
  mark,
  travelNames,
  onMovedByMenu,
  onEdit,
  onRemove,
  dialogAt,
  dialogOpener,
  end,
}: ItemListProps) {
  const List = view === "compact" ? CompactList : CardGrid
  // A removed item has no place in its placement's order (STY-049 S8).
  const stops = placed.filter(({ item }) => item.removal === undefined)
  const stopAt = new Map(stops.map(({ position }, at) => [position, at]))
  return (
    <List aria-labelledby={labelledBy}>
      {placed.map(({ item: pageItem, position }) => (
        <EditableItem
          key={pageItem.key}
          roadmapId={roadmapId}
          items={items}
          pageItem={pageItem}
          organisations={organisations}
          view={view}
          position={position}
          order={orderOf(ordered, stopAt.get(position), stops.length)}
          onAnnounce={cardHandlers.announce}
          mark={mark?.key === pageItem.key ? mark : undefined}
          travelName={travelNames.get(pageItem.key)}
          onMovedByMenu={onMovedByMenu}
          focusRequest={
            focus?.position === position ? focus.control : undefined
          }
          onFocusRequest={cardHandlers.requestFocus}
          onFocused={cardHandlers.focused}
          onEdit={onEdit}
          onRemove={onRemove}
          dialogOpener={dialogAt === position ? dialogOpener : undefined}
        />
      ))}
      {end}
    </List>
  )
}

/**
 * Stands in for the items while they are read, announced once as loading: cards, or
 * rows in the compact view (STY-067 S12).
 */
export function RoadmapItemsSkeleton({ view }: { view: ItemsView }) {
  const { t } = useTranslation()
  return (
    <div role="status">
      <span className="sr-only">{t("roadmaps.items.loading")}</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        {view === "compact" ? (
          <CompactList>
            {[0, 1, 2].map((index) => (
              <li
                key={index}
                className="flex min-h-12 items-center gap-3 border-t px-3 py-2 first:border-t-0"
              >
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 flex-1" />
              </li>
            ))}
          </CompactList>
        ) : (
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
        )}
      </div>
    </div>
  )
}
