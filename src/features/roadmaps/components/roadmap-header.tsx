import type { ReactNode, RefObject } from "react"

import { NavigationMenuButton } from "@/components/layout/navigation-drawer"
import { LEFT_OUT } from "@/components/layout/left-out"
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
import { RoadmapFacts } from "./roadmap-facts"
import { RoadmapMoreMenu } from "./roadmap-more-menu"

export interface RoadmapHeaderProps {
  /** The roadmap as read. */
  roadmap: Roadmap
  /** The roadmap as shown, pending edits applied, for its title and facts. */
  shown: Roadmap
  /** The title as shown, pending edits applied. */
  title: string
  /** The title has a pending edit. */
  titleChanged: boolean
  /** The heading, where focus can be sent. */
  heading: RefObject<HTMLHeadingElement | null>
  publishedState: PublishedState
  /** "About this roadmap", with its Edit, under the facts. */
  about: ReactNode
  /** A read of the page's roadmap data is in flight. */
  fetching: boolean
  onRefresh: () => void
  addItemButton: RefObject<HTMLButtonElement | null>
  /** The roadmap's items are read, so one can be added. */
  canAddItem: boolean
  onAddItem: () => void
  /**
   * The placement navigation's "Jump to" (STY-053 D5), while the page has placements to
   * jump to: after More on a desktop, or in a row of its own under the controls.
   */
  jumpTo?: ReactNode
}

/**
 * The top of a roadmap's page, one block on one left edge (STY-059 S1): its title, with
 * a badge when it is out of step with the family or category list (STY-027 S4, S8) and
 * a Changed tag; its facts; for a roadmap not published, the Not published tag with
 * "Publish roadmap" beside it (S6); `about`; then its controls, "Add an item" (STY-046
 * S1), More (STY-052 D6) and "Jump to", in that order (S7). Narrower than a desktop,
 * "Jump to" keeps a row of its own under the rest.
 *
 * It sticks at the top of the screen once the page has scrolled past it (STY-052 S1,
 * D5), slimmed to the title and the controls, in the same order: the title cut with an
 * ellipsis, its full text still its name, "Jump to" cut where the row is still short of
 * room, and on a phone "Add an item" an icon (D18). Stuck, the facts, the Publish row and
 * `about` are visually hidden, never unmounted, so About keeps its state, and More holds
 * "Publish roadmap" at every width (STY-059 D7); a control among them reached by Tab or
 * a screen reader scrolls the page back to the top, so the block lets go and shows it.
 * The row starts with the shell's menu button, so the navigation is one press away
 * (STY-054 D8).
 */
export function RoadmapHeader({
  roadmap,
  shown,
  title,
  titleChanged,
  heading,
  publishedState,
  about,
  fetching,
  onRefresh,
  addItemButton,
  canAddItem,
  onAddItem,
  jumpTo,
}: RoadmapHeaderProps) {
  const phone = !useMediaQuery(WIDER_THAN_A_PHONE)
  // Narrower than a desktop, "Jump to" has a row of its own: beside the rest it would
  // push them off a tablet's screen, in Cymraeg above all.
  const jumpToInline = useMediaQuery(DESKTOP_WIDTH)
  const notPublished = !roadmap.published
  return (
    <StickyHeader>
      {(stuck) => (
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "flex gap-3",
              stuck ? "items-center" : "flex-col gap-4",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-x-3 gap-y-2",
                // Stuck beside "Jump to", the title keeps some room as it gives way.
                stuck ? "flex-1 lg:min-w-24" : "flex-wrap",
              )}
            >
              {stuck && <NavigationMenuButton variant="secondary" />}
              <h1
                ref={heading}
                tabIndex={-1}
                className={cn(
                  "outline-none focus-visible:focus-ring",
                  stuck
                    ? "truncate text-heading-s"
                    : "text-heading-l text-pretty wrap-break-word sm:text-heading-xl",
                )}
              >
                {title}
              </h1>
              {!stuck && (
                <>
                  <ListMismatchBadges roadmap={roadmap} />
                  {titleChanged && <ChangedTag />}
                </>
              )}
            </div>
            <div
              // Stuck, out of sight but still reached by Tab or a screen reader, which
              // lets the block go to show it in place.
              className={cn("flex flex-col gap-1", stuck && "sr-only")}
              {...(stuck ? LEFT_OUT : {})}
            >
              <RoadmapFacts roadmap={shown} />
              {notPublished && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1">
                  <NotPublishedBadge />
                  <PublishRoadmapButton state={publishedState} />
                </div>
              )}
              {about}
            </div>
            <div
              className={cn(
                "flex gap-3",
                // Stuck, the row never wraps: "Jump to" gives way, cutting its
                // placement's name, so every control stays on the screen.
                stuck ? "min-w-0" : "flex-wrap",
              )}
            >
              <AddItemButton
                ref={addItemButton}
                compact={stuck && phone}
                disabled={!canAddItem}
                onAdd={onAddItem}
              />
              <RoadmapMoreMenu
                fetching={fetching}
                onRefresh={onRefresh}
                // Beside the Not published tag at the top, in More once stuck (D7).
                publishedState={notPublished && !stuck ? null : publishedState}
              />
              {jumpToInline && jumpTo}
            </div>
          </div>
          {!jumpToInline && jumpTo}
        </div>
      )}
    </StickyHeader>
  )
}
