import {
  ChevronDownIcon,
  EllipsisIcon,
  PencilIcon,
  RefreshCwIcon,
} from "lucide-react"
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
import { PublishedStateIcon } from "../editing/published-state-icon"
import type { PublishedState } from "../editing/use-published-state"

export interface RoadmapMoreMenuProps {
  /** A read is in flight: Refresh is busy, and More spins. */
  fetching: boolean
  onRefresh: () => void
  /** "Edit product details" was chosen, with More, where focus returns. */
  onEdit: (from: HTMLElement | null) => void
  /** Publishing or unpublishing the roadmap, when More offers it. */
  publishedState: PublishedState | null
  /**
   * An ellipsis and its chevron, still named "More", as in a phone's stuck header
   * (STY-060 D2, D5).
   */
  compact?: boolean
  className?: string | undefined
}

/**
 * "More", in a roadmap's header: "Edit product details", which opens the roadmap
 * dialog (STY-065 S5), Refresh, which reads the page's roadmap data again, and
 * "Unpublish roadmap", or "Publish roadmap" once the header has stuck (STY-052 D6,
 * STY-059 D7), shown as "…" where `compact`. An item's action waits for the menu to
 * close, so focus is back on More, where what it opens returns it. After the session
 * has expired Refresh and the publishing items ask to reconnect first, then carry on
 * (STY-057).
 */
export function RoadmapMoreMenu({
  fetching,
  onRefresh,
  onEdit,
  publishedState,
  compact = false,
  className,
}: RoadmapMoreMenuProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const refresh = useSessionAction(onRefresh)
  const askPublishedState = useSessionAction(() => {
    publishedState?.ask()
  })
  const actions = {
    // It writes nothing, so it never asks to reconnect.
    edit: onEdit,
    refresh,
    publishedState: askPublishedState,
  }
  const { choose, onOpenChangeComplete } = useMenuChoice(
    (chosen: keyof typeof actions) => {
      actions[chosen](triggerRef.current)
    },
  )

  return (
    <DropdownMenu onOpenChangeComplete={onOpenChangeComplete}>
      <DropdownMenuTrigger
        ref={triggerRef}
        aria-busy={fetching}
        render={
          <Button
            variant="secondary"
            className={cn(compact && "gap-1", className)}
          />
        }
      >
        {fetching ? (
          <RefreshCwIcon
            data-icon="inline-start"
            aria-hidden="true"
            className="animate-spin"
          />
        ) : (
          compact && (
            <EllipsisIcon data-icon="inline-start" aria-hidden="true" />
          )
        )}
        <span className={cn(compact && "sr-only")}>{t("roadmaps.more")}</span>
        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuItem
          onClick={() => {
            choose("edit")
          }}
        >
          <PencilIcon aria-hidden="true" />
          {t("roadmaps.editDetails")}
        </DropdownMenuItem>
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
  const verb = publishedStateAction(state)
  return (
    <DropdownMenuItem disabled={!state.available} onClick={onChoose}>
      <PublishedStateIcon action={verb} aria-hidden="true" />
      {t(`roadmaps.publishRoadmap.action.${verb}`)}
    </DropdownMenuItem>
  )
}
