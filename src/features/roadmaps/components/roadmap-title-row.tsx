import type { ReactNode, RefObject } from "react"

import { StickyHeader } from "@/components/layout/sticky-header"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  DESKTOP_WIDTH,
  useMediaQuery,
  WIDER_THAN_A_PHONE,
} from "@/lib/use-media-query"
import { cn } from "@/lib/utils"

import { ChangedTag } from "../editing/edit-controls"
import { PublishRoadmapButton } from "../editing/published-state-dialog"
import type { PublishedState } from "../editing/use-published-state"
import { AddItemButton } from "./add-item-button"
import { ListMismatchBadges } from "./list-mismatch-badges"
import { NotPublishedBadge } from "./not-published-badge"
import { RoadmapMoreMenu } from "./roadmap-more-menu"

export interface RoadmapTitleRowProps {
  roadmap: Roadmap
  /** The title as shown, pending edits applied. */
  title: string
  /** The title has a pending edit. */
  titleChanged: boolean
  /** The heading, where focus can be sent. */
  heading: RefObject<HTMLHeadingElement | null>
  publishedState: PublishedState
  /** A read of the page's roadmap data is in flight. */
  fetching: boolean
  onRefresh: () => void
  addItemButton: RefObject<HTMLButtonElement | null>
  /** The roadmap's items are read, so one can be added. */
  canAddItem: boolean
  onAddItem: () => void
  /**
   * The placement navigation's "Jump to" (STY-053 D5), while the page has placements to
   * jump to: among the controls on a desktop, or in a row of its own under them.
   */
  jumpTo?: ReactNode
}

/**
 * A roadmap's title row, which sticks at the top of the screen once the page has
 * scrolled past it (STY-052 S1, D5): its title, a Not published badge when it is not
 * public (STY-025 D8), a badge when it is out of step with the family or category list
 * (STY-027 S4, S8) and a Changed tag, then "Publish roadmap" while it is not published
 * (D15), "Jump to" (STY-053 D5), More (D6) and "Add an item" (STY-046 S1). Stuck, it
 * slims to one row: the title cut with an ellipsis, its full text still its name, and
 * no badges, "Jump to" cut where the row is still short of room; on a phone, "Add an
 * item" is an icon and "Publish roadmap" moves into More (D18, D19). Narrower than a
 * desktop, "Jump to" keeps a row of its own under the rest.
 */
export function RoadmapTitleRow({
  roadmap,
  title,
  titleChanged,
  heading,
  publishedState,
  fetching,
  onRefresh,
  addItemButton,
  canAddItem,
  onAddItem,
  jumpTo,
}: RoadmapTitleRowProps) {
  const phone = !useMediaQuery(WIDER_THAN_A_PHONE)
  // Narrower than a desktop, "Jump to" has a row of its own: beside the rest it would
  // push them off a tablet's screen, in Cymraeg above all.
  const jumpToInline = useMediaQuery(DESKTOP_WIDTH)
  return (
    <StickyHeader>
      {(stuck) => {
        const slim = stuck && phone
        const publishShown = publishedState.publishing && !slim
        return (
          <div className="flex flex-col gap-3">
            <div
              className={cn(
                "flex gap-3",
                stuck
                  ? "items-center"
                  : "flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
              )}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center gap-x-3 gap-y-2",
                  // Stuck, the title keeps some room as the controls give way.
                  stuck ? "min-w-24 flex-1" : "flex-wrap",
                )}
              >
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className={cn(
                    "outline-none focus-visible:focus-ring",
                    stuck
                      ? "truncate text-heading-s"
                      : "text-heading-xl text-pretty wrap-break-word",
                  )}
                >
                  {title}
                </h1>
                {!stuck && (
                  <>
                    {!roadmap.published && <NotPublishedBadge />}
                    <ListMismatchBadges roadmap={roadmap} />
                    {titleChanged && <ChangedTag />}
                  </>
                )}
              </div>
              <div
                className={cn(
                  "flex gap-3",
                  // Stuck, the row never wraps: "Jump to" gives way, cutting its
                  // placement's name, so every control stays on the screen.
                  stuck ? "min-w-0" : "shrink-0 flex-wrap",
                )}
              >
                {publishShown && (
                  <PublishRoadmapButton state={publishedState} />
                )}
                {jumpToInline && jumpTo}
                <RoadmapMoreMenu
                  fetching={fetching}
                  onRefresh={onRefresh}
                  publishedState={publishShown ? null : publishedState}
                />
                <AddItemButton
                  ref={addItemButton}
                  compact={slim}
                  disabled={!canAddItem}
                  onAdd={onAddItem}
                />
              </div>
            </div>
            {!jumpToInline && jumpTo}
          </div>
        )
      }}
    </StickyHeader>
  )
}
