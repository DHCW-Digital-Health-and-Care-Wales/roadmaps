import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { JumpTargetLabel } from "./jump-target-label"
import { jumpTargetHeadingId } from "./jump-targets"
import type { PlacementNavigation } from "./use-placement-navigation"

export interface PlacementLinksProps {
  navigation: PlacementNavigation
}

/**
 * A row of links to the page's jump targets, under "About this roadmap" and scrolling
 * away with it (STY-053 D5), each with its count and pending mark, the current one bold
 * and underlined. On a phone the row scrolls inside itself, never the page (S7). A link
 * jumps without changing the address, as the skip link does (D8, ADR-004).
 */
export function PlacementLinks({
  navigation: { summaries, current, jump },
}: PlacementLinksProps) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t("roadmaps.jumpTo.links")}
      // Relative, so the links' screen-reader text scrolls inside the row too.
      className="relative -mx-4 overflow-x-auto border-y px-4 md:mx-0 md:px-0"
    >
      <ul className="flex gap-1 py-1">
        {summaries.map((summary) => {
          const isCurrent = summary.target === current
          return (
            <li key={summary.target} className="flex">
              <a
                href={`#${jumpTargetHeadingId(summary.target)}`}
                aria-current={isCurrent ? "location" : undefined}
                className={cn(
                  "flex items-center gap-1.5 border-b-4 border-transparent px-2.5 py-1.5 text-body-xs whitespace-nowrap text-foreground outline-none focus-visible:focus-link [&>svg]:size-4 [&>svg]:shrink-0",
                  isCurrent && "border-primary font-bold",
                )}
                onClick={(event) => {
                  // Hash history owns the URL fragment, so jump without navigating.
                  event.preventDefault()
                  jump(summary.target)
                }}
              >
                <JumpTargetLabel summary={summary} />
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
