import type { ReactNode } from "react"

import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"

import { HorizonFlag } from "./horizon-flag"
import { ItemFields } from "./item-fields"

export interface RoadmapItemCardProps {
  item: RoadmapItem
  /** The organisation list, which the item's `organisationIds` name (ADR-014). */
  organisations: readonly Organisation[]
  /** Controls at the foot of the card, such as Edit. */
  actions?: ReactNode
}

/**
 * A roadmap item as plain text (ADR-011), as the Cards view shows it: its title as a
 * heading, an unplaced item's flag saying what is wrong with its horizon, then each
 * field it has (`ItemFields`), cut after three lines (STY-066). A list item, for a list
 * of items.
 */
export function RoadmapItemCard({
  item,
  organisations,
  actions,
}: RoadmapItemCardProps) {
  const language = useLanguage()
  return (
    <li className="flex flex-col gap-3 border bg-card p-4 text-card-foreground shadow-card-bar">
      <h3 className="text-heading-xs wrap-break-word whitespace-pre-line">
        {localise(item.title, language)}
      </h3>
      {item.writtenHorizon !== null && (
        <HorizonFlag writtenHorizon={item.writtenHorizon} />
      )}
      <ItemFields item={item} organisations={organisations} />
      {actions && <div className="mt-auto pt-1">{actions}</div>}
    </li>
  )
}
