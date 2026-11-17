import { ArrowRightLeftIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

import type { OrderMove } from "./placement-orders"

/** An item's place in its placement's order, as its Move menu offers to change it. */
export interface MenuPosition {
  /** Its 0-based place among the placement's items, as the page shows them. */
  at: number
  /** How many items the placement shows. */
  count: number
  /** Held, though focusable: the order can't be changed for now (STY-050 S15). */
  held: boolean
}

export interface MoveMenuProps {
  /** What is moved, for assistive technology: "Move First item". */
  subject: string
  /** Where the item is shown now; `null` while unplaced. */
  placement: RoadmapPlacement | null
  /**
   * Its position, when it can change: in a placement that shows two items or more
   * (STY-050 S1).
   */
  position?: MenuPosition | undefined
  button: RefObject<HTMLButtonElement | null>
  /** Held shut, though focusable: the item can't be moved for now. */
  disabled?: boolean
  onMove: (placement: RoadmapPlacement) => void
  onReorder: (to: OrderMove) => void
}

/** Each choice of position with its copy, in the order the menu lists them. */
const ORDER_MOVES = [
  ["top", "roadmaps.edit.order.toTop"],
  ["up", "roadmaps.edit.order.upOne"],
  ["down", "roadmaps.edit.order.downOne"],
  ["bottom", "roadmaps.edit.order.toBottom"],
] as const satisfies readonly (readonly [OrderMove, string])[]

/**
 * "Move", a menu of every other placement by its heading, in page order (STY-031 S2):
 * an unplaced item is offered all six, and no choice unplaces one. Above them, for an
 * item with a `position`, its position in its placement, in numerals (D7), and where
 * it can go there: "To the top" and "Up one" unless it is first, "Down one" and "To
 * the bottom" unless it is last (STY-050 S1).
 */
export function MoveMenu({
  subject,
  placement,
  position,
  button,
  disabled = false,
  onMove,
  onReorder,
}: MoveMenuProps) {
  const { t } = useTranslation()
  const first = position?.at === 0
  const last = position?.at === (position?.count ?? 0) - 1
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={button}
        disabled={disabled}
        render={<Button variant="secondary" size="sm" focusableWhenDisabled />}
      >
        <ArrowRightLeftIcon data-icon="inline-start" aria-hidden="true" />
        {t("roadmaps.edit.move")} <span className="sr-only">{subject}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {position && placement && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t("roadmaps.edit.order.position", {
                  placement: t(`roadmaps.items.placements.${placement}`),
                  position: position.at + 1,
                  count: position.count,
                })}
              </DropdownMenuLabel>
              {ORDER_MOVES.filter(([to]) =>
                to === "top" || to === "up" ? !first : !last,
              ).map(([to, label]) => (
                <DropdownMenuItem
                  key={to}
                  disabled={position.held}
                  onClick={() => {
                    onReorder(to)
                  }}
                >
                  {t(label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("roadmaps.edit.moveTo")}</DropdownMenuLabel>
          {ROADMAP_PLACEMENTS.filter((each) => each !== placement).map(
            (each) => (
              <DropdownMenuItem
                key={each}
                onClick={() => {
                  onMove(each)
                }}
              >
                {t(`roadmaps.items.placements.${each}`)}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
