import type { ReactNode, RefObject } from "react"

import { NavigationMenuButton } from "@/components/layout/navigation-drawer"
import { LEFT_OUT } from "@/components/layout/left-out"
import { StickyHeader } from "@/components/layout/sticky-header"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  TABLET_WIDTH,
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
import { NotPublishedNotice } from "./not-published-notice"
import { RoadmapMoreMenu } from "./roadmap-more-menu"

export interface RoadmapHeaderProps {
  /** The roadmap as read. */
  roadmap: Roadmap
  /** The title as shown, pending edits applied. */
  title: string
  /** The title has a pending edit. */
  titleChanged: boolean
  /** The heading, where focus can be sent. */
  heading: RefObject<HTMLHeadingElement | null>
  publishedState: PublishedState
  /** The line under the title: the roadmap's facts and its product details. */
  details: ReactNode
  /** A read of the page's roadmap data is in flight. */
  fetching: boolean
  onRefresh: () => void
  /** More's "Edit product details" was chosen, with More, where focus returns. */
  onEditRoadmap: (from: HTMLElement | null) => void
  addItemButton: RefObject<HTMLButtonElement | null>
  /** The roadmap's items are read, so one can be added. */
  canAddItem: boolean
  onAddItem: () => void
  /** The placement navigation, while the page has placements to jump to (STY-053). */
  navigation?: PlacementNavigation | undefined
}

/**
 * Where each part of the block sits, by layout: `stuck`, slimmed at the top of the
 * screen; `tablet`, in the page from 768px; `narrow`, in the page below that, where the
 * controls' wrapper gives way so each control takes a cell of the block's grid, More
 * beside the title and the rest under the details.
 */
const LAYOUT_CLASSES = {
  stuck: {
    // From a tablet: the title, the controls on its right, then the links across.
    block:
      "grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
    title: "",
    // Out of sight but still reachable (`LEFT_OUT`).
    details: "sr-only",
    controls: "flex min-w-0 items-start gap-3",
    addItem: "",
    more: "",
    jumpTo: "flex-1",
    links: "border-b-0 md:col-span-2",
  },
  tablet: {
    block: "grid-cols-[minmax(0,1fr)_auto] gap-x-3",
    title: "row-start-1 flex-wrap",
    details: "col-span-2 row-start-2 mt-1 flex flex-col gap-3",
    controls: "flex min-w-0 items-start gap-3",
    addItem: "",
    more: "",
    jumpTo: "flex-1",
    links: "col-span-2 mt-3",
  },
  narrow: {
    block: "grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3",
    title: "col-span-2 row-start-1 flex-wrap",
    details: "col-span-3 row-start-2 mt-1 flex flex-col gap-3",
    controls: "contents",
    addItem: "row-start-3 mt-4",
    more: "col-start-3 row-start-1",
    jumpTo: "col-span-2 col-start-2 row-start-3 mt-4",
    links: "",
  },
} as const

/**
 * The top of a roadmap's page (STY-065 S1): its title, with a badge when it is out of
 * step with the family or category list (STY-027 S4, S8) and a Changed tag; its
 * actions, "Add an item" (STY-046 S1) and More (STY-052 D6); `details`, one line; for
 * a roadmap not published, the Not published notice with "Publish roadmap" (S4); then
 * the jump control.
 *
 * From a tablet's width the actions sit at the end of the title's row, where they stay
 * once stuck, and the jump control is the row of placement links, the same at the top
 * and once stuck (S6). Narrower, More is "…" at the end of the title's row, and "Add
 * an item" and "Jump to" share the row under the details, "Jump to" growing to the
 * edge (S7).
 *
 * It sticks at the top of the screen once the page has scrolled past it (STY-052 S1,
 * D5), slimmed to the title and the controls (STY-060 S3, S4): narrower than a tablet
 * two rows, the menu button and the title, then the controls, "Jump to" growing to the
 * edge, and on a phone the title cut after two lines and Add an item and More icons
 * (D2); from a tablet the title with Add an item and More on its right, then the links.
 * Its full title stays its name. Stuck, the details and the notice are visually
 * hidden, never unmounted, so the product details keep their state, and More holds
 * "Publish roadmap" at every width (STY-059 D7). A control among them reached from
 * after it, by Shift+Tab or a screen reader, scrolls the page back, so the block lets
 * go and shows it; tabbed into from before, focus goes on past it (`LEFT_OUT`). Every
 * control keeps its parent as the row sticks and lets go, so focus on it stays
 * (`StickyHeader`). The strip starts with the shell's menu button, so the navigation
 * is one press away (STY-054 D8).
 *
 * The controls come before the details in the page's order from a tablet's width, as
 * they are drawn, and after them narrower, where only More is drawn out of that order
 * (STY-065 D8).
 */
export function RoadmapHeader({
  roadmap,
  title,
  titleChanged,
  heading,
  publishedState,
  details,
  fetching,
  onRefresh,
  onEditRoadmap,
  addItemButton,
  canAddItem,
  onAddItem,
  navigation,
}: RoadmapHeaderProps) {
  const phone = !useMediaQuery(WIDER_THAN_A_PHONE)
  const tablet = useMediaQuery(TABLET_WIDTH)
  const notPublished = !roadmap.published
  return (
    <StickyHeader>
      {(stuck) => {
        const layoutClasses = stuck
          ? LAYOUT_CLASSES.stuck
          : tablet
            ? LAYOUT_CLASSES.tablet
            : LAYOUT_CLASSES.narrow
        const controls = (
          <div key="controls" className={layoutClasses.controls}>
            <AddItemButton
              ref={addItemButton}
              compact={stuck && phone}
              disabled={!canAddItem}
              onAdd={onAddItem}
              className={layoutClasses.addItem}
            />
            <RoadmapMoreMenu
              fetching={fetching}
              onRefresh={onRefresh}
              onEdit={onEditRoadmap}
              compact={stuck ? phone : !tablet}
              className={layoutClasses.more}
              // In the Not published notice at the top, in More once stuck (D7).
              publishedState={notPublished && !stuck ? null : publishedState}
            />
            {navigation && !tablet && (
              <div className={cn("flex min-w-0", layoutClasses.jumpTo)}>
                <JumpToMenu navigation={navigation} />
              </div>
            )}
          </div>
        )
        const detailsBlock = (
          <div
            key="details"
            className={layoutClasses.details}
            // Stuck, from after it, the block lets go to show it in place; from
            // before, Tab passes it by.
            {...(stuck ? LEFT_OUT : {})}
          >
            {details}
            {notPublished && (
              <NotPublishedNotice
                action={<PublishRoadmapButton state={publishedState} />}
              />
            )}
          </div>
        )
        return (
          <div className={cn("grid", layoutClasses.block)}>
            <div
              className={cn(
                "flex min-w-0 items-center gap-x-3 gap-y-2",
                layoutClasses.title,
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
            {/* In the order they are drawn, as far as one order can be (D8). React
                puts focus back on a control the change of order moves. */}
            {tablet ? [controls, detailsBlock] : [detailsBlock, controls]}
            {navigation && tablet && (
              <PlacementLinks
                navigation={navigation}
                className={layoutClasses.links}
              />
            )}
          </div>
        )
      }}
    </StickyHeader>
  )
}
