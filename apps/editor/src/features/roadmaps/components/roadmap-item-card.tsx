import type { FocusEventHandler, ReactNode } from "react"

import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

import { HorizonFlag } from "./horizon-flag"
import { ItemFields } from "./item-fields"
import { STRUCK_TEXT_CLASSES } from "./struck-text"

export interface RoadmapItemCardProps {
  item: RoadmapItem
  /** The organisation list, which the item's `organisationIds` name (ADR-014). */
  organisations: readonly Organisation[]
  /** Controls at the foot of the card, such as Edit. */
  actions?: ReactNode
  /**
   * Whether its text is struck through, as an item removed and not yet published is
   * (STY-049 S2): its controls are not.
   */
  struck?: boolean
  /**
   * Whether it is the item last moved (STY-071): the mark's edge round the card. Its label
   * is with the pending tag at the foot (`actions`, STY-075 S1).
   */
  marked?: boolean
  /**
   * The view transition name its travel after a move pairs it by (STY-072,
   * `travelNames`); with the moved `marked`, it travels raised above the others.
   */
  travelName?: string | undefined
  /** Focus has come to one of its controls. */
  onFocus?: FocusEventHandler<HTMLLIElement> | undefined
}

/**
 * A roadmap item as plain text (ADR-011), as the Cards view shows it: its title as a
 * heading, an unplaced item's flag saying what is wrong with its horizon, then each
 * field it has (`ItemFields`), cut after three lines (STY-066), struck through when
 * `struck`. A `marked` card has the moved mark's edge over its own border and
 * padding, so nothing in it shifts (STY-071 S1). A list item, for a list of items.
 */
export function RoadmapItemCard({
  item,
  organisations,
  actions,
  struck = false,
  marked = false,
  travelName,
  onFocus,
}: RoadmapItemCardProps) {
  const language = useLanguage()
  return (
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions -- onFocus only observes focus bubbling up from the card's controls.
    <li
      className={cn(
        "flex flex-col gap-3 border bg-card p-4 text-card-foreground",
        marked
          ? "relative z-1 shadow-moved-mark [view-transition-class:moved-item]"
          : "shadow-card-bar",
      )}
      style={{ viewTransitionName: travelName }}
      onFocus={onFocus}
    >
      <div className={cn("flex flex-col gap-3", struck && STRUCK_TEXT_CLASSES)}>
        <h3 className="text-heading-xs wrap-break-word whitespace-pre-line">
          {localise(item.title, language)}
        </h3>
        {item.writtenHorizon !== null && (
          <HorizonFlag writtenHorizon={item.writtenHorizon} />
        )}
        <ItemFields item={item} organisations={organisations} />
      </div>
      {Boolean(actions) && <div className="mt-auto pt-1">{actions}</div>}
    </li>
  )
}
