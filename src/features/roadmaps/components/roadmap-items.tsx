import { ListTodoIcon, TriangleAlertIcon } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import type { ItemChanges } from "@/domain/roadmap/roadmap-changes"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

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
}

/**
 * A roadmap's items: those the public site leaves out first, flagged (D4), then all six
 * placements in the public site's order, each under its heading, saying when it has
 * none (D1). A roadmap with no items has one empty state instead (D5). Each item can be
 * edited and moved, and shows its pending changes, in its pending placement (STY-025,
 * STY-031).
 */
export function RoadmapItems({ roadmapId, items }: RoadmapItemsProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const changes = useRoadmapChanges(roadmapId)
  const entries = useMemo(
    () => matchItemChanges(items, changes),
    [items, changes],
  )
  const { unplaced, placements } = useMemo(
    () =>
      groupRoadmapItems(
        items,
        (item, position) =>
          applyItemChanges(item, entries.get(position)).placement,
      ),
    [items, entries],
  )
  // A moved item's card is a new one, in another list, so focus is handed to it here.
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const focusRequests = useMemo(
    () => ({
      request: (position: number, control: CardControl) => {
        setFocus({ position, control })
      },
      met: () => {
        setFocus(null)
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
      placed={placed}
      entries={entries}
      labelledBy={labelledBy}
      focus={focus}
      focusRequests={focusRequests}
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
  placed: readonly PositionedRoadmapItem[]
  entries: ReadonlyMap<number, ItemChanges>
  labelledBy: string
  focus: FocusRequest | null
  focusRequests: {
    request: (position: number, control: CardControl) => void
    met: () => void
  }
}

function ItemList({
  roadmapId,
  items,
  placed,
  entries,
  labelledBy,
  focus,
  focusRequests,
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
          position={position}
          entry={entries.get(position)}
          focusRequest={
            focus?.position === position ? focus.control : undefined
          }
          onFocusRequest={focusRequests.request}
          onFocused={focusRequests.met}
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
