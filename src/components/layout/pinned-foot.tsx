import { type ReactNode, useRef } from "react"

import { cn } from "@/lib/utils"

import { PageContainer } from "./page-container"
import { useMeasuredHeight, usePinnedInset, usePinning } from "./pinning"

export interface PinnedFootProps {
  /** Stacked from the top down; with none, nothing shows. */
  children: ReactNode
}

/**
 * What a page keeps at the foot of the screen, as a band across it, from the page's top
 * (STY-052 D10): it takes no room in the page's flow, its height keeping focus clear of
 * it and leaving room at the end of the page (`usePinnedInset`), and it never covers
 * more than half the screen, scrolling inside itself instead. Where the viewport is too
 * short (`usePinning`) it stays where it is in the page's flow.
 */
export function PinnedFoot({ children }: PinnedFootProps) {
  const pinning = usePinning()
  const foot = useRef<HTMLDivElement>(null)
  usePinnedInset("bottom", useMeasuredHeight(foot, pinning), pinning)

  return (
    <div
      ref={foot}
      data-slot="pinned-foot"
      data-pinned={pinning || undefined}
      className={cn(
        "border-t-4 border-status-info-border bg-background has-[>div:empty]:hidden",
        pinning && "fixed inset-x-0 bottom-0 z-40 max-h-1/2 overflow-y-auto",
      )}
    >
      <PageContainer
        className={cn(
          "flex flex-col gap-3 py-3",
          // In the page's flow its own container frames it already.
          !pinning && "max-w-none px-0 md:px-0",
        )}
      >
        {children}
      </PageContainer>
    </div>
  )
}
