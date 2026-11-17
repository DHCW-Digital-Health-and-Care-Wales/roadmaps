import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { usePinnedHeight } from "@/components/layout/pinning"
import type { PlacementOrder } from "@/domain/roadmap/roadmap-changes"

import type { PageItem } from "../editing/page-items"
import type { RoadmapItemGroups } from "../group-roadmap-items"
import {
  type JumpTarget,
  jumpTargetHeadingId,
  type JumpTargetSummary,
  summariseJumpTargets,
} from "./jump-targets"

/**
 * A roadmap's placement navigation (STY-053): where it goes, where the page is, and how
 * to move it.
 */
export interface PlacementNavigation {
  /** The page's jump targets in page order, with their counts and pending marks. */
  summaries: readonly JumpTargetSummary[]
  /**
   * The target whose part of the page is at the top of the screen, under the pinned
   * title row (S3): the one last jumped to while the page stays where the jump left it,
   * and none above the first (D8).
   */
  current: JumpTarget | null
  /** Scrolls `target`'s heading to the top of the screen and moves focus to it (S1). */
  jump: (target: JumpTarget) => void
}

/** A jump, and where it left the page. */
interface Jump {
  target: JumpTarget
  scrollY: number
}

/**
 * The placement navigation of a page whose items `groups` holds, with `orders`, the
 * roadmap's pending orders (`summariseJumpTargets`). It follows which target the page
 * is in, and jumps to one. A jump changes no address (D8, ADR-004): it scrolls the
 * target's heading clear of the pinned title row and focuses it. The first jump can
 * come before the row has ever stuck, when its height is not yet known: once it is,
 * the heading is aligned again, unless the page has scrolled since.
 */
export function usePlacementNavigation(
  groups: RoadmapItemGroups<PageItem>,
  orders: readonly PlacementOrder[] = NO_ORDERS,
): PlacementNavigation {
  const summaries = useMemo(
    () => summariseJumpTargets(groups, orders),
    [groups, orders],
  )
  const targets = useMemo(
    () => summaries.map(({ target }) => target),
    [summaries],
  )
  const top = usePinnedHeight("top")
  const lastJump = useRef<Jump | null>(null)
  const [current, setCurrent] = useState<JumpTarget | null>(null)

  useEffect(() => {
    let frame = 0
    const follow = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // A scroll that moved the page from where a jump left it ends the jump, as
        // does its target leaving the page (the unplaced items, once placed).
        const jumped = lastJump.current
        if (
          jumped?.scrollY !== window.scrollY ||
          !targets.includes(jumped.target)
        ) {
          lastJump.current = null
        }
        setCurrent(lastJump.current?.target ?? targetAtTop(targets, top))
      })
    }
    follow()
    window.addEventListener("scroll", follow, { passive: true })
    window.addEventListener("resize", follow)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", follow)
      window.removeEventListener("resize", follow)
    }
  }, [targets, top])

  // The title row's height is known, or has changed: the jump's heading goes under it.
  useLayoutEffect(() => {
    const jump = lastJump.current
    if (jump) lastJump.current = alignHeading(jump.target, top)
  }, [top])

  const jump = useCallback(
    (target: JumpTarget) => {
      const heading = headingOf(target)
      if (!heading) return
      lastJump.current = alignHeading(target, top)
      heading.focus({ preventScroll: true })
      setCurrent(target)
    },
    [top],
  )

  return { summaries, current, jump }
}

const NO_ORDERS: readonly PlacementOrder[] = []

function headingOf(target: JumpTarget): HTMLElement | null {
  return document.getElementById(jumpTargetHeadingId(target))
}

/** Scrolls `target`'s heading to `top`, the pinned height; says where that left the page. */
function alignHeading(target: JumpTarget, top: number): Jump | null {
  const heading = headingOf(target)
  if (!heading) return null
  window.scrollTo({
    top: window.scrollY + heading.getBoundingClientRect().top - top,
    behavior: "instant",
  })
  return { target, scrollY: window.scrollY }
}

/**
 * The last of `targets` whose heading has reached `top`, the pinned height, or none
 * while the first is still below it. A pixel's leeway absorbs subpixel layout; a
 * heading with no box is not laid out, so reaches nothing.
 */
function targetAtTop(
  targets: readonly JumpTarget[],
  top: number,
): JumpTarget | null {
  let reached: JumpTarget | null = null
  for (const target of targets) {
    const box = headingOf(target)?.getBoundingClientRect()
    if (box && box.height > 0 && box.top <= top + 1) reached = target
  }
  return reached
}
