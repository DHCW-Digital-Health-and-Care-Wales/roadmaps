import { useLayoutEffect, useState, type RefObject } from "react"

/**
 * What `measure` reads of the element as it is drawn at its width now, as a string so
 * an unchanged answer draws nothing again: measured as the layout is made, so nothing
 * moves after it is first drawn; again when `content` changes and when the element's
 * size does; and once the fonts are ready, since a font can change what is inside the
 * element without changing the element's own box. "" until it can be measured, and
 * where the browser cannot watch sizes, a single read.
 */
export function useMeasure(
  elementRef: RefObject<HTMLElement | null>,
  content: string,
  measure: (element: HTMLElement) => string,
): string {
  const [measured, setMeasured] = useState("")
  useLayoutEffect(() => {
    const current = elementRef.current
    if (!current) return
    let ended = false
    const read = () => {
      if (!ended) setMeasured(measure(current))
    }
    read()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(read)
    observer.observe(current)
    void document.fonts.ready.then(read)
    return () => {
      ended = true
      observer.disconnect()
    }
  }, [elementRef, content, measure])
  return measured
}
