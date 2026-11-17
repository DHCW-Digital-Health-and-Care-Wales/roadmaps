import type { RefObject } from "react"

import { StickyHeader } from "@/components/layout/sticky-header"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useMediaQuery } from "@/lib/use-media-query"
import { cn } from "@/lib/utils"

import { ChangedTag } from "../editing/edit-controls"
import { PublishRoadmapButton } from "../editing/published-state-dialog"
import type { PublishedState } from "../editing/use-published-state"
import { AddItemButton } from "./add-item-button"
import { ListMismatchBadges } from "./list-mismatch-badges"
import { NotPublishedBadge } from "./not-published-badge"
import { RoadmapMoreMenu } from "./roadmap-more-menu"

/** From Tailwind's `sm`: a viewport wider than a phone's. */
const WIDER_THAN_A_PHONE = "(min-width: 40rem)"

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
}

/**
 * A roadmap's title row, which sticks at the top of the screen once the page has
 * scrolled past it (STY-052 S1, D5): its title, a Not published badge when it is not
 * public (STY-025 D8), a badge when it is out of step with the family or category list
 * (STY-027 S4, S8) and a Changed tag, then "Publish roadmap" while it is not published
 * (D15), More (D6) and "Add an item" (STY-046 S1). Stuck, it slims to one row: the title
 * cut with an ellipsis, its full text still its name, and no badges; on a phone, "Add
 * an item" is an icon and "Publish roadmap" moves into More (D18, D19).
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
}: RoadmapTitleRowProps) {
  const phone = !useMediaQuery(WIDER_THAN_A_PHONE)
  return (
    <StickyHeader>
      {(stuck) => {
        const slim = stuck && phone
        const publishShown = publishedState.publishing && !slim
        return (
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
                stuck ? "flex-1" : "flex-wrap",
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
            <div className={cn("flex shrink-0 gap-3", !stuck && "flex-wrap")}>
              {publishShown && <PublishRoadmapButton state={publishedState} />}
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
        )
      }}
    </StickyHeader>
  )
}
