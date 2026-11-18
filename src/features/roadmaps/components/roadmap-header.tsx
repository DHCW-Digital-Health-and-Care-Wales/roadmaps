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
import { JumpToMenu } from "../placement-navigation/jump-to-menu"
import { PlacementLinks } from "../placement-navigation/placement-links"
import type { PlacementNavigation } from "../placement-navigation/use-placement-navigation"
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
  /** The placement navigation, while the page has placements to jump to (STY-053). */
  navigation?: PlacementNavigation | undefined
}

/**
 * The top of a roadmap's page, one block on one left edge (STY-059 S1): its title, with
 * a badge when it is out of step with the family or category list (STY-027 S4, S8) and
 * a Changed tag; its facts; for a roadmap not published, the Not published tag with
 * "Publish roadmap" beside it (S6); `about`; then one row of controls, "Add an item"
 * (STY-046 S1), More (STY-052 D6) and the jump control, in that order (S7).
 *
 * The jump control is one per width, the same at the top and once stuck (STY-060 S1,
 * D1): "Jump to" below a desktop, at the end of the row, running across the row below on
 * a phone (S2); from a desktop, the row of placement links under the rest.
 *
 * It sticks at the top of the screen once the page has scrolled past it (STY-052 S1,
 * D5), slimmed to the title and the controls (STY-060 S3, S4): below a desktop two rows,
 * the menu button and the title, then the controls, "Jump to" growing to the edge, and
 * on a phone the title cut after two lines and Add an item and More icons (D2); on a
 * desktop the title with Add an item and More on its right, then the links. Its full
 * title stays its name. Stuck, the facts, the Publish row and `about` are visually
 * hidden, never unmounted, so About keeps its state, and More holds "Publish roadmap"
 * at every width (STY-059 D7). A control among them reached from after it, by
 * Shift+Tab or a screen reader, scrolls the page back, so the block lets go and shows
 * it; tabbed into from before, focus goes on past it (`LEFT_OUT`). Every control keeps
 * its parent as the row sticks and lets go, so focus on it stays (`StickyHeader`). The
 * strip starts with the shell's menu button, so the navigation is one press away
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
  navigation,
}: RoadmapHeaderProps) {
  const phone = !useMediaQuery(WIDER_THAN_A_PHONE)
  const desktop = useMediaQuery(DESKTOP_WIDTH)
  const notPublished = !roadmap.published
  return (
    <StickyHeader>
      {(stuck) => (
        <div
          className={cn(
            // One column no wider than the page, whatever its content's widest word.
            "grid grid-cols-1",
            // Stuck on a desktop: the title, Add an item and More on its right, then
            // the links across both.
            stuck
              ? "gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              : "gap-4",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-x-3 gap-y-2",
              !stuck && "flex-wrap",
            )}
          >
            {stuck && <NavigationMenuButton variant="secondary" />}
            <h1
              ref={heading}
              tabIndex={-1}
              className={cn(
                "outline-none focus-visible:focus-ring",
                stuck
                  ? // Two lines on a phone, one from 640px, cut with an ellipsis.
                    "line-clamp-2 min-w-0 text-heading-xs wrap-break-word sm:line-clamp-1 sm:text-heading-s"
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
            // Stuck, out of sight but still reachable: from after it, the block lets
            // go to show it in place; from before, Tab passes it by.
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
              stuck ? "min-w-0 items-start" : "flex-wrap",
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
              compact={stuck && phone}
              // Beside the Not published tag at the top, in More once stuck (D7).
              publishedState={notPublished && !stuck ? null : publishedState}
            />
            {navigation && !desktop && (
              <div
                className={cn(
                  "flex min-w-0",
                  // On a phone's top it takes the row below; elsewhere it grows to
                  // the edge.
                  stuck ? "flex-1" : "w-full sm:w-auto sm:flex-1",
                )}
              >
                <JumpToMenu navigation={navigation} />
              </div>
            )}
          </div>
          {navigation && desktop && (
            <PlacementLinks
              navigation={navigation}
              className={cn(stuck && "border-y-0 lg:col-span-2")}
            />
          )}
        </div>
      )}
    </StickyHeader>
  )
}
