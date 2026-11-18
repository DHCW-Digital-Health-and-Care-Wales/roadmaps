import { ChevronDownIcon, RefreshCwIcon } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSessionAction } from "@/features/auth/session-action"
import { useMenuChoice } from "@/lib/use-menu-choice"
import { cn } from "@/lib/utils"

import { publishedStateAction } from "../editing/published-state-action"
import type { PublishedState } from "../editing/use-published-state"

export interface RoadmapMoreMenuProps {
  /** A read is in flight: Refresh is busy, and More spins. */
  fetching: boolean
  onRefresh: () => void
  /** Publishing or unpublishing the roadmap, when More offers it. */
  publishedState: PublishedState | null
}

/**
 * "More", in a roadmap's header: Refresh, which reads the page's roadmap data again,
 * and "Unpublish roadmap", or "Publish roadmap" once the header has stuck (STY-052 D6,
 * STY-059 D7). An item's action waits for the menu to close, so focus is back on
 * More, where what it opens returns it. After the session has expired each asks to
 * reconnect first, then carries on (STY-057).
 */
export function RoadmapMoreMenu({
  fetching,
  onRefresh,
  publishedState,
}: RoadmapMoreMenuProps) {
  const { t } = useTranslation()
  const trigger = useRef<HTMLButtonElement>(null)
  const refresh = useSessionAction(onRefresh)
  const askPublishedState = useSessionAction(() => {
    publishedState?.ask()
  })
  const actions = { refresh, publishedState: askPublishedState }
  const { choose, onOpenChangeComplete } = useMenuChoice(
    (chosen: keyof typeof actions) => {
      actions[chosen](trigger.current)
    },
  )

  return (
    <DropdownMenu onOpenChangeComplete={onOpenChangeComplete}>
      <DropdownMenuTrigger
        ref={trigger}
        aria-busy={fetching}
        render={<Button variant="secondary" />}
      >
        {fetching && (
          <RefreshCwIcon
            data-icon="inline-start"
            aria-hidden="true"
            className="animate-spin"
          />
        )}
        {t("roadmaps.more")}
        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuItem
          disabled={fetching}
          onClick={() => {
            choose("refresh")
          }}
        >
          <RefreshCwIcon
            aria-hidden="true"
            className={cn(fetching && "animate-spin")}
          />
          {t("roadmaps.refresh")}
        </DropdownMenuItem>
        {publishedState && (
          <PublishedStateItem
            state={publishedState}
            onChoose={() => {
              choose("publishedState")
            }}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** "Unpublish roadmap" or "Publish roadmap", unavailable while it can't be chosen. */
function PublishedStateItem({
  state,
  onChoose,
}: {
  state: PublishedState
  onChoose: () => void
}) {
  const { t } = useTranslation()
  const { verb, Icon } = publishedStateAction(state)
  return (
    <DropdownMenuItem disabled={!state.available} onClick={onChoose}>
      <Icon aria-hidden="true" />
      {t(`roadmaps.publishRoadmap.action.${verb}`)}
    </DropdownMenuItem>
  )
}
