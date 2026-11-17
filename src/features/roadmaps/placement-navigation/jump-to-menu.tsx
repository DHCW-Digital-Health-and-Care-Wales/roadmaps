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
import { useJumpTargetName } from "./use-jump-target-name"
import type { PlacementNavigation } from "./use-placement-navigation"

export interface JumpToMenuProps {
  navigation: PlacementNavigation
}

/**
 * "Jump to", in a roadmap's title row (STY-053 D5): a menu of the page's jump targets,
 * each with its count and pending mark, the current one ticked. The button names the
 * current one once the page has reached it ("Jump to: Later", S3, D8). On a phone it
 * runs across the page. A jump waits for the menu to close, so focus lands on the
 * heading and stays there.
 */
export function JumpToMenu({
  navigation: { summaries, current, jump },
}: JumpToMenuProps) {
  const { t } = useTranslation()
  const nameOf = useJumpTargetName()
  const { choose, onOpenChangeComplete } = useMenuChoice(jump)

  return (
    <DropdownMenu onOpenChangeComplete={onOpenChangeComplete}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            className="w-full min-w-0 justify-between sm:w-auto"
          />
        }
      >
        <span className="truncate">
          {current
            ? t("roadmaps.jumpTo.current", { name: nameOf(current) })
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
