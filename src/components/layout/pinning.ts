import { type RefObject, useEffect, useLayoutEffect, useState } from "react"

import { useMediaQuery } from "@/lib/use-media-query"

/**
 * Below this viewport height nothing pins, and the page keeps its controls in its flow
 * (STY-052 S6, D18): 1280×800 at 400% zoom, or a phone held sideways.
 */
const PINNING_QUERY = "(min-height: 500px)"

/** Whether the viewport is tall enough to spare room for pinned bars. */
export function usePinning(): boolean {
  return useMediaQuery(PINNING_QUERY)
}

/**
 * Sets `--pinned-<edge>` on the document to `height` while `active`: `globals.css` turns
 * it into the `scroll-padding` that keeps a focused control clear of the bar (WCAG
 * 2.4.11) and, at the foot, into room at the end of the page.
 */
export function usePinnedInset(
  edge: "top" | "bottom",
  height: number | undefined,
  active: boolean,
): void {
  useLayoutEffect(() => {
    if (!active || height === undefined) return
    const name = `--pinned-${edge}`
    const { style } = document.documentElement
    style.setProperty(name, `${String(height)}px`)
    return () => {
      style.removeProperty(name)
    }
  }, [edge, height, active])
}

/** `element`'s height while `measuring`, as it last was: kept once measuring stops. */
export function useMeasuredHeight(
  element: RefObject<HTMLElement | null>,
  measuring: boolean,
): number | undefined {
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const measured = element.current
    if (!measuring || !measured) return
    const observer = new ResizeObserver(() => {
      setHeight(measured.offsetHeight)
    })
    observer.observe(measured)
    return () => {
      observer.disconnect()
    }
  }, [element, measuring])
  return height
}

/**
 * Whether `element` has scrolled wholly above the viewport, followed while `watching`
 * (and `false` otherwise).
 */
export function useScrolledPast(
  element: RefObject<HTMLElement | null>,
  watching: boolean,
): boolean {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const watched = element.current
    if (!watching || !watched) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
      }
    })
    observer.observe(watched)
    return () => {
      observer.disconnect()
    }
  }, [element, watching])
  return watching && past
}
