import { type ReactNode, useRef } from "react"

import { cn } from "@/lib/utils"

import { leftOutFocus } from "./left-out"
import { PageContainer } from "./page-container"
import {
  useMeasuredHeight,
  usePinnedInset,
  usePinning,
  useScrolledPast,
} from "./pinning"

export interface StickyHeaderProps {
  /**
   * The header, drawn slim while `stuck`: one set of controls, never a copy. Slim a
   * control by its props or classes, in place: moving it to another parent remounts it,
   * and focus on it is lost as the row sticks. A part it leaves out visually but keeps
   * reachable carries `LEFT_OUT` (`./left-out`) while stuck.
   */
  children: (stuck: boolean) => ReactNode
}

/**
 * A page's header that sticks to the top of the screen once it has scrolled wholly out
 * of view, as a band across the screen beside the shell's navigation, slimmed by its own
 * `children` (STY-052 D5). Its place in the page keeps the height it had there, so
 * nothing below it moves as it sticks or lets go. It never sticks where the viewport is
 * too short (`usePinning`), and while stuck its height keeps focus clear of it
 * (`usePinnedInset`). Focus reaching a part it leaves out lets it go, or passes it by
 * when tabbed into from before (`LEFT_OUT`).
 */
export function StickyHeader({ children }: StickyHeaderProps) {
  const pinning = usePinning()
  const place = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  const stuck = useScrolledPast(place, pinning)
  // Two heights of the one row: its place keeps the height the row had in the flow,
  // last measured before it stuck, while the inset follows the row's stuck height.
  const flowHeight = useMeasuredHeight(header, pinning && !stuck)
  const stuckHeight = useMeasuredHeight(header, stuck)
  usePinnedInset("top", stuckHeight, pinning)

  return (
    <div ref={place} style={stuck ? { height: flowHeight } : undefined}>
      <div
        ref={header}
        data-slot="sticky-header"
        data-stuck={stuck || undefined}
        onFocus={(event) => {
          if (!stuck) return
          const next = leftOutFocus(
            event.target,
            event.relatedTarget,
            event.currentTarget,
          )
          if (next === "release") {
            place.current?.scrollIntoView({ block: "start" })
          } else {
            next?.focus()
          }
        }}
        className={cn(
          stuck &&
            "fixed top-0 right-0 left-(--navigation-width) z-40 border-b-4 border-border bg-background py-3",
        )}
      >
        <PageContainer
          // In the page's flow its own container frames it already.
          className={cn(!stuck && "max-w-none px-0 md:px-0")}
        >
          {children(stuck)}
        </PageContainer>
      </div>
    </div>
  )
}
