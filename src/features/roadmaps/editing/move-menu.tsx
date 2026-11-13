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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ROADMAP_PLACEMENTS,
  type RoadmapPlacement,
} from "@/domain/roadmap/roadmap-placement"

export interface MoveMenuProps {
  /** What is moved, for assistive technology: "Move First item". */
  subject: string
  /** Where the item is shown now; `null` while unplaced. */
  placement: RoadmapPlacement | null
  button: RefObject<HTMLButtonElement | null>
  onMove: (placement: RoadmapPlacement) => void
}

/**
 * "Move", a menu of every other placement by its heading, in page order (STY-031 S2):
 * an unplaced item is offered all six, and no choice unplaces one.
 */
export function MoveMenu({
  subject,
  placement,
  button,
  onMove,
}: MoveMenuProps) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={button}
        render={<Button variant="secondary" size="sm" />}
      >
        <ArrowRightLeftIcon data-icon="inline-start" aria-hidden="true" />
        {t("roadmaps.edit.move")} <span className="sr-only">{subject}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
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
