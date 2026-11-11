import { ListTodoIcon, TriangleAlertIcon } from "lucide-react"
import { useId, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"

import {
  groupRoadmapItems,
  type PositionedRoadmapItem,
} from "../group-roadmap-items"
import { RoadmapItemCard } from "./roadmap-item-card"
import { StatusPanel } from "./status-panel"

/** One, two, then three columns of item cards, as the roadmap cards are laid out. */
const itemGridClassName =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"

export interface RoadmapItemsProps {
  items: readonly RoadmapItem[]
}

/**
 * A roadmap's items: those the public site leaves out first, flagged (D4), then all six
 * placements in the public site's order, each under its heading, saying when it has
 * none (D1). A roadmap with no items has one empty state instead (D5).
 */
export function RoadmapItems({ items }: RoadmapItemsProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const { unplaced, placements } = useMemo(
    () => groupRoadmapItems(items),
    [items],
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
          <ItemList items={unplaced} labelledBy={unplacedId} />
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
              <ItemList items={placed} labelledBy={id} />
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

function ItemList({
  items,
  labelledBy,
}: {
  items: readonly PositionedRoadmapItem[]
  labelledBy: string
}) {
  return (
    <ul aria-labelledby={labelledBy} className={itemGridClassName}>
      {items.map(({ item, position }) => (
        <RoadmapItemCard key={position} item={item} />
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
