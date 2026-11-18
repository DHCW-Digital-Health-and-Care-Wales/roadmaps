import { type ReactNode, useRef } from "react"

import { cn } from "@/lib/utils"

import { PageContainer } from "./page-container"
import { useMeasuredHeight, usePinnedInset, usePinning } from "./pinning"

/** Each slot counts as empty when it renders nothing: an empty wrapper still shows. */
export interface PinnedFootProps {
  /** Notices, stacked above the bar: past the room they have, they scroll. */
  notices: ReactNode
  /** What stays in view whatever the notices above it. */
  bar: ReactNode
}

/** In the page's flow, the page's own container frames it already. */
const IN_FLOW = "max-w-none px-0 md:px-0"

/**
 * What a page keeps at the foot of the screen, as a band across it beside the shell's
 * navigation, from the page's top (STY-052 D10): it takes no room in the page's flow,
 * its height keeping focus clear of it and leaving room at the end of the page
 * (`usePinnedInset`). It never covers more than half the screen: the notices scroll
 * inside it, the bar always in view (D14). Where the viewport is too short
 * (`usePinning`) it stays where it is in the page's flow. With nothing in it, it shows
 * nothing.
 */
export function PinnedFoot({ notices, bar }: PinnedFootProps) {
  const pinning = usePinning()
  const foot = useRef<HTMLDivElement>(null)
  usePinnedInset("bottom", useMeasuredHeight(foot, pinning), pinning)

  return (
    <div
      ref={foot}
      data-slot="pinned-foot"
      data-pinned={pinning || undefined}
      className={cn(
        "flex flex-col border-t-4 border-status-info-border bg-background pb-3 [&:not(:has([data-slot=page-container]>*))]:hidden",
        pinning &&
          "fixed right-0 bottom-0 left-(--navigation-width) z-40 max-h-1/2",
      )}
    >
      <div
        data-slot="pinned-notices"
        className={cn(
          "min-h-0 has-[>div:empty]:hidden",
          pinning && "overflow-y-auto",
        )}
      >
        <PageContainer
          className={cn("flex flex-col gap-3 pt-3", !pinning && IN_FLOW)}
        >
          {notices}
        </PageContainer>
      </div>
      <PageContainer
        className={cn("shrink-0 pt-3 empty:hidden", !pinning && IN_FLOW)}
      >
        {bar}
      </PageContainer>
    </div>
  )
}
