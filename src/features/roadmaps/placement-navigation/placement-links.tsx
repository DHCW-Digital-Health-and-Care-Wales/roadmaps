import { useLocation, useRouter } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { JumpTargetLabel } from "./jump-target-label"
import type { PlacementNavigation } from "./use-placement-navigation"

export interface PlacementLinksProps {
  navigation: PlacementNavigation
  className?: string | undefined
}

/**
 * A row of links to the page's jump targets, the jump control from a tablet's width,
 * under the header's details at the top and under the title once stuck (STY-065 S6),
 * each with its count and pending mark, the current one bold and underlined (STY-053
 * S2, S3). It starts on the page's left edge, over a rule. Short of room, as in Cymraeg
 * on a tablet, the links wrap onto another line, so none passes the edge. A link jumps
 * without changing the address, as the skip link does (D8, ADR-004); its address is the
 * page's own, since the router owns the fragment, so one opened in a new tab opens the
 * roadmap.
 */
export function PlacementLinks({
  navigation: { summaries, current, jump },
  className,
}: PlacementLinksProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const here = router.history.createHref(useLocation().href)
  return (
    <nav
      aria-label={t("roadmaps.jumpTo.links")}
      className={cn("border-b", className)}
    >
      {/* The first link's text, not its padding, starts on the page's edge. */}
      <ul className="-mx-2.5 flex flex-wrap gap-1">
        {summaries.map((summary) => {
          const isCurrent = summary.target === current
          return (
            <li key={summary.target} className="flex">
              <a
                href={here}
                aria-current={isCurrent ? "location" : undefined}
                className={cn(
                  "flex items-center gap-1.5 border-b-4 border-transparent px-2.5 py-1.5 text-body-xs whitespace-nowrap text-foreground outline-none focus-visible:focus-link [&>svg]:size-4 [&>svg]:shrink-0",
                  isCurrent && "border-primary font-bold",
                )}
                onClick={(event) => {
                  // Jump without navigating: the address stays the page's.
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
