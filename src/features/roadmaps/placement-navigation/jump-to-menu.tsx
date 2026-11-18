import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMenuChoice } from "@/lib/use-menu-choice"

import { JumpTargetLabel } from "./jump-target-label"
import { jumpTargetName } from "./jump-targets"
import type { PlacementNavigation } from "./use-placement-navigation"

export interface JumpToMenuProps {
  navigation: PlacementNavigation
}

/**
 * "Jump to", the jump control narrower than a tablet, beside "Add an item" in a
 * roadmap's header and after More once stuck (STY-065 S7): a menu of the page's jump targets, each with its count and pending mark, the
 * current one ticked. The button names the current one once the page has reached it
 * ("Jump to: Later", STY-053 S3, D8), on one line, the name cut where the row is short
 * of room (STY-060 S5); its accessible name and the open list keep it whole. It fills
 * what holds it. A jump waits for the menu to close, so focus lands on the heading and
 * stays there.
 */
export function JumpToMenu({
  navigation: { summaries, current, jump },
}: JumpToMenuProps) {
  const { t } = useTranslation()
  const { choose, onOpenChangeComplete } = useMenuChoice(jump)

  return (
    <DropdownMenu onOpenChangeComplete={onOpenChangeComplete}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            // It gives way first in a row short of room, cutting its label.
            className="w-full min-w-0 shrink justify-between"
          />
        }
      >
        <span className="truncate">
          {current
            ? t("roadmaps.jumpTo.current", { name: jumpTargetName(current, t) })
            : t("roadmaps.jumpTo.menu")}
        </span>
        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-(--anchor-width)"
      >
        {summaries.map((summary) => {
          const isCurrent = summary.target === current
          return (
            <DropdownMenuItem
              key={summary.target}
              aria-current={isCurrent ? "location" : undefined}
              className="gap-2 py-1.5"
              onClick={() => {
                choose(summary.target)
              }}
            >
              <CheckIcon
                aria-hidden="true"
                className={isCurrent ? undefined : "invisible"}
              />
              <JumpTargetLabel summary={summary} />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
