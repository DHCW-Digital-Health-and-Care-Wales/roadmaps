import { ListTodoIcon, TriangleAlertIcon } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { ItemChanges } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import {
  type CardControl,
  EditableItemCard,
} from "../editing/editable-item-card"
import { applyItemChanges, matchItemChanges } from "../editing/pending-changes"
import { useRoadmapChanges } from "../editing/pending-changes-context"
import {
  groupRoadmapItems,
  type PositionedRoadmapItem,
} from "../group-roadmap-items"
import { useItemCardKeys } from "./item-card-keys"
import { StatusPanel } from "./status-panel"

/** One, two, then three columns of item cards, as the roadmap cards are laid out. */
const itemGridClassName =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"

export interface RoadmapItemsProps {
  roadmapId: string
  items: readonly RoadmapItem[]
  organisations: readonly Organisation[]
}

/**
 * A roadmap's items: those the public site leaves out first, flagged (D4), then all six
 * placements in the public site's order, each under its heading, saying when it has
 * none (D1). A roadmap with no items has one empty state instead (D5). Each item can be
 * edited and moved, and shows its pending changes, in its pending placement (STY-025,
 * STY-031).
 */
export function RoadmapItems({
  roadmapId,
  items,
  organisations,
}: RoadmapItemsProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const changes = useRoadmapChanges(roadmapId)
  const entries = useMemo(
    () => matchItemChanges(items, changes),
    [items, changes],
  )
  // A card whose form is open stays where it opened, by `cardHoldKey`: moving it to
  // another list would make it a new card, losing what the form holds.
  const [held, setHeld] = useState<
    ReadonlyMap<string, RoadmapPlacement | null>
  >(new Map())
  const { unplaced, placements } = useMemo(
    () =>
      groupRoadmapItems(items, (item, position) => {
        const key = cardHoldKey(item, position)
        return held.has(key)
          ? (held.get(key) ?? null)
          : applyItemChanges(item, entries.get(position)).placement
      }),
    [items, entries, held],
  )
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
      hold: (key: string, placement: RoadmapPlacement | null | undefined) => {
        setHeld((current) => {
          if (current.get(key) === placement) return current
          const next = new Map(current)
          if (placement === undefined) next.delete(key)
          else next.set(key, placement)
          return next
        })
      },
    }),
    [],
  )
  const list = (
    placed: readonly PositionedRoadmapItem[],
    labelledBy: string,
  ) => (
    <ItemList
      roadmapId={roadmapId}
      items={items}
      organisations={organisations}
      placed={placed}
      entries={entries}
      labelledBy={labelledBy}
      focus={focus}
      cardHandlers={cardHandlers}
    />
  )

  if (items.length === 0) {
    return (
      <StatusPanel
        icon={<ListTodoIcon />}
        title={t("roadmaps.items.empty.title")}
        description={t("roadmaps.items.empty.description")}
      />
    )
  }

  const unplacedId = `${headingId}-unplaced`
  return (
    <div className="flex flex-col gap-10">
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
          {list(unplaced, unplacedId)}
        </div>
      )}
      {placements.map(({ placement, items: placed }) => {
        const id = `${headingId}-${placement}`
        return (
          <div key={placement} className="flex flex-col gap-3">
            <h2 id={id} className="text-heading-m">
              {t(`roadmaps.items.placements.${placement}`)}
            </h2>
            {placed.length > 0 ? (
              list(placed, id)
            ) : (
              <p className="text-muted-foreground">
                {t("roadmaps.items.noneInPlacement")}
              </p>
            )}
          </div>
        )
      })}
    </div>
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
  placed: readonly PositionedRoadmapItem[]
  entries: ReadonlyMap<number, ItemChanges>
  labelledBy: string
  focus: FocusRequest | null
  cardHandlers: {
    requestFocus: (position: number, control: CardControl) => void
    focused: () => void
    hold: (key: string, placement: RoadmapPlacement | null | undefined) => void
  }
}

/** Which item a held card shows: by its ID, or with none by its place. */
function cardHoldKey(item: RoadmapItem, position: number): string {
  return item.id ?? `at:${String(position)}`
}

function ItemList({
  roadmapId,
  items,
  organisations,
  placed,
  entries,
  labelledBy,
  focus,
  cardHandlers,
}: ItemListProps) {
  const keys = useItemCardKeys(placed)
  return (
    <ul aria-labelledby={labelledBy} className={itemGridClassName}>
      {placed.map(({ item, position }, index) => (
        <EditableItemCard
          key={keys[index]}
          roadmapId={roadmapId}
          items={items}
          item={item}
          organisations={organisations}
          position={position}
          entry={entries.get(position)}
          focusRequest={
            focus?.position === position ? focus.control : undefined
          }
          onFocusRequest={cardHandlers.requestFocus}
          onFocused={cardHandlers.focused}
          holdKey={cardHoldKey(item, position)}
          onHold={cardHandlers.hold}
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
