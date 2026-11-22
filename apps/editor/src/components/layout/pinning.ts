import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react"

import { createExternalStore } from "@/lib/external-store"
import { useMediaQuery } from "@/lib/use-media-query"

type Edge = "top" | "bottom"

/** The pinned bars' heights, as `usePinnedInset` sets them on the document. */
const insets = createExternalStore<Readonly<Partial<Record<Edge, number>>>>({})

function setInset(edge: Edge, height: number | undefined): void {
  const { style } = document.documentElement
  const name = `--pinned-${edge}`
  if (height === undefined) style.removeProperty(name)
  else style.setProperty(name, `${String(height)}px`)
  insets.setSnapshot({ ...insets.getSnapshot(), [edge]: height })
}

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
  edge: Edge,
  height: number | undefined,
  active: boolean,
): void {
  useLayoutEffect(() => {
    if (!active || height === undefined) return
    setInset(edge, height)
    return () => {
      setInset(edge, undefined)
    }
  }, [edge, height, active])
}

/**
 * The height `usePinnedInset` keeps clear at `edge`, 0 while none is set: where a
 * scroll by script puts what it shows, as the browser's `scroll-padding` does.
 */
export function usePinnedHeight(edge: Edge): number {
  return useSyncExternalStore(
    insets.subscribe,
    () => insets.getSnapshot()[edge] ?? 0,
  )
}

/**
 * `element`'s height while `measuring`, as it last was: kept once measuring stops. Its
 * border box is watched, so the padding and border an element gains as it sticks are
 * measured too.
 */
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
    observer.observe(measured, { box: "border-box" })
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
